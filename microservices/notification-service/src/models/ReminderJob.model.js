const mongoose = require('mongoose');

const contextSchema = new mongoose.Schema({
  order_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  appt_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' },
  rx_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Prescription' },
  clp_id: { type: mongoose.Schema.Types.ObjectId, ref: 'ContactLensPlan' }
}, { _id: false });

const sendResultSchema = new mongoose.Schema({
  provider_msg_id: { type: String, trim: true },
  error: { type: String, trim: true },
  retry_count: { type: Number, default: 0 },
  max_retries: { type: Number, default: 3 }
}, { _id: false });

const reminderJobSchema = new mongoose.Schema({
  job_id: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true
  },
  rule_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AutomationRule',
    required: true
  },
  customer_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Contact',
    required: true
  },
  context: {
    type: contextSchema
  },
  scheduled_for: {
    type: Date,
    required: true
  },
  channel: {
    type: String,
    enum: ['whatsapp', 'sms', 'email'],
    required: true
  },
  status: {
    type: String,
    enum: ['PENDING', 'SENT', 'FAILED', 'SKIPPED', 'CANCELLED'],
    default: 'PENDING'
  },
  send_result: {
    type: sendResultSchema
  },
  template_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Template',
    required: true
  },
  variables: {
    type: Map,
    of: String
  },
  priority: {
    type: Number,
    default: 5,
    min: 1,
    max: 10
  },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});

reminderJobSchema.index({ rule_id: 1 });
reminderJobSchema.index({ customer_id: 1 });
reminderJobSchema.index({ scheduled_for: 1 });
reminderJobSchema.index({ status: 1 });
reminderJobSchema.index({ priority: 1 });

const ReminderJob = mongoose.model('ReminderJob', reminderJobSchema);

module.exports = ReminderJob;
