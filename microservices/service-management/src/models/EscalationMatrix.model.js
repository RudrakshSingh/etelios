const mongoose = require('mongoose');

const escalationMatrixSchema = new mongoose.Schema({
  level: {
    type: Number,
    required: true,
    min: 1
  },
  trigger: {
    type: String,
    enum: ['WARNING_THRESHOLD', 'BREACH'],
    required: true
  },
  warning_threshold: {
    type: Number,
    min: 0,
    max: 100
  },
  notify_roles: [{
    type: String,
    enum: ['STORE_MANAGER', 'AREA_MANAGER', 'OPS_HEAD', 'ADMIN', 'SUPERADMIN']
  }],
  notify_users: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  channel: {
    type: String,
    enum: ['APP_INBOX', 'EMAIL', 'WHATSAPP', 'SMS'],
    required: true
  },
  reassign_to: {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    role: {
      type: String,
      enum: ['STORE_MANAGER', 'AREA_MANAGER', 'OPS_HEAD', 'ADMIN', 'SUPERADMIN']
    }
  },
  auto_actions: {
    add_watcher: {
      type: Boolean,
      default: false
    },
    bump_priority: {
      type: Boolean,
      default: false
    },
    lock_override: {
      type: Boolean,
      default: false
    }
  },
  is_active: {
    type: Boolean,
    default: true
  },
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
});

escalationMatrixSchema.index({ level: 1 });
escalationMatrixSchema.index({ trigger: 1 });
escalationMatrixSchema.index({ is_active: 1 });

const EscalationMatrix = mongoose.model('EscalationMatrix', escalationMatrixSchema);

module.exports = EscalationMatrix;
