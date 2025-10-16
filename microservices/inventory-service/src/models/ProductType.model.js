const mongoose = require('mongoose');

const productTypeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    enum: ['EYEGLASSES', 'SUNGLASSES', 'LENS', 'CONTACT_LENS', 'SOLUTIONS', 'MEDICINE', 'OTHER', 'NONCHARGEABLE']
  },
  description: {
    type: String,
    required: true
  },
  is_chargeable: {
    type: Boolean,
    default: true
  },
  is_expirable: {
    type: Boolean,
    default: false
  },
  is_consumable: {
    type: Boolean,
    default: false
  },
  is_asset: {
    type: Boolean,
    default: false
  },
  requires_batch_tracking: {
    type: Boolean,
    default: false
  },
  requires_expiry_tracking: {
    type: Boolean,
    default: false
  },
  default_uqc: { // Unit of Quantity Code
    type: String,
    default: 'PCS'
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

productTypeSchema.pre('save', function(next) {
  this.updated_at = Date.now();
  next();
});

const ProductType = mongoose.model('ProductType', productTypeSchema);

module.exports = ProductType;
