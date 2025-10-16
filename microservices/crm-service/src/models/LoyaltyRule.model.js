const mongoose = require('mongoose');

const loyaltyRuleSchema = new mongoose.Schema({
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
  earn: {
    base_per_100: {
      inhouse: { type: Number, default: 1.0, min: 0 },
      international: { type: Number, default: 0.5, min: 0 }
    },
    exclusions: {
      categories: [{ type: String, trim: true }],
      brands: [{ type: String, trim: true }],
      skus: [{ type: String, trim: true }]
    },
    invoice_point_cap: { type: Number, default: 5000, min: 0 }
  },
  tier_bonus: {
    Silver: { type: Number, default: 0.0, min: 0 },
    Gold: { type: Number, default: 0.25, min: 0 },
    Platinum: { type: Number, default: 0.50, min: 0 }
  },
  burn: {
    point_value: { type: Number, default: 1, min: 0 },
    max_burn_pct: { type: Number, default: 0.20, min: 0, max: 1 },
    step: { type: Number, default: 100, min: 1 },
    exclusions: {
      categories: [{ type: String, trim: true }],
      brands: [{ type: String, trim: true }],
      skus: [{ type: String, trim: true }]
    }
  },
  expiry: {
    months: { type: Number, default: 12, min: 1 },
    fifo: { type: Boolean, default: true }
  },
  referral: {
    min_first_purchase: { type: Number, default: 2000, min: 0 },
    referrer_bonus: { type: Number, default: 500, min: 0 },
    referee_bonus: { type: Number, default: 250, min: 0 }
  },
  family_pooling: { type: Boolean, default: true },
  effective_from: { type: Date, required: true },
  effective_to: { type: Date },
  is_active: { type: Boolean, default: true },
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});

// rule_id index is already defined in schema with unique: true
loyaltyRuleSchema.index({ is_active: 1 });
loyaltyRuleSchema.index({ effective_from: 1 });
loyaltyRuleSchema.index({ effective_to: 1 });

const LoyaltyRule = mongoose.model('LoyaltyRule', loyaltyRuleSchema);

module.exports = LoyaltyRule;
