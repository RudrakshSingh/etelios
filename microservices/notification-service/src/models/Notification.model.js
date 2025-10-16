const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  notification_id: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true
  },
  recipient_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  recipient_type: {
    type: String,
    enum: ['USER', 'CUSTOMER', 'EMPLOYEE', 'SYSTEM'],
    default: 'USER',
    index: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  message: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: [
      'SYSTEM', 'ALERT', 'REMINDER', 'APPROVAL', 'REJECTION', 
      'ASSIGNMENT', 'ESCALATION', 'BIRTHDAY', 'ANNIVERSARY',
      'APPOINTMENT', 'DOCUMENT', 'ASSET', 'TRANSFER', 'SLA',
      'MARKETING', 'ENGAGEMENT', 'COMPLIANCE'
    ],
    required: true,
    index: true
  },
  category: {
    type: String,
    enum: [
      'HR', 'FINANCE', 'SALES', 'CUSTOMER_SERVICE', 'INVENTORY',
      'COMPLIANCE', 'MARKETING', 'SYSTEM', 'SECURITY'
    ],
    required: true,
    index: true
  },
  priority: {
    type: String,
    enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT', 'CRITICAL'],
    default: 'MEDIUM',
    index: true
  },
  status: {
    type: String,
    enum: ['PENDING', 'SENT', 'DELIVERED', 'READ', 'FAILED', 'CANCELLED'],
    default: 'PENDING',
    index: true
  },
  channels: [{
    channel: {
      type: String,
      enum: ['EMAIL', 'SMS', 'WHATSAPP', 'PUSH', 'SLACK', 'WEBHOOK', 'APP_INBOX'],
      required: true
    },
    status: {
      type: String,
      enum: ['PENDING', 'SENT', 'DELIVERED', 'READ', 'FAILED'],
      default: 'PENDING'
    },
    sent_at: Date,
    delivered_at: Date,
    read_at: Date,
    failed_at: Date,
    error_message: String,
    provider_message_id: String,
    delivery_attempts: {
      type: Number,
      default: 0
    }
  }],
  metadata: {
    entity_type: String, // 'document', 'transfer', 'asset', etc.
    entity_id: mongoose.Schema.Types.ObjectId,
    action: String, // 'created', 'updated', 'approved', etc.
    workflow_stage: String,
    escalation_level: Number,
    sla_due_date: Date,
    related_notifications: [mongoose.Schema.Types.ObjectId]
  },
  template_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Template'
  },
  variables: {
    type: Map,
    of: String
  },
  scheduled_for: {
    type: Date,
    index: true
  },
  expires_at: {
    type: Date,
    index: true
  },
  read_at: {
    type: Date,
    default: null
  },
  acknowledged_at: {
    type: Date,
    default: null
  },
  acknowledged_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  response: {
    type: String,
    enum: ['ACCEPTED', 'REJECTED', 'PENDING', 'NO_RESPONSE'],
    default: 'NO_RESPONSE'
  },
  response_data: {
    type: mongoose.Schema.Types.Mixed
  },
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
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
notificationSchema.index({ recipient_id: 1, status: 1 });
notificationSchema.index({ type: 1, category: 1 });
notificationSchema.index({ priority: 1, scheduled_for: 1 });
notificationSchema.index({ created_at: -1 });
notificationSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });

// Virtual for notification age
notificationSchema.virtual('age_in_hours').get(function() {
  return Math.floor((Date.now() - this.created_at) / (1000 * 60 * 60));
});

// Virtual for delivery status
notificationSchema.virtual('delivery_status').get(function() {
  const channels = this.channels || [];
  if (channels.length === 0) return 'PENDING';
  
  const delivered = channels.filter(c => c.status === 'DELIVERED').length;
  const failed = channels.filter(c => c.status === 'FAILED').length;
  
  if (delivered > 0) return 'DELIVERED';
  if (failed === channels.length) return 'FAILED';
  return 'PENDING';
});

// Pre-save middleware
notificationSchema.pre('save', function(next) {
  if (this.isNew && !this.notification_id) {
    this.notification_id = `NOTIF-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
  }
  next();
});

module.exports = mongoose.model('Notification', notificationSchema);
