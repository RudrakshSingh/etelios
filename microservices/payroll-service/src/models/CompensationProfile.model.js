const mongoose = require('mongoose');

const compensationProfileSchema = new mongoose.Schema({
  employeeId: {
    type: String,
    required: true,
    ref: 'Employee',
    index: true
  },
  salarySystem: {
    type: String,
    enum: ['PERFORMANCE_DEBIT_CREDIT', 'FIXED_PLUS_TARGET_INCENTIVE', 'STANDARD_FIXED', 'WORKTRACK_PLUS_INCENTIVE'],
    required: true
  },
  grossMonthly: {
    type: Number,
    required: true
  },
  ctcMonthly: {
    type: Number,
    required: true
  },
  ctcAnnual: {
    type: Number,
    required: true
  },
  components: [{
    code: {
      type: String,
      required: true
    },
    name: {
      type: String,
      required: true
    },
    type: {
      type: String,
      enum: ['FIXED', 'VARIABLE', 'STATUTORY'],
      required: true
    },
    periodicity: {
      type: String,
      enum: ['MONTHLY', 'QUARTERLY', 'ADHOC'],
      default: 'MONTHLY'
    },
    monthly: {
      type: Number,
      default: 0
    },
    annual: {
      type: Number,
      default: 0
    },
    calcRuleRef: {
      type: String,
      trim: true
    }
  }],
  statutory: {
    epfEnabled: {
      type: Boolean,
      default: true
    },
    esiEligible: {
      type: Boolean,
      default: false
    },
    ptState: {
      type: String,
      trim: true
    },
    tdsMonthly: {
      type: Number,
      default: 0
    }
  },
  incentivePolicyRef: {
    type: String,
    trim: true
  },
  effectiveDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date
  },
  status: {
    type: String,
    enum: ['ACTIVE', 'INACTIVE', 'HISTORICAL'],
    default: 'ACTIVE'
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes
compensationProfileSchema.index({ employeeId: 1, status: 1 });
compensationProfileSchema.index({ salarySystem: 1 });
compensationProfileSchema.index({ effectiveDate: 1 });

module.exports = mongoose.model('CompensationProfile', compensationProfileSchema);
