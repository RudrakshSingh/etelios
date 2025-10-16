const mongoose = require('mongoose');

const productMasterSchema = new mongoose.Schema({
  // Basic Information
  model_number: {
    type: String,
    required: true,
    unique: true
  },
  product_type_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ProductType',
    required: true
  },
  brand_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Brand',
    required: true
  },
  sub_brand_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SubBrand'
  },
  
  // Product Details
  name: {
    type: String,
    required: true
  },
  description: {
    type: String
  },
  
  // Physical Attributes
  shape_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Shape'
  },
  material_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Material'
  },
  
  // Measurements (for frames/sunglasses)
  measurements: {
    a_size: Number, // Lens width
    b_size: Number, // Bridge width
    dia: Number,    // Lens diameter
    dbl: Number,    // Distance between lenses
    temple_length: Number,
    bridge_size: Number
  },
  
  // Special Attributes
  gender: {
    type: String,
    enum: ['MEN', 'WOMEN', 'UNISEX', 'KIDS_MALE', 'KIDS_FEMALE', 'KIDS_UNISEX']
  },
  rxable: { // For sunglasses - can be used for prescription
    type: Boolean,
    default: false
  },
  
  // Pricing
  purchase_price: {
    type: Number,
    min: 0
  },
  b2b_price: {
    type: Number,
    min: 0
  },
  mrp: {
    type: Number,
    min: 0
  },
  
  // Sales Configuration
  mode_of_sales: [{
    type: String,
    enum: ['ONLINE', 'OFFLINE', 'BOTH']
  }],
  
  // Product Traits
  traits: {
    type: Object,
    default: {
      variants_matrix: false,
      serial_tracking: false,
      batch_expiry: false,
      service_item: false,
      rx_required: false,
      recipe_bom: false
    }
  },
  
  // Product Code Generation
  master_sku: {
    type: String,
    unique: true
  },
  master_product_code: {
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

// Pre-save middleware to generate SKU and product code
productMasterSchema.pre('save', function(next) {
  this.updated_at = Date.now();
  
  if (!this.master_sku) {
    this.master_sku = `SKU-${this.model_number}-${Date.now()}`;
  }
  
  if (!this.master_product_code) {
    // This will be populated with brand/sub-brand prefix + model number
    // Implementation will be done in the service layer
  }
  
  // Auto-set batch_expiry for consumables based on product type
  if (this.product_type_id) {
    // This will be handled in the service layer based on product type
    // CONTACT_LENS, SOLUTIONS, MEDICINE should have batch_expiry: true
  }
  
  next();
});

// Indexes for performance (model_number already has unique index from schema definition)
productMasterSchema.index({ product_type_id: 1 });
productMasterSchema.index({ brand_id: 1 });
productMasterSchema.index({ is_active: 1 });

const ProductMaster = mongoose.model('ProductMaster', productMasterSchema);

module.exports = ProductMaster;
