const mongoose = require('mongoose');

const grnSchema = new mongoose.Schema({
  grn_no: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  po_no: {
    type: String,
    required: true,
    trim: true
  },
  vendor_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor',
    required: true
  },
  store_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store',
    required: true
  },
  received_at: {
    type: Date,
    required: true
  },
  lines: [{
    sku: {
      type: String,
      required: true,
      trim: true
    },
    batch_lot: {
      type: String,
      required: true,
      trim: true
    },
    quantity_received: {
      type: Number,
      required: true,
      min: 0
    },
    rate: {
      type: Number,
      required: true,
      min: 0
    },
    gst_percentage: {
      type: Number,
      required: true,
      min: 0,
      max: 100
    },
    mrp: {
      type: Number,
      required: true,
      min: 0
    },
    expiry_date: {
      type: Date
    },
    line_total: {
      type: Number,
      required: true
    }
  }],
  shortages: [{
    sku: {
      type: String,
      required: true,
      trim: true
    },
    quantity_short: {
      type: Number,
      required: true,
      min: 0
    },
    reason: {
      type: String,
      trim: true
    }
  }],
  damages: [{
    sku: {
      type: String,
      required: true,
      trim: true
    },
    quantity_damaged: {
      type: Number,
      required: true,
      min: 0
    },
    reason: {
      type: String,
      trim: true
    }
  }],
  attachments: [{
    filename: {
      type: String,
      required: true,
      trim: true
    },
    url: {
      type: String,
      required: true,
      trim: true
    },
    type: {
      type: String,
      enum: ['BILL', 'INVOICE', 'OTHER'],
      default: 'BILL'
    }
  }],
  total_amount: {
    type: Number,
    required: true,
    min: 0
  },
  status: {
    type: String,
    enum: ['PENDING', 'RECEIVED', 'PARTIAL', 'COMPLETE'],
    default: 'PENDING'
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
});

// grn_no index is already defined in schema with unique: true
grnSchema.index({ po_no: 1 });
grnSchema.index({ vendor_id: 1 });
grnSchema.index({ store_id: 1 });
grnSchema.index({ received_at: 1 });

const GRN = mongoose.model('GRN', grnSchema);

module.exports = GRN;
