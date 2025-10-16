const mongoose = require('mongoose');

const brandSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  prefix: {
    type: String,
    required: true,
    unique: true,
    uppercase: true
  },
  description: {
    type: String
  },
  logo_url: {
    type: String
  },
  website: {
    type: String
  },
  contact_info: {
    email: String,
    phone: String,
    address: String
  },
  is_active: {
    type: Boolean,
    default: true
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
});

brandSchema.pre('save', function(next) {
  this.updated_at = Date.now();
  next();
});

const Brand = mongoose.model('Brand', brandSchema);

module.exports = Brand;
