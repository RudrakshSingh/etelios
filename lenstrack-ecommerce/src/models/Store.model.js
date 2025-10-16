const mongoose = require('mongoose');

const storeSchema = new mongoose.Schema({
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
    maxlength: 1000
  },
  address: {
    street: {
      type: String,
      required: true
    },
    city: {
      type: String,
      required: true
    },
    state: {
      type: String,
      required: true
    },
    pincode: {
      type: String,
      required: true
    },
    country: {
      type: String,
      default: 'India'
    },
    coordinates: {
      latitude: Number,
      longitude: Number
    }
  },
  contact: {
    phone: {
      type: String,
      required: true
    },
    email: {
      type: String,
      required: true,
      lowercase: true
    },
    website: String,
    whatsapp: String
  },
  hours: {
    monday: {
      open: String,
      close: String,
      closed: {
        type: Boolean,
        default: false
      }
    },
    tuesday: {
      open: String,
      close: String,
      closed: {
        type: Boolean,
        default: false
      }
    },
    wednesday: {
      open: String,
      close: String,
      closed: {
        type: Boolean,
        default: false
      }
    },
    thursday: {
      open: String,
      close: String,
      closed: {
        type: Boolean,
        default: false
      }
    },
    friday: {
      open: String,
      close: String,
      closed: {
        type: Boolean,
        default: false
      }
    },
    saturday: {
      open: String,
      close: String,
      closed: {
        type: Boolean,
        default: false
      }
    },
    sunday: {
      open: String,
      close: String,
      closed: {
        type: Boolean,
        default: false
      }
    }
  },
  services: [{
    type: String,
    enum: [
      'eye_examination', 'contact_lens_fitting', 'frame_repair', 
      'lens_replacement', 'prescription_glasses', 'sunglasses',
      'computer_glasses', 'progressive_lenses', 'bifocal_lenses',
      'home_delivery', 'pickup_service', 'warranty_service'
    ]
  }],
  staff: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    role: {
      type: String,
      enum: ['manager', 'optometrist', 'sales_associate', 'technician'],
      required: true
    },
    permissions: [String],
    isActive: {
      type: Boolean,
      default: true
    }
  }],
  inventory: {
    trackInventory: {
      type: Boolean,
      default: true
    },
    lowStockThreshold: {
      type: Number,
      default: 10
    },
    allowBackorder: {
      type: Boolean,
      default: false
    }
  },
  settings: {
    timezone: {
      type: String,
      default: 'Asia/Kolkata'
    },
    currency: {
      type: String,
      default: 'INR'
    },
    language: {
      type: String,
      default: 'en'
    },
    taxRate: {
      type: Number,
      default: 18
    },
    shippingCost: {
      type: Number,
      default: 0
    },
    freeShippingThreshold: {
      type: Number,
      default: 0
    }
  },
  images: [{
    url: {
      type: String,
      required: true
    },
    alt: String,
    type: {
      type: String,
      enum: ['exterior', 'interior', 'showroom', 'staff', 'other']
    },
    isPrimary: {
      type: Boolean,
      default: false
    }
  }],
  social: {
    facebook: String,
    instagram: String,
    twitter: String,
    linkedin: String,
    youtube: String
  },
  seo: {
    metaTitle: String,
    metaDescription: String,
    keywords: [String]
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'maintenance', 'closed'],
    default: 'active'
  },
  featured: {
    type: Boolean,
    default: false
  },
  rating: {
    average: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    count: {
      type: Number,
      default: 0
    }
  },
  statistics: {
    totalOrders: {
      type: Number,
      default: 0
    },
    totalRevenue: {
      type: Number,
      default: 0
    },
    totalCustomers: {
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
storeSchema.index({ name: 1 });
storeSchema.index({ slug: 1 });
storeSchema.index({ 'address.city': 1 });
storeSchema.index({ 'address.state': 1 });
storeSchema.index({ 'address.pincode': 1 });
storeSchema.index({ status: 1 });
storeSchema.index({ featured: 1 });
storeSchema.index({ 'address.coordinates': '2dsphere' });

// Virtual for full address
storeSchema.virtual('fullAddress').get(function() {
  return `${this.address.street}, ${this.address.city}, ${this.address.state} ${this.address.pincode}, ${this.address.country}`;
});

// Virtual for is open
storeSchema.virtual('isOpen').get(function() {
  const now = new Date();
  const day = now.toLocaleDateString('en-US', { weekday: 'lowercase' });
  const time = now.toTimeString().slice(0, 5);
  
  const dayHours = this.hours[day];
  if (!dayHours || dayHours.closed) return false;
  
  return time >= dayHours.open && time <= dayHours.close;
});

// Pre-save middleware to generate slug
storeSchema.pre('save', function(next) {
  if (this.isModified('name') && !this.slug) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
  next();
});

// Method to get primary image
storeSchema.methods.getPrimaryImage = function() {
  const primaryImage = this.images.find(img => img.isPrimary);
  return primaryImage || this.images[0] || null;
};

// Method to add staff member
storeSchema.methods.addStaff = function(userId, role, permissions = []) {
  this.staff.push({
    user: userId,
    role,
    permissions,
    isActive: true
  });
  return this.save();
};

// Method to remove staff member
storeSchema.methods.removeStaff = function(userId) {
  this.staff = this.staff.filter(member => member.user.toString() !== userId.toString());
  return this.save();
};

// Method to update staff role
storeSchema.methods.updateStaffRole = function(userId, role, permissions = []) {
  const member = this.staff.find(m => m.user.toString() === userId.toString());
  if (member) {
    member.role = role;
    member.permissions = permissions;
  }
  return this.save();
};

// Method to check if user has access
storeSchema.methods.hasAccess = function(userId, requiredRole = null) {
  const member = this.staff.find(m => 
    m.user.toString() === userId.toString() && m.isActive
  );
  
  if (!member) return false;
  if (!requiredRole) return true;
  
  return member.role === requiredRole;
};

// Method to update statistics
storeSchema.methods.updateStatistics = async function() {
  const Order = require('./Order.model');
  const User = require('./User.model');
  
  const [orderStats, customerStats] = await Promise.all([
    Order.aggregate([
      { $match: { store: this._id } },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: '$pricing.total' }
        }
      }
    ]),
    User.countDocuments({ stores: this._id })
  ]);
  
  if (orderStats.length > 0) {
    this.statistics.totalOrders = orderStats[0].totalOrders;
    this.statistics.totalRevenue = orderStats[0].totalRevenue;
  }
  
  this.statistics.totalCustomers = customerStats;
  return this.save();
};

// Static method to find nearby stores
storeSchema.statics.findNearby = function(latitude, longitude, maxDistance = 10000) {
  return this.find({
    'address.coordinates': {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [longitude, latitude]
        },
        $maxDistance: maxDistance
      }
    },
    status: 'active'
  });
};

// Static method to find by city
storeSchema.statics.findByCity = function(city) {
  return this.find({ 
    'address.city': new RegExp(city, 'i'),
    status: 'active'
  });
};

// Static method to search stores
storeSchema.statics.search = function(searchTerm) {
  return this.find({
    $or: [
      { name: { $regex: searchTerm, $options: 'i' } },
      { description: { $regex: searchTerm, $options: 'i' } },
      { 'address.city': { $regex: searchTerm, $options: 'i' } },
      { 'address.state': { $regex: searchTerm, $options: 'i' } }
    ],
    status: 'active'
  });
};

module.exports = mongoose.model('Store', storeSchema);
