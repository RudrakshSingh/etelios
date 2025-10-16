const ReportsService = require('../services/reports.service');
const logger = require('../config/logger');

/**
 * Generate attendance report
 */
const generateAttendanceReport = async (req, res, next) => {
  try {
    const { startDate, endDate, storeId, format = 'json' } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required'
      });
    }

    const report = await ReportsService.generateAttendanceReport(startDate, endDate, storeId);

    if (format === 'csv') {
      // Convert to CSV format
      const csvData = convertAttendanceReportToCSV(report);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=attendance-report.csv');
      return res.send(csvData);
    }

    res.status(200).json({
      success: true,
      message: 'Attendance report generated successfully',
      data: report
    });
  } catch (error) {
    logger.error('Error in generateAttendanceReport controller', { error: error.message, userId: req.user?._id });
    next(error);
  }
};

/**
 * Generate employee report
 */
const generateEmployeeReport = async (req, res, next) => {
  try {
    const { storeId, department, format = 'json' } = req.query;

    const report = await ReportsService.generateEmployeeReport(storeId, department);

    if (format === 'csv') {
      // Convert to CSV format
      const csvData = convertEmployeeReportToCSV(report);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=employee-report.csv');
      return res.send(csvData);
    }

    res.status(200).json({
      success: true,
      message: 'Employee report generated successfully',
      data: report
    });
  } catch (error) {
    logger.error('Error in generateEmployeeReport controller', { error: error.message, userId: req.user?._id });
    next(error);
  }
};

/**
 * Generate asset report
 */
const generateAssetReport = async (req, res, next) => {
  try {
    const { storeId, format = 'json' } = req.query;

    const report = await ReportsService.generateAssetReport(storeId);

    if (format === 'csv') {
      // Convert to CSV format
      const csvData = convertAssetReportToCSV(report);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=asset-report.csv');
      return res.send(csvData);
    }

    res.status(200).json({
      success: true,
      message: 'Asset report generated successfully',
      data: report
    });
  } catch (error) {
    logger.error('Error in generateAssetReport controller', { error: error.message, userId: req.user?._id });
    next(error);
  }
};

/**
 * Generate store performance report
 */
const generateStorePerformanceReport = async (req, res, next) => {
  try {
    const { startDate, endDate, format = 'json' } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required'
      });
    }

    const report = await ReportsService.generateStorePerformanceReport(startDate, endDate);

    if (format === 'csv') {
      // Convert to CSV format
      const csvData = convertStorePerformanceReportToCSV(report);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=store-performance-report.csv');
      return res.send(csvData);
    }

    res.status(200).json({
      success: true,
      message: 'Store performance report generated successfully',
      data: report
    });
  } catch (error) {
    logger.error('Error in generateStorePerformanceReport controller', { error: error.message, userId: req.user?._id });
    next(error);
  }
};

/**
 * Convert attendance report to CSV format
 */
const convertAttendanceReportToCSV = (report) => {
  const headers = [
    'Employee ID',
    'Employee Name',
    'Email',
    'Total Days',
    'Present Days',
    'Absent Days',
    'On Leave Days',
    'Holiday Days',
    'Attendance Percentage',
    'Total Working Hours',
    'Average Working Hours'
  ];

  const rows = report.details.map(employee => [
    employee.employeeId,
    employee.employeeName,
    employee.email,
    employee.totalDays,
    employee.presentDays,
    employee.absentDays,
    employee.onLeaveDays,
    employee.holidayDays,
    employee.attendancePercentage.toFixed(2),
    employee.totalWorkingHours.toFixed(2),
    employee.averageWorkingHours.toFixed(2)
  ]);

  return [headers, ...rows].map(row => row.join(',')).join('\n');
};

/**
 * Convert employee report to CSV format
 */
const convertEmployeeReportToCSV = (report) => {
  const headers = [
    'Employee ID',
    'First Name',
    'Last Name',
    'Email',
    'Phone',
    'Job Title',
    'Department',
    'Role',
    'Store',
    'Status',
    'Hire Date'
  ];

  const rows = report.details.map(employee => [
    employee.employeeId,
    employee.firstName,
    employee.lastName,
    employee.email,
    employee.phone || '',
    employee.jobTitle || '',
    employee.department || '',
    employee.role?.name || '',
    employee.store?.name || '',
    employee.status,
    employee.hireDate
  ]);

  return [headers, ...rows].map(row => row.join(',')).join('\n');
};

/**
 * Convert asset report to CSV format
 */
const convertAssetReportToCSV = (report) => {
  const headers = [
    'Asset ID',
    'Name',
    'Description',
    'Category',
    'Status',
    'Assigned To',
    'Assigned Date',
    'Purchase Date',
    'Purchase Price',
    'Serial Number'
  ];

  const rows = report.details.map(asset => [
    asset.assetId,
    asset.name,
    asset.description || '',
    asset.category || '',
    asset.status,
    asset.assignedTo ? `${asset.assignedTo.firstName} ${asset.assignedTo.lastName}` : '',
    asset.assignedDate || '',
    asset.purchaseDate || '',
    asset.purchasePrice || '',
    asset.serialNumber || ''
  ]);

  return [headers, ...rows].map(row => row.join(',')).join('\n');
};

/**
 * Convert store performance report to CSV format
 */
const convertStorePerformanceReportToCSV = (report) => {
  const headers = [
    'Store Name',
    'Store Address',
    'Total Employees',
    'Total Working Days',
    'Total Actual Attendance',
    'Attendance Rate (%)',
    'Average Working Hours',
    'Total Working Hours'
  ];

  const rows = report.details.map(store => [
    store.storeName,
    `${store.storeAddress.street}, ${store.storeAddress.city}`,
    store.totalEmployees,
    store.totalWorkingDays,
    store.totalActualAttendance,
    store.attendanceRate.toFixed(2),
    store.averageWorkingHours.toFixed(2),
    store.totalWorkingHours.toFixed(2)
  ]);

  return [headers, ...rows].map(row => row.join(',')).join('\n');
};

module.exports = {
  generateAttendanceReport,
  generateEmployeeReport,
  generateAssetReport,
  generateStorePerformanceReport
};