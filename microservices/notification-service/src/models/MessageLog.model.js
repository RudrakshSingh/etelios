const mongoose = require('mongoose');

const metaSchema = new mongoose.Schema({
  click_url: { type: String, trim: true },
  wa_conv_id: { type: String, trim: true },
  dlt_submit_id: { type: String, trim: true },
  provider_response: { type: mongoose.Schema.Types.Mixed },
  retry_count: { type: Number, default: 0 }
}, { _id: false });

const messageLogSchema = new mongoose.Schema({
  log_id: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true
  },
  job_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ReminderJob',
    required: true
  },
  customer_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Contact',
    required: true
  },
  channel: {
    type: String,
    enum: ['whatsapp', 'sms', 'email'],
    required: true
  },
  template_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Template',
    required: true
  },
  sent_at: {
    type: Date,
    required: true
  },
  delivery_status: {
    type: String,
    enum: ['DELIVERED', 'FAILED', 'READ', 'CLICKED', 'BOUNCED', 'PENDING'],
    default: 'PENDING'
  },
  meta: {
    type: metaSchema
  },
  campaign_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Campaign'
  },
  cost: {
    type: Number,
    default: 0,
    min: 0
  },
  created_at: { type: Date, default: Date.now }
});

messageLogSchema.index({ job_id: 1 });
messageLogSchema.index({ customer_id: 1 });
messageLogSchema.index({ sent_at: 1 });
messageLogSchema.index({ delivery_status: 1 });
messageLogSchema.index({ channel: 1 });
messageLogSchema.index({ campaign_id: 1 });

const MessageLog = mongoose.model('MessageLog', messageLogSchema);

module.exports = MessageLog;
