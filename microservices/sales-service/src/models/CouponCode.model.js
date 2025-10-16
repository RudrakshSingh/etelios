const mongoose = require('mongoose');

const couponCodeSchema = new mongoose.Schema({
  code_id: {
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
  code: {
    type: String,
    required: true,
    trim: true,
    uppercase: true,
    index: true
  },
  distribution: {
    type: String,
    required: true,
    enum: ['GENERIC', 'UNIQUE', 'BULK'],
    default: 'GENERIC'
  },
  assigned_to_customer_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    index: true
  },
  batch_id: {
    type: String,
    trim: true,
    index: true
  },
  status: {
    type: String,
    enum: ['ISSUED', 'REDEEMED', 'REVOKED', 'EXPIRED'],
    default: 'ISSUED',
    index: true
  },
  usage_count: {
    type: Number,
    default: 0,
    min: 0
  },
  max_usage: {
    type: Number,
    default: 1,
    min: 1
  },
  metadata: {
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    distribution_channel: { type: String, trim: true },
    campaign_id: { type: String, trim: true },
    expires_at: { type: Date },
    notes: { type: String, trim: true }
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
couponCodeSchema.index({ code: 1, status: 1 });
couponCodeSchema.index({ coupon_id: 1, status: 1 });
couponCodeSchema.index({ assigned_to_customer_id: 1, status: 1 });
couponCodeSchema.index({ created_at: -1 });

// Virtual for availability
couponCodeSchema.virtual('is_available').get(function() {
  return this.status === 'ISSUED' && 
         this.usage_count < this.max_usage &&
         (!this.metadata.expires_at || this.metadata.expires_at > new Date());
});

// Virtual for remaining usage
couponCodeSchema.virtual('remaining_usage').get(function() {
  return Math.max(0, this.max_usage - this.usage_count);
});

// Pre-save middleware
couponCodeSchema.pre('save', function(next) {
  // Auto-expire if past expiry date
  if (this.status === 'ISSUED' && 
      this.metadata.expires_at && 
      this.metadata.expires_at < new Date()) {
    this.status = 'EXPIRED';
  }
  
  // Validate usage limits
  if (this.usage_count > this.max_usage) {
    return next(new Error('Usage count cannot exceed max usage'));
  }
  
  next();
});

// Methods
couponCodeSchema.methods.canBeUsed = function() {
  return this.is_available;
};

couponCodeSchema.methods.incrementUsage = function() {
  this.usage_count += 1;
  if (this.usage_count >= this.max_usage) {
    this.status = 'REDEEMED';
  }
  return this.save();
};

couponCodeSchema.methods.revoke = function(userId, reason) {
  this.status = 'REVOKED';
  this.addAuditEntry('REVOKED', userId, { reason });
  return this.save();
};

couponCodeSchema.methods.addAuditEntry = function(action, userId, details) {
  this.audit.push({
    action,
    user_id: userId,
    timestamp: new Date(),
    details
  });
  return this.save();
};

// Static methods
couponCodeSchema.statics.generateCode = function(length = 8, prefix = '') {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = prefix;
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

couponCodeSchema.statics.generateBulkCodes = function(couponId, count, options = {}) {
  const { prefix = '', length = 8, distribution = 'BULK', batchId } = options;
  const codes = [];
  
  for (let i = 0; i < count; i++) {
    const code = this.generateCode(length, prefix);
    codes.push({
      code_id: `CODE-${Date.now()}-${i}`,
      coupon_id: couponId,
      code,
      distribution,
      batch_id: batchId || `BATCH-${Date.now()}`,
      status: 'ISSUED'
    });
  }
  
  return codes;
};

couponCodeSchema.statics.findAvailableCode = function(couponId, customerId = null) {
  const query = {
    coupon_id: couponId,
    status: 'ISSUED',
    usage_count: { $lt: '$max_usage' }
  };
  
  if (customerId) {
    query.$or = [
      { assigned_to_customer_id: customerId },
      { distribution: 'GENERIC' }
    ];
  } else {
    query.distribution = 'GENERIC';
  }
  
  return this.findOne(query);
};

module.exports = mongoose.model('CouponCode', couponCodeSchema);
