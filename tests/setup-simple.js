// Simple test setup for CI/CD
const mongoose = require('mongoose');

// Mock Redis
jest.mock('ioredis', () => {
  const mockRedis = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    quit: jest.fn(),
    on: jest.fn(),
    connect: jest.fn().mockResolvedValue(),
    status: 'ready'
  };
  return jest.fn(() => mockRedis);
});

// Mock Cloudinary
jest.mock('cloudinary', () => ({
  v2: {
    config: jest.fn(),
    uploader: {
      upload: jest.fn().mockResolvedValue({
        public_id: 'test_public_id',
        secure_url: 'https://res.cloudinary.com/test/image/upload/test.jpg'
      }),
      destroy: jest.fn().mockResolvedValue({ result: 'ok' })
    }
  }
}));

// Mock Winston logger
jest.mock('winston', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  })),
  format: {
    combine: jest.fn(),
    timestamp: jest.fn(),
    errors: jest.fn(),
    splat: jest.fn(),
    json: jest.fn(),
    colorize: jest.fn(),
    simple: jest.fn()
  },
  transports: {
    Console: jest.fn(),
    File: jest.fn()
  }
}));

// Mock BullMQ
jest.mock('bullmq', () => ({
  Queue: jest.fn().mockImplementation(() => ({
    add: jest.fn().mockResolvedValue({ id: 'test-job-id' }),
    close: jest.fn().mockResolvedValue()
  })),
  Worker: jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    close: jest.fn().mockResolvedValue()
  })),
  QueueScheduler: jest.fn().mockImplementation(() => ({
    close: jest.fn().mockResolvedValue()
  }))
}));

// Mock email service
jest.mock('../src/utils/email', () => ({
  sendEmail: jest.fn().mockResolvedValue()
}));

// Mock audit service
jest.mock('../src/utils/audit', () => ({
  recordAuditLog: jest.fn().mockResolvedValue()
}));

// Mock MongoDB connection for tests
beforeAll(async () => {
  // Use test database URL or mock connection
  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/hrms_test';
  
  try {
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
  } catch (error) {
    // If connection fails, continue with mocked tests
    console.warn('MongoDB connection failed, using mocks:', error.message);
  }
});

afterAll(async () => {
  // Close database connection
  try {
    await mongoose.connection.close();
  } catch (error) {
    // Ignore connection errors
  }
});

beforeEach(async () => {
  // Clear all collections before each test
  try {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      const collection = collections[key];
      await collection.deleteMany({});
    }
  } catch (error) {
    // Ignore cleanup errors
  }
});

// Global test timeout
jest.setTimeout(30000);
