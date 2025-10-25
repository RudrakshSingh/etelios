const mongoose = require('mongoose');

const roleSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true, 
    unique: true, 
    trim: true 
  },
  permissions: [{ 
    type: String, 
    trim: true 
  }],
  description: { 
    type: String, 
    trim: true 
  },
  level: {
    type: Number,
    required: true,
    min: 1,
    max: 10
  },
  isActive: {
    type: Boolean,
    default: true
  },
  department: {
    type: String,
    trim: true
  },
  accessLevel: {
    type: String,
    enum: ['read', 'write', 'admin', 'super_admin'],
    default: 'read'
  }
}, { 
  timestamps: true 
});

// Indexes for better query performance
roleSchema.index({ name: 1 });
roleSchema.index({ level: 1 });
roleSchema.index({ isActive: 1 });
roleSchema.index({ department: 1 });

module.exports = mongoose.model('Role', roleSchema);