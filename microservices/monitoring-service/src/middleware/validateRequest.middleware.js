const { validationResult } = require('express-validator');
const { AppError } = require('./errorHandler.middleware');

function validateRequest(req, res, next) {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => ({
      field: error.path,
      message: error.msg,
      value: error.value
    }));

    throw new AppError('Validation failed', 400);
  }

  next();
}

module.exports = { validateRequest };