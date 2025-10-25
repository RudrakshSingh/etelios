const Joi = require('joi');

/**
 * Request validation middleware wrapper
 * @param {Object} schema - Joi validation schema
 */
const validateRequest = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req);
    
    if (error) {
      const errorMessage = error.details.map(detail => detail.message).join(', ');
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: errorMessage
      });
    }
    
    next();
  };
};

module.exports = { validateRequest };