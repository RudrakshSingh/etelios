const mongoose = require('mongoose');

const stateSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true
  },
  name: {
    type: String,
    required: true
  },
  is_active: {
    type: Boolean,
    default: true
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

stateSchema.pre('save', function(next) {
  this.updated_at = Date.now();
  next();
});

const State = mongoose.model('State', stateSchema);

module.exports = State;
