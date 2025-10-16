const mongoose = require('mongoose');

const throttlingSchema = new mongoose.Schema({
  max_per_minute: { type: Number, default: 10 },
  max_per_hour: { type: Number, default: 100 },
  max_per_day: { type: Number, default: 1000 }
}, { _id: false });

const senderIdsSchema = new mongoose.Schema({
  sms: { type: String, trim: true },
  whatsapp: { type: String, trim: true },
  email: { type: String, trim: true }
}, { _id: false });

const campaignSchema = new mongoose.Schema({
  campaign_id: {
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
  channel: {
    type: String,
    enum: ['sms', 'whatsapp', 'email', 'multi'],
    required: true
  },
  type: {
    type: String,
    enum: ['transactional', 'promotional'],
    required: true
  },
  segment_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CustomerSegment'
  },
  schedule: {
    start_date: { type: Date },
    end_date: { type: Date },
    time_of_day: { type: String, default: '09:00' },
    timezone: { type: String, default: 'Asia/Kolkata' }
  },
  status: {
    type: String,
    enum: ['DRAFT', 'SCHEDULED', 'RUNNING', 'PAUSED', 'COMPLETED', 'CANCELLED'],
    default: 'DRAFT'
  },
  template_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Template',
    required: true
  },
  throttling: {
    type: throttlingSchema,
    default: () => ({
      max_per_minute: 10,
      max_per_hour: 100,
      max_per_day: 1000
    })
  },
  sender_ids: {
    type: senderIdsSchema
  },
  target_count: { type: Number, default: 0 },
  sent_count: { type: Number, default: 0 },
  delivered_count: { type: Number, default: 0 },
  clicked_count: { type: Number, default: 0 },
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});

campaignSchema.index({ status: 1 });
campaignSchema.index({ type: 1 });
campaignSchema.index({ channel: 1 });
campaignSchema.index({ created_by: 1 });

const Campaign = mongoose.model('Campaign', campaignSchema);

module.exports = Campaign;
