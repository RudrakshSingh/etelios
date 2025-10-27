const mongoose = require('mongoose');

const emergencyLockSchema = new mongoose.Schema({
  // Lock identification
  lockId: {
    type: String,
    required: true,
    unique: true,
    default: () => `lock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  },
  
  // Tenant information
  tenantId: {
    type: String,
    required: true,
    index: true
  },
  
  // Lock status
  isLocked: {
    type: Boolean,
    default: false,
    index: true
  },
  
  // Lock details
  lockReason: {
    type: String,
    enum: ['sos_emergency', 'security_breach', 'maintenance', 'compliance', 'custom'],
    required: true
  },
  
  lockDescription: {
    type: String,
    required: true,
    maxlength: 500
  },
  
  // Who triggered the lock
  triggeredBy: {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    userRole: {
      type: String,
      required: true,
      enum: ['superadmin', 'admin', 'store_manager']
    },
    userName: {
      type: String,
      required: true
    },
    userEmail: {
      type: String,
      required: true
    }
  },
  
  // Lock timing
  lockedAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  
  // Recovery keys
  recoveryKeys: {
    customerKey: {
      type: String,
      required: true,
      minlength: 16,
      maxlength: 32
    },
    eteliosKey: {
      type: String,
      required: true,
      minlength: 16,
      maxlength: 32
    },
    keyHash: {
      type: String,
      required: true
    }
  },
  
  // Recovery attempts
  recoveryAttempts: [{
    attemptedAt: {
      type: Date,
      default: Date.now
    },
    customerKeyProvided: String,
    eteliosKeyProvided: String,
    ipAddress: String,
    userAgent: String,
    success: {
      type: Boolean,
      default: false
    },
    failureReason: String
  }],
  
  // Recovery details
  recoveredBy: {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    userName: String,
    userEmail: String,
    recoveredAt: Date,
    recoveryMethod: {
      type: String,
      enum: ['dual_key', 'admin_override', 'emergency_contact']
    }
  },
  
  // Lock configuration
  lockConfig: {
    allowPartialAccess: {
      type: Boolean,
      default: false
    },
    allowedModules: [{
      type: String,
      enum: ['auth', 'hr', 'attendance', 'payroll', 'crm', 'inventory', 'sales', 'purchase', 'financial', 'document', 'service', 'cpp', 'prescription', 'analytics', 'notification', 'monitoring']
    }],
    lockMessage: {
      type: String,
      default: 'Sorry, the software has crashed. Please contact your administrator or Etelios support for recovery.',
      maxlength: 1000
    },
    customLockMessage: String,
    showRecoveryForm: {
      type: Boolean,
      default: true
    },
    maxRecoveryAttempts: {
      type: Number,
      default: 5
    },
    lockTimeout: {
      type: Number,
      default: 24 * 60 * 60 * 1000 // 24 hours in milliseconds
    }
  },
  
  // Emergency contacts
  emergencyContacts: [{
    name: String,
    email: String,
    phone: String,
    role: String,
    priority: {
      type: Number,
      default: 1
    }
  }],
  
  // Audit trail
  auditLog: [{
    action: {
      type: String,
      enum: ['lock_triggered', 'recovery_attempted', 'recovery_successful', 'recovery_failed', 'lock_extended', 'lock_modified', 'emergency_contact_notified']
    },
    performedBy: String,
    performedAt: {
      type: Date,
      default: Date.now
    },
    details: String,
    ipAddress: String,
    userAgent: String
  }],
  
  // Status tracking
  status: {
    type: String,
    enum: ['active', 'recovered', 'expired', 'cancelled'],
    default: 'active',
    index: true
  },
  
  // Metadata
  metadata: {
    clientVersion: String,
    serverVersion: String,
    environment: {
      type: String,
      enum: ['development', 'staging', 'production'],
      default: 'production'
    },
    lockSource: {
      type: String,
      enum: ['web_interface', 'api_call', 'admin_panel', 'emergency_button'],
      default: 'emergency_button'
    }
  }
}, {
  timestamps: true
});

// Indexes for performance
emergencyLockSchema.index({ tenantId: 1, isLocked: 1 });
emergencyLockSchema.index({ lockedAt: -1 });
emergencyLockSchema.index({ status: 1, isLocked: 1 });
emergencyLockSchema.index({ 'triggeredBy.userId': 1 });

// Pre-save middleware to hash recovery keys
emergencyLockSchema.pre('save', async function(next) {
  if (this.isModified('recoveryKeys')) {
    const crypto = require('crypto');
    const combinedKeys = this.recoveryKeys.customerKey + this.recoveryKeys.eteliosKey;
    this.recoveryKeys.keyHash = crypto.createHash('sha256').update(combinedKeys).digest('hex');
  }
  next();
});

// Static methods
emergencyLockSchema.statics.createEmergencyLock = async function(lockData) {
  const crypto = require('crypto');
  
  // Generate secure recovery keys
  const customerKey = crypto.randomBytes(16).toString('hex');
  const eteliosKey = crypto.randomBytes(16).toString('hex');
  
  const lock = new this({
    ...lockData,
    recoveryKeys: {
      customerKey,
      eteliosKey,
      keyHash: crypto.createHash('sha256').update(customerKey + eteliosKey).digest('hex')
    }
  });
  
  return await lock.save();
};

emergencyLockSchema.statics.verifyRecoveryKeys = async function(lockId, customerKey, eteliosKey) {
  const lock = await this.findOne({ lockId, isLocked: true });
  if (!lock) {
    throw new Error('Lock not found or not active');
  }
  
  const crypto = require('crypto');
  const providedHash = crypto.createHash('sha256').update(customerKey + eteliosKey).digest('hex');
  
  return providedHash === lock.recoveryKeys.keyHash;
};

emergencyLockSchema.statics.getActiveLock = async function(tenantId) {
  return await this.findOne({ 
    tenantId, 
    isLocked: true, 
    status: 'active',
    lockedAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Within 24 hours
  });
};

// Instance methods
emergencyLockSchema.methods.addRecoveryAttempt = function(attemptData) {
  this.recoveryAttempts.push({
    ...attemptData,
    attemptedAt: new Date()
  });
  
  // Add to audit log
  this.auditLog.push({
    action: 'recovery_attempted',
    performedAt: new Date(),
    details: `Recovery attempt ${attemptData.success ? 'successful' : 'failed'}`,
    ...attemptData
  });
  
  return this.save();
};

emergencyLockSchema.methods.recover = function(recoveryData) {
  this.isLocked = false;
  this.status = 'recovered';
  this.recoveredBy = {
    ...recoveryData,
    recoveredAt: new Date()
  };
  
  // Add to audit log
  this.auditLog.push({
    action: 'recovery_successful',
    performedAt: new Date(),
    details: 'System successfully recovered',
    ...recoveryData
  });
  
  return this.save();
};

emergencyLockSchema.methods.extendLock = function(extensionData) {
  this.lockConfig.lockTimeout += extensionData.additionalHours * 60 * 60 * 1000;
  
  // Add to audit log
  this.auditLog.push({
    action: 'lock_extended',
    performedAt: new Date(),
    details: `Lock extended by ${extensionData.additionalHours} hours`,
    ...extensionData
  });
  
  return this.save();
};

const EmergencyLock = mongoose.model('EmergencyLock', emergencyLockSchema);

module.exports = EmergencyLock;
