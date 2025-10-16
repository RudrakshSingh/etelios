const mongoose = require('mongoose');

const lessonSchema = new mongoose.Schema({
  lesson_id: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true
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
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  learning_objectives: [{
    type: String,
    required: true
  }],
  duration_minutes: {
    type: Number,
    required: true,
    min: 3,
    max: 15
  },
  difficulty_level: {
    type: String,
    enum: ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'],
    default: 'BEGINNER',
    index: true
  },
  content: {
    hook: {
      duration_seconds: {
        type: Number,
        default: 15,
        min: 10,
        max: 30
      },
      text: {
        type: String,
        required: true
      },
      media_url: {
        type: String
      }
    },
    micro_concept: {
      duration_seconds: {
        type: Number,
        default: 90,
        min: 60,
        max: 120
      },
      key_points: [{
        type: String,
        required: true
      }],
      graphics: [{
        type: String,
        url: String,
        caption: String
      }],
      media_url: {
        type: String
      }
    },
    guided_practice: {
      duration_seconds: {
        type: Number,
        default: 120,
        min: 60,
        max: 180
      },
      activities: [{
        activity_type: {
          type: String,
          enum: ['MCQ', 'REORDER', 'HOTSPOT', 'DRAG_DROP', 'FILL_BLANK'],
          required: true
        },
        question: {
          type: String,
          required: true
        },
        options: [{
          type: String
        }],
        correct_answer: {
          type: mongoose.Schema.Types.Mixed,
          required: true
        },
        explanation: {
          type: String
        },
        points: {
          type: Number,
          default: 10
        }
      }]
    },
    role_play: {
      duration_seconds: {
        type: Number,
        default: 90,
        min: 60,
        max: 120
      },
      scenario: {
        type: String,
        required: true
      },
      customer_persona: {
        type: String,
        required: true
      },
      objectives: [{
        type: String,
        required: true
      }],
      rubric: {
        discovery: {
          weight: { type: Number, default: 20 },
          criteria: { type: String, required: true }
        },
        product_fit: {
          weight: { type: Number, default: 20 },
          criteria: { type: String, required: true }
        },
        clarity: {
          weight: { type: Number, default: 15 },
          criteria: { type: String, required: true }
        },
        empathy: {
          weight: { type: Number, default: 15 },
          criteria: { type: String, required: true }
        },
        compliance: {
          weight: { type: Number, default: 15 },
          criteria: { type: String, required: true }
        },
        close: {
          weight: { type: Number, default: 15 },
          criteria: { type: String, required: true }
        }
      }
    },
    checkpoint_quiz: {
      duration_seconds: {
        type: Number,
        default: 180,
        min: 120,
        max: 300
      },
      questions: [{
        question: {
          type: String,
          required: true
        },
        options: [{
          type: String,
          required: true
        }],
        correct_answer: {
          type: Number,
          required: true
        },
        explanation: {
          type: String
        },
        points: {
          type: Number,
          default: 10
        }
      }],
      pass_percentage: {
        type: Number,
        default: 80,
        min: 60,
        max: 100
      }
    },
    take_to_floor_task: {
      title: {
        type: String,
        required: true
      },
      description: {
        type: String,
        required: true
      },
      action_items: [{
        type: String,
        required: true
      }],
      success_criteria: {
        type: String,
        required: true
      },
      xp_reward: {
        type: Number,
        default: 30
      }
    },
    reflection: {
      duration_seconds: {
        type: Number,
        default: 15,
        min: 10,
        max: 30
      },
      questions: [{
        type: String,
        required: true
      }]
    }
  },
  prerequisites: [{
    type: String
  }],
  tags: [{
    type: String,
    trim: true
  }],
  media: {
    videos: [{
      url: String,
      duration_seconds: Number,
      thumbnail: String
    }],
    images: [{
      url: String,
      caption: String,
      alt_text: String
    }],
    documents: [{
      url: String,
      title: String,
      type: String
    }]
  },
  assessment: {
    total_points: {
      type: Number,
      default: 100
    },
    pass_threshold: {
      type: Number,
      default: 80
    },
    max_attempts: {
      type: Number,
      default: 3
    },
    time_limit_minutes: {
      type: Number,
      default: 15
    }
  },
  gamification: {
    xp_rewards: {
      completion: {
        type: Number,
        default: 50
      },
      perfect_score: {
        type: Number,
        default: 25
      },
      first_attempt: {
        type: Number,
        default: 15
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
lessonSchema.pre('save', function(next) {
  this.updated_at = Date.now();
  next();
});

// Indexes for performance
lessonSchema.index({ lesson_id: 1 });
lessonSchema.index({ track_id: 1, module_id: 1 });
lessonSchema.index({ difficulty_level: 1, status: 1 });
lessonSchema.index({ tags: 1 });

// Methods
lessonSchema.methods.calculateTotalDuration = function() {
  const content = this.content;
  return (
    (content.hook?.duration_seconds || 0) +
    (content.micro_concept?.duration_seconds || 0) +
    (content.guided_practice?.duration_seconds || 0) +
    (content.role_play?.duration_seconds || 0) +
    (content.checkpoint_quiz?.duration_seconds || 0) +
    (content.reflection?.duration_seconds || 0)
  );
};

lessonSchema.methods.getTotalXP = function() {
  const gamification = this.gamification;
  return (
    (gamification.xp_rewards?.completion || 0) +
    (gamification.xp_rewards?.perfect_score || 0) +
    (gamification.xp_rewards?.first_attempt || 0)
  );
};

lessonSchema.methods.validateRubric = function() {
  const rubric = this.content.role_play?.rubric;
  if (!rubric) return false;
  
  const weights = Object.values(rubric).map(item => item.weight || 0);
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  
  return Math.abs(totalWeight - 100) < 0.01; // Allow for small floating point errors
};

lessonSchema.methods.getActivityCount = function() {
  const guidedPractice = this.content.guided_practice;
  const checkpointQuiz = this.content.checkpoint_quiz;
  
  return {
    guided_practice: guidedPractice?.activities?.length || 0,
    quiz_questions: checkpointQuiz?.questions?.length || 0,
    total_activities: (guidedPractice?.activities?.length || 0) + (checkpointQuiz?.questions?.length || 0)
  };
};

const Lesson = mongoose.model('Lesson', lessonSchema);

module.exports = Lesson;
