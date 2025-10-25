const Joi = require('joi');

/**
 * Validation middleware for notification service
 */

const validateNotification = (req, res, next) => {
  const schema = Joi.object({
    type: Joi.string().valid('email', 'sms', 'push', 'whatsapp').required(),
    recipient: Joi.string().required(),
    subject: Joi.string().optional(),
    message: Joi.string().required(),
    template: Joi.string().optional(),
    data: Joi.object().optional()
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: error.details.map(detail => detail.message)
    });
  }

  next();
};

const validateTemplate = (req, res, next) => {
  const schema = Joi.object({
    name: Joi.string().required(),
    type: Joi.string().valid('email', 'sms', 'push', 'whatsapp').required(),
    subject: Joi.string().optional(),
    content: Joi.string().required(),
    variables: Joi.array().items(Joi.string()).optional()
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: error.details.map(detail => detail.message)
    });
  }

  next();
};

module.exports = {
  validateNotification,
  validateTemplate
};
