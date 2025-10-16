const mongoose = require('mongoose');

const purchaseInvoiceSchema = new mongoose.Schema({
  pinv_no: {
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
  po_no: {
    type: String,
    required: true,
    trim: true
  },
  invoice_date: {
    type: Date,
    required: true
  },
  due_date: {
    type: Date,
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  gst_breakup: {
    cgst: {
      type: Number,
      default: 0,
      min: 0
    },
    sgst: {
      type: Number,
      default: 0,
      min: 0
    },
    igst: {
      type: Number,
      default: 0,
      min: 0
    },
    cess: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  total_amount: {
    type: Number,
    required: true,
    min: 0
  },
  status: {
    type: String,
    enum: ['PENDING', 'APPROVED', 'PAID', 'OVERDUE'],
    default: 'PENDING'
  },
  payment_terms: {
    days: {
      type: Number,
      required: true,
      default: 30
    },
    early_pay_discount: {
      type: Number,
      default: 0
    }
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

// pinv_no index is already defined in schema with unique: true
purchaseInvoiceSchema.index({ vendor_id: 1 });
purchaseInvoiceSchema.index({ grn_no: 1 });
purchaseInvoiceSchema.index({ status: 1 });
purchaseInvoiceSchema.index({ due_date: 1 });

const PurchaseInvoice = mongoose.model('PurchaseInvoice', purchaseInvoiceSchema);

module.exports = PurchaseInvoice;
