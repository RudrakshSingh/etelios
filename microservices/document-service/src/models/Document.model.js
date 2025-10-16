const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const documentSchema = new mongoose.Schema({
  // Document identification
  document_id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  
  // Employee association
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  employee_id: {
    type: String,
    required: true,
    index: true
  },
  
  // Document metadata
  title: {
    type: String,
    required: true,
    trim: true
  },
  document_type: {
    type: String,
    required: true,
    enum: [
      'employment_contract',
      'offer_letter',
      'appointment_letter',
      'nda',
      'posh_acknowledgment',
      'company_handbook',
      'promotion_letter',
      'salary_letter',
      'transfer_letter',
      'exit_document',
      'no_dues_letter',
      'fnf_letter',
      'probation_contract',
      'fixed_term_agreement',
      'confidentiality_agreement',
      'non_compete_agreement',
      'other'
    ],
    index: true
  },
  category: {
    type: String,
    required: true,
    enum: ['contract', 'compliance', 'policy', 'letter', 'agreement', 'other'],
    index: true
  },
  
  // File information
  file_name: {
    type: String,
    required: true
  },
  original_name: {
    type: String,
    required: true
  },
  file_size: {
    type: Number,
    required: true
  },
  mime_type: {
    type: String,
    required: true
  },
  file_extension: {
    type: String,
    required: true
  },
  
  // Storage information
  storage_provider: {
    type: String,
    enum: ['s3', 'local', 'cloudinary'],
    default: 'local'
  },
  storage_path: {
    type: String,
    required: true
  },
  storage_url: {
    type: String,
    required: true
  },
  encrypted: {
    type: Boolean,
    default: true
  },
  encryption_key: {
    type: String,
    required: true
  },
  
  // Version control
  version: {
    type: Number,
    default: 1,
    index: true
  },
  is_latest: {
    type: Boolean,
    default: true,
    index: true
  },
  parent_document: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Document',
    default: null
  },
  
  // Document status
  status: {
    type: String,
    enum: ['draft', 'pending_signature', 'signed', 'expired', 'archived', 'rejected'],
    default: 'draft',
    index: true
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
  
  // E-signature information
  signature_required: {
    type: Boolean,
    default: false
  },
  signature_method: {
    type: String,
    enum: ['checkbox', 'docusign', 'digio', 'aadhaar_esign', 'manual'],
    default: 'checkbox'
  },
  signed_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  signed_at: {
    type: Date,
    default: null
  },
  signature_ip: {
    type: String,
    default: null
  },
  signature_device: {
    type: String,
    default: null
  },
  signature_metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  
  // Compliance tracking
  compliance_required: {
    type: Boolean,
    default: false
  },
  compliance_type: {
    type: String,
    enum: ['posh', 'nda', 'confidentiality', 'non_compete', 'other'],
    default: null
  },
  compliance_deadline: {
    type: Date,
    default: null
  },
  
  // Expiry information
  expiry_date: {
    type: Date,
    default: null,
    index: true
  },
  auto_renewal: {
    type: Boolean,
    default: false
  },
  
  // Access control
  access_level: {
    type: String,
    enum: ['public', 'restricted', 'confidential', 'secret'],
    default: 'restricted',
    index: true
  },
  department_access: [{
    type: String,
    index: true
  }],
  role_access: [{
    type: String,
    index: true
  }],
  
  // Workflow information
  workflow_stage: {
    type: String,
    enum: ['created', 'pending_approval', 'approved', 'pending_signature', 'signed', 'completed', 'rejected'],
    default: 'created',
    index: true
  },
  workflow_assignee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  workflow_due_date: {
    type: Date,
    default: null
  },
  
  // Notification settings
  reminder_enabled: {
    type: Boolean,
    default: true
  },
  reminder_frequency: {
    type: String,
    enum: ['daily', 'weekly', 'monthly'],
    default: 'weekly'
  },
  last_reminder_sent: {
    type: Date,
    default: null
  },
  
  // Audit information
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updated_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  approved_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  approved_at: {
    type: Date,
    default: null
  },
  
  // Soft delete
  is_deleted: {
    type: Boolean,
    default: false,
    index: true
  },
  deleted_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  deleted_at: {
    type: Date,
    default: null
  },
  
  // Timestamps
  created_at: {
    type: Date,
    default: Date.now,
    index: true
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
documentSchema.index({ employee: 1, document_type: 1, is_latest: 1 });
documentSchema.index({ status: 1, signature_required: 1 });
documentSchema.index({ compliance_type: 1, compliance_required: 1 });
documentSchema.index({ expiry_date: 1, status: 1 });
documentSchema.index({ workflow_stage: 1, workflow_assignee: 1 });
documentSchema.index({ created_at: -1 });
documentSchema.index({ updated_at: -1 });

// Virtual for document URL
documentSchema.virtual('download_url').get(function() {
  return `/api/documents/${this._id}/download`;
});

// Virtual for signature status
documentSchema.virtual('is_signed').get(function() {
  return this.status === 'signed' && this.signed_at !== null;
});

// Virtual for expiry status
documentSchema.virtual('is_expired').get(function() {
  if (!this.expiry_date) return false;
  return new Date() > this.expiry_date;
});

// Virtual for days until expiry
documentSchema.virtual('days_until_expiry').get(function() {
  if (!this.expiry_date) return null;
  const now = new Date();
  const diffTime = this.expiry_date - now;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Pre-save middleware
documentSchema.pre('save', function(next) {
  // Generate document ID if not provided
  if (!this.document_id) {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    this.document_id = `DOC_${timestamp}_${random}`.toUpperCase();
  }
  
  // Set updated timestamp
  this.updated_at = new Date();
  
  next();
});

// Instance methods
documentSchema.methods.canAccess = function(user) {
  // Check if user can access this document
  if (this.is_deleted) return false;
  
  // Employee can access their own documents
  if (this.employee.toString() === user._id.toString()) return true;
  
  // Check role-based access
  if (this.role_access.length > 0 && this.role_access.includes(user.role)) return true;
  
  // Check department access
  if (this.department_access.length > 0 && this.department_access.includes(user.department)) return true;
  
  // HR/Admin have full access
  if (['admin', 'hr'].includes(user.role)) return true;
  
  return false;
};

documentSchema.methods.canSign = function(user) {
  // Check if user can sign this document
  if (!this.signature_required) return false;
  if (this.is_signed) return false;
  if (this.employee.toString() !== user._id.toString()) return false;
  
  return true;
};

documentSchema.methods.sign = function(user, signatureData = {}) {
  // Sign the document
  this.signed_by = user._id;
  this.signed_at = new Date();
  this.status = 'signed';
  this.signature_ip = signatureData.ip || null;
  this.signature_device = signatureData.device || null;
  this.signature_metadata = signatureData.metadata || {};
  
  return this.save();
};

documentSchema.methods.archive = function(user) {
  // Archive the document
  this.is_latest = false;
  this.status = 'archived';
  this.updated_by = user._id;
  
  return this.save();
};

// Static methods
documentSchema.statics.findByEmployee = function(employeeId, options = {}) {
  const query = {
    employee: employeeId,
    is_deleted: false,
    is_latest: true
  };
  
  if (options.document_type) {
    query.document_type = options.document_type;
  }
  
  if (options.status) {
    query.status = options.status;
  }
  
  return this.find(query).sort({ created_at: -1 });
};

documentSchema.statics.findPendingSignatures = function() {
  return this.find({
    signature_required: true,
    status: 'pending_signature',
    is_deleted: false,
    is_latest: true
  }).populate('employee', 'name email employee_id');
};

documentSchema.statics.findExpiringSoon = function(days = 30) {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + days);
  
  return this.find({
    expiry_date: { $lte: futureDate, $gte: new Date() },
    status: { $in: ['signed', 'pending_signature'] },
    is_deleted: false,
    is_latest: true
  }).populate('employee', 'name email employee_id');
};

documentSchema.statics.findComplianceDocuments = function(complianceType) {
  return this.find({
    compliance_required: true,
    compliance_type: complianceType,
    is_deleted: false,
    is_latest: true
  }).populate('employee', 'name email employee_id department');
};

module.exports = mongoose.model('Document', documentSchema);