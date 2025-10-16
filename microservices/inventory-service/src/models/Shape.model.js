const mongoose = require('mongoose');

const shapeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  image_url: {
    type: String
  },
  vector_image: {
    type: String // For SVG or vector graphics
  },
  description: {
    type: String
  },
  category: {
    type: String,
    enum: ['FRAME', 'SUNGLASS', 'LENS']
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

shapeSchema.pre('save', function(next) {
  this.updated_at = Date.now();
  next();
});

const Shape = mongoose.model('Shape', shapeSchema);

module.exports = Shape;