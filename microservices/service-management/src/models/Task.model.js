const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  task_id: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true
  },
  type: {
    type: String,
    enum: ['followup', 'callback', 'escalation', 'manual'],
    required: true
  },
  customer_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Contact',
    required: true
  },
  due_at: {
    type: Date,
    required: true
  },
  reason: {
    type: String,
    enum: ['cl_refill_T-20', 'cl_refill_T-15', 'eye_test_T-20', 'eye_test_T-15', 'birthday_followup', 'anniversary_followup', 'low_csat', 'no_show'],
    required: true
  },
  assigned_to: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  status: {
    type: String,
    enum: ['OPEN', 'IN_PROGRESS', 'DONE', 'CANCELLED', 'ESCALATED'],
    default: 'OPEN'
  },
  outcome: {
    type: String,
    enum: ['order_booked', 'not_reachable', 'not_interested', 'call_back_date', 'appointment_booked', 'resolved', 'escalated']
  },
  notes: {
    type: String,
    trim: true
  },
  priority: {
    type: String,
    enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
    default: 'MEDIUM'
  },
  escalation_level: {
    type: Number,
    default: 0,
    min: 0,
    max: 3
  },
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});

taskSchema.index({ customer_id: 1 });
taskSchema.index({ assigned_to: 1 });
taskSchema.index({ due_at: 1 });
taskSchema.index({ status: 1 });
taskSchema.index({ reason: 1 });
taskSchema.index({ priority: 1 });

const Task = mongoose.model('Task', taskSchema);

module.exports = Task;
