const mongoose = require('mongoose');

const inventoryBatchSchema = new mongoose.Schema({
  batchNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ProductMaster',
    required: true
  },
  storeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store',
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 0
  },
  receivedQuantity: {
    type: Number,
    default: 0,
    min: 0
  },
  soldQuantity: {
    type: Number,
    default: 0,
    min: 0
  },
  returnedQuantity: {
    type: Number,
    default: 0,
    min: 0
  },
  damagedQuantity: {
    type: Number,
    default: 0,
    min: 0
  },
  expiryDate: {
    type: Date,
    required: true
  },
  manufacturingDate: {
    type: Date,
    required: true
  },
  costPrice: {
    type: Number,
    required: true,
    min: 0
  },
  sellingPrice: {
    type: Number,
    required: true,
    min: 0
  },
  mrp: {
    type: Number,
    required: true,
    min: 0
  },
  supplier: {
    type: String,
    required: true,
    trim: true
  },
  invoiceNumber: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['active', 'expired', 'damaged', 'sold_out'],
    default: 'active'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  notes: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Indexes for better query performance
inventoryBatchSchema.index({ batchNumber: 1 });
inventoryBatchSchema.index({ productId: 1 });
inventoryBatchSchema.index({ storeId: 1 });
inventoryBatchSchema.index({ expiryDate: 1 });
inventoryBatchSchema.index({ status: 1 });
inventoryBatchSchema.index({ isActive: 1 });

// Virtual for available quantity
inventoryBatchSchema.virtual('availableQuantity').get(function() {
  return this.quantity - this.soldQuantity - this.returnedQuantity - this.damagedQuantity;
});

// Virtual for days to expiry
inventoryBatchSchema.virtual('daysToExpiry').get(function() {
  const today = new Date();
  const expiry = new Date(this.expiryDate);
  const diffTime = expiry - today;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Pre-save middleware to validate quantities
inventoryBatchSchema.pre('save', function(next) {
  if (this.soldQuantity + this.returnedQuantity + this.damagedQuantity > this.quantity) {
    return next(new Error('Total sold, returned, and damaged quantity cannot exceed batch quantity'));
  }
  next();
});

// Method to check if batch is expired
inventoryBatchSchema.methods.isExpired = function() {
  return new Date() > this.expiryDate;
};

// Method to check if batch is near expiry (within 30 days)
inventoryBatchSchema.methods.isNearExpiry = function() {
  const today = new Date();
  const thirtyDaysFromNow = new Date(today.getTime() + (30 * 24 * 60 * 60 * 1000));
  return this.expiryDate <= thirtyDaysFromNow && this.expiryDate > today;
};

module.exports = mongoose.model('InventoryBatch', inventoryBatchSchema);
