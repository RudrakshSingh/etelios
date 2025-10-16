const mongoose = require('mongoose');

// Daily Performance Schema
const dailyPerformanceSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true
  },
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  store_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store',
    required: true
  },
  customer_count: {
    type: Number,
    default: 0
  },
  paid_bills_count: {
    type: Number,
    default: 0
  },
  revenue_pre_tax: {
    type: Number,
    default: 0
  },
  items_sold: {
    type: Number,
    default: 0
  },
  sku_counts: {
    type: Map,
    of: Number,
    default: {}
  },
  product_revenue: {
    type: Map,
    of: Number,
    default: {}
  },
  tele: {
    dials: { type: Number, default: 0 },
    connected: { type: Number, default: 0 },
    bookings: { type: Number, default: 0 },
    qa_score: { type: Number, min: 0, max: 100, default: 0 }
  },
  computed: {
    daily_rewards_total: { type: Number, default: 0 },
    eligible_for_spin: { type: Boolean, default: false }
  },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});

// Monthly Performance Schema
const monthlyPerformanceSchema = new mongoose.Schema({
  yyyymm: {
    type: String,
    required: true,
    match: /^\d{4}-\d{2}$/
  },
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  store_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store',
    required: true
  },
  total_revenue_pre_tax: {
    type: Number,
    default: 0
  },
  total_customer_count: {
    type: Number,
    default: 0
  },
  product_units: {
    type: Map,
    of: Number,
    default: {}
  },
  slabs_applied: [{
    rule_id: { type: String, required: true },
    slab_index: { type: Number, required: true },
    incentive_amount: { type: Number, required: true }
  }],
  monthly_rewards_total: {
    type: Number,
    default: 0
  },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});

// Incentive Payout Schema
const incentivePayoutSchema = new mongoose.Schema({
  payout_id: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true
  },
  period: {
    type: String,
    enum: ['DAILY', 'MONTHLY', 'QUARTERLY'],
    required: true
  },
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  store_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store',
    required: true
  },
  rule_refs: [{
    type: String,
    required: true
  }],
  amount: {
    type: Number,
    required: true
  },
  breakdown: [{
    rule_id: { type: String, required: true },
    type: {
      type: String,
      enum: ['SLAB', 'DAILY_CUSTOMER', 'PRODUCT', 'TELE', 'SPIN', 'BATTLE', 'ADJUSTMENT'],
      required: true
    },
    amount: { type: Number, required: true },
    notes: { type: String }
  }],
  status: {
    type: String,
    enum: ['DUE', 'APPROVED', 'PAID', 'ON_HOLD'],
    default: 'DUE'
  },
  export_ref: { type: String },
  created_at: { type: Date, default: Date.now },
  approved_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  paid_at: { type: Date }
});

// Spin Wheel Spin Schema
const spinWheelSpinSchema = new mongoose.Schema({
  spin_id: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true
  },
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  unlocked_by: {
    type: String,
    enum: ['DAILY_TARGET', 'MONTHLY_TARGET', 'MANUAL'],
    required: true
  },
  result: {
    reward_type: {
      type: String,
      enum: ['CASH', 'POINTS', 'LEAVE', 'VOUCHER'],
      required: true
    },
    value: { type: Number, required: true },
    label: { type: String, required: true }
  },
  voided: {
    type: Boolean,
    default: false
  },
  created_at: { type: Date, default: Date.now }
});

// Referral Tracking Schema
const referralTrackingSchema = new mongoose.Schema({
  ref_id: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true
  },
  referrer_user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  referred_user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  referred_join_date: {
    type: Date,
    required: true
  },
  vest_maturity_date: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['PENDING', 'VESTED', 'REJECTED'],
    default: 'PENDING'
  },
  payout_amount: {
    type: Number,
    required: true
  },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});

// Battle Score Schema
const battleScoreSchema = new mongoose.Schema({
  battle_id: {
    type: String,
    required: true,
    trim: true,
    uppercase: true
  },
  rule_id: {
    type: String,
    required: true
  },
  period_start: {
    type: Date,
    required: true
  },
  period_end: {
    type: Date,
    required: true
  },
  entity_type: {
    type: String,
    enum: ['STORE', 'REGION'],
    required: true
  },
  entity_id: {
    type: String,
    required: true
  },
  metric_value: {
    type: Number,
    required: true
  },
  rank: {
    type: Number,
    required: true
  },
  prize_awarded: {
    type: Boolean,
    default: false
  },
  created_at: { type: Date, default: Date.now }
});

// Audit Log Schema
const auditLogSchema = new mongoose.Schema({
  actor_user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  action: {
    type: String,
    required: true
  },
  entity: {
    type: String,
    required: true
  },
  entity_id: {
    type: String,
    required: true
  },
  before: {
    type: mongoose.Schema.Types.Mixed
  },
  after: {
    type: mongoose.Schema.Types.Mixed
  },
  at: {
    type: Date,
    default: Date.now
  }
});

// Create indexes
// Indexes are defined in schema definitions above

// Indexes are defined in schema definitions above

// Create models
const DailyPerformance = mongoose.model('DailyPerformance', dailyPerformanceSchema);
const MonthlyPerformance = mongoose.model('MonthlyPerformance', monthlyPerformanceSchema);
const IncentivePayout = mongoose.model('IncentivePayout', incentivePayoutSchema);
const SpinWheelSpin = mongoose.model('SpinWheelSpin', spinWheelSpinSchema);
const ReferralTracking = mongoose.model('ReferralTracking', referralTrackingSchema);
const BattleScore = mongoose.model('BattleScore', battleScoreSchema);

module.exports = {
  DailyPerformance,
  MonthlyPerformance,
  IncentivePayout,
  SpinWheelSpin,
  ReferralTracking,
  BattleScore
};
