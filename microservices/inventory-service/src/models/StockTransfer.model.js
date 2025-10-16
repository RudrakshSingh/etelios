const mongoose = require('mongoose');

const stockTransferSchema = new mongoose.Schema({
  // Transfer Details
  transfer_number: {
    type: String,
    required: true,
    unique: true
  },
  transfer_type: {
    type: String,
    enum: ['MANUAL', 'AUTO_RECOMMENDED', 'AGING_BASED', 'DEMAND_BASED'],
    required: true
  },
  
  // Store Information
  from_store_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store',
    required: true
  },
  to_store_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store',
    required: true
  },
  
  // Transfer Items
  items: [{
    product_variant_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ProductVariant',
      required: true
    },
    batch_number: String,
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    unit_cost: Number,
    total_cost: Number,
    reason: String,
    aging_days: Number
  }],
  
  // Status and Workflow
  status: {
    type: String,
    enum: ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'IN_TRANSIT', 'RECEIVED', 'REJECTED', 'CANCELLED'],
    default: 'DRAFT'
  },
  
  // Approvals
  requested_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  approved_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approved_at: Date,
  
  // Dates
  requested_date: {
    type: Date,
    default: Date.now
  },
  expected_delivery_date: Date,
  actual_delivery_date: Date,
  
  // Transfer Details
  courier_details: {
    courier_name: String,
    tracking_number: String,
    courier_contact: String
  },
  
  // Financial
  total_value: {
    type: Number,
    default: 0
  },
  
  // Notes and Comments
  notes: String,
  rejection_reason: String,
  
  // Timestamps
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
});

// Pre-save middleware
stockTransferSchema.pre('save', function(next) {
  this.updated_at = Date.now();
  
  // Generate transfer number if not provided
  if (!this.transfer_number) {
    this.transfer_number = `TRF-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
  }
  
  // Calculate total value
  this.total_value = this.items.reduce((total, item) => {
    return total + (item.total_cost || (item.quantity * item.unit_cost));
  }, 0);
  
  next();
});

// Indexes (transfer_number already has unique index from schema definition)
stockTransferSchema.index({ from_store_id: 1, status: 1 });
stockTransferSchema.index({ to_store_id: 1, status: 1 });
stockTransferSchema.index({ status: 1 });
stockTransferSchema.index({ requested_by: 1 });
stockTransferSchema.index({ created_at: 1 });

const StockTransfer = mongoose.model('StockTransfer', stockTransferSchema);

module.exports = StockTransfer;
