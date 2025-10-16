const mongoose = require('mongoose');

const checkupSchema = new mongoose.Schema({
  checkup_id: {
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
  store_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store',
    required: true
  },
  optometrist_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Optometrist',
    required: true
  },
  rx_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Prescription'
  },
  chief_complaint: {
    type: String,
    required: true,
    trim: true
  },
  history_of_present_illness: {
    type: String,
    trim: true
  },
  allergies: {
    type: String,
    trim: true
  },
  medications: {
    type: String,
    trim: true
  },
  // Anterior segment examination
  anterior_exam: {
    lids_lashes: { type: String, trim: true },
    conjunctiva: { type: String, trim: true },
    cornea: { type: String, trim: true },
    anterior_chamber: { type: String, trim: true },
    iris: { type: String, trim: true },
    pupil: { type: String, trim: true },
    lens: { type: String, trim: true }
  },
  // Posterior segment examination
  posterior_exam: {
    vitreous: { type: String, trim: true },
    retina: { type: String, trim: true },
    macula: { type: String, trim: true },
    optic_nerve: { type: String, trim: true },
    vessels: { type: String, trim: true }
  },
  // Intraocular pressure
  iop: {
    r: { type: Number, min: 0, max: 50 },
    l: { type: Number, min: 0, max: 50 },
    method: { type: String, enum: ['GOLDMANN', 'NON_CONTACT', 'DIGITAL'], trim: true }
  },
  // Keratometry readings
  keratometry: {
    r: {
      k1: { type: Number },
      k2: { type: Number },
      axis: { type: Number, min: 0, max: 180 }
    },
    l: {
      k1: { type: Number },
      k2: { type: Number },
      axis: { type: Number, min: 0, max: 180 }
    }
  },
  topography_url: {
    type: String,
    trim: true
  },
  // Final refraction linked to prescription
  final_refraction_linked_rx_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Prescription'
  },
  // Additional clinical findings
  clinical_findings: {
    dry_eye_severity: { type: String, enum: ['NONE', 'MILD', 'MODERATE', 'SEVERE'] },
    binocular_vision_status: { type: String, trim: true },
    color_vision: { type: String, trim: true },
    depth_perception: { type: String, trim: true }
  },
  // Recommendations
  recommendations: {
    follow_up_required: { type: Boolean, default: false },
    follow_up_interval_months: { type: Number, min: 1 },
    specialist_referral: { type: String, trim: true },
    lifestyle_advice: { type: String, trim: true }
  },
  // Checkup status
  status: {
    type: String,
    enum: ['IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
    default: 'IN_PROGRESS'
  },
  checkup_date: {
    type: Date,
    required: true,
    default: Date.now
  },
  duration_minutes: {
    type: Number,
    min: 0
  },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});

// Indexes
checkupSchema.index({ customer_id: 1 });
checkupSchema.index({ store_id: 1 });
checkupSchema.index({ optometrist_id: 1 });
checkupSchema.index({ rx_id: 1 });
checkupSchema.index({ checkup_date: -1 });
checkupSchema.index({ status: 1 });

const Checkup = mongoose.model('Checkup', checkupSchema);

module.exports = Checkup;
