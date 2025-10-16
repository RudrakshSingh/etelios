const mongoose = require('mongoose');

const journalEntrySchema = new mongoose.Schema({
  // Entry Information
  entry_number: {
    type: String,
    required: true,
    unique: true
  },
  entry_date: {
    type: Date,
    required: true
  },
  entry_type: {
    type: String,
    required: true,
    enum: [
      'MANUAL', 'AUTO', 'RECURRING', 'REVERSAL', 'ADJUSTMENT',
      'SALES', 'PURCHASE', 'PAYMENT', 'RECEIPT', 'TRANSFER'
    ]
  },
  
  // Entry Details
  description: {
    type: String,
    required: true,
    trim: true
  },
  reference_number: {
    type: String
  },
  reference_type: {
    type: String,
    enum: ['INVOICE', 'PAYMENT', 'RECEIPT', 'TRANSFER', 'JOURNAL', 'ADJUSTMENT']
  },
  
  // Store Information
  store_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store'
  },
  
  // Journal Lines
  journal_lines: [{
    account_code: {
      type: String,
      required: true
    },
    account_name: {
      type: String,
      required: true
    },
    description: {
      type: String,
      required: true
    },
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
    cost_center: {
      type: String
    },
    project: {
      type: String
    },
    department: {
      type: String
    }
  }],
  
  // Totals
  total_debit: {
    type: Number,
    required: true,
    min: 0
  },
  total_credit: {
    type: Number,
    required: true,
    min: 0
  },
  
  // Status and Approval
  status: {
    type: String,
    enum: ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'POSTED', 'REVERSED'],
    default: 'DRAFT'
  },
  approval_required: {
    type: Boolean,
    default: false
  },
  approved_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approved_at: {
    type: Date
  },
  posted_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  posted_at: {
    type: Date
  },
  
  // Recurring Entry
  is_recurring: {
    type: Boolean,
    default: false
  },
  recurring_frequency: {
    type: String,
    enum: ['DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY']
  },
  recurring_end_date: {
    type: Date
  },
  parent_entry: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'JournalEntry'
  },
  
  // Reversal Information
  is_reversal: {
    type: Boolean,
    default: false
  },
  reversed_entry: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'JournalEntry'
  },
  reversal_reason: {
    type: String
  },
  
  // GST Information
  gst_applicable: {
    type: Boolean,
    default: false
  },
  gst_amount: {
    type: Number,
    default: 0
  },
  cgst_amount: {
    type: Number,
    default: 0
  },
  sgst_amount: {
    type: Number,
    default: 0
  },
  igst_amount: {
    type: Number,
    default: 0
  },
  
  // Audit Trail
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updated_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Additional Information
  notes: {
    type: String,
    trim: true
  },
  attachments: [{
    filename: String,
    url: String,
    uploaded_at: Date
  }]
}, {
  timestamps: true
});

// Pre-save middleware to generate entry number
journalEntrySchema.pre('save', function(next) {
  if (!this.entry_number) {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = Math.random().toString(36).substr(2, 4).toUpperCase();
    this.entry_number = `JE${year}${month}${day}${random}`;
  }
  
  // Calculate totals
  this.total_debit = this.journal_lines.reduce((sum, line) => sum + line.debit_amount, 0);
  this.total_credit = this.journal_lines.reduce((sum, line) => sum + line.credit_amount, 0);
  
  next();
});

// Validation to ensure debit equals credit
journalEntrySchema.pre('save', function(next) {
  if (Math.abs(this.total_debit - this.total_credit) > 0.01) {
    return next(new Error('Total debit must equal total credit'));
  }
  next();
});

// Indexes
journalEntrySchema.index({ entry_number: 1 });
journalEntrySchema.index({ entry_date: 1 });
journalEntrySchema.index({ entry_type: 1 });
journalEntrySchema.index({ status: 1 });
journalEntrySchema.index({ store_id: 1 });
journalEntrySchema.index({ created_by: 1 });

// Method to post entry
journalEntrySchema.methods.postEntry = async function(userId) {
  if (this.status !== 'APPROVED') {
    throw new Error('Entry must be approved before posting');
  }
  
  const Ledger = require('./Ledger.model');
  
  // Create ledger entries for each journal line
  for (const line of this.journal_lines) {
    if (line.debit_amount > 0) {
      await Ledger.create({
        transaction_id: `${this.entry_number}-${line.account_code}-D`,
        transaction_date: this.entry_date,
        transaction_type: 'JOURNAL',
        account_head: line.account_name,
        account_code: line.account_code,
        store_id: this.store_id,
        description: line.description,
        reference_number: this.entry_number,
        reference_type: 'JOURNAL',
        debit_amount: line.debit_amount,
        credit_amount: 0,
        cost_center: line.cost_center,
        project: line.project,
        department: line.department,
        created_by: userId
      });
    }
    
    if (line.credit_amount > 0) {
      await Ledger.create({
        transaction_id: `${this.entry_number}-${line.account_code}-C`,
        transaction_date: this.entry_date,
        transaction_type: 'JOURNAL',
        account_head: line.account_name,
        account_code: line.account_code,
        store_id: this.store_id,
        description: line.description,
        reference_number: this.entry_number,
        reference_type: 'JOURNAL',
        debit_amount: 0,
        credit_amount: line.credit_amount,
        cost_center: line.cost_center,
        project: line.project,
        department: line.department,
        created_by: userId
      });
    }
  }
  
  this.status = 'POSTED';
  this.posted_by = userId;
  this.posted_at = new Date();
  await this.save();
};

// Method to reverse entry
journalEntrySchema.methods.reverseEntry = async function(userId, reason) {
  if (this.status !== 'POSTED') {
    throw new Error('Only posted entries can be reversed');
  }
  
  // Create reversal entry
  const reversalEntry = new this.constructor({
    entry_date: new Date(),
    entry_type: 'REVERSAL',
    description: `Reversal of ${this.entry_number}`,
    reference_number: this.entry_number,
    reference_type: 'JOURNAL',
    store_id: this.store_id,
    journal_lines: this.journal_lines.map(line => ({
      account_code: line.account_code,
      account_name: line.account_name,
      description: `Reversal of ${line.description}`,
      debit_amount: line.credit_amount,
      credit_amount: line.debit_amount,
      cost_center: line.cost_center,
      project: line.project,
      department: line.department
    })),
    is_reversal: true,
    reversed_entry: this._id,
    reversal_reason: reason,
    created_by: userId
  });
  
  await reversalEntry.save();
  await reversalEntry.postEntry(userId);
  
  this.status = 'REVERSED';
  await this.save();
  
  return reversalEntry;
};

// Static method to get trial balance
journalEntrySchema.statics.getTrialBalance = async function(fromDate, toDate) {
  const ChartOfAccounts = require('./ChartOfAccounts.model');
  return await ChartOfAccounts.getTrialBalance(fromDate, toDate);
};

// Static method to get balance sheet
journalEntrySchema.statics.getBalanceSheet = async function(asOfDate) {
  const ChartOfAccounts = require('./ChartOfAccounts.model');
  return await ChartOfAccounts.getBalanceSheet(asOfDate);
};

// Static method to get profit and loss
journalEntrySchema.statics.getProfitAndLoss = async function(fromDate, toDate) {
  const ChartOfAccounts = require('./ChartOfAccounts.model');
  return await ChartOfAccounts.getProfitAndLoss(fromDate, toDate);
};

const JournalEntry = mongoose.model('JournalEntry', journalEntrySchema);

module.exports = JournalEntry;
