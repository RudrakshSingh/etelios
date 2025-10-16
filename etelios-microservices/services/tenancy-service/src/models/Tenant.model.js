const mongoose = require('mongoose');

const tenantSchema = new mongoose.Schema({
  // Basic info
  name: {
    type: String,
    required: true,
    trim: true
  },
  domain: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  subdomain: {
    type: String,
    unique: true,
    lowercase: true,
    trim: true
  },

  // Status
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended', 'pending'],
    default: 'pending'
  },

  // Billing & Plans
  plan: {
    type: String,
    enum: ['starter', 'growth', 'enterprise'],
    default: 'starter'
  },
  billing_status: {
    type: String,
    enum: ['active', 'past_due', 'canceled', 'unpaid'],
    default: 'active'
  },
  billing_email: {
    type: String,
    required: true
  },

  // Limits & Entitlements
  limits: {
    stores: {
      type: Number,
      default: 1
    },
    users: {
      type: Number,
      default: 5
    },
    skus: {
      type: Number,
      default: 5000
    },
    api_calls_per_month: {
      type: Number,
      default: 10000
    },
    storage_gb: {
      type: Number,
      default: 10
    }
  },

  // Usage tracking
  usage: {
    stores: {
      type: Number,
      default: 0
    },
    users: {
      type: Number,
      default: 0
    },
    skus: {
      type: Number,
      default: 0
    },
    api_calls_current_month: {
      type: Number,
      default: 0
    },
    storage_used_gb: {
      type: Number,
      default: 0
    }
  },

  // Feature flags
  features: {
    offline_pos: {
      type: Boolean,
      default: true
    },
    analytics: {
      type: Boolean,
      default: false
    },
    loyalty: {
      type: Boolean,
      default: false
    },
    multi_channel: {
      type: Boolean,
      default: false
    },
    api_access: {
      type: Boolean,
      default: false
    },
    white_label: {
      type: Boolean,
      default: false
    },
    sso: {
      type: Boolean,
      default: false
    }
  },

  // Branding & White-labeling
  branding: {
    logo: String,
    primary_color: String,
    secondary_color: String,
    font_family: String,
    custom_css: String
  },

  // Data residency
  region: {
    type: String,
    default: 'us-east-1'
  },
  data_residency: {
    type: String,
    enum: ['us', 'eu', 'ap', 'in'],
    default: 'us'
  },

  // Database isolation
  isolation_mode: {
    type: String,
    enum: ['schema_per_tenant', 'db_per_tenant', 'row_level'],
    default: 'schema_per_tenant'
  },
  database_name: String,

  // Timestamps
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  },
  trial_ends_at: {
    type: Date,
    default: () => new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // 14 days trial
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// Indexes
tenantSchema.index({ domain: 1 }, { unique: true });
tenantSchema.index({ subdomain: 1 }, { unique: true });
tenantSchema.index({ status: 1 });
tenantSchema.index({ plan: 1 });
tenantSchema.index({ region: 1 });

// Instance methods
tenantSchema.methods.isWithinLimits = function() {
  return (
    this.usage.stores <= this.limits.stores &&
    this.usage.users <= this.limits.users &&
    this.usage.skus <= this.limits.skus &&
    this.usage.storage_used_gb <= this.limits.storage_gb
  );
};

tenantSchema.methods.hasFeature = function(feature) {
  return this.features[feature] === true;
};

tenantSchema.methods.isTrialExpired = function() {
  return this.trial_ends_at && this.trial_ends_at < new Date();
};

module.exports = mongoose.model('Tenant', tenantSchema);
