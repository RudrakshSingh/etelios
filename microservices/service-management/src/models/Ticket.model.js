const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
  ticket_number: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  status: {
    type: String,
    enum: ['open', 'in_progress', 'resolved', 'closed', 'cancelled'],
    default: 'open'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  category: {
    type: String,
    required: true,
    trim: true
  },
  assigned_to: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  customer_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true
  },
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  first_response_at: {
    type: Date
  },
  resolved_at: {
    type: Date
  },
  closed_at: {
    type: Date
  },
  customer_rating: {
    type: Number,
    min: 1,
    max: 5
  },
  customer_feedback: {
    type: String,
    trim: true
  },
  escalated: {
    type: Boolean,
    default: false
  },
  escalated_at: {
    type: Date
  },
  escalated_to: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  tags: [{
    type: String,
    trim: true
  }],
  attachments: [{
    filename: String,
    url: String,
    uploaded_at: {
      type: Date,
      default: Date.now
    }
  }],
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
ticketSchema.index({ ticket_number: 1 });
ticketSchema.index({ status: 1 });
ticketSchema.index({ priority: 1 });
ticketSchema.index({ assigned_to: 1 });
ticketSchema.index({ customer_id: 1 });
ticketSchema.index({ created_at: -1 });

module.exports = mongoose.model('Ticket', ticketSchema);