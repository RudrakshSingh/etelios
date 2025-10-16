const mongoose = require('mongoose');

const vendorSchema = new mongoose.Schema({
  vendor_id: {
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
  gstin: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  pan: {
    type: String,
    required: true,
    trim: true
  },
  contact: {
    name: {
      type: String,
      required: true,
      trim: true
    },
    phone: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      trim: true
    }
  },
  address: {
    street: {
      type: String,
      required: true,
      trim: true
    },
    city: {
      type: String,
      required: true,
      trim: true
    },
    state: {
      type: String,
      required: true,
      trim: true
    },
    pincode: {
      type: String,
      required: true,
      trim: true
    },
    country: {
      type: String,
      default: 'India',
      trim: true
    }
  },
  payment_terms: {
    days: {
      type: Number,
      required: true,
      default: 30
    },
    early_pay_discount: {
      type: Number,
      default: 0
    }
  },
  status: {
    type: String,
    enum: ['ACTIVE', 'INACTIVE', 'SUSPENDED'],
    default: 'ACTIVE'
  },
  rating: {
    type: Number,
    min: 1,
    max: 5,
    default: 3
  },
  categories: [{
    type: String,
    trim: true
  }],
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
});

// Indexes are already defined in schema with unique: true
vendorSchema.index({ name: 1 });
vendorSchema.index({ status: 1 });

const Vendor = mongoose.model('Vendor', vendorSchema);

module.exports = Vendor;
