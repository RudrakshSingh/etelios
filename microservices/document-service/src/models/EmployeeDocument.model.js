const mongoose = require('mongoose');

const employeeDocumentSchema = new mongoose.Schema({
  employee_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  document_type: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DocumentType',
    required: true
  },
  document_name: {
    type: String,
    required: true
  },
  file_path: {
    type: String,
    required: true
  },
  file_name: {
    type: String,
    required: true
  },
  file_size: {
    type: Number,
    required: true
  },
  file_type: {
    type: String,
    required: true
  },
  version: {
    type: Number,
    default: 1
  },
  is_latest: {
    type: Boolean,
    default: true
  },
  status: {
    type: String,
    enum: ['DRAFT', 'PENDING_SIGNATURE', 'SIGNED', 'EXPIRED', 'ARCHIVED', 'REJECTED'],
    default: 'DRAFT'
  },
  esign_status: {
    type: String,
    enum: ['PENDING', 'SIGNED', 'VERIFIED', 'FAILED'],
    default: 'PENDING'
  },
  esign_provider: {
    type: String,
    enum: ['DIGILOCKER', 'DIGIO', 'DOCUSIGN', 'AADHAAR', 'MANUAL'],
    default: 'MANUAL'
  },
  esign_data: {
    signature_id: String,
    transaction_id: String,
    signed_at: Date,
    signer_ip: String,
    signer_device: String,
    verification_status: {
      type: String,
      enum: ['PENDING', 'VERIFIED', 'FAILED'],
      default: 'PENDING'
    },
    digilocker_verification: {
      is_verified: Boolean,
      verification_id: String,
      verified_at: Date,
      aadhaar_verified: Boolean,
      document_hash: String
    }
  },
  expiry_date: {
    type: Date,
    default: null
  },
  reminder_sent: {
    type: Boolean,
    default: false
  },
  uploaded_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  signed_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  signed_at: {
    type: Date
  },
  // Rejection information
  rejection_reason: {
    type: String,
    default: null
  },
  rejected_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  rejected_at: {
    type: Date,
    default: null
  },
  verification_notes: {
    type: String,
    default: ''
  },
  audit_log: [{
    action: String,
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    details: mongoose.Schema.Types.Mixed
  }],
  comments: [{
    comment: String,
    added_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    added_at: {
      type: Date,
      default: Date.now
    }
  }],
  change_log: [{
    action: {
      type: String,
      enum: ['UPLOADED', 'SIGNED', 'UPDATED', 'ARCHIVED', 'EXPIRED']
    },
    performed_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    performed_at: {
      type: Date,
      default: Date.now
    },
    details: String
  }],
  access_permissions: [{
    role: {
      type: String,
      enum: ['HR', 'ADMIN', 'MANAGER', 'ACCOUNTS', 'EMPLOYEE']
    },
    can_view: {
      type: Boolean,
      default: false
    },
    can_download: {
      type: Boolean,
      default: false
    },
    can_upload: {
      type: Boolean,
      default: false
    }
  }],
  is_encrypted: {
    type: Boolean,
    default: true
  },
  encryption_key: {
    type: String
  },
  digilocker_integration: {
    is_enabled: {
      type: Boolean,
      default: false
    },
    digilocker_id: String,
    document_uri: String,
    verification_token: String,
    last_sync: Date,
    sync_status: {
      type: String,
      enum: ['PENDING', 'SYNCED', 'FAILED'],
      default: 'PENDING'
    }
  }
}, {
  timestamps: true
});

// Indexes
employeeDocumentSchema.index({ employee_id: 1, document_type: 1, is_latest: 1 });
employeeDocumentSchema.index({ status: 1, esign_status: 1 });
employeeDocumentSchema.index({ expiry_date: 1 });
employeeDocumentSchema.index({ 'digilocker_integration.digilocker_id': 1 });

// Pre-save middleware to update change log
employeeDocumentSchema.pre('save', function(next) {
  if (this.isModified() && !this.isNew) {
    this.change_log.push({
      action: 'UPDATED',
      performed_by: this.uploaded_by,
      details: 'Document updated'
    });
  }
  next();
});

// Instance method to archive old versions
employeeDocumentSchema.methods.archiveOldVersions = async function() {
  await this.constructor.updateMany(
    { 
      employee_id: this.employee_id, 
      document_type: this.document_type,
      _id: { $ne: this._id }
    },
    { is_latest: false, status: 'ARCHIVED' }
  );
};

// Instance method to check if document is expiring soon
employeeDocumentSchema.methods.isExpiringSoon = function(days = 30) {
  if (!this.expiry_date) return false;
  const daysUntilExpiry = Math.ceil((this.expiry_date - new Date()) / (1000 * 60 * 60 * 24));
  return daysUntilExpiry <= days && daysUntilExpiry > 0;
};

// Static method to get pending signatures
employeeDocumentSchema.statics.getPendingSignatures = function(employeeId = null) {
  const query = { 
    status: 'PENDING_SIGNATURE',
    esign_status: 'PENDING'
  };
  
  if (employeeId) {
    query.employee_id = employeeId;
  }
  
  return this.find(query)
    .populate('employee_id', 'name employee_id email')
    .populate('document_type', 'name category is_mandatory')
    .sort({ created_at: -1 });
};

// Static method to get expiring documents
employeeDocumentSchema.statics.getExpiringDocuments = function(days = 30) {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + days);
  
  return this.find({
    expiry_date: { $lte: futureDate, $gte: new Date() },
    status: { $ne: 'EXPIRED' }
  })
    .populate('employee_id', 'name employee_id email')
    .populate('document_type', 'name category')
    .sort({ expiry_date: 1 });
};

// Static method to get compliance status
employeeDocumentSchema.statics.getComplianceStatus = function() {
  return this.aggregate([
    {
      $group: {
        _id: '$document_type',
        total: { $sum: 1 },
        signed: {
          $sum: {
            $cond: [{ $eq: ['$esign_status', 'SIGNED'] }, 1, 0]
          }
        },
        pending: {
          $sum: {
            $cond: [{ $eq: ['$esign_status', 'PENDING'] }, 1, 0]
          }
        }
      }
    },
    {
      $lookup: {
        from: 'documenttypes',
        localField: '_id',
        foreignField: '_id',
        as: 'document_type_info'
      }
    },
    {
      $unwind: '$document_type_info'
    },
    {
      $project: {
        document_type: '$document_type_info.name',
        category: '$document_type_info.category',
        total: 1,
        signed: 1,
        pending: 1,
        compliance_percentage: {
          $multiply: [
            { $divide: ['$signed', '$total'] },
            100
          ]
        }
      }
    }
  ]);
};

module.exports = mongoose.model('EmployeeDocument', employeeDocumentSchema);
