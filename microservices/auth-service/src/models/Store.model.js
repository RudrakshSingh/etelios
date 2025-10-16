const mongoose = require('mongoose');

const storeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  code: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true,
    maxlength: 10
  },
  store_id: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500
  },

  // Location Information
  address: {
    street: {
      type: String,
      required: true,
      trim: true
    },
    city: {
      type: String,
      required: true,
      trim: true
    },
    state: {
      type: String,
      required: true,
      trim: true
    },
    country: {
      type: String,
      required: true,
      trim: true,
      default: 'India'
    },
    pincode: {
      type: String,
      required: true,
      trim: true,
      match: [/^\d{6}$/, 'Pincode must be 6 digits']
    }
  },

  // Geographic Coordinates
  coordinates: {
    latitude: {
      type: Number,
      required: true,
      min: -90,
      max: 90
    },
    longitude: {
      type: Number,
      required: true,
      min: -180,
      max: 180
    }
  },

  // Geofencing
  geofence_radius: {
    type: Number,
    required: true,
    default: 100, // meters
    min: 10,
    max: 1000
  },

  // Contact Information
  contact: {
    phone: {
      type: String,
      required: true,
      trim: true,
      match: [/^\+?[\d\s-()]+$/, 'Please enter a valid phone number']
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    }
  },

  // Store Management
  manager: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  assistant_managers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],

  // Store Details
  store_type: {
    type: String,
    enum: ['retail', 'warehouse', 'office', 'field', 'other'],
    default: 'retail'
  },
  store_size: {
    type: String,
    enum: ['small', 'medium', 'large', 'extra_large'],
    default: 'medium'
  },
  operating_hours: {
    monday: { open: String, close: String, is_open: { type: Boolean, default: true } },
    tuesday: { open: String, close: String, is_open: { type: Boolean, default: true } },
    wednesday: { open: String, close: String, is_open: { type: Boolean, default: true } },
    thursday: { open: String, close: String, is_open: { type: Boolean, default: true } },
    friday: { open: String, close: String, is_open: { type: Boolean, default: true } },
    saturday: { open: String, close: String, is_open: { type: Boolean, default: true } },
    sunday: { open: String, close: String, is_open: { type: Boolean, default: false } }
  },

  // Status and Activity
  status: {
    type: String,
    enum: ['active', 'inactive', 'maintenance', 'closed'],
    default: 'active'
  },
  is_active: {
    type: Boolean,
    default: true
  },
  opening_date: {
    type: Date,
    required: true
  },
  closing_date: {
    type: Date
  },

  // System Fields
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updated_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes are already defined in the schema with index: true

// 2dsphere index for geospatial queries
storeSchema.index({ coordinates: '2dsphere' });

// Virtual for full address
storeSchema.virtual('full_address').get(function() {
  const addr = this.address;
  return `${addr.street}, ${addr.city}, ${addr.state} ${addr.pincode}, ${addr.country}`;
});

// Virtual for store age
storeSchema.virtual('store_age').get(function() {
  if (this.opening_date) {
    const now = new Date();
    const diffTime = Math.abs(now - this.opening_date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }
  return 0;
});

// Virtual for employee count
storeSchema.virtual('employee_count', {
  ref: 'User',
  localField: '_id',
  foreignField: 'stores',
  count: true
});

// Pre-save middleware to validate coordinates
storeSchema.pre('save', function(next) {
  if (this.coordinates.latitude < -90 || this.coordinates.latitude > 90) {
    return next(new Error('Latitude must be between -90 and 90'));
  }
  if (this.coordinates.longitude < -180 || this.coordinates.longitude > 180) {
    return next(new Error('Longitude must be between -180 and 180'));
  }
  next();
});

// Pre-save middleware to set store_id if not provided
storeSchema.pre('save', function(next) {
  if (!this.store_id) {
    this.store_id = this.code;
  }
  next();
});

// Static method to find by code
storeSchema.statics.findByCode = function(code) {
  return this.findOne({ code: code.toUpperCase() });
};

// Static method to find active stores
storeSchema.statics.findActiveStores = function() {
  return this.find({ is_active: true, status: 'active' });
};

// Static method to find stores by manager
storeSchema.statics.findByManager = function(managerId) {
  return this.find({ manager: managerId, is_active: true });
};

// Static method to find stores within radius
storeSchema.statics.findWithinRadius = function(latitude, longitude, radiusInMeters) {
  return this.find({
    coordinates: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [longitude, latitude]
        },
        $maxDistance: radiusInMeters
      }
    },
    is_active: true
  });
};

// Static method to find stores by type
storeSchema.statics.findByType = function(storeType) {
  return this.find({ store_type: storeType, is_active: true });
};

// Static method to get store statistics
storeSchema.statics.getStoreStats = async function() {
  const stats = await this.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);

  const typeStats = await this.aggregate([
    {
      $group: {
        _id: '$store_type',
        count: { $sum: 1 }
      }
    }
  ]);

  const sizeStats = await this.aggregate([
    {
      $group: {
        _id: '$store_size',
        count: { $sum: 1 }
      }
    }
  ]);

  return {
    statusStats: stats,
    typeStats: typeStats,
    sizeStats: sizeStats
  };
};

// Instance method to check if store is open
storeSchema.methods.isOpen = function() {
  if (this.status !== 'active') return false;
  
  const now = new Date();
  const dayName = now.toLocaleLowerCase().slice(0, 3); // mon, tue, etc.
  const dayKey = dayName === 'sun' ? 'sunday' : 
                 dayName === 'mon' ? 'monday' :
                 dayName === 'tue' ? 'tuesday' :
                 dayName === 'wed' ? 'wednesday' :
                 dayName === 'thu' ? 'thursday' :
                 dayName === 'fri' ? 'friday' : 'saturday';
  
  const daySchedule = this.operating_hours[dayKey];
  if (!daySchedule || !daySchedule.is_open) return false;
  
  const currentTime = now.toTimeString().slice(0, 5); // HH:MM format
  return currentTime >= daySchedule.open && currentTime <= daySchedule.close;
};

// Instance method to get distance from coordinates
storeSchema.methods.getDistanceFrom = function(latitude, longitude) {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = latitude * Math.PI / 180;
  const φ2 = this.coordinates.latitude * Math.PI / 180;
  const Δφ = (this.coordinates.latitude - latitude) * Math.PI / 180;
  const Δλ = (this.coordinates.longitude - longitude) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // in metres
};

// Instance method to check if coordinates are within geofence
storeSchema.methods.isWithinGeofence = function(latitude, longitude) {
  const distance = this.getDistanceFrom(latitude, longitude);
  return distance <= this.geofence_radius;
};

module.exports = mongoose.model('Store', storeSchema);