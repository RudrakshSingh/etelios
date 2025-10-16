const mongoose = require('mongoose');

const supplierSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  company_name: {
    type: String,
    trim: true
  },
  contact_email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  contact_phone: {
    type: String,
    required: true,
    trim: true
  },
  address: {
    street: String,
    city: String,
    state: String,
    pincode: String,
    country: {
      type: String,
      default: 'India'
    }
  },
  gst_number: {
    type: String,
    trim: true
  },
  pan_number: {
    type: String,
    trim: true
  },
  payment_terms: {
    type: String,
    enum: ['net_15', 'net_30', 'net_45', 'net_60', 'cash_on_delivery', 'advance_payment'],
    default: 'net_30'
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended'],
    default: 'active'
  },
  rating: {
    type: Number,
    min: 1,
    max: 5,
    default: 3
  },
  notes: {
    type: String,
    trim: true
  },
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes
supplierSchema.index({ name: 1 });
supplierSchema.index({ contact_email: 1 });
supplierSchema.index({ status: 1 });
supplierSchema.index({ created_at: -1 });

module.exports = mongoose.model('Supplier', supplierSchema);
