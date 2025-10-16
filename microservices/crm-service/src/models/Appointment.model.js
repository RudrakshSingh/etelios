const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
  appt_id: {
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
  type: {
    type: String,
    enum: ['eye-test', 'fitting', 'pickup', 'consultation', 'follow-up'],
    required: true
  },
  appt_at: {
    type: Date,
    required: true
  },
  duration_minutes: {
    type: Number,
    default: 30,
    min: 15,
    max: 120
  },
  status: {
    type: String,
    enum: ['BOOKED', 'CONFIRMED', 'RESCHEDULED', 'NO_SHOW', 'DONE', 'CANCELLED'],
    default: 'BOOKED'
  },
  notes: {
    type: String,
    trim: true
  },
  reminder_sent: {
    t24h: { type: Boolean, default: false },
    t2h: { type: Boolean, default: false }
  },
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});

appointmentSchema.index({ customer_id: 1 });
appointmentSchema.index({ store_id: 1 });
appointmentSchema.index({ appt_at: 1 });
appointmentSchema.index({ status: 1 });
appointmentSchema.index({ type: 1 });

const Appointment = mongoose.model('Appointment', appointmentSchema);

module.exports = Appointment;
