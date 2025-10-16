const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500
  },
  parent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    default: null
  },
  level: {
    type: Number,
    default: 0
  },
  path: {
    type: String,
    required: true
  },
  image: {
    url: String,
    alt: String
  },
  icon: {
    type: String
  },
  color: {
    type: String,
    match: /^#[0-9A-F]{6}$/i
  },
  seo: {
    metaTitle: String,
    metaDescription: String,
    keywords: [String]
  },
  attributes: [{
    name: {
      type: String,
      required: true
    },
    type: {
      type: String,
      enum: ['text', 'number', 'boolean', 'select', 'multiselect', 'color', 'size'],
      required: true
    },
    options: [String],
    required: {
      type: Boolean,
      default: false
    },
    filterable: {
      type: Boolean,
      default: true
    }
  }],
  status: {
    type: String,
    enum: ['active', 'inactive', 'archived'],
    default: 'active'
  },
  featured: {
    type: Boolean,
    default: false
  },
  sortOrder: {
    type: Number,
    default: 0
  },
  productCount: {
    type: Number,
    default: 0
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
categorySchema.index({ name: 1 });
categorySchema.index({ slug: 1 });
categorySchema.index({ parent: 1 });
categorySchema.index({ level: 1 });
categorySchema.index({ path: 1 });
categorySchema.index({ status: 1 });
categorySchema.index({ featured: 1 });
categorySchema.index({ sortOrder: 1 });

// Virtual for full path
categorySchema.virtual('fullPath').get(function() {
  return this.path;
});

// Virtual for children count
categorySchema.virtual('childrenCount', {
  ref: 'Category',
  localField: '_id',
  foreignField: 'parent',
  count: true
});

// Pre-save middleware to generate slug and path
categorySchema.pre('save', async function(next) {
  if (this.isModified('name') && !this.slug) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
  
  if (this.isModified('parent') || this.isNew) {
    await this.calculatePath();
  }
  
  next();
});

// Method to calculate path
categorySchema.methods.calculatePath = async function() {
  if (this.parent) {
    const parent = await this.constructor.findById(this.parent);
    if (parent) {
      this.path = `${parent.path}/${this.slug}`;
      this.level = parent.level + 1;
    } else {
      this.path = this.slug;
      this.level = 0;
    }
  } else {
    this.path = this.slug;
    this.level = 0;
  }
};

// Method to get children
categorySchema.methods.getChildren = function() {
  return this.constructor.find({ parent: this._id, status: 'active' });
};

// Method to get ancestors
categorySchema.methods.getAncestors = async function() {
  const ancestors = [];
  let current = this;
  
  while (current.parent) {
    current = await this.constructor.findById(current.parent);
    if (current) {
      ancestors.unshift(current);
    } else {
      break;
    }
  }
  
  return ancestors;
};

// Method to get descendants
categorySchema.methods.getDescendants = async function() {
  const descendants = [];
  const children = await this.getChildren();
  
  for (const child of children) {
    descendants.push(child);
    const childDescendants = await child.getDescendants();
    descendants.push(...childDescendants);
  }
  
  return descendants;
};

// Method to update product count
categorySchema.methods.updateProductCount = async function() {
  const Product = require('./Product.model');
  const count = await Product.countDocuments({ category: this._id, status: 'active' });
  this.productCount = count;
  return this.save();
};

// Static method to get tree structure
categorySchema.statics.getTree = function() {
  return this.find({ status: 'active' })
    .sort({ level: 1, sortOrder: 1, name: 1 })
    .populate('parent', 'name slug');
};

// Static method to get root categories
categorySchema.statics.getRootCategories = function() {
  return this.find({ parent: null, status: 'active' })
    .sort({ sortOrder: 1, name: 1 });
};

// Static method to find by slug
categorySchema.statics.findBySlug = function(slug) {
  return this.findOne({ slug, status: 'active' });
};

// Static method to search categories
categorySchema.statics.search = function(searchTerm) {
  return this.find({
    $or: [
      { name: { $regex: searchTerm, $options: 'i' } },
      { description: { $regex: searchTerm, $options: 'i' } }
    ],
    status: 'active'
  });
};

module.exports = mongoose.model('Category', categorySchema);
