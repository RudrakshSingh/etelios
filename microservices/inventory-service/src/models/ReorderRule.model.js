const mongoose = require('mongoose');

const reorderRuleSchema = new mongoose.Schema({
  sku: {
    type: String,
    required: true,
    trim: true
  },
  store_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store',
    required: true
  },
  rop: {
    type: Number,
    required: true,
    min: 0
  },
  roq: {
    type: Number,
    required: true,
    min: 0
  },
  max_stock: {
    type: Number,
    required: true,
    min: 0
  },
  lead_time_days: {
    type: Number,
    required: true,
    min: 0
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

reorderRuleSchema.index({ sku: 1, store_id: 1 }, { unique: true });
reorderRuleSchema.index({ sku: 1 });
reorderRuleSchema.index({ store_id: 1 });
reorderRuleSchema.index({ is_active: 1 });

const ReorderRule = mongoose.model('ReorderRule', reorderRuleSchema);

module.exports = ReorderRule;
