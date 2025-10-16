const mongoose = require('mongoose');

const contactLensPlanSchema = new mongoose.Schema({
  clp_id: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true
  },
  customer_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Contact',
    required: true
  },
  store_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store',
    required: true
  },
  brand: {
    type: String,
    required: true,
    trim: true
  },
  product_name: {
    type: String,
    required: true,
    trim: true
  },
  replacement_cycle_days: {
    type: Number,
    required: true,
    min: 1,
    max: 365
  },
  last_purchase_at: {
    type: Date,
    required: true
  },
  next_refill_due_at: {
    type: Date,
    required: true
  },
  quantity_per_cycle: {
    type: Number,
    required: true,
    min: 1
  },
  is_active: {
    type: Boolean,
    default: true
  },
  reminder_sent: {
    t20: { type: Boolean, default: false },
    t15: { type: Boolean, default: false },
    t7: { type: Boolean, default: false },
    t1: { type: Boolean, default: false }
  },
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});

contactLensPlanSchema.index({ customer_id: 1 });
contactLensPlanSchema.index({ store_id: 1 });
contactLensPlanSchema.index({ next_refill_due_at: 1 });
contactLensPlanSchema.index({ is_active: 1 });

const ContactLensPlan = mongoose.model('ContactLensPlan', contactLensPlanSchema);

module.exports = ContactLensPlan;
