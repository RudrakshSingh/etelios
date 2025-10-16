const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
  coupon_id: {
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
  type: {
    type: String,
    required: true,
    enum: ['PERCENT', 'AMOUNT', 'FREE_ITEM', 'BOGO_BY_CODE', 'YOPO_BY_CODE', 'SHIPPING_OFF'],
    default: 'PERCENT'
  },
  percent_off: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  amount_off: {
    type: Number,
    min: 0,
    default: 0
  },
  free_item_sku: {
    type: String,
    trim: true
  },
  bogo: {
    x: { type: Number, min: 1 },
    y: { type: Number, min: 1 },
    reward: { 
      type: String, 
      enum: ['FREE', 'PERCENTAGE_OFF', 'FIXED_PRICE'],
      default: 'FREE'
    },
    value: { type: Number, min: 0 }
  },
  yopo: {
    group_size: { type: Number, min: 2 },
    payable: { 
      type: String, 
      enum: ['HIGHEST', 'LOWEST'],
      default: 'HIGHEST'
    }
  },
  max_discount_value: {
    type: Number,
    min: 0,
    default: 0
  },
  target: {
    products: [{ type: String, trim: true }],
    categories: [{ type: String, trim: true }],
    collections: [{ type: String, trim: true }],
    exclude_products: [{ type: String, trim: true }],
    customer_segments: [{ type: String, trim: true }],
    subscription_plans: [{ type: String, trim: true }],
    first_order_only: { type: Boolean, default: false },
    min_cart_value: { type: Number, min: 0, default: 0 },
    min_qty: { type: Number, min: 1, default: 1 },
    payment_methods: [{ type: String, trim: true }],
    channels: [{ 
      type: String, 
      enum: ['ECOM', 'POS', 'TELE', 'MOBILE'],
      default: ['ECOM', 'POS']
    }],
    stores: [{ type: String, trim: true }],
    cities: [{ type: String, trim: true }],
    states: [{ type: String, trim: true }],
    weekdays: [{ type: Number, min: 1, max: 7 }],
    hours_local: {
      start: { type: String, match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/ },
      end: { type: String, match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/ }
    }
  },
  stacking: {
    is_stackable: { type: Boolean, default: false },
    stack_with_loyalty: { type: Boolean, default: false },
    stack_with_wallet: { type: Boolean, default: true },
    exclude_coupon_ids: [{ type: String, trim: true }]
  },
  limits: {
    global_redemption_limit: { type: Number, min: 0, default: 0 },
    per_customer_limit_total: { type: Number, min: 0, default: 0 },
    per_customer_limit_daily: { type: Number, min: 0, default: 0 },
    per_store_daily_cap: { type: Number, min: 0, default: 0 }
  },
  validity: {
    starts_at: { type: Date, required: true },
    ends_at: { type: Date, required: true }
  },
  status: {
    type: String,
    enum: ['DRAFT', 'ACTIVE', 'PAUSED', 'EXPIRED', 'ARCHIVED'],
    default: 'DRAFT'
  },
  audit: [{
    action: { type: String, required: true },
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    timestamp: { type: Date, default: Date.now },
    changes: { type: mongoose.Schema.Types.Mixed },
    reason: { type: String }
  }],
  metadata: {
    campaign: { type: String, trim: true },
    description: { type: String, trim: true },
    tags: [{ type: String, trim: true }],
    priority: { type: Number, default: 0 },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approved_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approved_at: { type: Date }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
couponSchema.index({ status: 1 });
couponSchema.index({ 'validity.starts_at': 1, 'validity.ends_at': 1 });
couponSchema.index({ 'target.channels': 1 });
couponSchema.index({ 'target.stores': 1 });
couponSchema.index({ 'metadata.campaign': 1 });
couponSchema.index({ created_at: -1 });

// Virtual for active status
couponSchema.virtual('is_active').get(function() {
  const now = new Date();
  return this.status === 'ACTIVE' && 
         this.validity.starts_at <= now && 
         this.validity.ends_at >= now;
});

// Virtual for remaining redemptions
couponSchema.virtual('remaining_redemptions').get(function() {
  if (this.limits.global_redemption_limit === 0) return -1; // Unlimited
  // This would need to be calculated from actual redemptions
  return this.limits.global_redemption_limit;
});

// Pre-save middleware
couponSchema.pre('save', function(next) {
  // Auto-expire if past end date
  if (this.status === 'ACTIVE' && this.validity.ends_at < new Date()) {
    this.status = 'EXPIRED';
  }
  
  // Validate dates
  if (this.validity.starts_at >= this.validity.ends_at) {
    return next(new Error('Start date must be before end date'));
  }
  
  // Validate BOGO parameters
  if (this.type === 'BOGO_BY_CODE' && this.bogo) {
    if (this.bogo.x <= this.bogo.y) {
      return next(new Error('BOGO: X must be greater than Y'));
    }
  }
  
  next();
});

// Methods
couponSchema.methods.addAuditEntry = function(action, userId, changes, reason) {
  this.audit.push({
    action,
    user_id: userId,
    timestamp: new Date(),
    changes,
    reason
  });
  return this.save();
};

couponSchema.methods.canStackWith = function(otherCouponId) {
  if (!this.stacking.is_stackable) return false;
  if (this.stacking.exclude_coupon_ids.includes(otherCouponId)) return false;
  return true;
};

couponSchema.methods.isValidForChannel = function(channel) {
  return this.target.channels.includes(channel);
};

couponSchema.methods.isValidForStore = function(storeId) {
  if (this.target.stores.length === 0) return true;
  return this.target.stores.includes(storeId);
};

couponSchema.methods.isValidForTime = function(date = new Date()) {
  const now = new Date();
  const dayOfWeek = now.getDay() + 1; // Convert to 1-7 format
  const timeStr = now.toTimeString().slice(0, 5); // HH:MM format
  
  // Check date range
  if (date < this.validity.starts_at || date > this.validity.ends_at) {
    return false;
  }
  
  // Check weekdays
  if (this.target.weekdays.length > 0 && !this.target.weekdays.includes(dayOfWeek)) {
    return false;
  }
  
  // Check time window
  if (this.target.hours_local.start && this.target.hours_local.end) {
    if (timeStr < this.target.hours_local.start || timeStr > this.target.hours_local.end) {
      return false;
    }
  }
  
  return true;
};

module.exports = mongoose.model('Coupon', couponSchema);
