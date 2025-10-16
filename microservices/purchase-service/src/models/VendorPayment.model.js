const mongoose = require('mongoose');

const vendorPaymentSchema = new mongoose.Schema({
  txn_id: {
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
  pinv_no: {
    type: String,
    required: true,
    trim: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  mode: {
    type: String,
    enum: ['CASH', 'CHEQUE', 'NEFT', 'RTGS', 'UPI', 'CARD', 'BANK_TRANSFER'],
    required: true
  },
  utr: {
    type: String,
    trim: true
  },
  payment_date: {
    type: Date,
    required: true
  },
  bank_details: {
    bank_name: {
      type: String,
      trim: true
    },
    account_number: {
      type: String,
      trim: true
    },
    ifsc_code: {
      type: String,
      trim: true
    }
  },
  status: {
    type: String,
    enum: ['PENDING', 'COMPLETED', 'FAILED', 'CANCELLED'],
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
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
});

// txn_id index is already defined in schema with unique: true
vendorPaymentSchema.index({ vendor_id: 1 });
vendorPaymentSchema.index({ pinv_no: 1 });
vendorPaymentSchema.index({ payment_date: 1 });
vendorPaymentSchema.index({ status: 1 });

const VendorPayment = mongoose.model('VendorPayment', vendorPaymentSchema);

module.exports = VendorPayment;
