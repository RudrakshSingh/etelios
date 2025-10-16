const mongoose = require('mongoose');

const cppClaimSchema = new mongoose.Schema({
  claim_no: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  enrollment_id: {
    type: String,
    required: true,
    trim: true
  },
  line_id: {
    type: String,
    required: true,
    trim: true
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
  claim_date: {
    type: Date,
    required: true
  },
  reason: {
    type: String,
    enum: ['accidental_breakage'],
    required: true
  },
  evidence: {
    photos: [{
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
      uploaded_at: {
        type: Date,
        default: Date.now
      }
    }],
    surrender_received: {
      type: Boolean,
      required: true,
      default: false
    },
    notes: {
      type: String,
      trim: true
    }
  },
  assessment: {
    approved_mrp: {
      type: Number,
      required: true,
      min: 0
    },
    divisor_used: {
      type: Number,
      required: true,
      min: 1.0
    },
    cpp_price: {
      type: Number,
      required: true,
      min: 0
    },
    eligible_payable: {
      type: Number,
      required: true,
      min: 0
    },
    upcharge_difference: {
      type: Number,
      default: 0,
      min: 0
    },
    taxes: {
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
    }
  },
  replacement: {
    new_sku: {
      type: String,
      required: true,
      trim: true
    },
    new_mrp: {
      type: Number,
      required: true,
      min: 0
    },
    product_type: {
      type: String,
      enum: ['frame', 'lens'],
      required: true
    },
    is_same_mrp: {
      type: Boolean,
      required: true
    }
  },
  status: {
    type: String,
    enum: ['PENDING', 'APPROVED', 'REJECTED', 'FULFILLED', 'CLOSED'],
    default: 'PENDING'
  },
  rejection_reason: {
    type: String,
    trim: true
  },
  billing: {
    cpp_invoice_no: {
      type: String,
      trim: true
    },
    cpp_price: {
      type: Number,
      min: 0
    },
    upcharge: {
      type: Number,
      default: 0,
      min: 0
    },
    tax_breakup: {
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
    total_payable: {
      type: Number,
      min: 0
    }
  },
  audit_log: [{
    timestamp: {
      type: Date,
      default: Date.now
    },
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    action: {
      type: String,
      required: true,
      trim: true
    },
    from_status: {
      type: String,
      trim: true
    },
    to_status: {
      type: String,
      trim: true
    },
    notes: {
      type: String,
      trim: true
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed
    }
  }],
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  approved_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  fulfilled_by: {
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

// claim_no index is already defined in schema with unique: true
cppClaimSchema.index({ enrollment_id: 1 });
cppClaimSchema.index({ customer_id: 1 });
cppClaimSchema.index({ store_id: 1 });
cppClaimSchema.index({ status: 1 });
cppClaimSchema.index({ claim_date: 1 });

const CPPClaim = mongoose.model('CPPClaim', cppClaimSchema);

module.exports = CPPClaim;
