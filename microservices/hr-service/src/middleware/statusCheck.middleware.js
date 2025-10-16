const logger = require('../config/logger');
const User = require('../models/User.model');

const checkEmployeeStatus = (allowedStatuses = ['active']) => {
  return async (req, res, next) => {
    try {
      if (!req.user || !req.user._id) {
        const error = new Error('Authentication required for status check.');
        error.statusCode = 401;
        throw error;
      }

      const employee = await User.findById(req.user._id).select('status');

      if (!employee) {
        const error = new Error('Employee not found.');
        error.statusCode = 404;
        throw error;
      }

      if (!allowedStatuses.includes(employee.status)) {
        const error = new Error(`Access denied. Employee status is '${employee.status}'. Required status: ${allowedStatuses.join(', ')}.`);
        error.statusCode = 403;
        throw error;
      }

      next();
    } catch (error) {
      logger.error('Employee status check failed', { error: error.message, userId: req.user ? req.user._id : 'N/A', path: req.originalUrl });
      const statusCode = error.statusCode || 403;
      res.status(statusCode).json({ success: false, message: error.message });
    }
  };
};

module.exports = checkEmployeeStatus;