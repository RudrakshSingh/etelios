const mongoose = require('mongoose');

const productMasterSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  sku: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  category: {
    type: String,
    trim: true
  },
  subcategory: {
    type: String,
    trim: true
  },
  brand: {
    type: String,
    trim: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  cost: {
    type: Number,
    min: 0
  },
  description: {
    type: String,
    trim: true
  },
  specifications: {
    type: Map,
    of: String
  },
  images: [{
    url: String,
    alt: String,
    isPrimary: { type: Boolean, default: false }
  }],
  status: {
    type: String,
    enum: ['active', 'inactive', 'discontinued'],
    default: 'active'
  },
  tags: [{
    type: String,
    trim: true
  }],
  weight: {
    type: Number,
    min: 0
  },
  dimensions: {
    length: Number,
    width: Number,
    height: Number,
    unit: { type: String, default: 'cm' }
  },
  supplier: {
    type: String,
    trim: true
  },
  hsnCode: {
    type: String,
    trim: true
  },
  gstRate: {
    type: Number,
    min: 0,
    max: 100
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes for better query performance
productMasterSchema.index({ name: 1 });
productMasterSchema.index({ sku: 1 });
productMasterSchema.index({ category: 1 });
productMasterSchema.index({ brand: 1 });
productMasterSchema.index({ status: 1 });
productMasterSchema.index({ isActive: 1 });

module.exports = mongoose.model('ProductMaster', productMasterSchema);