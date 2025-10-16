const Attendance = require('../models/Attendance.model');
const User = require('../models/User.model');
const Store = require('../models/Store.model');
const Asset = require('../models/Asset.model');
const logger = require('../config/logger');

/**
 * Generates attendance report
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @param {string} storeId - Store ID (optional)
 * @returns {Promise<Object>} Attendance report
 */
const generateAttendanceReport = async (startDate, endDate, storeId = null) => {
  try {
    const query = {
      'clockIn.time': {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    };

    if (storeId) {
      query.store = storeId;
    }

    const attendances = await Attendance.find(query)
      .populate('employee', 'firstName lastName employeeId email')
      .populate('store', 'name address')
      .sort({ 'clockIn.time': -1 });

    // Calculate summary statistics
    const totalEmployees = await User.countDocuments({ 
      status: 'active',
      ...(storeId && { store: storeId })
    });

    const totalWorkingDays = Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24)) + 1;

    // Group by employee
    const employeeStats = {};
    attendances.forEach(attendance => {
      const employeeId = attendance.employee._id.toString();
      if (!employeeStats[employeeId]) {
        employeeStats[employeeId] = {
          employeeId: attendance.employee.employeeId,
          employeeName: `${attendance.employee.firstName} ${attendance.employee.lastName}`,
          email: attendance.employee.email,
          totalDays: 0,
          presentDays: 0,
          absentDays: 0,
          onLeaveDays: 0,
          holidayDays: 0,
          totalWorkingHours: 0,
          averageWorkingHours: 0
        };
      }

      employeeStats[employeeId].totalDays++;
      
      if (attendance.status === 'present') {
        employeeStats[employeeId].presentDays++;
        if (attendance.clockOut && attendance.clockOut.time) {
          const hours = (attendance.clockOut.time - attendance.clockIn.time) / (1000 * 60 * 60);
          employeeStats[employeeId].totalWorkingHours += hours;
        }
      } else if (attendance.status === 'absent') {
        employeeStats[employeeId].absentDays++;
      } else if (attendance.status === 'on_leave') {
        employeeStats[employeeId].onLeaveDays++;
      } else if (attendance.status === 'holiday') {
        employeeStats[employeeId].holidayDays++;
      }
    });

    // Calculate averages and percentages
    Object.values(employeeStats).forEach(employee => {
      employee.attendancePercentage = employee.totalDays > 0 ? (employee.presentDays / employee.totalDays) * 100 : 0;
      employee.averageWorkingHours = employee.presentDays > 0 ? employee.totalWorkingHours / employee.presentDays : 0;
    });

    // Overall statistics
    const totalPresentDays = Object.values(employeeStats).reduce((sum, emp) => sum + emp.presentDays, 0);
    const totalAbsentDays = Object.values(employeeStats).reduce((sum, emp) => sum + emp.absentDays, 0);
    const totalOnLeaveDays = Object.values(employeeStats).reduce((sum, emp) => sum + emp.onLeaveDays, 0);
    const totalHolidayDays = Object.values(employeeStats).reduce((sum, emp) => sum + emp.holidayDays, 0);

    const report = {
      summary: {
        totalEmployees,
        totalWorkingDays,
        totalPresentDays,
        totalAbsentDays,
        totalOnLeaveDays,
        totalHolidayDays,
        averageAttendance: totalEmployees > 0 ? (totalPresentDays / (totalEmployees * totalWorkingDays)) * 100 : 0
      },
      details: Object.values(employeeStats)
    };

    logger.info('Attendance report generated successfully', { 
      startDate, 
      endDate, 
      storeId,
      totalEmployees: report.summary.totalEmployees 
    });

    return report;
  } catch (error) {
    logger.error('Error in generateAttendanceReport service', { error: error.message, startDate, endDate, storeId });
    throw error;
  }
};

/**
 * Generates employee report
 * @param {string} storeId - Store ID (optional)
 * @param {string} department - Department (optional)
 * @returns {Promise<Object>} Employee report
 */
const generateEmployeeReport = async (storeId = null, department = null) => {
  try {
    const query = { isDeleted: false };
    if (storeId) query.store = storeId;
    if (department) query.department = new RegExp(department, 'i');

    const employees = await User.find(query)
      .populate('role', 'name permissions')
      .populate('store', 'name address')
      .select('-password -refreshToken')
      .sort({ createdAt: -1 });

    // Group by status
    const statusStats = {
      active: 0,
      on_leave: 0,
      terminated: 0,
      pending: 0
    };

    // Group by role
    const roleStats = {};

    // Group by department
    const departmentStats = {};

    employees.forEach(employee => {
      // Status statistics
      statusStats[employee.status] = (statusStats[employee.status] || 0) + 1;

      // Role statistics
      const roleName = employee.role?.name || 'Unknown';
      roleStats[roleName] = (roleStats[roleName] || 0) + 1;

      // Department statistics
      const dept = employee.department || 'Unknown';
      departmentStats[dept] = (departmentStats[dept] || 0) + 1;
    });

    const report = {
      summary: {
        totalEmployees: employees.length,
        statusBreakdown: statusStats,
        roleBreakdown: roleStats,
        departmentBreakdown: departmentStats
      },
      details: employees
    };

    logger.info('Employee report generated successfully', { 
      storeId, 
      department,
      totalEmployees: report.summary.totalEmployees 
    });

    return report;
  } catch (error) {
    logger.error('Error in generateEmployeeReport service', { error: error.message, storeId, department });
    throw error;
  }
};

/**
 * Generates asset report
 * @param {string} storeId - Store ID (optional)
 * @returns {Promise<Object>} Asset report
 */
const generateAssetReport = async (storeId = null) => {
  try {
    const query = {};
    if (storeId) {
      // Get employees in the store
      const storeEmployees = await User.find({ store: storeId }).select('_id');
      const employeeIds = storeEmployees.map(emp => emp._id);
      query.assignedTo = { $in: employeeIds };
    }

    const assets = await Asset.find(query)
      .populate('assignedTo', 'firstName lastName employeeId email')
      .sort({ createdAt: -1 });

    // Group by status
    const statusStats = {
      assigned: 0,
      available: 0,
      maintenance: 0,
      retired: 0
    };

    // Group by category
    const categoryStats = {};

    // Calculate total value
    let totalValue = 0;

    assets.forEach(asset => {
      // Status statistics
      statusStats[asset.status] = (statusStats[asset.status] || 0) + 1;

      // Category statistics
      const category = asset.category || 'Unknown';
      categoryStats[category] = (categoryStats[category] || 0) + 1;

      // Total value
      if (asset.purchasePrice) {
        totalValue += asset.purchasePrice;
      }
    });

    const report = {
      summary: {
        totalAssets: assets.length,
        statusBreakdown: statusStats,
        categoryBreakdown: categoryStats,
        totalValue,
        utilizationRate: assets.length > 0 ? (statusStats.assigned / assets.length) * 100 : 0
      },
      details: assets
    };

    logger.info('Asset report generated successfully', { 
      storeId,
      totalAssets: report.summary.totalAssets 
    });

    return report;
  } catch (error) {
    logger.error('Error in generateAssetReport service', { error: error.message, storeId });
    throw error;
  }
};

/**
 * Generates store performance report
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {Promise<Object>} Store performance report
 */
const generateStorePerformanceReport = async (startDate, endDate) => {
  try {
    const stores = await Store.find({ isActive: true });

    const storeReports = await Promise.all(
      stores.map(async (store) => {
        // Get employees in this store
        const storeEmployees = await User.find({ 
          store: store._id, 
          status: 'active' 
        });

        // Get attendance for this store
        const attendances = await Attendance.find({
          store: store._id,
          'clockIn.time': {
            $gte: new Date(startDate),
            $lte: new Date(endDate)
          }
        });

        // Calculate statistics
        const totalWorkingDays = Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24)) + 1;
        const totalPossibleAttendance = storeEmployees.length * totalWorkingDays;
        const totalActualAttendance = attendances.filter(a => a.status === 'present').length;
        const attendanceRate = totalPossibleAttendance > 0 ? (totalActualAttendance / totalPossibleAttendance) * 100 : 0;

        // Calculate average working hours
        let totalWorkingHours = 0;
        let workingDays = 0;
        attendances.forEach(attendance => {
          if (attendance.clockIn && attendance.clockOut) {
            const hours = (attendance.clockOut.time - attendance.clockIn.time) / (1000 * 60 * 60);
            totalWorkingHours += hours;
            workingDays++;
          }
        });
        const averageWorkingHours = workingDays > 0 ? totalWorkingHours / workingDays : 0;

        return {
          storeId: store._id,
          storeName: store.name,
          storeAddress: store.address,
          totalEmployees: storeEmployees.length,
          totalWorkingDays,
          totalActualAttendance,
          attendanceRate,
          averageWorkingHours,
          totalWorkingHours
        };
      })
    );

    const report = {
      summary: {
        totalStores: stores.length,
        totalEmployees: storeReports.reduce((sum, store) => sum + store.totalEmployees, 0),
        averageAttendanceRate: storeReports.length > 0 ? 
          storeReports.reduce((sum, store) => sum + store.attendanceRate, 0) / storeReports.length : 0
      },
      details: storeReports
    };

    logger.info('Store performance report generated successfully', { 
      startDate, 
      endDate,
      totalStores: report.summary.totalStores 
    });

    return report;
  } catch (error) {
    logger.error('Error in generateStorePerformanceReport service', { error: error.message, startDate, endDate });
    throw error;
  }
};

module.exports = {
  generateAttendanceReport,
  generateEmployeeReport,
  generateAssetReport,
  generateStorePerformanceReport
};