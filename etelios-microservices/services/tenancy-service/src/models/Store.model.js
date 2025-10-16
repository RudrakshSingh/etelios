const mongoose = require('mongoose');

const storeSchema = new mongoose.Schema({
  // Multi-tenancy
  tenant_id: {
    type: String,
    required: true,
    index: true
  },
  org_id: {
    type: String,
    required: true,
    index: true
  },

  // Basic info
  name: {
    type: String,
    required: true,
    trim: true
  },
  code: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['physical', 'warehouse', 'virtual', 'popup'],
    default: 'physical'
  },

  // Contact info
  email: {
    type: String,
    lowercase: true,
    trim: true
  },
  phone: {
    type: String,
    trim: true
  },

  // Address
  address: {
    street: String,
    city: String,
    state: String,
    postal_code: String,
    country: {
      type: String,
      default: 'IN'
    },
    coordinates: {
      latitude: Number,
      longitude: Number
    }
  },

  // Operating hours
  operating_hours: {
    monday: { open: String, close: String, closed: { type: Boolean, default: false } },
    tuesday: { open: String, close: String, closed: { type: Boolean, default: false } },
    wednesday: { open: String, close: String, closed: { type: Boolean, default: false } },
    thursday: { open: String, close: String, closed: { type: Boolean, default: false } },
    friday: { open: String, close: String, closed: { type: Boolean, default: false } },
    saturday: { open: String, close: String, closed: { type: Boolean, default: false } },
    sunday: { open: String, close: String, closed: { type: Boolean, default: false } }
  },

  // Settings
  settings: {
    currency: {
      type: String,
      default: 'INR'
    },
    timezone: {
      type: String,
      default: 'Asia/Kolkata'
    },
    tax_settings: {
      gst_enabled: {
        type: Boolean,
        default: true
      },
      gst_number: String,
      tax_inclusive: {
        type: Boolean,
        default: false
      }
    },
    pos_settings: {
      offline_mode: {
        type: Boolean,
        default: true
      },
      receipt_printer: String,
      barcode_scanner: String,
      cash_drawer: String
    }
  },

  // Status
  status: {
    type: String,
    enum: ['active', 'inactive', 'maintenance', 'closed'],
    default: 'active'
  },

  // Manager info
  manager_id: {
    type: String,
    default: null
  },
  staff_ids: [{
    type: String
  }],

  // Metrics
  metrics: {
    total_sales: {
      type: Number,
      default: 0
    },
    total_orders: {
      type: Number,
      default: 0
    },
    total_customers: {
      type: Number,
      default: 0
    },
    last_sale_date: {
      type: Date,
      default: null
    }
  },

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
storeSchema.index({ tenant_id: 1, code: 1 }, { unique: true });
storeSchema.index({ tenant_id: 1, org_id: 1 });
storeSchema.index({ tenant_id: 1, status: 1 });
storeSchema.index({ tenant_id: 1, 'address.coordinates': '2dsphere' });

// Instance methods
storeSchema.methods.isOpen = function() {
  const now = new Date();
  const day = now.toLocaleLowerCase().substring(0, 3);
  const currentTime = now.toTimeString().substring(0, 5);
  
  const dayHours = this.operating_hours[day];
  if (!dayHours || dayHours.closed) {
    return false;
  }
  
  return currentTime >= dayHours.open && currentTime <= dayHours.close;
};

storeSchema.methods.getDistance = function(latitude, longitude) {
  if (!this.address.coordinates) {
    return null;
  }
  
  const R = 6371; // Earth's radius in kilometers
  const dLat = (latitude - this.address.coordinates.latitude) * Math.PI / 180;
  const dLon = (longitude - this.address.coordinates.longitude) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(this.address.coordinates.latitude * Math.PI / 180) * Math.cos(latitude * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

module.exports = mongoose.model('Store', storeSchema);
