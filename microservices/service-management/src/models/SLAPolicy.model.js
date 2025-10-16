const mongoose = require('mongoose');

const slaPolicySchema = new mongoose.Schema({
  policy_id: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  targets: {
    first_response_minutes: {
      P1: {
        type: Number,
        required: true,
        min: 0
      },
      P2: {
        type: Number,
        required: true,
        min: 0
      },
      P3: {
        type: Number,
        required: true,
        min: 0
      }
    },
    resolution_minutes: {
      P1: {
        type: Number,
        required: true,
        min: 0
      },
      P2: {
        type: Number,
        required: true,
        min: 0
      },
      P3: {
        type: Number,
        required: true,
        min: 0
      }
    }
  },
  business_hours: {
    monday: {
      start: {
        type: String,
        required: true,
        trim: true
      },
      end: {
        type: String,
        required: true,
        trim: true
      }
    },
    tuesday: {
      start: {
        type: String,
        required: true,
        trim: true
      },
      end: {
        type: String,
        required: true,
        trim: true
      }
    },
    wednesday: {
      start: {
        type: String,
        required: true,
        trim: true
      },
      end: {
        type: String,
        required: true,
        trim: true
      }
    },
    thursday: {
      start: {
        type: String,
        required: true,
        trim: true
      },
      end: {
        type: String,
        required: true,
        trim: true
      }
    },
    friday: {
      start: {
        type: String,
        required: true,
        trim: true
      },
      end: {
        type: String,
        required: true,
        trim: true
      }
    },
    saturday: {
      start: {
        type: String,
        required: true,
        trim: true
      },
      end: {
        type: String,
        required: true,
        trim: true
      }
    },
    sunday: {
      start: {
        type: String,
        required: true,
        trim: true
      },
      end: {
        type: String,
        required: true,
        trim: true
      }
    }
  },
  holiday_calendar_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'HolidayCalendar'
  },
  pause_on: {
    WAITING_CUSTOMER: {
      type: Boolean,
      default: true
    },
    ON_HOLD: {
      type: Boolean,
      default: true
    }
  },
  is_active: {
    type: Boolean,
    default: true
  },
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
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

// policy_id index is already defined in schema with unique: true
slaPolicySchema.index({ name: 1 });
slaPolicySchema.index({ is_active: 1 });

const SLAPolicy = mongoose.model('SLAPolicy', slaPolicySchema);

module.exports = SLAPolicy;
