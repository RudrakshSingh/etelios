const mongoose = require('mongoose');

const materialSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  description: {
    type: String
  },
  category: {
    type: String,
    enum: ['FRAME', 'LENS', 'CONTACT_LENS', 'ACCESSORY']
  },
  properties: {
    weight: Number,
    flexibility: String,
    durability: String,
    comfort_level: String
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

materialSchema.pre('save', function(next) {
  this.updated_at = Date.now();
  next();
});

const Material = mongoose.model('Material', materialSchema);

module.exports = Material;
