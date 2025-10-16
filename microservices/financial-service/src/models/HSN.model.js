const mongoose = require('mongoose');

const hsnSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true
  },
  description: {
    type: String,
    required: true
  },
  uqc: { // Unit of Quantity Code
    type: String,
    required: true,
    default: 'PCS'
  },
  default_gst_rate_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'GSTRate'
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

hsnSchema.pre('save', function(next) {
  this.updated_at = Date.now();
  next();
});

const HSN = mongoose.model('HSN', hsnSchema);

module.exports = HSN;
