const mongoose = require('mongoose');

const tdsSchema = new mongoose.Schema({
  // TDS Information
  tds_number: {
    type: String,
    required: true,
    unique: true
  },
  tds_date: {
    type: Date,
    required: true
  },
  store_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store',
    required: true
  },
  
  // Vendor Information
  vendor_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor',
    required: true
  },
  vendor_name: {
    type: String,
    required: true
  },
  vendor_pan: {
    type: String,
    required: true,
    uppercase: true
  },
  
  // Transaction Information
  source_transaction_id: {
    type: String,
    required: true
  },
  source_transaction_type: {
    type: String,
    enum: ['PURCHASE', 'EXPENSE', 'SALARY', 'COMMISSION', 'RENT', 'PROFESSIONAL_FEES'],
    required: true
  },
  invoice_number: {
    type: String
  },
  invoice_date: {
    type: Date
  },
  
  // TDS Calculation
  gross_amount: {
    type: Number,
    required: true,
    min: 0
  },
  tds_rate: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  tds_amount: {
    type: Number,
    required: true,
    min: 0
  },
  net_amount: {
    type: Number,
    required: true,
    min: 0
  },
  
  // TDS Section Details
  tds_section: {
    type: String,
    required: true,
    enum: [
      '194A', '194B', '194C', '194D', '194E', '194F', '194G', '194H',
      '194I', '194J', '194K', '194L', '194M', '194N', '194O', '194P',
      '194Q', '194R', '194S', '194T', '194U', '194V', '194W', '194X',
      '194Y', '194Z', '194ZA', '194ZB', '194ZC', '194ZD', '194ZE', '194ZF'
    ]
  },
  tds_section_description: {
    type: String
  },
  
  // Payment Information
  payment_date: {
    type: Date,
    required: true
  },
  payment_method: {
    type: String,
    enum: ['BANK_TRANSFER', 'CHEQUE', 'CASH', 'OTHER'],
    required: true
  },
  payment_reference: {
    type: String
  },
  
  // TDS Return Information
  tds_return_period: {
    type: String,
    required: true
  },
  tds_return_quarter: {
    type: String,
    enum: ['Q1', 'Q2', 'Q3', 'Q4']
  },
  tds_return_year: {
    type: Number,
    required: true
  },
  
  // Challan Information
  challan_number: {
    type: String
  },
  challan_date: {
    type: Date
  },
  bsr_code: {
    type: String
  },
  challan_serial_number: {
    type: String
  },
  
  // Status
  status: {
    type: String,
    enum: ['PENDING', 'DEDUCTED', 'DEPOSITED', 'RETURN_FILED', 'CANCELLED'],
    default: 'PENDING'
  },
  
  // Due Dates
  due_date: {
    type: Date,
    required: true
  },
  deposit_due_date: {
    type: Date
  },
  return_due_date: {
    type: Date
  },
  
  // Interest and Penalty
  interest_amount: {
    type: Number,
    default: 0
  },
  penalty_amount: {
    type: Number,
    default: 0
  },
  late_fee: {
    type: Number,
    default: 0
  },
  
  // Audit Information
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  approved_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approved_at: Date,
  
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
tdsSchema.pre('save', function(next) {
  this.updated_at = Date.now();
  
  // Generate TDS number if not provided
  if (!this.tds_number) {
    this.tds_number = `TDS-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
  }
  
  // Calculate TDS amount
  this.tds_amount = (this.gross_amount * this.tds_rate) / 100;
  
  // Calculate net amount
  this.net_amount = this.gross_amount - this.tds_amount;
  
  // Set TDS section description based on section
  this.tds_section_description = this.getTDSSectionDescription(this.tds_section);
  
  // Calculate due dates
  this.calculateDueDates();
  
  next();
});

// Method to get TDS section description
tdsSchema.methods.getTDSSectionDescription = function(section) {
  const descriptions = {
    '194A': 'Interest other than interest on securities',
    '194B': 'Winnings from lottery or crossword puzzle',
    '194C': 'Payments to contractors',
    '194D': 'Insurance commission',
    '194E': 'Payments to non-resident sportsmen or sports associations',
    '194F': 'Payments on account of repurchase of units by Mutual Fund or Unit Trust of India',
    '194G': 'Commission on sale of lottery tickets',
    '194H': 'Commission or brokerage',
    '194I': 'Rent',
    '194J': 'Fees for professional or technical services',
    '194K': 'Income in respect of units',
    '194L': 'Compensation on acquisition of certain immovable property',
    '194M': 'Payment of certain sums by individual or HUF',
    '194N': 'Cash withdrawal',
    '194O': 'Payment of certain sums by e-commerce operator',
    '194P': 'Payment of certain sums by specified senior citizen',
    '194Q': 'Purchase of goods',
    '194R': 'Benefit or perquisite',
    '194S': 'Payment on transfer of virtual digital asset',
    '194T': 'Payment of winnings from horse race',
    '194U': 'Payment of winnings from online game',
    '194V': 'Payment of certain sums by e-commerce operator',
    '194W': 'Payment of certain sums by e-commerce operator',
    '194X': 'Payment of certain sums by e-commerce operator',
    '194Y': 'Payment of certain sums by e-commerce operator',
    '194Z': 'Payment of certain sums by e-commerce operator',
    '194ZA': 'Payment of certain sums by e-commerce operator',
    '194ZB': 'Payment of certain sums by e-commerce operator',
    '194ZC': 'Payment of certain sums by e-commerce operator',
    '194ZD': 'Payment of certain sums by e-commerce operator',
    '194ZE': 'Payment of certain sums by e-commerce operator',
    '194ZF': 'Payment of certain sums by e-commerce operator'
  };
  
  return descriptions[section] || 'Other TDS';
};

// Method to calculate due dates
tdsSchema.methods.calculateDueDates = function() {
  const paymentDate = new Date(this.payment_date);
  
  // TDS deposit due date (7th of next month)
  const depositDueDate = new Date(paymentDate.getFullYear(), paymentDate.getMonth() + 1, 7);
  this.deposit_due_date = depositDueDate;
  
  // TDS return due date (31st of the month following the quarter)
  const quarter = Math.ceil((paymentDate.getMonth() + 1) / 3);
  const returnDueDate = new Date(paymentDate.getFullYear(), quarter * 3, 31);
  this.return_due_date = returnDueDate;
  
  // General due date (same as deposit due date)
  this.due_date = depositDueDate;
};

// Static method to get TDS summary
tdsSchema.statics.getTDSSummary = async function(storeId, period) {
  const filter = { store_id: storeId };
  if (period) {
    filter.tds_date = {
      $gte: period.start,
      $lte: period.end
    };
  }
  
  const result = await this.aggregate([
    { $match: filter },
    {
      $group: {
        _id: null,
        total_gross_amount: { $sum: '$gross_amount' },
        total_tds_amount: { $sum: '$tds_amount' },
        total_net_amount: { $sum: '$net_amount' },
        count: { $sum: 1 }
      }
    }
  ]);
  
  return result[0] || { total_gross_amount: 0, total_tds_amount: 0, total_net_amount: 0, count: 0 };
};

// Indexes
tdsSchema.index({ tds_date: 1, store_id: 1 });
tdsSchema.index({ vendor_id: 1, tds_date: 1 });
tdsSchema.index({ tds_section: 1, tds_date: 1 });
tdsSchema.index({ status: 1, due_date: 1 });
tdsSchema.index({ tds_return_period: 1, tds_return_year: 1 });

const TDS = mongoose.model('TDS', tdsSchema);

module.exports = TDS;
