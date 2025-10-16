const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    required: true,
    unique: true
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  items: [{
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    variant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product.variants'
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    price: {
      type: Number,
      required: true,
      min: 0
    },
    discount: {
      type: Number,
      default: 0,
      min: 0
    },
    total: {
      type: Number,
      required: true,
      min: 0
    }
  }],
  pricing: {
    subtotal: {
      type: Number,
      required: true,
      min: 0
    },
    discount: {
      type: Number,
      default: 0,
      min: 0
    },
    tax: {
      type: Number,
      default: 0,
      min: 0
    },
    shipping: {
      type: Number,
      default: 0,
      min: 0
    },
    total: {
      type: Number,
      required: true,
      min: 0
    }
  },
  shipping: {
    address: {
      name: {
        type: String,
        required: true
      },
      street: {
        type: String,
        required: true
      },
      city: {
        type: String,
        required: true
      },
      state: {
        type: String,
        required: true
      },
      pincode: {
        type: String,
        required: true
      },
      country: {
        type: String,
        default: 'India'
      },
      phone: {
        type: String,
        required: true
      }
    },
    method: {
      type: String,
      enum: ['standard', 'express', 'overnight', 'pickup'],
      default: 'standard'
    },
    trackingNumber: String,
    carrier: String,
    estimatedDelivery: Date,
    actualDelivery: Date
  },
  billing: {
    address: {
      name: String,
      street: String,
      city: String,
      state: String,
      pincode: String,
      country: String,
      phone: String
    },
    sameAsShipping: {
      type: Boolean,
      default: true
    }
  },
  payment: {
    method: {
      type: String,
      enum: ['cod', 'online', 'wallet', 'emi'],
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded', 'partial_refund'],
      default: 'pending'
    },
    gateway: {
      type: String,
      enum: ['razorpay', 'payu', 'stripe', 'paypal']
    },
    transactionId: String,
    paymentId: String,
    paidAt: Date,
    refundedAt: Date,
    refundAmount: {
      type: Number,
      default: 0
    }
  },
  status: {
    type: String,
    enum: [
      'pending', 'confirmed', 'processing', 'shipped', 
      'delivered', 'cancelled', 'returned', 'refunded'
    ],
    default: 'pending'
  },
  notes: {
    customer: String,
    admin: String,
    internal: String
  },
  timeline: [{
    status: {
      type: String,
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    note: String,
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  store: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store'
  },
  source: {
    type: String,
    enum: ['website', 'mobile_app', 'pos', 'api', 'admin'],
    default: 'website'
  },
  coupon: {
    code: String,
    discount: Number,
    type: {
      type: String,
      enum: ['percentage', 'fixed']
    }
  },
  fulfillment: {
    warehouse: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Warehouse'
    },
    pickedAt: Date,
    packedAt: Date,
    shippedAt: Date,
    deliveredAt: Date
  },
  returns: [{
    reason: String,
    status: {
      type: String,
      enum: ['requested', 'approved', 'rejected', 'returned', 'refunded']
    },
    requestedAt: Date,
    approvedAt: Date,
    returnedAt: Date,
    refundedAt: Date,
    items: [{
      product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product'
      },
      quantity: Number,
      reason: String
    }]
  }],
  metadata: {
    userAgent: String,
    ipAddress: String,
    referrer: String,
    utmSource: String,
    utmMedium: String,
    utmCampaign: String
  }
}, {
  timestamps: true
});

// Indexes
orderSchema.index({ orderNumber: 1 });
orderSchema.index({ customer: 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ 'payment.status': 1 });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ store: 1 });

// Virtual for order total
orderSchema.virtual('totalAmount').get(function() {
  return this.pricing.total;
});

// Virtual for item count
orderSchema.virtual('itemCount').get(function() {
  return this.items.reduce((total, item) => total + item.quantity, 0);
});

// Pre-save middleware to generate order number
orderSchema.pre('save', async function(next) {
  if (this.isNew && !this.orderNumber) {
    const count = await this.constructor.countDocuments();
    this.orderNumber = `ORD-${Date.now()}-${(count + 1).toString().padStart(6, '0')}`;
  }
  next();
});

// Method to add timeline entry
orderSchema.methods.addTimelineEntry = function(status, note, updatedBy) {
  this.timeline.push({
    status,
    note,
    updatedBy,
    timestamp: new Date()
  });
  return this.save();
};

// Method to update status
orderSchema.methods.updateStatus = function(newStatus, note, updatedBy) {
  this.status = newStatus;
  this.addTimelineEntry(newStatus, note, updatedBy);
  return this.save();
};

// Method to calculate total
orderSchema.methods.calculateTotal = function() {
  const subtotal = this.items.reduce((total, item) => total + item.total, 0);
  this.pricing.subtotal = subtotal;
  this.pricing.total = subtotal + this.pricing.tax + this.pricing.shipping - this.pricing.discount;
  return this.pricing.total;
};

// Method to check if order can be cancelled
orderSchema.methods.canBeCancelled = function() {
  return ['pending', 'confirmed'].includes(this.status);
};

// Method to check if order can be returned
orderSchema.methods.canBeReturned = function() {
  return this.status === 'delivered' && 
         this.fulfillment.deliveredAt && 
         (Date.now() - this.fulfillment.deliveredAt) <= (7 * 24 * 60 * 60 * 1000); // 7 days
};

// Static method to find orders by customer
orderSchema.statics.findByCustomer = function(customerId, options = {}) {
  return this.find({ customer: customerId }, null, options);
};

// Static method to find orders by status
orderSchema.statics.findByStatus = function(status, options = {}) {
  return this.find({ status }, null, options);
};

// Static method to get order statistics
orderSchema.statics.getStatistics = function(startDate, endDate) {
  const match = {};
  if (startDate && endDate) {
    match.createdAt = { $gte: startDate, $lte: endDate };
  }
  
  return this.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        totalOrders: { $sum: 1 },
        totalRevenue: { $sum: '$pricing.total' },
        averageOrderValue: { $avg: '$pricing.total' }
      }
    }
  ]);
};

module.exports = mongoose.model('Order', orderSchema);
