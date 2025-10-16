const winston = require('winston');

const createLogger = (serviceName) => {
  const logger = winston.createLogger({
    level: (typeof process !== 'undefined' && process.env && process.env.LOG_LEVEL) || 'info',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json(),
      winston.format.printf(({ timestamp, level, message, service, ...meta }) => {
        return JSON.stringify({
          timestamp,
          level,
          service: service || serviceName,
          message,
          ...meta
        });
      })
    ),
    defaultMeta: { service: serviceName },
    transports: [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.simple()
        )
      })
    ]
  });

  // Add file transport in production
  if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'production') {
    logger.add(new winston.transports.File({
      filename: `logs/${serviceName}-error.log`,
      level: 'error'
    }));
    logger.add(new winston.transports.File({
      filename: `logs/${serviceName}-combined.log`
    }));
  }

  return logger;
};

module.exports = createLogger;