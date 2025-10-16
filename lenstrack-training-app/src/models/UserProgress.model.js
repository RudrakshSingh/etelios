const mongoose = require('mongoose');

const userProgressSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  track_id: {
    type: String,
    required: true,
    index: true
  },
  module_id: {
    type: String,
    required: true,
    index: true
  },
  lesson_id: {
    type: String,
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'FAILED'],
    default: 'NOT_STARTED',
    index: true
  },
  progress_percentage: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  attempts: {
    type: Number,
    default: 0,
    min: 0
  },
  max_attempts: {
    type: Number,
    default: 3
  },
  scores: {
    guided_practice: {
      score: { type: Number, default: 0 },
      max_score: { type: Number, default: 100 },
      attempts: { type: Number, default: 0 }
    },
    role_play: {
      score: { type: Number, default: 0 },
      max_score: { type: Number, default: 12 },
      attempts: { type: Number, default: 0 },
      rubric_scores: {
        discovery: { type: Number, default: 0 },
        product_fit: { type: Number, default: 0 },
        clarity: { type: Number, default: 0 },
        empathy: { type: Number, default: 0 },
        compliance: { type: Number, default: 0 },
        close: { type: Number, default: 0 }
      }
    },
    checkpoint_quiz: {
      score: { type: Number, default: 0 },
      max_score: { type: Number, default: 100 },
      attempts: { type: Number, default: 0 },
      pass_percentage: { type: Number, default: 80 }
    }
  },
  time_spent: {
    total_minutes: { type: Number, default: 0 },
    lesson_minutes: { type: Number, default: 0 },
    practice_minutes: { type: Number, default: 0 },
    role_play_minutes: { type: Number, default: 0 },
    quiz_minutes: { type: Number, default: 0 }
  },
  completion_data: {
    started_at: { type: Date },
    completed_at: { type: Date },
    first_attempt: { type: Boolean, default: false },
    perfect_score: { type: Boolean, default: false }
  },
  feedback: {
    strengths: [{ type: String }],
    improvements: [{ type: String }],
    suggestions: [{ type: String }],
    next_steps: [{ type: String }]
  },
  gamification: {
    xp_earned: { type: Number, default: 0 },
    badges_earned: [{ type: String }],
    streak_count: { type: Number, default: 0 },
    streak_frozen: { type: Boolean, default: false }
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
});

// Pre-save middleware
userProgressSchema.pre('save', function(next) {
  this.updated_at = Date.now();
  next();
});

// Indexes for performance
userProgressSchema.index({ user_id: 1, track_id: 1 });
userProgressSchema.index({ user_id: 1, status: 1 });
userProgressSchema.index({ track_id: 1, module_id: 1 });
userProgressSchema.index({ 'gamification.xp_earned': -1 });

// Methods
userProgressSchema.methods.calculateOverallScore = function() {
  const scores = this.scores;
  const totalScore = (
    (scores.guided_practice.score || 0) +
    (scores.role_play.score || 0) +
    (scores.checkpoint_quiz.score || 0)
  );
  const maxScore = (
    (scores.guided_practice.max_score || 100) +
    (scores.role_play.max_score || 12) +
    (scores.checkpoint_quiz.max_score || 100)
  );
  
  return maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
};

userProgressSchema.methods.isPassed = function() {
  const overallScore = this.calculateOverallScore();
  const quizPassed = (this.scores.checkpoint_quiz.score || 0) >= (this.scores.checkpoint_quiz.pass_percentage || 80);
  const rolePlayPassed = (this.scores.role_play.score || 0) >= 8; // 8/12 minimum
  
  return overallScore >= 80 && quizPassed && rolePlayPassed;
};

userProgressSchema.methods.calculateXP = function() {
  let xp = 0;
  
  // Base completion XP
  if (this.status === 'COMPLETED') {
    xp += 50;
  }
  
  // Perfect score bonus
  if (this.completion_data.perfect_score) {
    xp += 25;
  }
  
  // First attempt bonus
  if (this.completion_data.first_attempt) {
    xp += 15;
  }
  
  // Streak bonus
  if (this.gamification.streak_count > 0) {
    xp += Math.min(this.gamification.streak_count * 5, 50);
  }
  
  return xp;
};

userProgressSchema.methods.getBadgesEarned = function() {
  const badges = [];
  
  // Completion badges
  if (this.status === 'COMPLETED') {
    badges.push('LESSON_COMPLETE');
  }
  
  // Perfect score badge
  if (this.completion_data.perfect_score) {
    badges.push('PERFECT_SCORE');
  }
  
  // First attempt badge
  if (this.completion_data.first_attempt) {
    badges.push('FIRST_TRY');
  }
  
  // Streak badges
  if (this.gamification.streak_count >= 7) {
    badges.push('WEEK_STREAK');
  }
  if (this.gamification.streak_count >= 30) {
    badges.push('MONTH_STREAK');
  }
  
  return badges;
};

userProgressSchema.methods.updateProgress = function(activity, score, timeSpent) {
  this.attempts += 1;
  
  // Update scores based on activity
  if (activity === 'guided_practice') {
    this.scores.guided_practice.score = Math.max(this.scores.guided_practice.score, score);
    this.scores.guided_practice.attempts += 1;
    this.time_spent.practice_minutes += timeSpent;
  } else if (activity === 'role_play') {
    this.scores.role_play.score = Math.max(this.scores.role_play.score, score);
    this.scores.role_play.attempts += 1;
    this.time_spent.role_play_minutes += timeSpent;
  } else if (activity === 'checkpoint_quiz') {
    this.scores.checkpoint_quiz.score = Math.max(this.scores.checkpoint_quiz.score, score);
    this.scores.checkpoint_quiz.attempts += 1;
    this.time_spent.quiz_minutes += timeSpent;
  }
  
  // Update total time
  this.time_spent.total_minutes += timeSpent;
  
  // Update progress percentage
  this.progress_percentage = this.calculateOverallScore();
  
  // Check if completed
  if (this.isPassed()) {
    this.status = 'COMPLETED';
    this.completion_data.completed_at = new Date();
    this.completion_data.first_attempt = this.attempts === 1;
    this.completion_data.perfect_score = this.calculateOverallScore() === 100;
  }
  
  // Update gamification
  this.gamification.xp_earned = this.calculateXP();
  this.gamification.badges_earned = this.getBadgesEarned();
};

userProgressSchema.methods.getPerformanceSummary = function() {
  return {
    overall_score: this.calculateOverallScore(),
    is_passed: this.isPassed(),
    attempts: this.attempts,
    time_spent: this.time_spent,
    xp_earned: this.gamification.xp_earned,
    badges_earned: this.gamification.badges_earned,
    strengths: this.feedback.strengths,
    improvements: this.feedback.improvements
  };
};

const UserProgress = mongoose.model('UserProgress', userProgressSchema);

module.exports = UserProgress;
