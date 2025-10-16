const mongoose = require('mongoose');

const interactionSchema = new mongoose.Schema({
  ix_id: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true
  },
  customer_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true
  },
  channel: {
    type: String,
    enum: ['sms', 'email', 'whatsapp', 'voice', 'call'],
    required: true
  },
  direction: {
    type: String,
    enum: ['out', 'in'],
    required: true
  },
  template_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Template'
  },
  content_hash: {
    type: String,
    trim: true
  },
  sent_at: {
    type: Date
  },
  received_at: {
    type: Date
  },
  status: {
    type: String,
    enum: ['PENDING', 'SENT', 'DELIVERED', 'READ', 'CLICKED', 'FAILED', 'OPT_OUT'],
    default: 'PENDING'
  },
  meta: {
    provider_id: { type: String, trim: true },
    dlt_id: { type: String, trim: true },
    wa_id: { type: String, trim: true },
    cost: { type: Number, default: 0 },
    delivery_time_ms: { type: Number }
  },
  created_at: { type: Date, default: Date.now }
});

interactionSchema.index({ customer_id: 1 });
interactionSchema.index({ channel: 1 });
interactionSchema.index({ direction: 1 });
interactionSchema.index({ sent_at: 1 });
interactionSchema.index({ status: 1 });
interactionSchema.index({ template_id: 1 });

const Interaction = mongoose.model('Interaction', interactionSchema);

module.exports = Interaction;
