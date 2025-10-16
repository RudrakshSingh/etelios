const mongoose = require('mongoose');

const cppPolicySchema = new mongoose.Schema({
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
  validity_days: {
    type: Number,
    required: true,
    default: 365,
    min: 1,
    max: 1095 // Max 3 years
  },
  brand_rules: [{
    brand_type: {
      type: String,
      enum: ['inhouse', 'international'],
      required: true
    },
    divisor: {
      type: Number,
      required: true,
      min: 1.0,
      max: 10.0
    }
  }],
  lens_rule: {
    divisor: {
      type: Number,
      required: true,
      min: 1.0,
      max: 10.0,
      default: 1.75
    }
  },
  exclusions: [{
    type: String,
    enum: ['contact_lens', 'sunglasses', 'loss', 'theft', 'misuse', 'normal_wear']
  }],
  max_claims_per_line: {
    type: Number,
    required: true,
    default: 1,
    min: 1
  },
  rounding_mode: {
    type: String,
    enum: ['HALF_UP', 'HALF_DOWN', 'ROUND_UP', 'ROUND_DOWN'],
    default: 'HALF_UP'
  },
  terms_url: {
    type: String,
    trim: true
  },
  enrollment_fee: {
    type: Number,
    default: 0,
    min: 0
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
cppPolicySchema.index({ name: 1 });
cppPolicySchema.index({ is_active: 1 });

const CPPPolicy = mongoose.model('CPPPolicy', cppPolicySchema);

module.exports = CPPPolicy;
