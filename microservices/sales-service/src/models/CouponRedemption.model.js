const mongoose = require('mongoose');

const couponRedemptionSchema = new mongoose.Schema({
  redemption_id: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  coupon_id: {
    type: String,
    required: true,
    ref: 'Coupon',
    index: true
  },
  code_id: {
    type: String,
    required: true,
    ref: 'CouponCode',
    index: true
  },
  code: {
    type: String,
    required: true,
    trim: true,
    uppercase: true,
    index: true
  },
  customer_id: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'Customer',
    index: true
  },
  store_id: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  channel: {
    type: String,
    required: true,
    enum: ['ECOM', 'POS', 'TELE', 'MOBILE'],
    index: true
  },
  order_id: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  pre_discount_amount: {
    type: Number,
    required: true,
    min: 0
  },
  discount_amount: {
    type: Number,
    required: true,
    min: 0
  },
  discounted_items: [{
    sku: { type: String, required: true, trim: true },
    qty: { type: Number, required: true, min: 1 },
    original_price: { type: Number, required: true, min: 0 },
    discounted_price: { type: Number, required: true, min: 0 },
    discount_applied: { type: Number, required: true, min: 0 },
    category: { type: String, trim: true },
    product_collection: { type: String, trim: true }
  }],
  loyalty_burn_applied: {
    type: Boolean,
    default: false
  },
  loyalty_points_used: {
    type: Number,
    default: 0,
    min: 0
  },
  wallet_applied: {
    type: Boolean,
    default: false
  },
  wallet_amount_used: {
    type: Number,
    default: 0,
    min: 0
  },
  status: {
    type: String,
    enum: ['ACTIVE', 'CANCELLED', 'REFUNDED', 'VOIDED'],
    default: 'ACTIVE',
    index: true
  },
  refund_details: {
    refund_id: { type: String, trim: true },
    refund_amount: { type: Number, min: 0 },
    refund_date: { type: Date },
    refund_reason: { type: String, trim: true }
  },
  context: {
    ip_address: { type: String, trim: true },
    user_agent: { type: String, trim: true },
    device_id: { type: String, trim: true },
    session_id: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    payment_method: { type: String, trim: true },
    time_of_day: { type: String, trim: true }
  },
  audit: [{
    action: { type: String, required: true },
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    timestamp: { type: Date, default: Date.now },
    details: { type: mongoose.Schema.Types.Mixed }
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
couponRedemptionSchema.index({ customer_id: 1, created_at: -1 });
couponRedemptionSchema.index({ store_id: 1, created_at: -1 });
couponRedemptionSchema.index({ channel: 1, created_at: -1 });
couponRedemptionSchema.index({ status: 1, created_at: -1 });
couponRedemptionSchema.index({ created_at: -1 });

// Virtual for net discount
couponRedemptionSchema.virtual('net_discount').get(function() {
  return this.discount_amount - (this.loyalty_points_used || 0) - (this.wallet_amount_used || 0);
});

// Virtual for savings percentage
couponRedemptionSchema.virtual('savings_percentage').get(function() {
  if (this.pre_discount_amount === 0) return 0;
  return ((this.discount_amount / this.pre_discount_amount) * 100).toFixed(2);
});

// Pre-save middleware
couponRedemptionSchema.pre('save', function(next) {
  // Validate discount amount
  if (this.discount_amount > this.pre_discount_amount) {
    return next(new Error('Discount amount cannot exceed pre-discount amount'));
  }
  
  // Validate refund amount
  if (this.refund_details.refund_amount > this.discount_amount) {
    return next(new Error('Refund amount cannot exceed discount amount'));
  }
  
  next();
});

// Methods
couponRedemptionSchema.methods.cancel = function(userId, reason) {
  this.status = 'CANCELLED';
  this.addAuditEntry('CANCELLED', userId, { reason });
  return this.save();
};

couponRedemptionSchema.methods.refund = function(refundId, refundAmount, reason, userId) {
  this.status = 'REFUNDED';
  this.refund_details = {
    refund_id: refundId,
    refund_amount: refundAmount,
    refund_date: new Date(),
    refund_reason: reason
  };
  this.addAuditEntry('REFUNDED', userId, { 
    refund_id: refundId, 
    refund_amount: refundAmount, 
    reason 
  });
  return this.save();
};

couponRedemptionSchema.methods.void = function(userId, reason) {
  this.status = 'VOIDED';
  this.addAuditEntry('VOIDED', userId, { reason });
  return this.save();
};

couponRedemptionSchema.methods.addAuditEntry = function(action, userId, details) {
  this.audit.push({
    action,
    user_id: userId,
    timestamp: new Date(),
    details
  });
  return this.save();
};

// Static methods
couponRedemptionSchema.statics.getRedemptionStats = function(filters = {}) {
  const pipeline = [
    { $match: filters },
    {
      $group: {
        _id: null,
        total_redemptions: { $sum: 1 },
        total_discount_amount: { $sum: '$discount_amount' },
        total_pre_discount_amount: { $sum: '$pre_discount_amount' },
        avg_discount_percentage: {
          $avg: {
            $multiply: [
              { $divide: ['$discount_amount', '$pre_discount_amount'] },
              100
            ]
          }
        }
      }
    }
  ];
  
  return this.aggregate(pipeline);
};

couponRedemptionSchema.statics.getRedemptionsByCoupon = function(couponId, dateRange = {}) {
  const match = { coupon_id: couponId };
  
  if (dateRange.start) match.created_at = { $gte: dateRange.start };
  if (dateRange.end) match.created_at = { ...match.created_at, $lte: dateRange.end };
  
  return this.find(match).sort({ created_at: -1 });
};

couponRedemptionSchema.statics.getCustomerRedemptions = function(customerId, limit = 10) {
  return this.find({ customer_id: customerId })
    .sort({ created_at: -1 })
    .limit(limit);
};

couponRedemptionSchema.statics.getStoreRedemptions = function(storeId, dateRange = {}) {
  const match = { store_id: storeId };
  
  if (dateRange.start) match.created_at = { $gte: dateRange.start };
  if (dateRange.end) match.created_at = { ...match.created_at, $lte: dateRange.end };
  
  return this.find(match).sort({ created_at: -1 });
};

module.exports = mongoose.model('CouponRedemption', couponRedemptionSchema);
