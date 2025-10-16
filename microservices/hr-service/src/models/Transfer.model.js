const mongoose = require('mongoose');

const transferSchema = new mongoose.Schema({
  // Employee Information
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  employee_id: {
    type: String,
    required: true,
    trim: true,
    uppercase: true
  },

  // Transfer Details
  transfer_type: {
    type: String,
    enum: ['store_transfer', 'department_transfer', 'role_transfer', 'location_transfer'],
    required: true
  },
  reason: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000
  },
  request_date: {
    type: Date,
    required: true,
    default: Date.now
  },
  effective_date: {
    type: Date,
    required: true
  },

  // From Details
  from_store: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store',
    required: true
  },
  from_department: {
    type: String,
    required: true,
    trim: true
  },
  from_designation: {
    type: String,
    required: true,
    trim: true
  },
  from_manager: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  // To Details
  to_store: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store',
    required: true
  },
  to_department: {
    type: String,
    required: true,
    trim: true
  },
  to_designation: {
    type: String,
    required: true,
    trim: true
  },
  to_manager: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  // Approval Workflow
  status: {
    type: String,
    enum: ['pending', 'approved_by_manager', 'approved_by_hr', 'approved', 'rejected', 'cancelled'],
    default: 'pending'
  },
  approval_workflow: [{
    approver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    approver_role: {
      type: String,
      enum: ['manager', 'hr', 'admin'],
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    },
    comments: {
      type: String,
      trim: true,
      maxlength: 500
    },
    approved_at: {
      type: Date
    }
  }],

  // Final Approval
  approved_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approved_at: {
    type: Date
  },
  approval_notes: {
    type: String,
    trim: true,
    maxlength: 1000
  },

  // Rejection Details
  rejected_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  rejected_at: {
    type: Date
  },
  rejection_reason: {
    type: String,
    trim: true,
    maxlength: 1000
  },

  // Transfer Execution
  is_executed: {
    type: Boolean,
    default: false
  },
  executed_at: {
    type: Date
  },
  executed_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  // Additional Information
  documents: [{
    name: String,
    url: String,
    uploaded_at: Date
  }],
  notes: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  hr_notes: {
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

// Indexes
transferSchema.index({ employee: 1, request_date: -1 });
transferSchema.index({ employee_id: 1, request_date: -1 });
transferSchema.index({ status: 1 });
transferSchema.index({ transfer_type: 1 });
transferSchema.index({ from_store: 1, to_store: 1 });
transferSchema.index({ effective_date: 1 });
transferSchema.index({ created_at: -1 });

// Compound indexes for efficient queries
transferSchema.index({ employee: 1, status: 1 });
transferSchema.index({ status: 1, effective_date: 1 });
transferSchema.index({ from_store: 1, status: 1 });
transferSchema.index({ to_store: 1, status: 1 });

// Virtual for transfer duration
transferSchema.virtual('transfer_duration').get(function() {
  if (this.request_date && this.effective_date) {
    const diffTime = Math.abs(this.effective_date - this.request_date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }
  return 0;
});

// Virtual for is pending approval
transferSchema.virtual('is_pending_approval').get(function() {
  return this.status === 'pending' || this.status === 'approved_by_manager';
});

// Virtual for is approved
transferSchema.virtual('is_approved').get(function() {
  return this.status === 'approved';
});

// Virtual for is rejected
transferSchema.virtual('is_rejected').get(function() {
  return this.status === 'rejected';
});

// Pre-save middleware to set employee_id
transferSchema.pre('save', async function(next) {
  if (this.isNew && this.employee && !this.employee_id) {
    const user = await mongoose.model('User').findById(this.employee);
    if (user) {
      this.employee_id = user.employee_id;
    }
  }
  next();
});

// Pre-save middleware to validate effective date
transferSchema.pre('save', function(next) {
  if (this.effective_date && this.effective_date < this.request_date) {
    return next(new Error('Effective date cannot be before request date'));
  }
  next();
});

// Static method to find by employee
transferSchema.statics.findByEmployee = function(employeeId) {
  return this.find({ employee: employeeId }).sort({ request_date: -1 });
};

// Static method to find pending transfers
transferSchema.statics.findPendingTransfers = function() {
  return this.find({ 
    status: { $in: ['pending', 'approved_by_manager'] }
  }).populate('employee', 'name employee_id').populate('from_store to_store', 'name code');
};

// Static method to find transfers by store
transferSchema.statics.findByStore = function(storeId, type = 'from') {
  const query = type === 'from' ? { from_store: storeId } : { to_store: storeId };
  return this.find(query).sort({ request_date: -1 });
};

// Static method to find transfers by date range
transferSchema.statics.findByDateRange = function(startDate, endDate) {
  return this.find({
    request_date: { $gte: startDate, $lte: endDate }
  }).sort({ request_date: -1 });
};

// Static method to find transfers requiring approval
transferSchema.statics.findRequiringApproval = function(approverId) {
  return this.find({
    'approval_workflow.approver': approverId,
    'approval_workflow.status': 'pending'
  }).populate('employee', 'name employee_id').populate('from_store to_store', 'name code');
};

// Static method to get transfer statistics
transferSchema.statics.getTransferStats = async function(startDate, endDate) {
  const pipeline = [
    {
      $match: {
        request_date: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ];

  const statusStats = await this.aggregate(pipeline);

  const typeStats = await this.aggregate([
    {
      $match: {
        request_date: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: '$transfer_type',
        count: { $sum: 1 }
      }
    }
  ]);

  return {
    statusStats,
    typeStats
  };
};

// Instance method to add approval
transferSchema.methods.addApproval = function(approverId, approverRole, status, comments) {
  const approval = {
    approver: approverId,
    approver_role: approverRole,
    status: status,
    comments: comments,
    approved_at: new Date()
  };

  this.approval_workflow.push(approval);
  
  // Update overall status based on approval
  if (status === 'approved') {
    if (approverRole === 'manager') {
      this.status = 'approved_by_manager';
    } else if (approverRole === 'hr' || approverRole === 'admin') {
      this.status = 'approved';
      this.approved_by = approverId;
      this.approved_at = new Date();
    }
  } else if (status === 'rejected') {
    this.status = 'rejected';
    this.rejected_by = approverId;
    this.rejected_at = new Date();
    this.rejection_reason = comments;
  }

  return this.save();
};

// Instance method to execute transfer
transferSchema.methods.executeTransfer = async function(executedBy) {
  if (this.status !== 'approved') {
    throw new Error('Transfer must be approved before execution');
  }

  if (this.is_executed) {
    throw new Error('Transfer has already been executed');
  }

  // Update employee details
  const employee = await mongoose.model('User').findById(this.employee);
  if (employee) {
    employee.stores = [this.to_store];
    employee.primary_store = this.to_store;
    employee.department = this.to_department;
    employee.designation = this.to_designation;
    employee.reporting_manager = this.to_manager;
    await employee.save();
  }

  // Mark transfer as executed
  this.is_executed = true;
  this.executed_at = new Date();
  this.executed_by = executedBy;

  return this.save();
};

// Instance method to cancel transfer
transferSchema.methods.cancelTransfer = function(cancelledBy, reason) {
  if (this.status === 'executed') {
    throw new Error('Cannot cancel an executed transfer');
  }

  this.status = 'cancelled';
  this.cancelled_by = cancelledBy;
  this.cancelled_at = new Date();
  this.cancellation_reason = reason;

  return this.save();
};

// Instance method to get transfer summary
transferSchema.methods.getSummary = function() {
  return {
    id: this._id,
    employee_id: this.employee_id,
    transfer_type: this.transfer_type,
    from_store: this.from_store,
    to_store: this.to_store,
    status: this.status,
    request_date: this.request_date,
    effective_date: this.effective_date,
    is_executed: this.is_executed
  };
};

module.exports = mongoose.model('Transfer', transferSchema);