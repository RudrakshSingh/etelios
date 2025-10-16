const mongoose = require('mongoose');

// Base schema for all incentive rules
const baseRuleSchema = new mongoose.Schema({
  rule_id: {
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
    enum: ['MONTHLY_SLAB', 'QUARTERLY_EVAL', 'DAILY_TARGET', 'PRODUCT', 'TELESALES', 'SPIN_WHEEL', 'REFERRAL', 'MYSTERY_PRODUCT', 'TEAM_BATTLE', 'LEVEL_POLICY'],
    required: true
  },
  effective_from: {
    type: Date,
    required: true
  },
  effective_to: {
    type: Date
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
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});

// Monthly Slab Rule
const monthlySlabRuleSchema = new mongoose.Schema({
  ...baseRuleSchema.obj,
  currency: {
    type: String,
    default: 'INR'
  },
  slabs: [{
    min_sales: { type: Number, required: true },
    max_sales: { type: Number },
    base_salary_adj: { type: Number, default: 0 },
    incentive_amount: { type: Number, required: true }
  }],
  under_performance_deduction: {
    threshold: { type: Number },
    amount_or_pct: { type: Number },
    is_percentage: { type: Boolean, default: false }
  },
  carryover_policy: {
    window_months: { type: Number, default: 3 },
    notes: { type: String }
  }
});

// Quarterly Evaluation Rule
const quarterlyEvalRuleSchema = new mongoose.Schema({
  ...baseRuleSchema.obj,
  eval_window_months: {
    type: Number,
    default: 3
  },
  non_performance_threshold: {
    min_sales: { type: Number, required: true },
    months_required: { type: Number, required: true }
  },
  consequence: {
    type: String,
    enum: ['BASE_ONLY', 'PIP', 'NOTICE'],
    required: true
  },
  recovery_policy: {
    apply_deductions: { type: Boolean, default: true }
  }
});

// Daily Target Rule
const dailyTargetRuleSchema = new mongoose.Schema({
  ...baseRuleSchema.obj,
  scope: {
    type: String,
    enum: ['STORE', 'USER'],
    required: true
  },
  target_type: {
    type: String,
    enum: ['CUSTOMER_COUNT', 'REVENUE', 'PRODUCT_UNITS'],
    required: true
  },
  store_type_overrides: [{
    store_type: {
      type: String,
      enum: ['CHAMPION', 'LEARNING', 'STANDARD'],
      required: true
    },
    tiers: [{
      min: { type: Number, required: true },
      max: { type: Number },
      reward: { type: Number, required: true }
    }]
  }],
  global_min_valid_bills_per_user_per_day: {
    type: Number,
    default: 2
  }
});

// Product Incentive Rule
const productIncentiveRuleSchema = new mongoose.Schema({
  ...baseRuleSchema.obj,
  lines: [{
    sku: { type: String },
    brand: { type: String },
    category: { type: String },
    reward_type: {
      type: String,
      enum: ['FLAT', 'PCT'],
      required: true
    },
    reward_value: { type: Number, required: true },
    caps: {
      per_day: { type: Number },
      per_month: { type: Number }
    }
  }],
  scope: {
    type: String,
    enum: ['STORE', 'REGION', 'GLOBAL'],
    required: true
  }
});

// Tele-sales Rule
const teleSalesRuleSchema = new mongoose.Schema({
  ...baseRuleSchema.obj,
  dial_target_per_day: { type: Number, required: true },
  dial_reward: { type: Number, required: true },
  booking_reward: { type: Number, required: true },
  monthly_booking_bonus: [{
    threshold: { type: Number, required: true },
    bonus_amount: { type: Number, required: true }
  }],
  quality_score_weight: {
    type: Number,
    min: 0,
    max: 1,
    default: 0.2
  }
});

// Spin Wheel Rule
const spinWheelRuleSchema = new mongoose.Schema({
  ...baseRuleSchema.obj,
  unlock_condition: {
    type: String,
    enum: ['DAILY_TARGET_MET', 'MONTHLY_TARGET_EXCEEDED', 'MYSTERY_UNLOCK'],
    required: true
  },
  rewards: [{
    label: { type: String, required: true },
    type: {
      type: String,
      enum: ['CASH', 'POINTS', 'LEAVE', 'VOUCHER'],
      required: true
    },
    value: { type: Number, required: true },
    probability: { type: Number, min: 0, max: 1, required: true }
  }],
  daily_spin_cap: { type: Number, default: 1 },
  monthly_spin_cap: { type: Number, default: 4 }
});

// Referral Rule
const referralRuleSchema = new mongoose.Schema({
  ...baseRuleSchema.obj,
  vesting_months: {
    type: Number,
    default: 6
  },
  bonus_for_referrer: { type: Number, required: true },
  bonus_tiers: [{
    level: {
      type: String,
      enum: ['A', 'B', 'C'],
      required: true
    },
    bonus: { type: Number, required: true }
  }],
  eligibility: {
    referred_role: { type: String },
    min_tenure_days: { type: Number, default: 180 }
  }
});

// Mystery Product Rule
const mysteryProductRuleSchema = new mongoose.Schema({
  ...baseRuleSchema.obj,
  reveal_to: {
    type: String,
    enum: ['MANAGERS_ONLY'],
    default: 'MANAGERS_ONLY'
  },
  rotation: {
    type: String,
    enum: ['WEEKLY'],
    default: 'WEEKLY'
  },
  selection: {
    type: String,
    enum: ['MANUAL', 'AUTO'],
    required: true
  },
  current_week: {
    sku: { type: String, required: true },
    reward_type: {
      type: String,
      enum: ['FLAT', 'PCT'],
      required: true
    },
    reward_value: { type: Number, required: true }
  }
});

// Team Battle Rule
const teamBattleRuleSchema = new mongoose.Schema({
  ...baseRuleSchema.obj,
  period: {
    type: String,
    enum: ['WEEKLY', 'MONTHLY'],
    required: true
  },
  metric: {
    type: String,
    enum: ['CUSTOMER_COUNT', 'REVENUE', 'PRODUCT_UNITS'],
    required: true
  },
  eligibility: {
    stores: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Store' }],
    regions: [{ type: String }]
  },
  prize_pool: {
    type: {
      type: String,
      enum: ['CASH', 'BUDGET', 'VOUCHER'],
      required: true
    },
    value: { type: Number, required: true },
    split: {
      type: String,
      enum: ['WINNER_TAKES_ALL', 'TOP3'],
      required: true
    }
  },
  tie_breaker: {
    type: String,
    enum: ['CONVERSION_RATE', 'AOV'],
    default: 'CONVERSION_RATE'
  }
});

// Level Policy
const levelPolicySchema = new mongoose.Schema({
  ...baseRuleSchema.obj,
  cohorts: [{
    level: {
      type: String,
      enum: ['A', 'B', 'C'],
      required: true
    },
    promote_if: {
      months: { type: Number, required: true },
      percentile_top: { type: Number, required: true },
      min_avg_target_hit_pct: { type: Number, required: true }
    },
    demote_if: {
      months: { type: Number },
      below_percentile: { type: Number },
      min_avg_target_hit_pct: { type: Number }
    }
  }]
});

// Create models
const MonthlySlabRule = mongoose.model('MonthlySlabRule', monthlySlabRuleSchema);
const QuarterlyEvalRule = mongoose.model('QuarterlyEvalRule', quarterlyEvalRuleSchema);
const DailyTargetRule = mongoose.model('DailyTargetRule', dailyTargetRuleSchema);
const ProductIncentiveRule = mongoose.model('ProductIncentiveRule', productIncentiveRuleSchema);
const TeleSalesRule = mongoose.model('TeleSalesRule', teleSalesRuleSchema);
const SpinWheelRule = mongoose.model('SpinWheelRule', spinWheelRuleSchema);
const ReferralRule = mongoose.model('ReferralRule', referralRuleSchema);
const MysteryProductRule = mongoose.model('MysteryProductRule', mysteryProductRuleSchema);
const TeamBattleRule = mongoose.model('TeamBattleRule', teamBattleRuleSchema);
const LevelPolicy = mongoose.model('LevelPolicy', levelPolicySchema);

module.exports = {
  MonthlySlabRule,
  QuarterlyEvalRule,
  DailyTargetRule,
  ProductIncentiveRule,
  TeleSalesRule,
  SpinWheelRule,
  ReferralRule,
  MysteryProductRule,
  TeamBattleRule,
  LevelPolicy
};
