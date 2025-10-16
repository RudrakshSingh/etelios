const mongoose = require('mongoose');

const employeeMasterSchema = new mongoose.Schema({
  // Basic Employee Information
  employee_code: {
    type: String,
    required: true,
    unique: true,
    format: 'LENSTRACK-{DEPARTMENT}-{NUMBER}'
  },
  name: {
    type: String,
    required: true
  },
  designation: {
    type: String,
    required: true
  },
  store_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store',
    required: true
  },
  joining_date: {
    type: Date,
    required: true
  },
  
  // Category Classification
  category: {
    type: String,
    required: true,
    enum: ['SALES', 'BACKEND', 'LAB', 'HR', 'MANAGEMENT', 'TECH'],
    default: 'BACKEND'
  },
  
  // Salary Structure
  base_salary: {
    type: Number,
    required: true,
    min: 0
  },
  target_sales: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // Statutory Applicability Flags
  pf_applicable: {
    type: Boolean,
    default: true
  },
  esic_applicable: {
    type: Boolean,
    default: true
  },
  pt_applicable: {
    type: Boolean,
    default: true
  },
  tds_applicable: {
    type: Boolean,
    default: true
  },
  
  // Location & Tax Information
  state: {
    type: String,
    required: true
  },
  pan_number: {
    type: String,
    uppercase: true,
    match: /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/
  },
  
  // Leave Entitlements
  leave_entitlements: {
    casual_leave: {
      type: Number,
      default: 12
    },
    sick_leave: {
      type: Number,
      default: 12
    },
    privilege_leave: {
      type: Number,
      default: 21
    }
  },
  
  // Incentive Slabs (for Sales staff)
  incentive_slabs: [{
    slab_name: String,
    min_sales: Number,
    max_sales: Number,
    incentive_percentage: Number,
    is_active: {
      type: Boolean,
      default: true
    }
  }],
  
  // Performance Rules (for Sales staff)
  performance_rules: {
    buffer_threshold: {
      type: Number,
      default: 90 // 90% of target
    },
    safety_floor: {
      type: Number,
      default: 75 // 75% of target
    },
    deduction_percentage: {
      type: Number,
      default: 25 // 25% deduction from Special Allowance
    }
  },
  
  // Version History
  version: {
    type: Number,
    default: 1
  },
  is_current: {
    type: Boolean,
    default: true
  },
  
  // Audit Fields
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updated_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  effective_date: {
    type: Date,
    default: Date.now
  },
  end_date: {
    type: Date
  }
}, {
  timestamps: true
});

// Indexes
employeeMasterSchema.index({ employee_code: 1, is_current: 1 });
employeeMasterSchema.index({ category: 1 });
employeeMasterSchema.index({ store_id: 1 });

// Ensure only one current record per employee
employeeMasterSchema.pre('save', async function(next) {
  if (this.is_current) {
    await this.constructor.updateMany(
      { employee_code: this.employee_code, _id: { $ne: this._id } },
      { $set: { is_current: false, end_date: new Date() } }
    );
  }
  next();
});

// Generate employee code
employeeMasterSchema.methods.generateEmployeeCode = async function() {
  const deptCode = this.category.toUpperCase();
  const lastEmployee = await this.constructor.findOne(
    { category: this.category },
    {},
    { sort: { employee_code: -1 } }
  );
  
  let nextNumber = 1;
  if (lastEmployee && lastEmployee.employee_code) {
    const lastNumber = parseInt(lastEmployee.employee_code.split('-')[2]);
    nextNumber = lastNumber + 1;
  }
  
  return `ETELIOS-${deptCode}-${nextNumber.toString().padStart(3, '0')}`;
};

// Get current employee master
employeeMasterSchema.statics.getCurrentEmployee = function(employeeCode) {
  return this.findOne({ employee_code: employeeCode, is_current: true })
    .populate('store_id', 'name code')
    .populate('created_by', 'name employee_id')
    .populate('updated_by', 'name employee_id');
};

// Get employee history
employeeMasterSchema.statics.getEmployeeHistory = function(employeeCode) {
  return this.find({ employee_code: employeeCode })
    .sort({ effective_date: -1 })
    .populate('store_id', 'name code')
    .populate('created_by', 'name employee_id')
    .populate('updated_by', 'name employee_id');
};

const EmployeeMaster = mongoose.model('EmployeeMaster', employeeMasterSchema);

module.exports = EmployeeMaster;
