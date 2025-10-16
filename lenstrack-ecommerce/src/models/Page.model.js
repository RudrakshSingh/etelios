const mongoose = require('mongoose');

const pageSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  path: {
    type: String,
    required: true,
    unique: true
  },
  type: {
    type: String,
    enum: ['HOME', 'LANDING', 'CMS', 'PRODUCT', 'CATEGORY', 'CUSTOM'],
    required: true
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500
  },
  content: {
    draft: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    published: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  sections: [{
    id: {
      type: String,
      required: true
    },
    type: {
      type: String,
      required: true,
      enum: [
        'hero', 'banner', 'product_carousel', 'category_grid', 
        'text_block', 'image_gallery', 'testimonials', 'faq',
        'contact_form', 'newsletter', 'social_links', 'custom'
      ]
    },
    props: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    blocks: [{
      id: {
        type: String,
        required: true
      },
      type: {
        type: String,
        required: true
      },
      props: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
      },
      content: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
      }
    }],
    order: {
      type: Number,
      default: 0
    },
    isActive: {
      type: Boolean,
      default: true
    }
  }],
  seo: {
    metaTitle: String,
    metaDescription: String,
    keywords: [String],
    canonicalUrl: String,
    ogTitle: String,
    ogDescription: String,
    ogImage: String,
    twitterCard: {
      type: String,
      enum: ['summary', 'summary_large_image', 'app', 'player']
    },
    twitterTitle: String,
    twitterDescription: String,
    twitterImage: String,
    structuredData: {
      type: mongoose.Schema.Types.Mixed
    }
  },
  targeting: {
    devices: [{
      type: String,
      enum: ['desktop', 'tablet', 'mobile']
    }],
    locations: [{
      type: String
    }],
    userTypes: [{
      type: String,
      enum: ['guest', 'customer', 'vip', 'new']
    }],
    utm: {
      source: String,
      medium: String,
      campaign: String
    }
  },
  scheduling: {
    publishAt: Date,
    unpublishAt: Date,
    timezone: {
      type: String,
      default: 'Asia/Kolkata'
    }
  },
  experiments: {
    abKey: String,
    variants: [{
      key: String,
      weight: {
        type: Number,
        default: 50
      },
      content: {
        type: mongoose.Schema.Types.Mixed
      }
    }]
  },
  localization: {
    language: {
      type: String,
      default: 'en'
    },
    region: {
      type: String,
      default: 'IN'
    },
    translations: [{
      language: String,
      title: String,
      description: String,
      content: {
        type: mongoose.Schema.Types.Mixed
      }
    }]
  },
  status: {
    type: String,
    enum: ['draft', 'published', 'archived', 'scheduled'],
    default: 'draft'
  },
  version: {
    type: Number,
    default: 1
  },
  publishedAt: Date,
  archivedAt: Date,
  views: {
    type: Number,
    default: 0
  },
  analytics: {
    pageViews: {
      type: Number,
      default: 0
    },
    uniqueViews: {
      type: Number,
      default: 0
    },
    bounceRate: {
      type: Number,
      default: 0
    },
    avgTimeOnPage: {
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
  },
  publishedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Indexes
pageSchema.index({ slug: 1 });
pageSchema.index({ path: 1 });
pageSchema.index({ type: 1 });
pageSchema.index({ status: 1 });
pageSchema.index({ publishedAt: -1 });
pageSchema.index({ 'targeting.devices': 1 });
pageSchema.index({ 'targeting.locations': 1 });
pageSchema.index({ 'localization.language': 1 });

// Virtual for is published
pageSchema.virtual('isPublished').get(function() {
  return this.status === 'published' && 
         (!this.scheduling.publishAt || this.scheduling.publishAt <= new Date()) &&
         (!this.scheduling.unpublishAt || this.scheduling.unpublishAt > new Date());
});

// Virtual for is scheduled
pageSchema.virtual('isScheduled').get(function() {
  return this.status === 'scheduled' && 
         this.scheduling.publishAt && 
         this.scheduling.publishAt > new Date();
});

// Pre-save middleware to generate slug and path
pageSchema.pre('save', function(next) {
  if (this.isModified('title') && !this.slug) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
  
  if (this.isModified('slug') || this.isNew) {
    if (!this.path) {
      this.path = `/${this.slug}`;
    }
  }
  
  next();
});

// Method to publish page
pageSchema.methods.publish = function(publishedBy) {
  this.status = 'published';
  this.publishedAt = new Date();
  this.publishedBy = publishedBy;
  this.content.published = this.content.draft;
  return this.save();
};

// Method to unpublish page
pageSchema.methods.unpublish = function() {
  this.status = 'draft';
  this.archivedAt = new Date();
  return this.save();
};

// Method to archive page
pageSchema.methods.archive = function() {
  this.status = 'archived';
  this.archivedAt = new Date();
  return this.save();
};

// Method to add section
pageSchema.methods.addSection = function(sectionData) {
  const section = {
    id: require('uuid').v4(),
    ...sectionData,
    order: this.sections.length
  };
  this.sections.push(section);
  return this.save();
};

// Method to update section
pageSchema.methods.updateSection = function(sectionId, updates) {
  const section = this.sections.id(sectionId);
  if (section) {
    Object.assign(section, updates);
  }
  return this.save();
};

// Method to remove section
pageSchema.methods.removeSection = function(sectionId) {
  this.sections = this.sections.filter(section => section.id !== sectionId);
  return this.save();
};

// Method to reorder sections
pageSchema.methods.reorderSections = function(sectionIds) {
  sectionIds.forEach((sectionId, index) => {
    const section = this.sections.id(sectionId);
    if (section) {
      section.order = index;
    }
  });
  return this.save();
};

// Method to add block to section
pageSchema.methods.addBlock = function(sectionId, blockData) {
  const section = this.sections.id(sectionId);
  if (section) {
    const block = {
      id: require('uuid').v4(),
      ...blockData
    };
    section.blocks.push(block);
  }
  return this.save();
};

// Method to update block
pageSchema.methods.updateBlock = function(sectionId, blockId, updates) {
  const section = this.sections.id(sectionId);
  if (section) {
    const block = section.blocks.id(blockId);
    if (block) {
      Object.assign(block, updates);
    }
  }
  return this.save();
};

// Method to remove block
pageSchema.methods.removeBlock = function(sectionId, blockId) {
  const section = this.sections.id(sectionId);
  if (section) {
    section.blocks = section.blocks.filter(block => block.id !== blockId);
  }
  return this.save();
};

// Method to increment views
pageSchema.methods.incrementViews = function() {
  this.views += 1;
  this.analytics.pageViews += 1;
  return this.save();
};

// Method to get rendered content
pageSchema.methods.getRenderedContent = function() {
  return this.content.published || this.content.draft;
};

// Static method to find by path
pageSchema.statics.findByPath = function(path) {
  return this.findOne({ 
    path, 
    status: 'published',
    $or: [
      { 'scheduling.publishAt': { $exists: false } },
      { 'scheduling.publishAt': { $lte: new Date() } }
    ],
    $or: [
      { 'scheduling.unpublishAt': { $exists: false } },
      { 'scheduling.unpublishAt': { $gt: new Date() } }
    ]
  });
};

// Static method to find by slug
pageSchema.statics.findBySlug = function(slug) {
  return this.findOne({ 
    slug, 
    status: 'published',
    $or: [
      { 'scheduling.publishAt': { $exists: false } },
      { 'scheduling.publishAt': { $lte: new Date() } }
    ],
    $or: [
      { 'scheduling.unpublishAt': { $exists: false } },
      { 'scheduling.unpublishAt': { $gt: new Date() } }
    ]
  });
};

// Static method to find published pages
pageSchema.statics.findPublished = function(options = {}) {
  return this.find({ 
    status: 'published',
    $or: [
      { 'scheduling.publishAt': { $exists: false } },
      { 'scheduling.publishAt': { $lte: new Date() } }
    ],
    $or: [
      { 'scheduling.unpublishAt': { $exists: false } },
      { 'scheduling.unpublishAt': { $gt: new Date() } }
    ]
  }, null, options);
};

// Static method to search pages
pageSchema.statics.search = function(searchTerm) {
  return this.find({
    $or: [
      { title: { $regex: searchTerm, $options: 'i' } },
      { description: { $regex: searchTerm, $options: 'i' } },
      { 'seo.metaDescription': { $regex: searchTerm, $options: 'i' } }
    ],
    status: 'published'
  });
};

module.exports = mongoose.model('Page', pageSchema);
