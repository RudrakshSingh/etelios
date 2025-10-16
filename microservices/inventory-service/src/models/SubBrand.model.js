const mongoose = require('mongoose');

const subBrandSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  prefix: {
    type: String,
    required: true,
    uppercase: true
  },
  brand_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Brand',
    required: true
  },
  description: {
    type: String
  },
  target_segment: {
    type: String,
    enum: ['PREMIUM', 'MID_RANGE', 'BUDGET', 'LUXURY']
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

subBrandSchema.pre('save', function(next) {
  this.updated_at = Date.now();
  next();
});

// Compound index to ensure unique prefix per brand
subBrandSchema.index({ brand_id: 1, prefix: 1 }, { unique: true });

const SubBrand = mongoose.model('SubBrand', subBrandSchema);

module.exports = SubBrand;
