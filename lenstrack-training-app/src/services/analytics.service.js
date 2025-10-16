const UserProgress = require('../models/UserProgress.model');
const User = require('../models/User.model');
const LearningTrack = require('../models/LearningTrack.model');
const logger = require('./logger.service');

class AnalyticsService {
  constructor() {
    this.isInitialized = false;
  }

  async initialize() {
    try {
      this.isInitialized = true;
      logger.info('Analytics service initialized successfully');
    } catch (error) {
      logger.error('Analytics service initialization failed:', error);
      throw error;
    }
  }

  async getUserProgressAnalytics(userId, timeRange = 'month') {
    try {
      const dateFilter = this.getDateFilter(timeRange);
      
      const progressData = await UserProgress.aggregate([
        {
          $match: {
            user_id: userId,
            ...dateFilter
          }
        },
        {
          $group: {
            _id: '$track_id',
            total_lessons: { $sum: 1 },
            completed_lessons: {
              $sum: { $cond: [{ $eq: ['$status', 'COMPLETED'] }, 1, 0] }
            },
            in_progress_lessons: {
              $sum: { $cond: [{ $eq: ['$status', 'IN_PROGRESS'] }, 1, 0] }
            },
            average_score: { $avg: '$progress_percentage' },
            total_xp: { $sum: '$gamification.xp_earned' },
            total_time: { $sum: '$time_spent.total_minutes' },
            perfect_scores: {
              $sum: { $cond: ['$completion_data.perfect_score', 1, 0] }
            },
            first_attempts: {
              $sum: { $cond: ['$completion_data.first_attempt', 1, 0] }
            }
          }
        }
      ]);

      return progressData;
    } catch (error) {
      logger.error('Error getting user progress analytics:', error);
      throw error;
    }
  }

  async getStoreAnalytics(storeId, timeRange = 'month') {
    try {
      const dateFilter = this.getDateFilter(timeRange);
      
      const storeData = await UserProgress.aggregate([
        {
          $lookup: {
            from: 'users',
            localField: 'user_id',
            foreignField: '_id',
            as: 'user'
          }
        },
        {
          $unwind: '$user'
        },
        {
          $match: {
            'user.store_id': storeId,
            ...dateFilter
          }
        },
        {
          $group: {
            _id: null,
            total_users: { $addToSet: '$user_id' },
            total_lessons: { $sum: 1 },
            completed_lessons: {
              $sum: { $cond: [{ $eq: ['$status', 'COMPLETED'] }, 1, 0] }
            },
            average_score: { $avg: '$progress_percentage' },
            total_xp: { $sum: '$gamification.xp_earned' },
            total_time: { $sum: '$time_spent.total_minutes' },
            completion_rate: {
              $avg: { $cond: [{ $eq: ['$status', 'COMPLETED'] }, 1, 0] }
            }
          }
        },
        {
          $project: {
            _id: 0,
            total_users: { $size: '$total_users' },
            total_lessons: 1,
            completed_lessons: 1,
            average_score: { $round: ['$average_score', 2] },
            total_xp: 1,
            total_time: 1,
            completion_rate: { $round: [{ $multiply: ['$completion_rate', 100] }, 2] }
          }
        }
      ]);

      return storeData[0] || {};
    } catch (error) {
      logger.error('Error getting store analytics:', error);
      throw error;
    }
  }

  async getTrackAnalytics(trackId, timeRange = 'month') {
    try {
      const dateFilter = this.getDateFilter(timeRange);
      
      const trackData = await UserProgress.aggregate([
        {
          $match: {
            track_id: trackId,
            ...dateFilter
          }
        },
        {
          $group: {
            _id: '$module_id',
            total_attempts: { $sum: 1 },
            completed_attempts: {
              $sum: { $cond: [{ $eq: ['$status', 'COMPLETED'] }, 1, 0] }
            },
            average_score: { $avg: '$progress_percentage' },
            average_time: { $avg: '$time_spent.total_minutes' },
            perfect_scores: {
              $sum: { $cond: ['$completion_data.perfect_score', 1, 0] }
            },
            first_attempts: {
              $sum: { $cond: ['$completion_data.first_attempt', 1, 0] }
            }
          }
        },
        {
          $sort: { '_id': 1 }
        }
      ]);

      return trackData;
    } catch (error) {
      logger.error('Error getting track analytics:', error);
      throw error;
    }
  }

  async getKPIAnalytics(storeId, timeRange = 'month') {
    try {
      // This would integrate with Etelios ERP to get real KPI data
      // For now, return mock data structure
      const kpiData = {
        sales: {
          ar_attach_rate: 0,
          progressive_conversion: 0,
          aov_threshold: 0,
          close_rate: 0
        },
        optometrist: {
          remake_rate: 0,
          rx_recheck_rate: 0,
          pd_sh_error_rate: 0
        },
        training_impact: {
          pre_training_scores: {},
          post_training_scores: {},
          improvement_percentage: 0
        }
      };

      return kpiData;
    } catch (error) {
      logger.error('Error getting KPI analytics:', error);
      throw error;
    }
  }

  async getHeatmapData(userId, timeRange = 'month') {
    try {
      const dateFilter = this.getDateFilter(timeRange);
      
      const heatmapData = await UserProgress.aggregate([
        {
          $match: {
            user_id: userId,
            ...dateFilter
          }
        },
        {
          $group: {
            _id: {
              track_id: '$track_id',
              module_id: '$module_id'
            },
            total_attempts: { $sum: 1 },
            average_score: { $avg: '$progress_percentage' },
            completion_rate: {
              $avg: { $cond: [{ $eq: ['$status', 'COMPLETED'] }, 1, 0] }
            },
            skill_gaps: {
              $push: {
                $cond: [
                  { $lt: ['$progress_percentage', 80] },
                  '$_id',
                  null
                ]
              }
            }
          }
        },
        {
          $project: {
            _id: 0,
            track_id: '$_id.track_id',
            module_id: '$_id.module_id',
            total_attempts: 1,
            average_score: { $round: ['$average_score', 2] },
            completion_rate: { $round: [{ $multiply: ['$completion_rate', 100] }, 2] },
            skill_gaps: {
              $size: {
                $filter: {
                  input: '$skill_gaps',
                  cond: { $ne: ['$$this', null] }
                }
              }
            }
          }
        }
      ]);

      return heatmapData;
    } catch (error) {
      logger.error('Error getting heatmap data:', error);
      throw error;
    }
  }

  async getCohortAnalysis(trackId, timeRange = 'month') {
    try {
      const dateFilter = this.getDateFilter(timeRange);
      
      const cohortData = await UserProgress.aggregate([
        {
          $match: {
            track_id: trackId,
            ...dateFilter
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: 'user_id',
            foreignField: '_id',
            as: 'user'
          }
        },
        {
          $unwind: '$user'
        },
        {
          $group: {
            _id: {
              start_date: {
                $dateToString: {
                  format: '%Y-%m',
                  date: '$created_at'
                }
              },
              role: '$user.role'
            },
            total_users: { $addToSet: '$user_id' },
            completed_users: {
              $addToSet: {
                $cond: [
                  { $eq: ['$status', 'COMPLETED'] },
                  '$user_id',
                  null
                ]
              }
            },
            average_score: { $avg: '$progress_percentage' },
            average_time: { $avg: '$time_spent.total_minutes' }
          }
        },
        {
          $project: {
            _id: 0,
            start_date: '$_id.start_date',
            role: '$_id.role',
            total_users: { $size: '$total_users' },
            completed_users: {
              $size: {
                $filter: {
                  input: '$completed_users',
                  cond: { $ne: ['$$this', null] }
                }
              }
            },
            completion_rate: {
              $round: [
                {
                  $multiply: [
                    {
                      $divide: [
                        {
                          $size: {
                            $filter: {
                              input: '$completed_users',
                              cond: { $ne: ['$$this', null] }
                            }
                          }
                        },
                        { $size: '$total_users' }
                      ]
                    },
                    100
                  ]
                },
                2
              ]
            },
            average_score: { $round: ['$average_score', 2] },
            average_time: { $round: ['$average_time', 2] }
          }
        },
        {
          $sort: { start_date: 1, role: 1 }
        }
      ]);

      return cohortData;
    } catch (error) {
      logger.error('Error getting cohort analysis:', error);
      throw error;
    }
  }

  async getPerformanceTrends(userId, trackId, timeRange = 'month') {
    try {
      const dateFilter = this.getDateFilter(timeRange);
      
      const trendData = await UserProgress.aggregate([
        {
          $match: {
            user_id: userId,
            track_id: trackId,
            ...dateFilter
          }
        },
        {
          $group: {
            _id: {
              week: {
                $dateToString: {
                  format: '%Y-%U',
                  date: '$created_at'
                }
              }
            },
            total_lessons: { $sum: 1 },
            completed_lessons: {
              $sum: { $cond: [{ $eq: ['$status', 'COMPLETED'] }, 1, 0] }
            },
            average_score: { $avg: '$progress_percentage' },
            total_xp: { $sum: '$gamification.xp_earned' },
            total_time: { $sum: '$time_spent.total_minutes' }
          }
        },
        {
          $project: {
            _id: 0,
            week: '$_id.week',
            total_lessons: 1,
            completed_lessons: 1,
            completion_rate: {
              $round: [
                {
                  $multiply: [
                    { $divide: ['$completed_lessons', '$total_lessons'] },
                    100
                  ]
                },
                2
              ]
            },
            average_score: { $round: ['$average_score', 2] },
            total_xp: 1,
            total_time: 1
          }
        },
        {
          $sort: { week: 1 }
        }
      ]);

      return trendData;
    } catch (error) {
      logger.error('Error getting performance trends:', error);
      throw error;
    }
  }

  async getSkillGaps(storeId, timeRange = 'month') {
    try {
      const dateFilter = this.getDateFilter(timeRange);
      
      const skillGaps = await UserProgress.aggregate([
        {
          $lookup: {
            from: 'users',
            localField: 'user_id',
            foreignField: '_id',
            as: 'user'
          }
        },
        {
          $unwind: '$user'
        },
        {
          $match: {
            'user.store_id': storeId,
            progress_percentage: { $lt: 80 },
            ...dateFilter
          }
        },
        {
          $group: {
            _id: {
              track_id: '$track_id',
              module_id: '$module_id'
            },
            struggling_users: { $addToSet: '$user_id' },
            average_score: { $avg: '$progress_percentage' },
            common_issues: {
              $push: {
                $cond: [
                  { $ne: ['$feedback.improvements', []] },
                  '$feedback.improvements',
                  null
                ]
              }
            }
          }
        },
        {
          $project: {
            _id: 0,
            track_id: '$_id.track_id',
            module_id: '$_id.module_id',
            struggling_users_count: { $size: '$struggling_users' },
            average_score: { $round: ['$average_score', 2] },
            common_issues: {
              $reduce: {
                input: '$common_issues',
                initialValue: [],
                in: { $concatArrays: ['$$value', '$$this'] }
              }
            }
          }
        },
        {
          $sort: { struggling_users_count: -1 }
        }
      ]);

      return skillGaps;
    } catch (error) {
      logger.error('Error getting skill gaps:', error);
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
      case 'quarter':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case 'year':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        return {};
    }

    return {
      created_at: { $gte: startDate }
    };
  }

  async generateReport(reportType, filters = {}) {
    try {
      let reportData = {};

      switch (reportType) {
        case 'user_progress':
          reportData = await this.getUserProgressAnalytics(filters.userId, filters.timeRange);
          break;
        case 'store_performance':
          reportData = await this.getStoreAnalytics(filters.storeId, filters.timeRange);
          break;
        case 'track_analytics':
          reportData = await this.getTrackAnalytics(filters.trackId, filters.timeRange);
          break;
        case 'kpi_impact':
          reportData = await this.getKPIAnalytics(filters.storeId, filters.timeRange);
          break;
        case 'skill_gaps':
          reportData = await this.getSkillGaps(filters.storeId, filters.timeRange);
          break;
        default:
          throw new Error('Invalid report type');
      }

      return {
        report_type: reportType,
        filters: filters,
        data: reportData,
        generated_at: new Date(),
        generated_by: filters.userId
      };
    } catch (error) {
      logger.error('Error generating report:', error);
      throw error;
    }
  }
}

module.exports = new AnalyticsService();
