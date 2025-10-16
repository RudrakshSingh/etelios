const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
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
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  phone: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 8
  },

  // Profile
  first_name: {
    type: String,
    required: true,
    trim: true
  },
  last_name: {
    type: String,
    required: true,
    trim: true
  },
  avatar: {
    type: String,
    default: null
  },

  // Status
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended', 'pending'],
    default: 'pending'
  },
  email_verified: {
    type: Boolean,
    default: false
  },
  phone_verified: {
    type: Boolean,
    default: false
  },

  // Roles and permissions
  roles: [{
    type: String,
    enum: ['super_admin', 'tenant_admin', 'store_manager', 'staff', 'customer']
  }],
  permissions: [{
    type: String
  }],

  // Store/Channel context
  store_ids: [{
    type: String
  }],
  channel_ids: [{
    type: String
  }],

  // Security
  last_login: {
    type: Date,
    default: null
  },
  login_attempts: {
    type: Number,
    default: 0
  },
  locked_until: {
    type: Date,
    default: null
  },

  // MFA
  mfa_enabled: {
    type: Boolean,
    default: false
  },
  mfa_secret: {
    type: String,
    default: null
  },

  // API Keys
  api_keys: [{
    key: String,
    name: String,
    permissions: [String],
    expires_at: Date,
    created_at: {
      type: Date,
      default: Date.now
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

// Indexes for multi-tenancy
userSchema.index({ tenant_id: 1, email: 1 }, { unique: true });
userSchema.index({ tenant_id: 1, phone: 1 }, { unique: true });
userSchema.index({ tenant_id: 1, org_id: 1 });
userSchema.index({ tenant_id: 1, status: 1 });

// Pre-save middleware
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Instance methods
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.isLocked = function() {
  return !!(this.locked_until && this.locked_until > Date.now());
};

userSchema.methods.incLoginAttempts = function() {
  // If we have a previous lock that has expired, restart at 1
  if (this.locked_until && this.locked_until < Date.now()) {
    return this.updateOne({
      $unset: { locked_until: 1 },
      $set: { login_attempts: 1 }
    });
  }
  
  const updates = { $inc: { login_attempts: 1 } };
  
  // Lock account after 5 failed attempts for 2 hours
  if (this.login_attempts + 1 >= 5 && !this.isLocked()) {
    updates.$set = { locked_until: Date.now() + 2 * 60 * 60 * 1000 };
  }
  
  return this.updateOne(updates);
};

userSchema.methods.resetLoginAttempts = function() {
  return this.updateOne({
    $unset: { login_attempts: 1, locked_until: 1 }
  });
};

userSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.password;
  delete user.mfa_secret;
  return user;
};

module.exports = mongoose.model('User', userSchema);