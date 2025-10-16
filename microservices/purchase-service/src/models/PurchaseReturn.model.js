const mongoose = require('mongoose');

const purchaseReturnSchema = new mongoose.Schema({
  pr_no: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  vendor_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor',
    required: true
  },
  grn_no: {
    type: String,
    required: true,
    trim: true
  },
  return_date: {
    type: Date,
    required: true
  },
  lines: [{
    sku: {
      type: String,
      required: true,
      trim: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 0
    },
    reason: {
      type: String,
      required: true,
      trim: true
    },
    batch_lot: {
      type: String,
      trim: true
    }
  }],
  credit_note_no: {
    type: String,
    trim: true
  },
  total_amount: {
    type: Number,
    required: true,
    min: 0
  },
  status: {
    type: String,
    enum: ['PENDING', 'APPROVED', 'PROCESSED', 'CANCELLED'],
    default: 'PENDING'
  },
  remarks: {
    type: String,
    trim: true
  },
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  approved_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
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

// pr_no index is already defined in schema with unique: true
purchaseReturnSchema.index({ vendor_id: 1 });
purchaseReturnSchema.index({ grn_no: 1 });
purchaseReturnSchema.index({ return_date: 1 });
purchaseReturnSchema.index({ status: 1 });

const PurchaseReturn = mongoose.model('PurchaseReturn', purchaseReturnSchema);

module.exports = PurchaseReturn;
