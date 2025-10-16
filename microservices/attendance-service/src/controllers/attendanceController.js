const AttendanceService = require('../services/attendance.service');
const { upload, uploadToCloudinary } = require('../middleware/upload.middleware');
const logger = require('../config/logger');

/**
 * Clock in endpoint
 */
const clockIn = async (req, res, next) => {
  try {
    const { latitude, longitude, notes } = req.body;
    const employeeId = req.user._id;

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Selfie is required'
      });
    }

    const attendance = await AttendanceService.clockIn(
      employeeId,
      parseFloat(latitude),
      parseFloat(longitude),
      req.file.cloudinaryUrl,
      notes
    );

    res.status(201).json({
      success: true,
      message: 'Clock-in recorded successfully',
      data: attendance
    });
  } catch (error) {
    logger.error('Error in clockIn controller', { error: error.message, userId: req.user?._id });
    next(error);
  }
};

/**
 * Clock out endpoint
 */
const clockOut = async (req, res, next) => {
  try {
    const { latitude, longitude, notes } = req.body;
    const employeeId = req.user._id;

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Selfie is required'
      });
    }

    const attendance = await AttendanceService.clockOut(
      employeeId,
      parseFloat(latitude),
      parseFloat(longitude),
      req.file.cloudinaryUrl,
      notes
    );

    res.status(200).json({
      success: true,
      message: 'Clock-out recorded successfully',
      data: attendance
    });
  } catch (error) {
    logger.error('Error in clockOut controller', { error: error.message, userId: req.user?._id });
    next(error);
  }
};

/**
 * Get attendance history
 */
const getAttendanceHistory = async (req, res, next) => {
  try {
    const { startDate, endDate, page = 1, limit = 10 } = req.query;
    const employeeId = req.user._id;

    const result = await AttendanceService.getAttendanceHistory(
      employeeId,
      startDate,
      endDate,
      parseInt(page),
      parseInt(limit)
    );

    res.status(200).json({
      success: true,
      message: 'Attendance history retrieved successfully',
      data: result
    });
  } catch (error) {
    logger.error('Error in getAttendanceHistory controller', { error: error.message, userId: req.user?._id });
    next(error);
  }
};

/**
 * Get attendance summary
 */
const getAttendanceSummary = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const employeeId = req.user._id;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required'
      });
    }

    const summary = await AttendanceService.getAttendanceSummary(
      employeeId,
      startDate,
      endDate
    );

    res.status(200).json({
      success: true,
      message: 'Attendance summary retrieved successfully',
      data: summary
    });
  } catch (error) {
    logger.error('Error in getAttendanceSummary controller', { error: error.message, userId: req.user?._id });
    next(error);
  }
};

/**
 * Get all attendance records
 */
const getAttendanceRecords = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, employeeId, startDate, endDate, status } = req.query;

    const filters = {};
    if (employeeId) filters.employee = employeeId;
    if (startDate) filters.date = { ...filters.date, $gte: new Date(startDate) };
    if (endDate) filters.date = { ...filters.date, $lte: new Date(endDate) };
    if (status) filters.status = status;

    const result = await AttendanceService.getAttendanceRecords(filters, parseInt(page), parseInt(limit));

    res.status(200).json({
      success: true,
      message: 'Attendance records retrieved successfully',
      data: result
    });
  } catch (error) {
    logger.error('Error in getAttendanceRecords controller', { error: error.message, userId: req.user?._id });
    next(error);
  }
};

module.exports = {
  clockIn,
  clockOut,
  getAttendanceHistory,
  getAttendanceSummary,
  getAttendanceRecords
};