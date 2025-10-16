const mongoose = require('mongoose');

const learningTrackSchema = new mongoose.Schema({
  track_id: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    required: true,
    enum: ['SALES', 'OPTOMETRIST', 'MANAGER', 'GENERAL'],
    index: true
  },
  description: {
    type: String,
    required: true
  },
  target_audience: {
    type: [String],
    required: true,
    enum: ['SALES_ASSOCIATE', 'OPTOMETRIST', 'STORE_MANAGER', 'REGIONAL_MANAGER']
  },
  duration_weeks: {
    type: Number,
    required: true,
    min: 1,
    max: 12
  },
  modules: [{
    module_id: {
      type: String,
      required: true
    },
    title: {
      type: String,
      required: true
    },
    description: {
      type: String,
      required: true
    },
    duration_minutes: {
      type: Number,
      required: true,
      min: 3,
      max: 15
    },
    learning_objectives: [{
      type: String,
      required: true
    }],
    prerequisites: [{
      type: String
    }],
    order: {
      type: Number,
      required: true
    },
    is_required: {
      type: Boolean,
      default: true
    },
    difficulty_level: {
      type: String,
      enum: ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'],
      default: 'BEGINNER'
    }
  }],
  assessment_criteria: {
    pass_percentage: {
      type: Number,
      default: 80,
      min: 60,
      max: 100
    },
    max_attempts: {
      type: Number,
      default: 3,
      min: 1,
      max: 10
    },
    time_limit_minutes: {
      type: Number,
      default: 30,
      min: 10,
      max: 120
    }
  },
  certification: {
    is_certified: {
      type: Boolean,
      default: true
    },
    certificate_template: {
      type: String
    },
    validity_months: {
      type: Number,
      default: 12,
      min: 1,
      max: 36
    },
    renewal_required: {
      type: Boolean,
      default: true
    }
  },
  kpi_requirements: {
    sales: {
      ar_attach_rate: {
        type: Number,
        min: 0,
        max: 100
      },
      progressive_conversion: {
        type: Number,
        min: 0,
        max: 100
      },
      aov_threshold: {
        type: Number,
        min: 0
      },
      close_rate: {
        type: Number,
        min: 0,
        max: 100
      }
    },
    optometrist: {
      remake_rate: {
        type: Number,
        max: 5
      },
      rx_recheck_rate: {
        type: Number,
        max: 3
      },
      pd_sh_error_rate: {
        type: Number,
        max: 0
      }
    }
  },
  gamification: {
    xp_rewards: {
      completion: {
        type: Number,
        default: 100
      },
      perfect_score: {
        type: Number,
        default: 50
      },
      streak_bonus: {
        type: Number,
        default: 25
      }
    },
    badges: [{
      badge_id: {
        type: String,
        required: true
      },
      name: {
        type: String,
        required: true
      },
      description: {
        type: String,
        required: true
      },
      icon: {
        type: String
      },
      criteria: {
        type: Object,
        required: true
      }
    }]
  },
  status: {
    type: String,
    enum: ['DRAFT', 'ACTIVE', 'ARCHIVED', 'MAINTENANCE'],
    default: 'DRAFT',
    index: true
  },
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updated_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
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
learningTrackSchema.pre('save', function(next) {
  this.updated_at = Date.now();
  next();
});

// Indexes for performance
learningTrackSchema.index({ track_id: 1 });
learningTrackSchema.index({ type: 1, status: 1 });
learningTrackSchema.index({ target_audience: 1 });
learningTrackSchema.index({ 'modules.module_id': 1 });

// Methods
learningTrackSchema.methods.getModuleById = function(moduleId) {
  return this.modules.find(module => module.module_id === moduleId);
};

learningTrackSchema.methods.getNextModule = function(currentModuleId) {
  const currentIndex = this.modules.findIndex(module => module.module_id === currentModuleId);
  return currentIndex < this.modules.length - 1 ? this.modules[currentIndex + 1] : null;
};

learningTrackSchema.methods.getPreviousModule = function(currentModuleId) {
  const currentIndex = this.modules.findIndex(module => module.module_id === currentModuleId);
  return currentIndex > 0 ? this.modules[currentIndex - 1] : null;
};

learningTrackSchema.methods.calculateTotalDuration = function() {
  return this.modules.reduce((total, module) => total + module.duration_minutes, 0);
};

learningTrackSchema.methods.getCompletionPercentage = function(completedModules) {
  const totalModules = this.modules.length;
  const completedCount = completedModules.length;
  return Math.round((completedCount / totalModules) * 100);
};

const LearningTrack = mongoose.model('LearningTrack', learningTrackSchema);

module.exports = LearningTrack;
