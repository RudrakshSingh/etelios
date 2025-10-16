const mongoose = require('mongoose');

const loyaltyTxnSchema = new mongoose.Schema({
  txn_id: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true
  },
  customer_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true
  },
  order_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SalesOrder'
  },
  points: {
    type: Number,
    required: true
  },
  reason: {
    type: String,
    enum: ['earn', 'burn', 'expiry', 'manual', 'reversal', 'referral'],
    required: true
  },
  expires_at: {
    type: Date
  },
  balance_after: {
    type: Number,
    required: true,
    min: 0
  },
  meta: {
    tier_bonus: { type: Number, default: 0 },
    base_points: { type: Number, default: 0 },
    invoice_amount: { type: Number, default: 0 },
    burn_percentage: { type: Number, default: 0 },
    referral_customer_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
    manual_reason: { type: String, trim: true },
    approved_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  created_at: { type: Date, default: Date.now }
});

loyaltyTxnSchema.index({ customer_id: 1 });
loyaltyTxnSchema.index({ order_id: 1 });
loyaltyTxnSchema.index({ reason: 1 });
loyaltyTxnSchema.index({ expires_at: 1 });
loyaltyTxnSchema.index({ created_at: 1 });

const LoyaltyTxn = mongoose.model('LoyaltyTxn', loyaltyTxnSchema);

module.exports = LoyaltyTxn;
