const mongoose = require('mongoose');

const assetSchema = new mongoose.Schema({
  // Asset Identification
  asset_id: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500
  },
  category: {
    type: String,
    required: true,
    enum: ['uniform', 'id_card', 'phone', 'laptop', 'desktop', 'tablet', 'monitor', 'keyboard', 'mouse', 'headphone', 'camera', 'printer', 'scanner', 'tool', 'other'],
    default: 'other'
  },
  subcategory: {
    type: String,
    trim: true,
    maxlength: 50
  },

  // Asset Details
  brand: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50
  },
  model: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  serial_number: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true
  },
  purchase_date: {
    type: Date,
    required: true
  },
  purchase_price: {
    type: Number,
    required: true,
    min: 0
  },
  warranty_expiry: {
    type: Date
  },
  supplier: {
    name: {
      type: String,
      trim: true,
      maxlength: 100
    },
    contact: {
      type: String,
      trim: true
    },
    email: {
      type: String,
      trim: true,
      lowercase: true
    }
  },

  // Asset Status
  status: {
    type: String,
    enum: ['available', 'assigned', 'maintenance', 'retired', 'lost', 'damaged'],
    default: 'available'
  },
  condition: {
    type: String,
    enum: ['excellent', 'good', 'fair', 'poor', 'damaged'],
    default: 'good'
  },
  is_active: {
    type: Boolean,
    default: true
  },

  // Assignment Information
  assigned_to: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  assigned_employee_id: {
    type: String,
    trim: true,
    uppercase: true
  },
  assigned_date: {
    type: Date
  },
  assigned_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  return_date: {
    type: Date
  },
  return_reason: {
    type: String,
    trim: true,
    maxlength: 500
  },

  // Asset Register Specific Fields
  asset_register: {
    // Employee Details
    employee_name: {
      type: String,
      trim: true,
      maxlength: 100
    },
    employee_code: {
      type: String,
      trim: true,
      uppercase: true
    },
    employee_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    designation: {
      type: String,
      trim: true,
      maxlength: 100
    },
    store_department: {
      type: String,
      trim: true,
      maxlength: 100
    },
    store_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Store'
    },
    joining_date: {
      type: Date
    },
    reporting_manager: {
      type: String,
      trim: true,
      maxlength: 100
    },
    reporting_manager_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },

    // Asset Issue Details
    issue_date: {
      type: Date
    },
    issued_by: {
      type: String,
      trim: true,
      maxlength: 100
    },
    condition_at_issue: {
      type: String,
      enum: ['new', 'used', 'excellent', 'good', 'fair'],
      default: 'new'
    },
    employee_signature: {
      type: String,
      trim: true
    },
    hr_admin_signature: {
      type: String,
      trim: true
    },
    acknowledgment_date: {
      type: Date
    },

    // Asset Return Details
    return_date: {
      type: Date
    },
    received_by: {
      type: String,
      trim: true,
      maxlength: 100
    },
    condition_at_return: {
      type: String,
      enum: ['good', 'damaged', 'working', 'missing', 'excellent', 'fair', 'poor'],
      default: 'good'
    },
    damage_remarks: {
      type: String,
      trim: true,
      maxlength: 500
    },
    return_employee_signature: {
      type: String,
      trim: true
    },
    return_hr_approval: {
      type: String,
      trim: true
    },
    return_approval_date: {
      type: Date
    },

    // Asset Specific Details
    uniform_size: {
      type: String,
      trim: true
    },
    id_card_number: {
      type: String,
      trim: true,
      uppercase: true
    },
    imei_number: {
      type: String,
      trim: true
    },
    serial_number_custom: {
      type: String,
      trim: true,
      uppercase: true
    },
    tool_specification: {
      type: String,
      trim: true,
      maxlength: 200
    },

    // Recovery and Alerts
    recovery_required: {
      type: Boolean,
      default: false
    },
    recovery_amount: {
      type: Number,
      min: 0,
      default: 0
    },
    recovery_reason: {
      type: String,
      trim: true,
      maxlength: 500
    },
    alert_sent: {
      type: Boolean,
      default: false
    },
    alert_sent_date: {
      type: Date
    },
    final_settlement_deducted: {
      type: Boolean,
      default: false
    }
  },

  // Location Information
  current_location: {
    store: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Store'
    },
    department: {
      type: String,
      trim: true
    },
    room: {
      type: String,
      trim: true
    },
    desk: {
      type: String,
      trim: true
    }
  },

  // Maintenance Information
  maintenance_history: [{
    date: {
      type: Date,
      required: true
    },
    type: {
      type: String,
      enum: ['repair', 'upgrade', 'cleaning', 'inspection', 'other'],
      required: true
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500
    },
    cost: {
      type: Number,
      min: 0
    },
    performed_by: {
      type: String,
      trim: true
    },
    next_maintenance_date: {
      type: Date
    }
  }],

  // Asset Specifications
  specifications: {
    processor: String,
    memory: String,
    storage: String,
    operating_system: String,
    screen_size: String,
    color: String,
    weight: String,
    dimensions: String,
    other: mongoose.Schema.Types.Mixed
  },

  // Documents and Images
  documents: [{
    name: String,
    type: String,
    url: String,
    uploaded_at: Date
  }],
  images: [{
    name: String,
    url: String,
    uploaded_at: Date
  }],

  // Notes and Comments
  notes: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  admin_notes: {
    type: String,
    trim: true,
    maxlength: 1000
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

// Compound indexes for efficient queries
assetSchema.index({ status: 1, category: 1 });
assetSchema.index({ assigned_to: 1, status: 1 });
assetSchema.index({ 'current_location.store': 1, status: 1 });

// Virtual for asset age
assetSchema.virtual('asset_age').get(function() {
  if (this.purchase_date) {
    const now = new Date();
    const diffTime = Math.abs(now - this.purchase_date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }
  return 0;
});

// Virtual for is assigned
assetSchema.virtual('is_assigned').get(function() {
  return this.status === 'assigned' && !!this.assigned_to;
});

// Virtual for is available
assetSchema.virtual('is_available').get(function() {
  return this.status === 'available' && this.is_active;
});

// Virtual for warranty status
assetSchema.virtual('warranty_status').get(function() {
  if (!this.warranty_expiry) return 'no_warranty';
  
  const now = new Date();
  if (now > this.warranty_expiry) return 'expired';
  
  const daysLeft = Math.ceil((this.warranty_expiry - now) / (1000 * 60 * 60 * 24));
  if (daysLeft <= 30) return 'expiring_soon';
  
  return 'active';
});

// Pre-save middleware to set assigned_employee_id
assetSchema.pre('save', async function(next) {
  if (this.isNew && this.assigned_to && !this.assigned_employee_id) {
    const user = await mongoose.model('User').findById(this.assigned_to);
    if (user) {
      this.assigned_employee_id = user.employee_id;
    }
  }
  next();
});

// Pre-save middleware to validate assignment
assetSchema.pre('save', function(next) {
  if (this.status === 'assigned' && !this.assigned_to) {
    return next(new Error('Asset must be assigned to a user when status is assigned'));
  }
  if (this.status !== 'assigned' && this.assigned_to) {
    this.assigned_to = undefined;
    this.assigned_employee_id = undefined;
    this.assigned_date = undefined;
    this.assigned_by = undefined;
  }
  next();
});

// Static method to find by asset ID
assetSchema.statics.findByAssetId = function(assetId) {
  return this.findOne({ asset_id: assetId.toUpperCase() });
};

// Static method to find by serial number
assetSchema.statics.findBySerialNumber = function(serialNumber) {
  return this.findOne({ serial_number: serialNumber.toUpperCase() });
};

// Static method to find available assets
assetSchema.statics.findAvailableAssets = function() {
  return this.find({ status: 'available', is_active: true });
};

// Static method to find by category
assetSchema.statics.findByCategory = function(category) {
  return this.find({ category, is_active: true });
};

// Static method to find by assigned user
assetSchema.statics.findByAssignedUser = function(userId) {
  return this.find({ assigned_to: userId, status: 'assigned' });
};

// Static method to find by store
assetSchema.statics.findByStore = function(storeId) {
  return this.find({ 'current_location.store': storeId, is_active: true });
};

// Static method to find assets requiring maintenance
assetSchema.statics.findRequiringMaintenance = function() {
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
  
  return this.find({
    is_active: true,
    $or: [
      { warranty_expiry: { $lte: thirtyDaysFromNow } },
      { 'maintenance_history.next_maintenance_date': { $lte: thirtyDaysFromNow } }
    ]
  });
};

// Static method to get asset statistics
assetSchema.statics.getAssetStats = async function() {
  const statusStats = await this.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalValue: { $sum: '$purchase_price' }
      }
    }
  ]);

  const categoryStats = await this.aggregate([
    {
      $group: {
        _id: '$category',
        count: { $sum: 1 },
        totalValue: { $sum: '$purchase_price' }
      }
    }
  ]);

  const conditionStats = await this.aggregate([
    {
      $group: {
        _id: '$condition',
        count: { $sum: 1 }
      }
    }
  ]);

  return {
    statusStats,
    categoryStats,
    conditionStats
  };
};

// Instance method to assign asset
assetSchema.methods.assignAsset = function(userId, assignedBy, notes) {
  if (this.status !== 'available') {
    throw new Error('Asset must be available to assign');
  }

  this.status = 'assigned';
  this.assigned_to = userId;
  this.assigned_date = new Date();
  this.assigned_by = assignedBy;
  this.notes = notes;

  return this.save();
};

// Instance method to return asset
assetSchema.methods.returnAsset = function(returnReason, returnedBy) {
  if (this.status !== 'assigned') {
    throw new Error('Asset must be assigned to return');
  }

  this.status = 'available';
  this.return_date = new Date();
  this.return_reason = returnReason;
  this.assigned_to = undefined;
  this.assigned_employee_id = undefined;
  this.assigned_date = undefined;
  this.assigned_by = undefined;

  return this.save();
};

// Instance method to add maintenance record
assetSchema.methods.addMaintenanceRecord = function(maintenanceData) {
  this.maintenance_history.push({
    ...maintenanceData,
    date: new Date()
  });

  return this.save();
};

// Instance method to update condition
assetSchema.methods.updateCondition = function(condition, notes, updatedBy) {
  this.condition = condition;
  this.notes = notes;
  this.updated_by = updatedBy;

  return this.save();
};

// Instance method to get asset summary
assetSchema.methods.getSummary = function() {
  return {
    asset_id: this.asset_id,
    name: this.name,
    category: this.category,
    brand: this.brand,
    model: this.model,
    status: this.status,
    condition: this.condition,
    assigned_to: this.assigned_to,
    current_location: this.current_location
  };
};

// Instance method to issue asset with register details
assetSchema.methods.issueAssetWithRegister = function(registerData, issuedBy) {
  if (this.status !== 'available') {
    throw new Error('Asset must be available to issue');
  }

  this.status = 'assigned';
  this.assigned_to = registerData.employee_id;
  this.assigned_date = new Date();
  this.assigned_by = issuedBy;
  
  // Update asset register details
  this.asset_register = {
    ...this.asset_register,
    ...registerData,
    issue_date: new Date(),
    issued_by: issuedBy,
    acknowledgment_date: new Date()
  };

  return this.save();
};

// Instance method to return asset with register details
assetSchema.methods.returnAssetWithRegister = function(returnData, receivedBy) {
  if (this.status !== 'assigned') {
    throw new Error('Asset must be assigned to return');
  }

  this.status = 'available';
  this.return_date = new Date();
  this.return_reason = returnData.return_reason;
  this.assigned_to = undefined;
  this.assigned_employee_id = undefined;
  this.assigned_date = undefined;
  this.assigned_by = undefined;

  // Update asset register return details
  this.asset_register = {
    ...this.asset_register,
    return_date: new Date(),
    received_by: receivedBy,
    condition_at_return: returnData.condition_at_return,
    damage_remarks: returnData.damage_remarks,
    return_approval_date: new Date()
  };

  return this.save();
};

// Instance method to acknowledge asset receipt
assetSchema.methods.acknowledgeAsset = function(acknowledgmentData) {
  this.asset_register = {
    ...this.asset_register,
    employee_signature: acknowledgmentData.employee_signature,
    hr_admin_signature: acknowledgmentData.hr_admin_signature,
    acknowledgment_date: new Date()
  };

  return this.save();
};

// Instance method to mark recovery required
assetSchema.methods.markRecoveryRequired = function(recoveryData) {
  this.asset_register = {
    ...this.asset_register,
    recovery_required: true,
    recovery_amount: recoveryData.amount,
    recovery_reason: recoveryData.reason
  };

  return this.save();
};

// Instance method to send alert for unreturned asset
assetSchema.methods.sendAlert = function() {
  this.asset_register = {
    ...this.asset_register,
    alert_sent: true,
    alert_sent_date: new Date()
  };

  return this.save();
};

// Static method to find assets requiring return alerts
assetSchema.statics.findAssetsRequiringAlerts = function() {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  return this.find({
    status: 'assigned',
    'asset_register.alert_sent': false,
    assigned_date: { $lte: thirtyDaysAgo }
  });
};

// Static method to find assets with recovery required
assetSchema.statics.findAssetsWithRecovery = function() {
  return this.find({
    'asset_register.recovery_required': true,
    'asset_register.final_settlement_deducted': false
  });
};

module.exports = mongoose.model('Asset', assetSchema);