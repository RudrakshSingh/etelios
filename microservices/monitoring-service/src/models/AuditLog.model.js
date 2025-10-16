const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  // Document reference
  document: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Document',
    required: true,
    index: true
  },
  document_id: {
    type: String,
    required: true,
    index: true
  },
  
  // User information
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  user_id: {
    type: String,
    required: true,
    index: true
  },
  user_name: {
    type: String,
    required: true
  },
  user_email: {
    type: String,
    required: true
  },
  user_role: {
    type: String,
    required: true,
    index: true
  },
  
  // Action details
  action: {
    type: String,
    required: true,
    enum: [
      'create',
      'view',
      'download',
      'upload',
      'update',
      'delete',
      'sign',
      'approve',
      'reject',
      'archive',
      'restore',
      'share',
      'export',
      'print',
      'email_sent',
      'reminder_sent',
      'workflow_triggered',
      'compliance_check',
      'expiry_alert'
    ],
    index: true
  },
  action_description: {
    type: String,
    required: true
  },
  
  // Document details at time of action
  document_title: {
    type: String,
    required: true
  },
  document_type: {
    type: String,
    required: true,
    index: true
  },
  document_status: {
    type: String,
    required: true,
    index: true
  },
  document_version: {
    type: Number,
    required: true
  },
  
  // Employee information
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
  employee_name: {
    type: String,
    required: true
  },
  employee_email: {
    type: String,
    required: true
  },
  
  // Request information
  ip_address: {
    type: String,
    required: true,
    index: true
  },
  user_agent: {
    type: String,
    required: true
  },
  device_type: {
    type: String,
    enum: ['desktop', 'mobile', 'tablet', 'unknown'],
    default: 'unknown',
    index: true
  },
  browser: {
    type: String,
    default: 'unknown'
  },
  operating_system: {
    type: String,
    default: 'unknown'
  },
  
  // Location information (if available)
  location: {
    country: String,
    region: String,
    city: String,
    coordinates: {
      latitude: Number,
      longitude: Number
    }
  },
  
  // Action metadata
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  
  // File information (for file-related actions)
  file_info: {
    file_name: String,
    file_size: Number,
    mime_type: String,
    checksum: String
  },
  
  // Signature information (for signing actions)
  signature_info: {
    signature_method: String,
    signature_timestamp: Date,
    signature_ip: String,
    signature_device: String,
    signature_metadata: mongoose.Schema.Types.Mixed
  },
  
  // Compliance information
  compliance_info: {
    compliance_type: String,
    compliance_status: String,
    compliance_deadline: Date,
    compliance_percentage: Number
  },
  
  // Workflow information
  workflow_info: {
    workflow_stage: String,
    workflow_assignee: String,
    workflow_due_date: Date,
    workflow_priority: String
  },
  
  // Risk assessment
  risk_level: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'low',
    index: true
  },
  risk_factors: [{
    type: String,
    enum: [
      'unauthorized_access',
      'data_breach',
      'compliance_violation',
      'signature_fraud',
      'document_tampering',
      'access_outside_hours',
      'bulk_download',
      'suspicious_activity'
    ]
  }],
  
  // Session information
  session_id: {
    type: String,
    index: true
  },
  request_id: {
    type: String,
    index: true
  },
  
  // Timestamp
  timestamp: {
    type: Date,
    default: Date.now,
    required: true,
    index: true
  },
  
  // Retention
  retention_date: {
    type: Date,
    default: function() {
      // Default retention of 7 years for compliance
      const date = new Date();
      date.setFullYear(date.getFullYear() + 7);
      return date;
    }
  },
  
  // Archive status
  is_archived: {
    type: Boolean,
    default: false,
    index: true
  },
  archived_at: {
    type: Date,
    default: null
  }
}, {
  timestamps: false, // We use custom timestamp field
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance and compliance
auditLogSchema.index({ document: 1, timestamp: -1 });
auditLogSchema.index({ user: 1, timestamp: -1 });
auditLogSchema.index({ employee: 1, timestamp: -1 });
auditLogSchema.index({ action: 1, timestamp: -1 });
auditLogSchema.index({ document_type: 1, timestamp: -1 });
auditLogSchema.index({ risk_level: 1, timestamp: -1 });
auditLogSchema.index({ ip_address: 1, timestamp: -1 });
auditLogSchema.index({ timestamp: -1 });
auditLogSchema.index({ retention_date: 1 });

// Virtual for time since action
auditLogSchema.virtual('time_since_action').get(function() {
  const now = new Date();
  const diffTime = now - this.timestamp;
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
  const diffMinutes = Math.floor(diffTime / (1000 * 60));
  
  if (diffDays > 0) return `${diffDays} days ago`;
  if (diffHours > 0) return `${diffHours} hours ago`;
  if (diffMinutes > 0) return `${diffMinutes} minutes ago`;
  return 'Just now';
});

// Pre-save middleware
auditLogSchema.pre('save', function(next) {
  // Extract device information from user agent
  if (this.user_agent) {
    const userAgent = this.user_agent.toLowerCase();
    
    // Detect device type
    if (userAgent.includes('mobile') || userAgent.includes('android') || userAgent.includes('iphone')) {
      this.device_type = 'mobile';
    } else if (userAgent.includes('tablet') || userAgent.includes('ipad')) {
      this.device_type = 'tablet';
    } else if (userAgent.includes('windows') || userAgent.includes('macintosh') || userAgent.includes('linux')) {
      this.device_type = 'desktop';
    }
    
    // Detect browser
    if (userAgent.includes('chrome')) this.browser = 'Chrome';
    else if (userAgent.includes('firefox')) this.browser = 'Firefox';
    else if (userAgent.includes('safari')) this.browser = 'Safari';
    else if (userAgent.includes('edge')) this.browser = 'Edge';
    
    // Detect OS
    if (userAgent.includes('windows')) this.operating_system = 'Windows';
    else if (userAgent.includes('macintosh')) this.operating_system = 'macOS';
    else if (userAgent.includes('linux')) this.operating_system = 'Linux';
    else if (userAgent.includes('android')) this.operating_system = 'Android';
    else if (userAgent.includes('iphone') || userAgent.includes('ipad')) this.operating_system = 'iOS';
  }
  
  // Assess risk level based on action and metadata
  this.assessRiskLevel();
  
  next();
});

// Instance methods
auditLogSchema.methods.assessRiskLevel = function() {
  let riskFactors = [];
  let riskLevel = 'low';
  
  // Check for high-risk actions
  if (['delete', 'sign', 'approve'].includes(this.action)) {
    riskFactors.push('sensitive_action');
  }
  
  // Check for bulk operations
  if (this.metadata && this.metadata.bulk_operation) {
    riskFactors.push('bulk_download');
    riskLevel = 'medium';
  }
  
  // Check for access outside business hours
  const hour = this.timestamp.getHours();
  if (hour < 6 || hour > 22) {
    riskFactors.push('access_outside_hours');
    if (riskLevel === 'low') riskLevel = 'medium';
  }
  
  // Check for suspicious IP patterns
  if (this.metadata && this.metadata.suspicious_ip) {
    riskFactors.push('suspicious_activity');
    riskLevel = 'high';
  }
  
  // Check for compliance violations
  if (this.compliance_info && this.compliance_info.compliance_status === 'violation') {
    riskFactors.push('compliance_violation');
    riskLevel = 'critical';
  }
  
  this.risk_factors = riskFactors;
  this.risk_level = riskLevel;
};

// Static methods
auditLogSchema.statics.logAction = function(data) {
  const auditLog = new this({
    document: data.document,
    document_id: data.document_id,
    user: data.user,
    user_id: data.user_id,
    user_name: data.user_name,
    user_email: data.user_email,
    user_role: data.user_role,
    action: data.action,
    action_description: data.action_description,
    document_title: data.document_title,
    document_type: data.document_type,
    document_status: data.document_status,
    document_version: data.document_version,
    employee: data.employee,
    employee_id: data.employee_id,
    employee_name: data.employee_name,
    employee_email: data.employee_email,
    ip_address: data.ip_address,
    user_agent: data.user_agent,
    metadata: data.metadata || {},
    file_info: data.file_info || {},
    signature_info: data.signature_info || {},
    compliance_info: data.compliance_info || {},
    workflow_info: data.workflow_info || {},
    session_id: data.session_id,
    request_id: data.request_id
  });
  
  return auditLog.save();
};

auditLogSchema.statics.getUserActivity = function(userId, options = {}) {
  const query = { user: userId };
  
  if (options.startDate) {
    query.timestamp = { $gte: options.startDate };
  }
  if (options.endDate) {
    query.timestamp = { ...query.timestamp, $lte: options.endDate };
  }
  if (options.action) {
    query.action = options.action;
  }
  
  return this.find(query)
    .populate('document', 'title document_type status')
    .populate('employee', 'name email employee_id')
    .sort({ timestamp: -1 })
    .limit(options.limit || 100);
};

auditLogSchema.statics.getDocumentHistory = function(documentId, options = {}) {
  const query = { document: documentId };
  
  if (options.startDate) {
    query.timestamp = { $gte: options.startDate };
  }
  if (options.endDate) {
    query.timestamp = { ...query.timestamp, $lte: options.endDate };
  }
  if (options.action) {
    query.action = options.action;
  }
  
  return this.find(query)
    .populate('user', 'name email role')
    .sort({ timestamp: -1 })
    .limit(options.limit || 100);
};

auditLogSchema.statics.getComplianceReport = function(options = {}) {
  const query = {
    'compliance_info.compliance_type': { $exists: true },
    timestamp: {
      $gte: options.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      $lte: options.endDate || new Date()
    }
  };
  
  return this.find(query)
    .populate('document', 'title document_type compliance_type')
    .populate('employee', 'name email department')
    .sort({ timestamp: -1 });
};

auditLogSchema.statics.getRiskAlerts = function(riskLevel = 'medium') {
  const riskLevels = ['low', 'medium', 'high', 'critical'];
  const targetIndex = riskLevels.indexOf(riskLevel);
  const queryLevels = riskLevels.slice(targetIndex);
  
  return this.find({
    risk_level: { $in: queryLevels },
    timestamp: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
  })
    .populate('document', 'title document_type')
    .populate('user', 'name email role')
    .populate('employee', 'name email')
    .sort({ timestamp: -1 });
};

module.exports = mongoose.model('AuditLog', auditLogSchema);
