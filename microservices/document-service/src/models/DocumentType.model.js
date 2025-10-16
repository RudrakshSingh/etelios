const mongoose = require('mongoose');

const documentTypeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  category: {
    type: String,
    required: true,
    enum: [
      'EMPLOYMENT_CONTRACTS',
      'CONFIDENTIALITY_COMPLIANCE', 
      'HR_OPERATIONS',
      'EXIT_DOCUMENTS',
      'OPTIONAL'
    ]
  },
  description: {
    type: String,
    required: true
  },
  is_mandatory: {
    type: Boolean,
    default: false
  },
  requires_esign: {
    type: Boolean,
    default: true
  },
  expiry_days: {
    type: Number,
    default: null // null means no expiry
  },
  auto_assign_on: {
    type: String,
    enum: ['ONBOARDING', 'PROMOTION', 'TRANSFER', 'EXIT', 'MANUAL'],
    default: 'MANUAL'
  },
  allowed_formats: [{
    type: String,
    enum: ['PDF', 'DOCX', 'JPG', 'PNG', 'JPEG']
  }],
  max_file_size: {
    type: Number,
    default: 10485760 // 10MB in bytes
  },
  template_url: {
    type: String,
    default: null
  },
  is_active: {
    type: Boolean,
    default: true
  },
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Indexes
documentTypeSchema.index({ category: 1, is_active: 1 });
documentTypeSchema.index({ auto_assign_on: 1 });

// Static method to get document types by category
documentTypeSchema.statics.getByCategory = function(category) {
  return this.find({ category, is_active: true }).sort({ name: 1 });
};

// Static method to get mandatory document types
documentTypeSchema.statics.getMandatory = function() {
  return this.find({ is_mandatory: true, is_active: true }).sort({ name: 1 });
};

// Static method to get auto-assign document types
documentTypeSchema.statics.getAutoAssign = function(trigger) {
  return this.find({ auto_assign_on: trigger, is_active: true }).sort({ name: 1 });
};

module.exports = mongoose.model('DocumentType', documentTypeSchema);
