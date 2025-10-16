const mongoose = require('mongoose');

const skuSchema = new mongoose.Schema({
  // Multi-tenancy
  tenant_id: {
    type: String,
    required: true,
    index: true
  },

  // Product reference
  product_id: {
    type: String,
    required: true,
    index: true
  },

  // SKU identification
  sku: {
    type: String,
    required: true,
    trim: true
  },
  barcode: {
    type: String,
    trim: true,
    sparse: true
  },
  gtin: {
    type: String,
    trim: true
  },

  // Variant attributes
  attributes: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },

  // Pricing
  price: {
    type: Number,
    required: true,
    min: 0
  },
  cost_price: {
    type: Number,
    default: 0
  },
  compare_at_price: {
    type: Number,
    default: null
  },
  currency: {
    type: String,
    default: 'INR'
  },

  // Inventory
  track_inventory: {
    type: Boolean,
    default: true
  },
  inventory_quantity: {
    type: Number,
    default: 0
  },
  reserved_quantity: {
    type: Number,
    default: 0
  },
  available_quantity: {
    type: Number,
    default: 0
  },
  low_stock_threshold: {
    type: Number,
    default: 5
  },

  // Physical properties
  weight: {
    value: Number,
    unit: {
      type: String,
      default: 'kg'
    }
  },
  dimensions: {
    length: Number,
    width: Number,
    height: Number,
    unit: {
      type: String,
      default: 'cm'
    }
  },

  // Status
  status: {
    type: String,
    enum: ['active', 'inactive', 'discontinued'],
    default: 'active',
    index: true
  },
  is_default: {
    type: Boolean,
    default: false
  },

  // Images
  images: [{
    url: String,
    alt_text: String,
    is_primary: {
      type: Boolean,
      default: false
    }
  }],

  // Metadata
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
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
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// Indexes
skuSchema.index({ tenant_id: 1, sku: 1 }, { unique: true });
skuSchema.index({ tenant_id: 1, product_id: 1 });
skuSchema.index({ tenant_id: 1, barcode: 1 }, { sparse: true });
skuSchema.index({ tenant_id: 1, status: 1 });
skuSchema.index({ tenant_id: 1, is_default: 1 });

// Virtual for available quantity
skuSchema.virtual('available_quantity').get(function() {
  if (!this.track_inventory) {
    return Infinity;
  }
  return Math.max(0, this.inventory_quantity - this.reserved_quantity);
});

// Pre-save middleware to update available quantity
skuSchema.pre('save', function(next) {
  if (this.track_inventory) {
    this.available_quantity = Math.max(0, this.inventory_quantity - this.reserved_quantity);
  }
  next();
});

// Instance methods
skuSchema.methods.isAvailable = function() {
  return this.status === 'active' && 
         (!this.track_inventory || this.available_quantity > 0);
};

skuSchema.methods.isLowStock = function() {
  return this.track_inventory && 
         this.available_quantity <= this.low_stock_threshold;
};

skuSchema.methods.reserveQuantity = function(quantity) {
  if (!this.track_inventory) {
    return true;
  }
  
  if (this.available_quantity >= quantity) {
    this.reserved_quantity += quantity;
    this.available_quantity = Math.max(0, this.inventory_quantity - this.reserved_quantity);
    return true;
  }
  return false;
};

skuSchema.methods.releaseQuantity = function(quantity) {
  if (!this.track_inventory) {
    return true;
  }
  
  this.reserved_quantity = Math.max(0, this.reserved_quantity - quantity);
  this.available_quantity = Math.max(0, this.inventory_quantity - this.reserved_quantity);
  return true;
};

skuSchema.methods.getPrimaryImage = function() {
  const primaryImage = this.images.find(img => img.is_primary);
  return primaryImage || this.images[0] || null;
};

module.exports = mongoose.model('SKU', skuSchema);
