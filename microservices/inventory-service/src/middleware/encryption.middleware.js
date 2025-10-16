const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const logger = require('../config/logger');

class EncryptionService {
  constructor() {
    this.algorithm = 'aes-256-gcm';
    this.keyLength = 32;
    this.ivLength = 16;
    this.tagLength = 16;
    this.saltRounds = 12;
    
    // Get encryption key from environment
    this.masterKey = process.env.ENCRYPTION_MASTER_KEY;
    if (!this.masterKey) {
      logger.warn('No encryption master key found, generating new key');
      this.masterKey = crypto.randomBytes(32).toString('hex');
    }
  }

  // Generate a secure random key
  generateKey() {
    return crypto.randomBytes(this.keyLength);
  }

  // Generate a secure random IV
  generateIV() {
    return crypto.randomBytes(this.ivLength);
  }

  // Derive key from master key and salt
  deriveKey(salt) {
    return crypto.pbkdf2Sync(this.masterKey, salt, 100000, this.keyLength, 'sha512');
  }

  // Encrypt sensitive data
  encrypt(text) {
    try {
      const salt = crypto.randomBytes(16);
      const key = this.deriveKey(salt);
      const iv = this.generateIV();
      
      const cipher = crypto.createCipher(this.algorithm, key);
      cipher.setAAD(salt);
      
      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const tag = cipher.getAuthTag();
      
      return {
        encrypted,
        salt: salt.toString('hex'),
        iv: iv.toString('hex'),
        tag: tag.toString('hex')
      };
    } catch (error) {
      logger.error('Encryption failed', { error: error.message });
      throw new Error('Encryption failed');
    }
  }

  // Decrypt sensitive data
  decrypt(encryptedData) {
    try {
      const { encrypted, salt, iv, tag } = encryptedData;
      const key = this.deriveKey(Buffer.from(salt, 'hex'));
      
      const decipher = crypto.createDecipher(this.algorithm, key);
      decipher.setAAD(Buffer.from(salt, 'hex'));
      decipher.setAuthTag(Buffer.from(tag, 'hex'));
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      logger.error('Decryption failed', { error: error.message });
      throw new Error('Decryption failed');
    }
  }

  // Hash password with salt
  async hashPassword(password) {
    try {
      const salt = await bcrypt.genSalt(this.saltRounds);
      const hash = await bcrypt.hash(password, salt);
      return hash;
    } catch (error) {
      logger.error('Password hashing failed', { error: error.message });
      throw new Error('Password hashing failed');
    }
  }

  // Verify password
  async verifyPassword(password, hash) {
    try {
      return await bcrypt.compare(password, hash);
    } catch (error) {
      logger.error('Password verification failed', { error: error.message });
      throw new Error('Password verification failed');
    }
  }

  // Generate secure random token
  generateSecureToken(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }

  // Generate secure random string
  generateSecureString(length = 16) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  // Hash sensitive data for storage
  hashSensitiveData(data) {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  // Generate HMAC for data integrity
  generateHMAC(data, secret) {
    return crypto.createHmac('sha256', secret).update(data).digest('hex');
  }

  // Verify HMAC
  verifyHMAC(data, secret, hmac) {
    const expectedHmac = this.generateHMAC(data, secret);
    return crypto.timingSafeEqual(Buffer.from(hmac, 'hex'), Buffer.from(expectedHmac, 'hex'));
  }

  // Encrypt file content
  encryptFile(fileBuffer) {
    try {
      const salt = crypto.randomBytes(16);
      const key = this.deriveKey(salt);
      const iv = this.generateIV();
      
      const cipher = crypto.createCipher(this.algorithm, key);
      cipher.setAAD(salt);
      
      const encrypted = Buffer.concat([cipher.update(fileBuffer), cipher.final()]);
      const tag = cipher.getAuthTag();
      
      return {
        encrypted,
        salt: salt.toString('hex'),
        iv: iv.toString('hex'),
        tag: tag.toString('hex')
      };
    } catch (error) {
      logger.error('File encryption failed', { error: error.message });
      throw new Error('File encryption failed');
    }
  }

  // Decrypt file content
  decryptFile(encryptedData) {
    try {
      const { encrypted, salt, iv, tag } = encryptedData;
      const key = this.deriveKey(Buffer.from(salt, 'hex'));
      
      const decipher = crypto.createDecipher(this.algorithm, key);
      decipher.setAAD(Buffer.from(salt, 'hex'));
      decipher.setAuthTag(Buffer.from(tag, 'hex'));
      
      const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
      return decrypted;
    } catch (error) {
      logger.error('File decryption failed', { error: error.message });
      throw new Error('File decryption failed');
    }
  }

  // Generate secure session ID
  generateSessionId() {
    return crypto.randomBytes(32).toString('hex');
  }

  // Generate secure API key
  generateAPIKey() {
    const prefix = 'hrms_';
    const randomPart = crypto.randomBytes(24).toString('hex');
    return prefix + randomPart;
  }

  // Encrypt database connection string
  encryptConnectionString(connectionString) {
    const encrypted = this.encrypt(connectionString);
    return JSON.stringify(encrypted);
  }

  // Decrypt database connection string
  decryptConnectionString(encryptedConnectionString) {
    const encryptedData = JSON.parse(encryptedConnectionString);
    return this.decrypt(encryptedData);
  }
}

// Create singleton instance
const encryptionService = new EncryptionService();

// Middleware for encrypting sensitive data before storage
const encryptSensitiveData = (req, res, next) => {
  if (req.body) {
    // Encrypt sensitive fields
    const sensitiveFields = ['password', 'ssn', 'bankAccount', 'creditCard', 'personalInfo'];
    
    for (const field of sensitiveFields) {
      if (req.body[field]) {
        try {
          req.body[field] = encryptionService.encrypt(req.body[field]);
        } catch (error) {
          logger.error('Failed to encrypt sensitive data', { field, error: error.message });
          return res.status(500).json({
            success: false,
            message: 'Data encryption failed'
          });
        }
      }
    }
  }
  
  next();
};

// Middleware for decrypting sensitive data after retrieval
const decryptSensitiveData = (req, res, next) => {
  if (res.locals.data) {
    // Decrypt sensitive fields
    const sensitiveFields = ['password', 'ssn', 'bankAccount', 'creditCard', 'personalInfo'];
    
    for (const field of sensitiveFields) {
      if (res.locals.data[field] && typeof res.locals.data[field] === 'object') {
        try {
          res.locals.data[field] = encryptionService.decrypt(res.locals.data[field]);
        } catch (error) {
          logger.error('Failed to decrypt sensitive data', { field, error: error.message });
        }
      }
    }
  }
  
  next();
};

// Middleware for hashing passwords
const hashPassword = async (req, res, next) => {
  if (req.body.password) {
    try {
      req.body.password = await encryptionService.hashPassword(req.body.password);
    } catch (error) {
      logger.error('Password hashing failed', { error: error.message });
      return res.status(500).json({
        success: false,
        message: 'Password hashing failed'
      });
    }
  }
  
  next();
};

// Middleware for verifying passwords
const verifyPassword = async (req, res, next) => {
  if (req.body.password && req.body.hashedPassword) {
    try {
      const isValid = await encryptionService.verifyPassword(req.body.password, req.body.hashedPassword);
      if (!isValid) {
        return res.status(401).json({
          success: false,
          message: 'Invalid password'
        });
      }
    } catch (error) {
      logger.error('Password verification failed', { error: error.message });
      return res.status(500).json({
        success: false,
        message: 'Password verification failed'
      });
    }
  }
  
  next();
};

module.exports = {
  encryptionService,
  encryptSensitiveData,
  decryptSensitiveData,
  hashPassword,
  verifyPassword
};
