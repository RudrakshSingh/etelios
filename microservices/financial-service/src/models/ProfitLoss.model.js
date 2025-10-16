const mongoose = require('mongoose');

const profitLossSchema = new mongoose.Schema({
  // Period Information
  period_type: {
    type: String,
    enum: ['MONTHLY', 'QUARTERLY', 'YEARLY'],
    required: true
  },
  period_start: {
    type: Date,
    required: true
  },
  period_end: {
    type: Date,
    required: true
  },
  store_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store'
  },
  
  // Revenue Section
  revenue: {
    gross_sales: {
      type: Number,
      default: 0
    },
    sales_discounts: {
      type: Number,
      default: 0
    },
    sales_returns: {
      type: Number,
      default: 0
    },
    net_sales: {
      type: Number,
      default: 0
    },
    other_income: {
      type: Number,
      default: 0
    },
    total_revenue: {
      type: Number,
      default: 0
    }
  },
  
  // Cost of Goods Sold
  cogs: {
    opening_inventory: {
      type: Number,
      default: 0
    },
    purchases: {
      type: Number,
      default: 0
    },
    purchase_returns: {
      type: Number,
      default: 0
    },
    net_purchases: {
      type: Number,
      default: 0
    },
    closing_inventory: {
      type: Number,
      default: 0
    },
    total_cogs: {
      type: Number,
      default: 0
    }
  },
  
  // Gross Profit
  gross_profit: {
    type: Number,
    default: 0
  },
  
  // Operating Expenses
  operating_expenses: {
    employee_salaries: {
      type: Number,
      default: 0
    },
    rent: {
      type: Number,
      default: 0
    },
    utilities: {
      type: Number,
      default: 0
    },
    marketing: {
      type: Number,
      default: 0
    },
    depreciation: {
      type: Number,
      default: 0
    },
    other_expenses: {
      type: Number,
      default: 0
    },
    total_operating_expenses: {
      type: Number,
      default: 0
    }
  },
  
  // Operating Profit
  operating_profit: {
    type: Number,
    default: 0
  },
  
  // Other Income/Expenses
  other_income_expenses: {
    interest_income: {
      type: Number,
      default: 0
    },
    interest_expense: {
      type: Number,
      default: 0
    },
    other_income: {
      type: Number,
      default: 0
    },
    other_expenses: {
      type: Number,
      default: 0
    }
  },
  
  // Net Profit
  net_profit: {
    type: Number,
    default: 0
  },
  
  // Margins
  gross_margin: {
    type: Number,
    default: 0
  },
  operating_margin: {
    type: Number,
    default: 0
  },
  net_margin: {
    type: Number,
    default: 0
  },
  
  // Status
  status: {
    type: String,
    enum: ['DRAFT', 'REVIEW', 'APPROVED', 'LOCKED'],
    default: 'DRAFT'
  },
  
  // Audit
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

// Pre-save middleware to calculate derived fields
profitLossSchema.pre('save', function(next) {
  this.updated_at = Date.now();
  
  // Calculate net sales
  this.revenue.net_sales = this.revenue.gross_sales - this.revenue.sales_discounts - this.revenue.sales_returns;
  
  // Calculate total revenue
  this.revenue.total_revenue = this.revenue.net_sales + this.revenue.other_income;
  
  // Calculate net purchases
  this.cogs.net_purchases = this.cogs.purchases - this.cogs.purchase_returns;
  
  // Calculate total COGS
  this.cogs.total_cogs = this.cogs.opening_inventory + this.cogs.net_purchases - this.cogs.closing_inventory;
  
  // Calculate gross profit
  this.gross_profit = this.revenue.total_revenue - this.cogs.total_cogs;
  
  // Calculate total operating expenses
  this.operating_expenses.total_operating_expenses = 
    this.operating_expenses.employee_salaries +
    this.operating_expenses.rent +
    this.operating_expenses.utilities +
    this.operating_expenses.marketing +
    this.operating_expenses.depreciation +
    this.operating_expenses.other_expenses;
  
  // Calculate operating profit
  this.operating_profit = this.gross_profit - this.operating_expenses.total_operating_expenses;
  
  // Calculate net profit
  this.net_profit = this.operating_profit + 
    this.other_income_expenses.interest_income +
    this.other_income_expenses.other_income -
    this.other_income_expenses.interest_expense -
    this.other_income_expenses.other_expenses;
  
  // Calculate margins
  if (this.revenue.total_revenue > 0) {
    this.gross_margin = (this.gross_profit / this.revenue.total_revenue) * 100;
    this.operating_margin = (this.operating_profit / this.revenue.total_revenue) * 100;
    this.net_margin = (this.net_profit / this.revenue.total_revenue) * 100;
  }
  
  next();
});

// Indexes
profitLossSchema.index({ period_start: 1, period_end: 1 });
profitLossSchema.index({ store_id: 1, period_start: 1 });
profitLossSchema.index({ period_start: 1, period_end: 1, store_id: 1 }, { unique: true });

const ProfitLoss = mongoose.model('ProfitLoss', profitLossSchema);

module.exports = ProfitLoss;
