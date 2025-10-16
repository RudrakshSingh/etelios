const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    trim: true,
    maxlength: 2000
  },
  shortDescription: {
    type: String,
    trim: true,
    maxlength: 500
  },
  sku: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  barcode: {
    type: String,
    unique: true,
    sparse: true
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true
  },
  subcategory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category'
  },
  brand: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Brand'
  },
  tags: [{
    type: String,
    trim: true
  }],
  images: [{
    url: {
      type: String,
      required: true
    },
    alt: String,
    isPrimary: {
      type: Boolean,
      default: false
    },
    order: {
      type: Number,
      default: 0
    }
  }],
  pricing: {
    cost: {
      type: Number,
      required: true,
      min: 0
    },
    mrp: {
      type: Number,
      required: true,
      min: 0
    },
    sellingPrice: {
      type: Number,
      required: true,
      min: 0
    },
    discount: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    }
  },
  inventory: {
    trackQuantity: {
      type: Boolean,
      default: true
    },
    quantity: {
      type: Number,
      default: 0,
      min: 0
    },
    lowStockThreshold: {
      type: Number,
      default: 10
    },
    allowBackorder: {
      type: Boolean,
      default: false
    },
    manageStock: {
      type: Boolean,
      default: true
    }
  },
  shipping: {
    weight: {
      type: Number,
      min: 0
    },
    dimensions: {
      length: Number,
      width: Number,
      height: Number
    },
    shippingClass: {
      type: String,
      enum: ['standard', 'express', 'overnight', 'bulk']
    }
  },
  seo: {
    metaTitle: String,
    metaDescription: String,
    slug: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true
    },
    keywords: [String]
  },
  attributes: [{
    name: {
      type: String,
      required: true
    },
    value: {
      type: String,
      required: true
    },
    type: {
      type: String,
      enum: ['text', 'number', 'boolean', 'date', 'color', 'size']
    }
  }],
  variants: [{
    name: {
      type: String,
      required: true
    },
    sku: {
      type: String,
      required: true
    },
    attributes: [{
      name: String,
      value: String
    }],
    pricing: {
      cost: Number,
      mrp: Number,
      sellingPrice: Number,
      discount: Number
    },
    inventory: {
      quantity: Number,
      lowStockThreshold: Number
    },
    images: [String]
  }],
  status: {
    type: String,
    enum: ['draft', 'active', 'inactive', 'archived'],
    default: 'draft'
  },
  visibility: {
    type: String,
    enum: ['public', 'private', 'password_protected'],
    default: 'public'
  },
  featured: {
    type: Boolean,
    default: false
  },
  digital: {
    type: Boolean,
    default: false
  },
  downloadable: {
    type: Boolean,
    default: false
  },
  virtual: {
    type: Boolean,
    default: false
  },
  reviews: {
    averageRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    totalReviews: {
      type: Number,
      default: 0
    }
  },
  sales: {
    totalSold: {
      type: Number,
      default: 0
    },
    revenue: {
      type: Number,
      default: 0
    }
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Indexes
productSchema.index({ name: 'text', description: 'text', tags: 'text' });
productSchema.index({ sku: 1 });
productSchema.index({ category: 1 });
productSchema.index({ brand: 1 });
productSchema.index({ status: 1 });
productSchema.index({ featured: 1 });
productSchema.index({ 'pricing.sellingPrice': 1 });
productSchema.index({ createdAt: -1 });

// Virtual for profit margin
productSchema.virtual('profitMargin').get(function() {
  if (this.pricing.cost && this.pricing.sellingPrice) {
    return ((this.pricing.sellingPrice - this.pricing.cost) / this.pricing.sellingPrice * 100).toFixed(2);
  }
  return 0;
});

// Virtual for stock status
productSchema.virtual('stockStatus').get(function() {
  if (!this.inventory.trackQuantity) return 'unlimited';
  if (this.inventory.quantity === 0) return 'out_of_stock';
  if (this.inventory.quantity <= this.inventory.lowStockThreshold) return 'low_stock';
  return 'in_stock';
});

// Pre-save middleware to generate slug
productSchema.pre('save', function(next) {
  if (this.isModified('name') && !this.seo.slug) {
    this.seo.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
  next();
});

// Method to check if product is in stock
productSchema.methods.isInStock = function(quantity = 1) {
  if (!this.inventory.trackQuantity) return true;
  if (this.inventory.allowBackorder) return true;
  return this.inventory.quantity >= quantity;
};

// Method to update inventory
productSchema.methods.updateInventory = function(quantity, operation = 'subtract') {
  if (!this.inventory.trackQuantity) return;
  
  if (operation === 'subtract') {
    this.inventory.quantity = Math.max(0, this.inventory.quantity - quantity);
  } else if (operation === 'add') {
    this.inventory.quantity += quantity;
  }
  
  return this.save();
};

// Method to get primary image
productSchema.methods.getPrimaryImage = function() {
  const primaryImage = this.images.find(img => img.isPrimary);
  return primaryImage || this.images[0] || null;
};

// Method to calculate discount percentage
productSchema.methods.getDiscountPercentage = function() {
  if (this.pricing.mrp && this.pricing.sellingPrice) {
    return Math.round(((this.pricing.mrp - this.pricing.sellingPrice) / this.pricing.mrp) * 100);
  }
  return 0;
};

// Static method to find products by category
productSchema.statics.findByCategory = function(categoryId, options = {}) {
  const query = { category: categoryId, status: 'active' };
  return this.find(query, null, options);
};

// Static method to find featured products
productSchema.statics.findFeatured = function(limit = 10) {
  return this.find({ featured: true, status: 'active' }).limit(limit);
};

// Static method to search products
productSchema.statics.search = function(searchTerm, options = {}) {
  const query = {
    $or: [
      { name: { $regex: searchTerm, $options: 'i' } },
      { description: { $regex: searchTerm, $options: 'i' } },
      { tags: { $in: [new RegExp(searchTerm, 'i')] } }
    ],
    status: 'active'
  };
  
  return this.find(query, null, options);
};

module.exports = mongoose.model('Product', productSchema);
