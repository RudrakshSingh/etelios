const mongoose = require('mongoose');

const slaSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  category: {
    type: String,
    required: true,
    trim: true
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    required: true
  },
  response_time_hours: {
    type: Number,
    required: true,
    min: 0
  },
  resolution_time_hours: {
    type: Number,
    required: true,
    min: 0
  },
  escalation_time_hours: {
    type: Number,
    min: 0
  },
  escalation_to: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
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
}, {
  timestamps: true
});

// Indexes
slaSchema.index({ name: 1 });
slaSchema.index({ category: 1 });
slaSchema.index({ priority: 1 });
slaSchema.index({ status: 1 });
slaSchema.index({ created_at: -1 });

module.exports = mongoose.model('SLA', slaSchema);
