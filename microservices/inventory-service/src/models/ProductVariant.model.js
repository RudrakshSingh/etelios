const mongoose = require('mongoose');

const productVariantSchema = new mongoose.Schema({
  // Parent Product
  product_master_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ProductMaster',
    required: true
  },
  
  // Variant Details
  color_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Color',
    required: true
  },
  variant_name: {
    type: String,
    required: true
  },
  
  // Product Codes
  sub_sku: {
    type: String,
    unique: true
  },
  sub_product_code: {
    type: String,
    unique: true
  },
  
  // Pricing (can override master pricing)
  purchase_price: Number,
  b2b_price: Number,
  mrp: Number,
  
  // Images
  images: [{
    url: String,
    alt_text: String,
    is_primary: Boolean
  }],
  
  // Barcode/QR Code
  barcode: {
    type: String,
    unique: true
  },
  qr_code: {
    type: String,
    unique: true
  },
  
  // Status
  is_active: {
    type: Boolean,
    default: true
  },
  
  // Timestamps
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
});

// Pre-save middleware
productVariantSchema.pre('save', function(next) {
  this.updated_at = Date.now();
  
  if (!this.sub_sku) {
    this.sub_sku = `SUB-${this.product_master_id}-${this.color_id}-${Date.now()}`;
  }
  
  if (!this.sub_product_code) {
    // Will be generated based on brand prefix + model + color code
  }
  
  if (!this.barcode) {
    this.barcode = `BC${Date.now()}${Math.random().toString(36).substr(2, 5)}`;
  }
  
  if (!this.qr_code) {
    this.qr_code = `QR${Date.now()}${Math.random().toString(36).substr(2, 5)}`;
  }
  
  next();
});

// Indexes (sub_sku, sub_product_code, barcode already have unique indexes from schema definition)
productVariantSchema.index({ product_master_id: 1, color_id: 1 }, { unique: true });
productVariantSchema.index({ is_active: 1 });

const ProductVariant = mongoose.model('ProductVariant', productVariantSchema);

module.exports = ProductVariant;
