const mongoose = require('mongoose');

const colorSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true
  },
  hex_code: {
    type: String,
    match: /^#[0-9A-F]{6}$/i
  },
  description: {
    type: String
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

colorSchema.pre('save', function(next) {
  this.updated_at = Date.now();
  next();
});

const Color = mongoose.model('Color', colorSchema);

module.exports = Color;
