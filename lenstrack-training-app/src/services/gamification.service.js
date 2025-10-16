const UserProgress = require('../models/UserProgress.model');
const User = require('../models/User.model');
const logger = require('./logger.service');

class GamificationService {
  constructor() {
    this.xpRewards = {
      lesson_completion: 50,
      perfect_score: 25,
      first_attempt: 15,
      streak_bonus: 5,
      daily_goal: 10,
      weekly_goal: 50,
      monthly_goal: 200
    };
    
    this.badges = {
      'LESSON_COMPLETE': {
        name: 'Lesson Complete',
        description: 'Completed a lesson',
        icon: '🎓',
        xp_reward: 10
      },
      'PERFECT_SCORE': {
        name: 'Perfect Score',
        description: 'Achieved 100% score',
        icon: '💯',
        xp_reward: 25
      },
      'FIRST_TRY': {
        name: 'First Try',
        description: 'Passed on first attempt',
        icon: '🚀',
        xp_reward: 15
      },
      'WEEK_STREAK': {
        name: 'Week Streak',
        description: '7-day learning streak',
        icon: '🔥',
        xp_reward: 50
      },
      'MONTH_STREAK': {
        name: 'Month Streak',
        description: '30-day learning streak',
        icon: '⭐',
        xp_reward: 100
      },
      'AR_CHAMP': {
        name: 'AR Champion',
        description: 'Achieved 25%+ AR attach rate',
        icon: '🎯',
        xp_reward: 100
      },
      'AOV_ACE': {
        name: 'AOV Ace',
        description: 'Exceeded store median AOV',
        icon: '💰',
        xp_reward: 100
      },
      'PROGRESSIVE_PRO': {
        name: 'Progressive Pro',
        description: '20%+ progressive conversion',
        icon: '👓',
        xp_reward: 100
      },
      'PD_PRO': {
        name: 'PD Pro',
        description: 'Zero PD measurement errors',
        icon: '📏',
        xp_reward: 100
      },
      'REMAKE_ZERO': {
        name: 'Remake Zero',
        description: '2% or less remake rate',
        icon: '🎯',
        xp_reward: 100
      }
    };
  }

  async calculateUserXP(userId) {
    try {
      const progressRecords = await UserProgress.find({ user_id: userId });
      
      let totalXP = 0;
      const badgesEarned = new Set();
      
      progressRecords.forEach(progress => {
        totalXP += progress.gamification.xp_earned || 0;
        progress.gamification.badges_earned.forEach(badge => {
          badgesEarned.add(badge);
        });
      });
      
      return {
        total_xp: totalXP,
        badges_earned: Array.from(badgesEarned),
        level: this.calculateLevel(totalXP),
        next_level_xp: this.getNextLevelXP(totalXP)
      };
    } catch (error) {
      logger.error('Error calculating user XP:', error);
      throw error;
    }
  }

  calculateLevel(xp) {
    // Level formula: level = floor(sqrt(xp / 100))
    return Math.floor(Math.sqrt(xp / 100)) + 1;
  }

  getNextLevelXP(currentXP) {
    const currentLevel = this.calculateLevel(currentXP);
    const nextLevelXP = Math.pow(currentLevel, 2) * 100;
    return nextLevelXP - currentXP;
  }

  async updateStreak(userId, trackId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      // Check if user has a streak record
      let streak = user.gamification?.streak || {
        current_streak: 0,
        longest_streak: 0,
        last_activity: null,
        streak_frozen: false
      };

      // Check if streak should continue
      if (streak.last_activity) {
        const lastActivity = new Date(streak.last_activity);
        const daysDiff = Math.floor((today - lastActivity) / (1000 * 60 * 60 * 24));
        
        if (daysDiff === 1) {
          // Continue streak
          streak.current_streak += 1;
        } else if (daysDiff > 1) {
          // Streak broken
          streak.current_streak = 1;
        }
        // If daysDiff === 0, same day, don't change streak
      } else {
        // First activity
        streak.current_streak = 1;
      }

      // Update longest streak
      if (streak.current_streak > streak.longest_streak) {
        streak.longest_streak = streak.current_streak;
      }

      // Update last activity
      streak.last_activity = today;

      // Update user gamification
      if (!user.gamification) {
        user.gamification = {};
      }
      user.gamification.streak = streak;

      await user.save();

      return streak;
    } catch (error) {
      logger.error('Error updating streak:', error);
      throw error;
    }
  }

  async awardBadge(userId, badgeId, reason = '') {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const badge = this.badges[badgeId];
      if (!badge) {
        throw new Error('Invalid badge ID');
      }

      // Check if user already has this badge
      if (!user.gamification) {
        user.gamification = {};
      }
      if (!user.gamification.badges) {
        user.gamification.badges = [];
      }

      const hasBadge = user.gamification.badges.some(b => b.badge_id === badgeId);
      if (hasBadge) {
        return { message: 'Badge already earned', badge: badge };
      }

      // Award badge
      const badgeRecord = {
        badge_id: badgeId,
        name: badge.name,
        description: badge.description,
        icon: badge.icon,
        earned_at: new Date(),
        reason: reason,
        xp_reward: badge.xp_reward
      };

      user.gamification.badges.push(badgeRecord);

      // Add XP reward
      if (badge.xp_reward > 0) {
        if (!user.gamification.total_xp) {
          user.gamification.total_xp = 0;
        }
        user.gamification.total_xp += badge.xp_reward;
      }

      await user.save();

      logger.info(`Badge awarded to user ${userId}: ${badge.name}`);

      return {
        message: 'Badge earned!',
        badge: badge,
        xp_earned: badge.xp_reward
      };
    } catch (error) {
      logger.error('Error awarding badge:', error);
      throw error;
    }
  }

  async checkKPIBadges(userId, kpiData) {
    try {
      const badgesToAward = [];

      // Sales badges
      if (kpiData.sales) {
        if (kpiData.sales.ar_attach_rate >= 25) {
          badgesToAward.push('AR_CHAMP');
        }
        if (kpiData.sales.aov_threshold > 0) {
          badgesToAward.push('AOV_ACE');
        }
        if (kpiData.sales.progressive_conversion >= 20) {
          badgesToAward.push('PROGRESSIVE_PRO');
        }
      }

      // Optometrist badges
      if (kpiData.optometrist) {
        if (kpiData.optometrist.pd_sh_error_rate === 0) {
          badgesToAward.push('PD_PRO');
        }
        if (kpiData.optometrist.remake_rate <= 2) {
          badgesToAward.push('REMAKE_ZERO');
        }
      }

      // Award badges
      const results = [];
      for (const badgeId of badgesToAward) {
        try {
          const result = await this.awardBadge(userId, badgeId, 'KPI achievement');
          results.push(result);
        } catch (error) {
          logger.error(`Failed to award badge ${badgeId}:`, error);
        }
      }

      return results;
    } catch (error) {
      logger.error('Error checking KPI badges:', error);
      throw error;
    }
  }

  async getLeaderboard(limit = 10, timeRange = 'month') {
    try {
      const dateFilter = this.getDateFilter(timeRange);
      
      const leaderboard = await User.aggregate([
        {
          $match: {
            'gamification.total_xp': { $exists: true, $gt: 0 },
            ...dateFilter
          }
        },
        {
          $project: {
            name: 1,
            employee_id: 1,
            store_id: 1,
            role: 1,
            'gamification.total_xp': 1,
            'gamification.badges': 1,
            'gamification.streak': 1
          }
        },
        {
          $sort: { 'gamification.total_xp': -1 }
        },
        {
          $limit: limit
        }
      ]);

      return leaderboard.map((user, index) => ({
        rank: index + 1,
        user_id: user._id,
        name: user.name,
        employee_id: user.employee_id,
        store_id: user.store_id,
        role: user.role,
        total_xp: user.gamification.total_xp,
        level: this.calculateLevel(user.gamification.total_xp),
        badges_count: user.gamification.badges?.length || 0,
        current_streak: user.gamification.streak?.current_streak || 0
      }));
    } catch (error) {
      logger.error('Error getting leaderboard:', error);
      throw error;
    }
  }

  getDateFilter(timeRange) {
    const now = new Date();
    let startDate;

    switch (timeRange) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'year':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        return {};
    }

    return {
      'gamification.badges.earned_at': { $gte: startDate }
    };
  }

  async getStoreLeaderboard(storeId, limit = 10) {
    try {
      const leaderboard = await User.aggregate([
        {
          $match: {
            store_id: storeId,
            'gamification.total_xp': { $exists: true, $gt: 0 }
          }
        },
        {
          $project: {
            name: 1,
            employee_id: 1,
            role: 1,
            'gamification.total_xp': 1,
            'gamification.badges': 1,
            'gamification.streak': 1
          }
        },
        {
          $sort: { 'gamification.total_xp': -1 }
        },
        {
          $limit: limit
        }
      ]);

      return leaderboard.map((user, index) => ({
        rank: index + 1,
        user_id: user._id,
        name: user.name,
        employee_id: user.employee_id,
        role: user.role,
        total_xp: user.gamification.total_xp,
        level: this.calculateLevel(user.gamification.total_xp),
        badges_count: user.gamification.badges?.length || 0,
        current_streak: user.gamification.streak?.current_streak || 0
      }));
    } catch (error) {
      logger.error('Error getting store leaderboard:', error);
      throw error;
    }
  }

  async getGamificationStats(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const progressRecords = await UserProgress.find({ user_id: userId });
      
      const stats = {
        total_xp: user.gamification?.total_xp || 0,
        level: this.calculateLevel(user.gamification?.total_xp || 0),
        next_level_xp: this.getNextLevelXP(user.gamification?.total_xp || 0),
        badges_earned: user.gamification?.badges?.length || 0,
        current_streak: user.gamification?.streak?.current_streak || 0,
        longest_streak: user.gamification?.streak?.longest_streak || 0,
        lessons_completed: progressRecords.filter(p => p.status === 'COMPLETED').length,
        total_lessons: progressRecords.length,
        perfect_scores: progressRecords.filter(p => p.completion_data.perfect_score).length,
        first_attempts: progressRecords.filter(p => p.completion_data.first_attempt).length
      };

      return stats;
    } catch (error) {
      logger.error('Error getting gamification stats:', error);
      throw error;
    }
  }

  async freezeStreak(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      if (!user.gamification) {
        user.gamification = {};
      }
      if (!user.gamification.streak) {
        user.gamification.streak = {};
      }

      user.gamification.streak.streak_frozen = true;
      await user.save();

      return { message: 'Streak frozen successfully' };
    } catch (error) {
      logger.error('Error freezing streak:', error);
      throw error;
    }
  }

  async unfreezeStreak(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      if (!user.gamification) {
        user.gamification = {};
      }
      if (!user.gamification.streak) {
        user.gamification.streak = {};
      }

      user.gamification.streak.streak_frozen = false;
      await user.save();

      return { message: 'Streak unfrozen successfully' };
    } catch (error) {
      logger.error('Error unfreezing streak:', error);
      throw error;
    }
  }
}

module.exports = new GamificationService();
