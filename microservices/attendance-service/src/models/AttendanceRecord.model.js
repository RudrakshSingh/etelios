const mongoose = require('mongoose');

const attendanceRecordSchema = new mongoose.Schema({
  // Employee Reference
  employee_code: {
    type: String,
    required: true,
    ref: 'EmployeeMaster'
  },
  
  // Month/Year
  month: {
    type: Number,
    required: true,
    min: 1,
    max: 12
  },
  year: {
    type: Number,
    required: true,
    min: 2020
  },
  
  // Attendance Details
  total_days: {
    type: Number,
    required: true,
    min: 1,
    max: 31
  },
  present_days: {
    type: Number,
    required: true,
    min: 0
  },
  paid_leaves: {
    type: Number,
    default: 0,
    min: 0
  },
  sick_leaves: {
    type: Number,
    default: 0,
    min: 0
  },
  lop_days: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // Calculated Fields
  eligible_days: {
    type: Number,
    required: true,
    min: 0
  },
  attendance_percentage: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  
  // Performance Data (for Sales staff)
  target_sales: {
    type: Number,
    default: 0,
    min: 0
  },
  actual_sales: {
    type: Number,
    default: 0,
    min: 0
  },
  sales_percentage: {
    type: Number,
    default: 0,
    min: 0
  },
  performance_status: {
    type: String,
    enum: ['EXCELLENT', 'GOOD', 'AVERAGE', 'BELOW_AVERAGE', 'POOR'],
    default: 'AVERAGE'
  },
  
  // Status
  status: {
    type: String,
    enum: ['DRAFT', 'SUBMITTED', 'APPROVED', 'LOCKED'],
    default: 'DRAFT'
  },
  
  // Approval
  approved_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approved_at: {
    type: Date
  },
  approval_notes: {
    type: String
  },
  
  // Audit
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
attendanceRecordSchema.index({ employee_code: 1, month: 1, year: 1 }, { unique: true });
attendanceRecordSchema.index({ status: 1 });
attendanceRecordSchema.index({ month: 1, year: 1 });

// Calculate eligible days before saving
attendanceRecordSchema.pre('save', function(next) {
  this.eligible_days = this.present_days + this.paid_leaves + this.sick_leaves;
  this.attendance_percentage = (this.eligible_days / this.total_days) * 100;
  
  // Calculate sales percentage for performance
  if (this.target_sales > 0) {
    this.sales_percentage = (this.actual_sales / this.target_sales) * 100;
    
    // Determine performance status
    if (this.sales_percentage >= 100) {
      this.performance_status = 'EXCELLENT';
    } else if (this.sales_percentage >= 90) {
      this.performance_status = 'GOOD';
    } else if (this.sales_percentage >= 75) {
      this.performance_status = 'AVERAGE';
    } else if (this.sales_percentage >= 50) {
      this.performance_status = 'BELOW_AVERAGE';
    } else {
      this.performance_status = 'POOR';
    }
  }
  
  next();
});

// Get attendance for payroll calculation
attendanceRecordSchema.statics.getAttendanceForPayroll = function(employeeCode, month, year) {
  return this.findOne({
    employee_code: employeeCode,
    month: month,
    year: year,
    status: { $in: ['APPROVED', 'LOCKED'] }
  });
};

// Get monthly attendance summary
attendanceRecordSchema.statics.getMonthlySummary = function(month, year) {
  return this.aggregate([
    {
      $match: {
        month: month,
        year: year,
        status: { $in: ['APPROVED', 'LOCKED'] }
      }
    },
    {
      $group: {
        _id: null,
        total_employees: { $sum: 1 },
        avg_attendance: { $avg: '$attendance_percentage' },
        total_present_days: { $sum: '$present_days' },
        total_paid_leaves: { $sum: '$paid_leaves' },
        total_sick_leaves: { $sum: '$sick_leaves' },
        total_lop_days: { $sum: '$lop_days' }
      }
    }
  ]);
};

const AttendanceRecord = mongoose.model('AttendanceRecord', attendanceRecordSchema);

module.exports = AttendanceRecord;
