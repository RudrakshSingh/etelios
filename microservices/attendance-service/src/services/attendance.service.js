const Attendance = require('../models/Attendance.model');
const User = require('../models/User.model');
const Store = require('../models/Store.model');
const { isWithinGeofence } = require('../utils/geoUtils');
const logger = require('../config/logger');
const { recordAuditLog } = require('../utils/audit');

/**
 * Records employee clock-in with GPS location and selfie
 * @param {string} employeeId - Employee ID
 * @param {number} latitude - GPS latitude
 * @param {number} longitude - GPS longitude
 * @param {string} selfieUrl - Selfie image URL
 * @param {string} notes - Optional notes
 * @returns {Promise<Object>} Attendance record
 */
const clockIn = async (employeeId, latitude, longitude, selfieUrl, notes = '') => {
  try {
    const employee = await User.findById(employeeId).populate('store');
    if (!employee) {
      const error = new Error('Employee not found');
      error.statusCode = 404;
      throw error;
    }

    if (!employee.store) {
      const error = new Error('Employee not assigned to any store');
      error.statusCode = 400;
      throw error;
    }

    // Check if already clocked in today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const existingAttendance = await Attendance.findOne({
      employee: employeeId,
      'clockIn.time': { $gte: today, $lt: tomorrow }
    });

    if (existingAttendance) {
      const error = new Error('Already clocked in today');
      error.statusCode = 400;
      throw error;
    }

    // Check geofence
    const isWithinGeofenceArea = isWithinGeofence(
      latitude,
      longitude,
      employee.store.location.coordinates[1], // latitude
      employee.store.location.coordinates[0], // longitude
      employee.store.geofenceRadiusKm
    );

    const attendance = new Attendance({
      employee: employeeId,
      store: employee.store._id,
      clockIn: {
        time: new Date(),
        location: {
          type: 'Point',
          coordinates: [longitude, latitude]
        },
        selfie: {
          url: selfieUrl,
          public_id: `selfie_${employeeId}_${Date.now()}`
        }
      },
      status: 'present',
      isGeofenceValid: isWithinGeofenceArea,
      notes
    });

    await attendance.save();
    await recordAuditLog(employeeId, 'CLOCK_IN', { 
      storeId: employee.store._id, 
      isGeofenceValid: isWithinGeofenceArea 
    });

    logger.info('Employee clocked in successfully', { 
      employeeId, 
      storeId: employee.store._id,
      isGeofenceValid: isWithinGeofenceArea 
    });

    return attendance;
  } catch (error) {
    logger.error('Error in clockIn service', { error: error.message, employeeId });
    throw error;
  }
};

/**
 * Records employee clock-out with GPS location and selfie
 * @param {string} employeeId - Employee ID
 * @param {number} latitude - GPS latitude
 * @param {number} longitude - GPS longitude
 * @param {string} selfieUrl - Selfie image URL
 * @param {string} notes - Optional notes
 * @returns {Promise<Object>} Attendance record
 */
const clockOut = async (employeeId, latitude, longitude, selfieUrl, notes = '') => {
  try {
    const employee = await User.findById(employeeId).populate('store');
    if (!employee) {
      const error = new Error('Employee not found');
      error.statusCode = 404;
      throw error;
    }

    // Find today's attendance record
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const attendance = await Attendance.findOne({
      employee: employeeId,
      'clockIn.time': { $gte: today, $lt: tomorrow },
      'clockOut.time': { $exists: false }
    });

    if (!attendance) {
      const error = new Error('No clock-in record found for today');
      error.statusCode = 400;
      throw error;
    }

    // Check geofence
    const isWithinGeofenceArea = isWithinGeofence(
      latitude,
      longitude,
      employee.store.location.coordinates[1], // latitude
      employee.store.location.coordinates[0], // longitude
      employee.store.geofenceRadiusKm
    );

    attendance.clockOut = {
      time: new Date(),
      location: {
        type: 'Point',
        coordinates: [longitude, latitude]
      },
      selfie: {
        url: selfieUrl,
        public_id: `selfie_out_${employeeId}_${Date.now()}`
      }
    };

    await attendance.save();
    await recordAuditLog(employeeId, 'CLOCK_OUT', { 
      storeId: employee.store._id, 
      isGeofenceValid: isWithinGeofenceArea 
    });

    logger.info('Employee clocked out successfully', { 
      employeeId, 
      storeId: employee.store._id,
      isGeofenceValid: isWithinGeofenceArea 
    });

    return attendance;
  } catch (error) {
    logger.error('Error in clockOut service', { error: error.message, employeeId });
    throw error;
  }
};

/**
 * Gets attendance history for an employee
 * @param {string} employeeId - Employee ID
 * @param {Date} startDate - Start date for history
 * @param {Date} endDate - End date for history
 * @param {number} page - Page number
 * @param {number} limit - Records per page
 * @returns {Promise<Object>} Paginated attendance history
 */
const getAttendanceHistory = async (employeeId, startDate, endDate, page = 1, limit = 10) => {
  try {
    const query = { employee: employeeId };

    if (startDate && endDate) {
      query['clockIn.time'] = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const skip = (page - 1) * limit;

    const [attendances, total] = await Promise.all([
      Attendance.find(query)
        .populate('store', 'name address')
        .sort({ 'clockIn.time': -1 })
        .skip(skip)
        .limit(limit),
      Attendance.countDocuments(query)
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      attendances,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: total,
        itemsPerPage: limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    };
  } catch (error) {
    logger.error('Error in getAttendanceHistory service', { error: error.message, employeeId });
    throw error;
  }
};

/**
 * Gets attendance summary for an employee
 * @param {string} employeeId - Employee ID
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {Promise<Object>} Attendance summary
 */
const getAttendanceSummary = async (employeeId, startDate, endDate) => {
  try {
    const query = { 
      employee: employeeId,
      'clockIn.time': {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    };

    const attendances = await Attendance.find(query);

    const summary = {
      totalDays: attendances.length,
      presentDays: attendances.filter(a => a.status === 'present').length,
      absentDays: attendances.filter(a => a.status === 'absent').length,
      onLeaveDays: attendances.filter(a => a.status === 'on_leave').length,
      holidayDays: attendances.filter(a => a.status === 'holiday').length,
      averageWorkingHours: 0,
      totalWorkingHours: 0
    };

    // Calculate working hours
    let totalHours = 0;
    let workingDays = 0;

    attendances.forEach(attendance => {
      if (attendance.clockIn && attendance.clockOut) {
        const hours = (attendance.clockOut.time - attendance.clockIn.time) / (1000 * 60 * 60);
        totalHours += hours;
        workingDays++;
      }
    });

    summary.totalWorkingHours = totalHours;
    summary.averageWorkingHours = workingDays > 0 ? totalHours / workingDays : 0;
    summary.attendancePercentage = summary.totalDays > 0 ? (summary.presentDays / summary.totalDays) * 100 : 0;

    return summary;
  } catch (error) {
    logger.error('Error in getAttendanceSummary service', { error: error.message, employeeId });
    throw error;
  }
};

/**
 * Get all attendance records with filters
 * @param {Object} filters - Filter criteria
 * @param {number} page - Page number
 * @param {number} limit - Number of items per page
 * @returns {Promise<Object>} Paginated attendance records
 */
const getAttendanceRecords = async (filters = {}, page = 1, limit = 10) => {
  try {
    const query = {};

    if (filters.employee) {
      query.employee = filters.employee;
    }

    if (filters.date) {
      query.date = filters.date;
    }

    if (filters.status) {
      query.status = filters.status;
    }

    const skip = (page - 1) * limit;

    const [records, total] = await Promise.all([
      Attendance.find(query)
        .populate('employee', 'name email employee_id')
        .populate('store', 'name code')
        .sort({ date: -1, clockIn: -1 })
        .skip(skip)
        .limit(limit),
      Attendance.countDocuments(query)
    ]);

    return {
      records,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total
      }
    };
  } catch (error) {
    logger.error('Error in getAttendanceRecords service', { error: error.message, filters, page, limit });
    throw error;
  }
};

module.exports = {
  clockIn,
  clockOut,
  getAttendanceHistory,
  getAttendanceSummary,
  getAttendanceRecords
};