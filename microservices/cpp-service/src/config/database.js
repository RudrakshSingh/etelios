const mongoose = require('mongoose');
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});

const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/etelios_hrms';
    
    const conn = await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    logger.info('MongoDB connected successfully', {
      service: 'hrms-backend',
      host: conn.connection.host,
      port: conn.connection.port,
      name: conn.connection.name,
      replicaSet: conn.connection.replicaSet || 'none'
    });

    console.log('Database connected successfully');
    return conn;
  } catch (error) {
    logger.error('MongoDB connection failed:', error);
    console.error('Database connection failed:', error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
