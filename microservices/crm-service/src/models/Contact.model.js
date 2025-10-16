const mongoose = require('mongoose');

const consentSchema = new mongoose.Schema({
  sms: { type: Boolean, default: false },
  whatsapp: { type: Boolean, default: false },
  email: { type: Boolean, default: false },
  last_updated_at: { type: Date, default: Date.now },
  source: { type: String, enum: ['form', 'whatsapp', 'sms', 'email', 'manual'], default: 'manual' }
}, { _id: false });

const contactSchema = new mongoose.Schema({
  customer_id: {
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
  phone: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true
  },
  dob: {
    type: Date
  },
  anniversary: {
    type: Date
  },
  primary_store_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store',
    required: true
  },
  consents: {
    type: consentSchema,
    default: () => ({
      sms: false,
      whatsapp: false,
      email: false,
      last_updated_at: new Date(),
      source: 'manual'
    })
  },
  tags: [{
    type: String,
    enum: ['new', 'loyal', 'cl-user', 'vip', 'inactive', 'high-value', 'frequent-buyer'],
    trim: true
  }],
  preferences: {
    preferred_channel: {
      type: String,
      enum: ['whatsapp', 'sms', 'email'],
      default: 'whatsapp'
    },
    quiet_hours_start: { type: String, default: '21:00' },
    quiet_hours_end: { type: String, default: '09:00' },
    timezone: { type: String, default: 'Asia/Kolkata' }
  },
  last_engagement_at: { type: Date },
  engagement_score: { type: Number, min: 0, max: 100, default: 0 },
  is_active: { type: Boolean, default: true },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});

// Pre-save middleware to handle tags data format
contactSchema.pre('save', function(next) {
  // Convert tags object to array if needed
  if (this.tags && typeof this.tags === 'object' && !Array.isArray(this.tags)) {
    this.tags = Object.values(this.tags);
  }
  next();
});

contactSchema.index({ phone: 1 });
contactSchema.index({ email: 1 });
contactSchema.index({ primary_store_id: 1 });
contactSchema.index({ tags: 1 });
contactSchema.index({ is_active: 1 });
contactSchema.index({ last_engagement_at: 1 });

const Contact = mongoose.model('Contact', contactSchema);

module.exports = Contact;
