const mongoose = require('mongoose');
const logger = require('./logger');

class DatabaseConnection {
  constructor() {
    this.connections = new Map();
  }

  async connect(serviceName, options = {}) {
    const {
      uri = process.env.MONGODB_URI || 'mongodb://admin:password@localhost:27017',
      dbName = `${serviceName}_${process.env.NODE_ENV || 'development'}`,
      ...mongooseOptions
    } = options;

    try {
      const connection = await mongoose.createConnection(uri, {
        dbName,
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        ...mongooseOptions
      });

      this.connections.set(serviceName, connection);
      
      logger(serviceName).info(`${serviceName} connected to MongoDB`, {
        service: serviceName,
        database: dbName
      });

      return connection;
    } catch (error) {
      logger(serviceName).error(`${serviceName} MongoDB connection failed`, {
        service: serviceName,
        error: error.message
      });
      throw error;
    }
  }

  getConnection(serviceName) {
    return this.connections.get(serviceName);
  }

  async disconnect(serviceName) {
    const connection = this.connections.get(serviceName);
    if (connection) {
      await connection.close();
      this.connections.delete(serviceName);
      logger(serviceName).info(`${serviceName} MongoDB disconnected`);
    }
  }

  async disconnectAll() {
    const promises = Array.from(this.connections.keys()).map(serviceName => 
      this.disconnect(serviceName)
    );
    await Promise.all(promises);
  }
}

module.exports = new DatabaseConnection();