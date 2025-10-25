const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema({
  productCode: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  productName: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    required: true
  },
  brand: {
    type: String,
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 0
  },
  unitPrice: {
    type: Number,
    required: true,
    min: 0
  },
  totalValue: {
    type: Number,
    required: true,
    min: 0
  },
  supplier: {
    type: String,
    required: true
  },
  expiryDate: {
    type: Date
  },
  batchNumber: {
    type: String
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'discontinued'],
    default: 'active'
  },
  location: {
    type: String,
    trim: true
  },
  notes: {
    type: String,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes for better query performance
inventorySchema.index({ productCode: 1 });
inventorySchema.index({ productName: 1 });
inventorySchema.index({ category: 1 });
inventorySchema.index({ brand: 1 });
inventorySchema.index({ status: 1 });
inventorySchema.index({ isActive: 1 });

// Virtual for stock value
inventorySchema.virtual('stockValue').get(function() {
  return this.quantity * this.unitPrice;
});

// Pre-save middleware to calculate total value
inventorySchema.pre('save', function(next) {
  this.totalValue = this.quantity * this.unitPrice;
  next();
});

module.exports = mongoose.model('Inventory', inventorySchema);