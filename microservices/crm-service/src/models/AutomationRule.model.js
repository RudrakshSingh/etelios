const mongoose = require('mongoose');

const timingSchema = new mongoose.Schema({
  offset_days: { type: Number, required: true },
  time_of_day: { type: String, default: '09:00' },
  timezone: { type: String, default: 'Asia/Kolkata' }
}, { _id: false });

const automationRuleSchema = new mongoose.Schema({
  rule_id: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  trigger: {
    type: String,
    enum: ['birthday', 'anniversary', 'appt_reminder', 'post_delivery_feedback', 'eye_test_recall', 'cl_refill'],
    required: true
  },
  timing: {
    type: timingSchema,
    required: true
  },
  channel_priority: [{
    type: String,
    enum: ['whatsapp', 'sms', 'email']
  }],
  template_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Template',
    required: true
  },
  fallback_template_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Template'
  },
  create_task_for: {
    type: String,
    enum: ['ecom', 'store'],
    sparse: true
  },
  precheck_fn: {
    type: String,
    trim: true
  },
  enabled: {
    type: Boolean,
    default: true
  },
  conditions: {
    min_engagement_score: { type: Number, min: 0, max: 100 },
    max_sends_per_year: { type: Number, default: 1 },
    quiet_hours_respected: { type: Boolean, default: true }
  },
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});

automationRuleSchema.index({ trigger: 1 });
automationRuleSchema.index({ enabled: 1 });
automationRuleSchema.index({ created_by: 1 });

const AutomationRule = mongoose.model('AutomationRule', automationRuleSchema);

module.exports = AutomationRule;
