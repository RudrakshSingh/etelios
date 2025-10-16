const mongoose = require('mongoose');

const familySchema = new mongoose.Schema({
  family_id: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true
  },
  head_customer_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true
  },
  members: [{
    customer_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: true
    },
    relationship: {
      type: String,
      enum: ['self', 'spouse', 'parent', 'child', 'sibling', 'other'],
      default: 'self'
    },
    added_at: { type: Date, default: Date.now }
  }],
  shared_benefits: {
    loyalty_pool: { type: Boolean, default: true },
    wallet_pool: { type: Boolean, default: true }
  },
  is_active: { type: Boolean, default: true },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});

// family_id index is already defined in schema with unique: true
familySchema.index({ head_customer_id: 1 });
familySchema.index({ 'members.customer_id': 1 });

const Family = mongoose.model('Family', familySchema);

module.exports = Family;
