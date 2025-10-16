const mongoose = require('mongoose');

const chartOfAccountsSchema = new mongoose.Schema({
  // Account Information
  account_code: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  account_name: {
    type: String,
    required: true,
    trim: true
  },
  account_type: {
    type: String,
    required: true,
    enum: [
      'ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE',
      'COST_OF_GOODS_SOLD', 'OTHER_INCOME', 'OTHER_EXPENSE'
    ]
  },
  account_subtype: {
    type: String,
    enum: [
      // Assets
      'CURRENT_ASSET', 'FIXED_ASSET', 'INVESTMENT', 'INTANGIBLE_ASSET',
      // Liabilities
      'CURRENT_LIABILITY', 'LONG_TERM_LIABILITY', 'PROVISION',
      // Equity
      'OWNERS_EQUITY', 'RETAINED_EARNINGS', 'RESERVES',
      // Revenue
      'SALES_REVENUE', 'SERVICE_REVENUE', 'OTHER_REVENUE',
      // Expenses
      'OPERATING_EXPENSE', 'ADMINISTRATIVE_EXPENSE', 'SELLING_EXPENSE',
      'FINANCIAL_EXPENSE', 'TAX_EXPENSE'
    ]
  },
  
  // Account Hierarchy
  parent_account: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ChartOfAccounts'
  },
  account_level: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  
  // Account Properties
  is_active: {
    type: Boolean,
    default: true
  },
  is_system_account: {
    type: Boolean,
    default: false
  },
  is_cash_account: {
    type: Boolean,
    default: false
  },
  is_bank_account: {
    type: Boolean,
    default: false
  },
  
  // GST Information
  gst_applicable: {
    type: Boolean,
    default: false
  },
  gst_rate: {
    type: Number,
    min: 0,
    max: 100
  },
  hsn_code: {
    type: String
  },
  
  // Account Settings
  allow_negative_balance: {
    type: Boolean,
    default: false
  },
  require_approval: {
    type: Boolean,
    default: false
  },
  approval_limit: {
    type: Number,
    default: 0
  },
  
  // Opening Balance
  opening_balance: {
    type: Number,
    default: 0
  },
  opening_balance_type: {
    type: String,
    enum: ['DEBIT', 'CREDIT'],
    default: 'DEBIT'
  },
  
  // Metadata
  description: {
    type: String,
    trim: true
  },
  notes: {
    type: String,
    trim: true
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
  }
}, {
  timestamps: true
});

// Indexes
chartOfAccountsSchema.index({ account_code: 1 });
chartOfAccountsSchema.index({ account_name: 1 });
chartOfAccountsSchema.index({ account_type: 1 });
chartOfAccountsSchema.index({ parent_account: 1 });
chartOfAccountsSchema.index({ is_active: 1 });

// Virtual for account hierarchy path
chartOfAccountsSchema.virtual('account_path').get(function() {
  if (this.parent_account) {
    return `${this.parent_account.account_path} > ${this.account_name}`;
  }
  return this.account_name;
});

// Method to get all child accounts
chartOfAccountsSchema.methods.getChildAccounts = async function() {
  return await this.constructor.find({ parent_account: this._id });
};

// Method to get account balance
chartOfAccountsSchema.methods.getBalance = async function(fromDate, toDate) {
  const Ledger = require('./Ledger.model');
  
  const query = {
    account_code: this.account_code,
    transaction_date: {
      $gte: fromDate || new Date('1900-01-01'),
      $lte: toDate || new Date()
    }
  };
  
  const transactions = await Ledger.find(query);
  
  let balance = this.opening_balance;
  if (this.opening_balance_type === 'CREDIT') {
    balance = -balance;
  }
  
  transactions.forEach(transaction => {
    if (transaction.debit_amount > 0) {
      balance += transaction.debit_amount;
    }
    if (transaction.credit_amount > 0) {
      balance -= transaction.credit_amount;
    }
  });
  
  return balance;
};

// Static method to get trial balance
chartOfAccountsSchema.statics.getTrialBalance = async function(fromDate, toDate) {
  const accounts = await this.find({ is_active: true }).sort({ account_code: 1 });
  const trialBalance = [];
  
  for (const account of accounts) {
    const balance = await account.getBalance(fromDate, toDate);
    if (balance !== 0) {
      trialBalance.push({
        account_code: account.account_code,
        account_name: account.account_name,
        account_type: account.account_type,
        debit_balance: balance > 0 ? balance : 0,
        credit_balance: balance < 0 ? Math.abs(balance) : 0
      });
    }
  }
  
  return trialBalance;
};

// Static method to get balance sheet
chartOfAccountsSchema.statics.getBalanceSheet = async function(asOfDate) {
  const accounts = await this.find({ is_active: true }).sort({ account_code: 1 });
  const balanceSheet = {
    assets: [],
    liabilities: [],
    equity: []
  };
  
  for (const account of accounts) {
    const balance = await account.getBalance(null, asOfDate);
    
    if (balance !== 0) {
      const accountData = {
        account_code: account.account_code,
        account_name: account.account_name,
        balance: balance
      };
      
      if (account.account_type === 'ASSET') {
        balanceSheet.assets.push(accountData);
      } else if (account.account_type === 'LIABILITY') {
        balanceSheet.liabilities.push(accountData);
      } else if (account.account_type === 'EQUITY') {
        balanceSheet.equity.push(accountData);
      }
    }
  }
  
  return balanceSheet;
};

// Static method to get profit and loss
chartOfAccountsSchema.statics.getProfitAndLoss = async function(fromDate, toDate) {
  const revenueAccounts = await this.find({ 
    account_type: 'REVENUE', 
    is_active: true 
  });
  const expenseAccounts = await this.find({ 
    account_type: 'EXPENSE', 
    is_active: true 
  });
  
  const pnl = {
    revenue: [],
    expenses: [],
    gross_profit: 0,
    net_profit: 0
  };
  
  let totalRevenue = 0;
  let totalExpenses = 0;
  
  // Calculate revenue
  for (const account of revenueAccounts) {
    const balance = await account.getBalance(fromDate, toDate);
    if (balance !== 0) {
      pnl.revenue.push({
        account_code: account.account_code,
        account_name: account.account_name,
        amount: balance
      });
      totalRevenue += balance;
    }
  }
  
  // Calculate expenses
  for (const account of expenseAccounts) {
    const balance = await account.getBalance(fromDate, toDate);
    if (balance !== 0) {
      pnl.expenses.push({
        account_code: account.account_code,
        account_name: account.account_name,
        amount: Math.abs(balance)
      });
      totalExpenses += Math.abs(balance);
    }
  }
  
  pnl.gross_profit = totalRevenue - totalExpenses;
  pnl.net_profit = pnl.gross_profit;
  
  return pnl;
};

const ChartOfAccounts = mongoose.model('ChartOfAccounts', chartOfAccountsSchema);

module.exports = ChartOfAccounts;
