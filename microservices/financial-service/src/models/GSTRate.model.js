const mongoose = require('mongoose');

const gstRateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  rate_pct: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  cess_pct: {
    type: Number,
    default: 0,
    min: 0
  },
  effective_from: {
    type: Date,
    required: true
  },
  effective_to: {
    type: Date
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

gstRateSchema.pre('save', function(next) {
  this.updated_at = Date.now();
  next();
});

// Indexes
gstRateSchema.index({ effective_from: 1, effective_to: 1 });
gstRateSchema.index({ is_active: 1 });

const GSTRate = mongoose.model('GSTRate', gstRateSchema);

module.exports = GSTRate;
