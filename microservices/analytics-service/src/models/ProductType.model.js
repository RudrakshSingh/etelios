const mongoose = require('mongoose');

const productTypeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  code: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  category: {
    type: String,
    required: true,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  metadata: {
    type: Map,
    of: String
  }
}, {
  timestamps: true
});

// Indexes for better query performance
productTypeSchema.index({ name: 1 });
productTypeSchema.index({ code: 1 });
productTypeSchema.index({ category: 1 });
productTypeSchema.index({ isActive: 1 });

module.exports = mongoose.model('ProductType', productTypeSchema);
