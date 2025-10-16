const mongoose = require('mongoose');

const ledgerSchema = new mongoose.Schema({
  // Transaction Information
  transaction_id: {
    type: String,
    required: true,
    unique: true
  },
  transaction_date: {
    type: Date,
    required: true
  },
  transaction_type: {
    type: String,
    required: true,
    enum: ['SALE', 'PURCHASE', 'EXPENSE', 'PAYMENT', 'RECEIPT', 'TRANSFER', 'ADJUSTMENT', 'JOURNAL']
  },
  
  // Account Information
  account_head: {
    type: String,
    required: true,
    enum: [
      'CASH', 'BANK', 'ACCOUNTS_RECEIVABLE', 'ACCOUNTS_PAYABLE', 'INVENTORY',
      'SALES', 'PURCHASES', 'EXPENSES', 'ASSETS', 'LIABILITIES', 'EQUITY',
      'COST_OF_GOODS_SOLD', 'OTHER_INCOME', 'OTHER_EXPENSES'
    ]
  },
  sub_account: {
    type: String
  },
  
  // Store Information
  store_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store'
  },
  
  // Transaction Details
  description: {
    type: String,
    required: true
  },
  reference_number: {
    type: String
  },
  reference_type: {
    type: String,
    enum: ['INVOICE', 'PAYMENT', 'RECEIPT', 'TRANSFER', 'JOURNAL', 'ADJUSTMENT']
  },
  
  // Financial Details
  debit_amount: {
    type: Number,
    default: 0,
    min: 0
  },
  credit_amount: {
    type: Number,
    default: 0,
    min: 0
  },
  balance: {
    type: Number,
    default: 0
  },
  currency: {
    type: String,
    default: 'INR'
  },
  
  // Tax Information
  tax_amount: {
    type: Number,
    default: 0
  },
  tax_type: {
    type: String,
    enum: ['CGST', 'SGST', 'IGST', 'CESS', 'TDS']
  },
  tax_rate: {
    type: Number,
    default: 0
  },
  
  // Customer/Vendor Information
  customer_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer'
  },
  vendor_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor'
  },
  customer_name: String,
  vendor_name: String,
  
  // Product Information
  product_variant_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ProductVariant'
  },
  quantity: Number,
  unit_price: Number,
  
  // Payment Information
  payment_method: {
    type: String,
    enum: ['CASH', 'BANK_TRANSFER', 'CHEQUE', 'CREDIT_CARD', 'DEBIT_CARD', 'UPI', 'OTHER']
  },
  payment_reference: String,
  
  // Status
  status: {
    type: String,
    enum: ['PENDING', 'CONFIRMED', 'CANCELLED', 'REVERSED'],
    default: 'PENDING'
  },
  
  // Reversal Information
  reversed_transaction_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ledger'
  },
  reversal_reason: String,
  
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
ledgerSchema.pre('save', function(next) {
  this.updated_at = Date.now();
  
  // Generate transaction ID if not provided
  if (!this.transaction_id) {
    this.transaction_id = `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
  }
  
  // Calculate balance
  this.balance = this.debit_amount - this.credit_amount;
  
  next();
});

// Static method to get account balance
ledgerSchema.statics.getAccountBalance = async function(accountHead, storeId = null, asOfDate = null) {
  const filter = { account_head: accountHead, status: 'CONFIRMED' };
  if (storeId) filter.store_id = storeId;
  if (asOfDate) filter.transaction_date = { $lte: asOfDate };
  
  const result = await this.aggregate([
    { $match: filter },
    {
      $group: {
        _id: null,
        total_debit: { $sum: '$debit_amount' },
        total_credit: { $sum: '$credit_amount' },
        balance: { $sum: '$balance' }
      }
    }
  ]);
  
  return result[0] || { total_debit: 0, total_credit: 0, balance: 0 };
};

// Static method to get trial balance
ledgerSchema.statics.getTrialBalance = async function(storeId = null, asOfDate = null) {
  const filter = { status: 'CONFIRMED' };
  if (storeId) filter.store_id = storeId;
  if (asOfDate) filter.transaction_date = { $lte: asOfDate };
  
  const result = await this.aggregate([
    { $match: filter },
    {
      $group: {
        _id: '$account_head',
        total_debit: { $sum: '$debit_amount' },
        total_credit: { $sum: '$credit_amount' },
        balance: { $sum: '$balance' }
      }
    },
    { $sort: { _id: 1 } }
  ]);
  
  return result;
};

// Indexes
ledgerSchema.index({ transaction_date: 1, account_head: 1 });
ledgerSchema.index({ account_head: 1, store_id: 1 });
ledgerSchema.index({ transaction_type: 1, transaction_date: 1 });
ledgerSchema.index({ status: 1, transaction_date: 1 });
ledgerSchema.index({ customer_id: 1, transaction_date: 1 });
ledgerSchema.index({ vendor_id: 1, transaction_date: 1 });

const Ledger = mongoose.model('Ledger', ledgerSchema);

module.exports = Ledger;
