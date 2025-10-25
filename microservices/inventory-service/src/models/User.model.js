const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  phone: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  employeeId: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  role: {
    type: String,
    required: true,
    enum: ['admin', 'manager', 'employee', 'inventory_manager', 'store_manager', 'accountant'],
    default: 'employee'
  },
  department: {
    type: String,
    required: true,
    trim: true
  },
  position: {
    type: String,
    required: true,
    trim: true
  },
  storeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store',
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended'],
    default: 'active'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  permissions: [{
    type: String,
    trim: true
  }],
  lastLogin: {
    type: Date
  },
  profile: {
    avatar: { type: String },
    bio: { type: String, trim: true },
    dateOfBirth: { type: Date },
    address: {
      street: { type: String, trim: true },
      city: { type: String, trim: true },
      state: { type: String, trim: true },
      pincode: { type: String, trim: true },
      country: { type: String, trim: true, default: 'India' }
    }
  },
  settings: {
    notifications: {
      email: { type: Boolean, default: true },
      sms: { type: Boolean, default: false },
      push: { type: Boolean, default: true }
    },
    preferences: {
      language: { type: String, default: 'en' },
      timezone: { type: String, default: 'Asia/Kolkata' },
      theme: { type: String, default: 'light' }
    }
  }
}, {
  timestamps: true
});

// Indexes for better query performance
userSchema.index({ email: 1 });
userSchema.index({ phone: 1 });
userSchema.index({ employeeId: 1 });
userSchema.index({ role: 1 });
userSchema.index({ department: 1 });
userSchema.index({ storeId: 1 });
userSchema.index({ status: 1 });
userSchema.index({ isActive: 1 });

// Virtual for full name
userSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Virtual for full address
userSchema.virtual('fullAddress').get(function() {
  const { street, city, state, pincode, country } = this.profile.address;
  return [street, city, state, pincode, country].filter(Boolean).join(', ');
});

// Pre-save middleware to set default permissions based on role
userSchema.pre('save', function(next) {
  if (this.isNew && !this.permissions.length) {
    switch (this.role) {
      case 'admin':
        this.permissions = ['read', 'write', 'delete', 'admin'];
        break;
      case 'manager':
        this.permissions = ['read', 'write'];
        break;
      case 'inventory_manager':
        this.permissions = ['read', 'write', 'inventory:manage'];
        break;
      case 'store_manager':
        this.permissions = ['read', 'write', 'store:manage'];
        break;
      default:
        this.permissions = ['read'];
    }
  }
  next();
});

module.exports = mongoose.model('User', userSchema);
