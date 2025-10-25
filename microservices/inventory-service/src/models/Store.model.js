const mongoose = require('mongoose');

const storeSchema = new mongoose.Schema({
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
  address: {
    street: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    pincode: { type: String, trim: true },
    country: { type: String, trim: true, default: 'India' }
  },
  contact: {
    phone: { type: String, trim: true },
    email: { type: String, trim: true },
    manager: { type: String, trim: true }
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      default: [0, 0]
    }
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'maintenance'],
    default: 'active'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  settings: {
    timezone: { type: String, default: 'Asia/Kolkata' },
    currency: { type: String, default: 'INR' },
    language: { type: String, default: 'en' }
  },
  metadata: {
    type: Map,
    of: String
  }
}, {
  timestamps: true
});

// Indexes for better query performance
storeSchema.index({ name: 1 });
storeSchema.index({ code: 1 });
storeSchema.index({ status: 1 });
storeSchema.index({ isActive: 1 });
storeSchema.index({ location: '2dsphere' });

// Virtual for full address
storeSchema.virtual('fullAddress').get(function() {
  const { street, city, state, pincode, country } = this.address;
  return [street, city, state, pincode, country].filter(Boolean).join(', ');
});

module.exports = mongoose.model('Store', storeSchema);
