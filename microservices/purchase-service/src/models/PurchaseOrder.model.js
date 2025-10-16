const mongoose = require('mongoose');

const purchaseOrderSchema = new mongoose.Schema({
  po_no: {
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
  store_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store',
    required: true
  },
  items: [{
    sku: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      required: true,
      trim: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
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
    hsn: {
      type: String,
      required: true,
      trim: true
    },
    discount: {
      type: Number,
      default: 0,
      min: 0
    },
    line_total: {
      type: Number,
      required: true
    }
  }],
  subtotal: {
    type: Number,
    required: true,
    min: 0
  },
  tax_total: {
    type: Number,
    required: true,
    min: 0
  },
  freight: {
    type: Number,
    default: 0,
    min: 0
  },
  other_costs: {
    type: Number,
    default: 0,
    min: 0
  },
  gross_total: {
    type: Number,
    required: true,
    min: 0
  },
  status: {
    type: String,
    enum: ['DRAFT', 'APPROVED', 'RECEIVED', 'PARTIAL', 'CLOSED'],
    default: 'DRAFT'
  },
  eta: {
    type: Date
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

// po_no index is already defined in schema with unique: true
purchaseOrderSchema.index({ vendor_id: 1 });
purchaseOrderSchema.index({ store_id: 1 });
purchaseOrderSchema.index({ status: 1 });
purchaseOrderSchema.index({ created_at: 1 });

const PurchaseOrder = mongoose.model('PurchaseOrder', purchaseOrderSchema);

module.exports = PurchaseOrder;
