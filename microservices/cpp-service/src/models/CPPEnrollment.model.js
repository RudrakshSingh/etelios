const mongoose = require('mongoose');

const cppEnrollmentSchema = new mongoose.Schema({
  enrollment_id: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  invoice_no: {
    type: String,
    required: true,
    trim: true
  },
  invoice_date: {
    type: Date,
    required: true
  },
  customer_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true
  },
  store_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store',
    required: true
  },
  lines: [{
    line_id: {
      type: String,
      required: true,
      trim: true
    },
    sku: {
      type: String,
      required: true,
      trim: true
    },
    product_type: {
      type: String,
      enum: ['frame', 'lens'],
      required: true
    },
    brand_type: {
      type: String,
      enum: ['inhouse', 'international', null],
      default: null
    },
    mrp: {
      type: Number,
      required: true,
      min: 0
    },
    eligible_mrp: {
      type: Number,
      required: true,
      min: 0
    },
    cpp_divisor: {
      type: Number,
      required: true,
      min: 1.0
    },
    cpp_price: {
      type: Number,
      required: true,
      min: 0
    },
    claim_count: {
      type: Number,
      default: 0,
      min: 0
    },
    is_claimable: {
      type: Boolean,
      default: true
    }
  }],
  expiry_at: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['ACTIVE', 'EXPIRED', 'VOID'],
    default: 'ACTIVE'
  },
  enrollment_fee_paid: {
    type: Number,
    default: 0,
    min: 0
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

// enrollment_id index is already defined in schema with unique: true
cppEnrollmentSchema.index({ invoice_no: 1 });
cppEnrollmentSchema.index({ customer_id: 1 });
cppEnrollmentSchema.index({ store_id: 1 });
cppEnrollmentSchema.index({ status: 1 });
cppEnrollmentSchema.index({ expiry_at: 1 });

const CPPEnrollment = mongoose.model('CPPEnrollment', cppEnrollmentSchema);

module.exports = CPPEnrollment;
