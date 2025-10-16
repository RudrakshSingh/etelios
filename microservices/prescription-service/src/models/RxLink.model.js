const mongoose = require('mongoose');

const rxLinkSchema = new mongoose.Schema({
  rx_link_id: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true
  },
  customer_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true
  },
  rx_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Prescription',
    required: true
  },
  scope: {
    type: String,
    enum: ['POS', 'ECOM'],
    required: true
  },
  allowed_products: [{
    type: String,
    enum: ['SPECTACLE_LENS', 'FRAME', 'CONTACT_LENS', 'SUNGLASSES', 'READING_GLASSES'],
    required: true
  }],
  expiry: {
    type: Date,
    required: true
  },
  usage_count: {
    type: Number,
    default: 0,
    min: 0
  },
  max_usage: {
    type: Number,
    default: 1,
    min: 1
  },
  is_active: {
    type: Boolean,
    default: true
  },
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});

// Indexes
rxLinkSchema.index({ customer_id: 1 });
rxLinkSchema.index({ rx_id: 1 });
rxLinkSchema.index({ scope: 1 });
rxLinkSchema.index({ expiry: 1 });
rxLinkSchema.index({ is_active: 1 });

const RxLink = mongoose.model('RxLink', rxLinkSchema);

module.exports = RxLink;
