const mongoose = require('mongoose');

const organizationSchema = new mongoose.Schema({
  // Multi-tenancy
  tenant_id: {
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
  type: {
    type: String,
    enum: ['company', 'franchise', 'chain', 'individual'],
    default: 'company'
  },

  // Business details
  business_type: {
    type: String,
    enum: ['retail', 'wholesale', 'manufacturing', 'service', 'restaurant', 'other'],
    default: 'retail'
  },
  industry: {
    type: String,
    enum: ['optical', 'grocery', 'clothing', 'shoes', 'electronics', 'qsr', 'pharmacy', 'other'],
    default: 'retail'
  },

  // Contact info
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },
  website: {
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
    }
  },

  // Legal info
  legal_name: String,
  tax_id: String,
  gst_number: String,
  pan_number: String,

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
    date_format: {
      type: String,
      default: 'DD/MM/YYYY'
    },
    language: {
      type: String,
      default: 'en'
    }
  },

  // Status
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended'],
    default: 'active'
  },

  // Hierarchy
  parent_org_id: {
    type: String,
    default: null
  },
  level: {
    type: Number,
    default: 0
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
organizationSchema.index({ tenant_id: 1, name: 1 });
organizationSchema.index({ tenant_id: 1, status: 1 });
organizationSchema.index({ tenant_id: 1, parent_org_id: 1 });

module.exports = mongoose.model('Organization', organizationSchema);
