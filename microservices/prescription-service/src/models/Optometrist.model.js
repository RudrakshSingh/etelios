const mongoose = require('mongoose');

const optometristSchema = new mongoose.Schema({
  optometrist_id: {
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
  reg_no: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true
  },
  signature_image_url: {
    type: String,
    trim: true
  },
  qualifications: [{
    degree: { type: String, required: true, trim: true },
    institution: { type: String, required: true, trim: true },
    year: { type: Number, required: true },
    is_primary: { type: Boolean, default: false }
  }],
  specializations: [{
    type: String,
    enum: ['PEDIATRIC', 'GERIATRIC', 'CONTACT_LENS', 'LOW_VISION', 'BINOCULAR_VISION', 'DRY_EYE', 'DIABETIC_CARE']
  }],
  experience_years: {
    type: Number,
    min: 0,
    required: true
  },
  languages: [{
    type: String,
    trim: true
  }],
  consultation_fee: {
    type: Number,
    min: 0
  },
  availability: {
    monday: { start: String, end: String, is_available: { type: Boolean, default: true } },
    tuesday: { start: String, end: String, is_available: { type: Boolean, default: true } },
    wednesday: { start: String, end: String, is_available: { type: Boolean, default: true } },
    thursday: { start: String, end: String, is_available: { type: Boolean, default: true } },
    friday: { start: String, end: String, is_available: { type: Boolean, default: true } },
    saturday: { start: String, end: String, is_available: { type: Boolean, default: true } },
    sunday: { start: String, end: String, is_available: { type: Boolean, default: false } }
  },
  is_active: {
    type: Boolean,
    default: true
  },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});

// Indexes
optometristSchema.index({ is_active: 1 });
optometristSchema.index({ name: 1 });

const Optometrist = mongoose.model('Optometrist', optometristSchema);

module.exports = Optometrist;
