const mongoose = require('mongoose');

const manualRegistrationSchema = new mongoose.Schema({
  registration_number: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['employee', 'customer', 'supplier', 'vendor', 'partner'],
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  address: {
    street: String,
    city: String,
    state: String,
    pincode: String,
    country: {
      type: String,
      default: 'India'
    }
  },
  documents: [{
    type: String,
    url: String,
    uploaded_at: {
      type: Date,
      default: Date.now
    }
  }],
  notes: {
    type: String,
    trim: true
  },
  approved_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approved_at: {
    type: Date
  },
  rejected_reason: {
    type: String,
    trim: true
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
manualRegistrationSchema.index({ registration_number: 1 });
manualRegistrationSchema.index({ email: 1 });
manualRegistrationSchema.index({ phone: 1 });
manualRegistrationSchema.index({ type: 1 });
manualRegistrationSchema.index({ status: 1 });
manualRegistrationSchema.index({ created_at: -1 });

module.exports = mongoose.model('ManualRegistration', manualRegistrationSchema);
