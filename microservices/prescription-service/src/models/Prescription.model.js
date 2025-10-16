const mongoose = require('mongoose');

const prescriptionSchema = new mongoose.Schema({
  customer_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true,
    index: true
  },
  rx_date: {
    type: Date,
    required: true,
    default: Date.now
  },
  od_sph: {
    type: Number,
    required: true
  },
  od_cyl: {
    type: Number,
    default: 0
  },
  od_axis: {
    type: Number,
    default: 0
  },
  os_sph: {
    type: Number,
    required: true
  },
  os_cyl: {
    type: Number,
    default: 0
  },
  os_axis: {
    type: Number,
    default: 0
  },
  add_power: {
    type: Number,
    default: 0
  },
  pd_right: {
    type: Number
  },
  pd_left: {
    type: Number
  },
  seg_height_right: {
    type: Number,
    default: 0
  },
  seg_height_left: {
    type: Number,
    default: 0
  },
  notes: {
    type: String
  },
  source: {
    type: String,
    enum: ['manual', 'visucore', 'eyekra', 'other'],
    default: 'manual'
  },
  uploaded_doc_url: {
    type: String
  },
  validity_date: {
    type: Date
  },
  status: {
    type: String,
    enum: ['active', 'expired', 'replaced'],
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
  timestamps: true,
  collection: 'prescriptions'
});

// Indexes for performance
prescriptionSchema.index({ customer_id: 1, created_at: -1 });
prescriptionSchema.index({ status: 1 });
prescriptionSchema.index({ rx_date: -1 });

module.exports = mongoose.model('Prescription', prescriptionSchema);