const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const logger = require('../config/logger');

/**
 * Hash a password using bcrypt
 * @param {string} password - Plain text password
 * @param {number} saltRounds - Number of salt rounds (default: 12)
 * @returns {Promise<string>} Hashed password
 */
async function hashPassword(password, saltRounds = 12) {
  try {
    if (!password || typeof password !== 'string') {
      throw new Error('Password must be a non-empty string');
    }

    if (password.length < 6) {
      throw new Error('Password must be at least 6 characters long');
    }

    const hashedPassword = await bcrypt.hash(password, saltRounds);
    return hashedPassword;
  } catch (error) {
    logger.error('Error hashing password', { 
      error: error.message,
      saltRounds
    });
    throw new Error('Password hashing failed');
  }
}

/**
 * Compare a password with its hash
 * @param {string} password - Plain text password
 * @param {string} hashedPassword - Hashed password
 * @returns {Promise<boolean>} True if password matches
 */
async function comparePassword(password, hashedPassword) {
  try {
    if (!password || !hashedPassword) {
      return false;
    }

    const isMatch = await bcrypt.compare(password, hashedPassword);
    return isMatch;
  } catch (error) {
    logger.error('Error comparing password', { 
      error: error.message
    });
    throw new Error('Password comparison failed');
  }
}

/**
 * Generate a random string
 * @param {number} length - Length of the string (default: 32)
 * @param {string} charset - Character set to use (default: alphanumeric)
 * @returns {string} Random string
 */
function generateRandomString(length = 32, charset = 'alphanumeric') {
  try {
    let chars;
    
    switch (charset) {
      case 'numeric':
        chars = '0123456789';
        break;
      case 'alpha':
        chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
        break;
      case 'alphanumeric':
        chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        break;
      case 'hex':
        chars = '0123456789abcdef';
        break;
      default:
        chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    }

    let result = '';
    const randomBytes = crypto.randomBytes(length);
    
    for (let i = 0; i < length; i++) {
      result += chars[randomBytes[i] % chars.length];
    }
    
    return result;
  } catch (error) {
    logger.error('Error generating random string', { 
      error: error.message,
      length, charset
    });
    throw new Error('Random string generation failed');
  }
}

/**
 * Generate a secure token
 * @param {number} length - Length of the token (default: 64)
 * @returns {string} Secure token
 */
function generateSecureToken(length = 64) {
  try {
    return crypto.randomBytes(length).toString('hex');
  } catch (error) {
    logger.error('Error generating secure token', { 
      error: error.message,
      length
    });
    throw new Error('Secure token generation failed');
  }
}

/**
 * Generate a UUID v4
 * @returns {string} UUID v4
 */
function generateUUID() {
  try {
    return crypto.randomUUID();
  } catch (error) {
    logger.error('Error generating UUID', { 
      error: error.message
    });
    // Fallback to manual UUID generation
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
}

/**
 * Hash a string using SHA-256
 * @param {string} input - Input string
 * @returns {string} SHA-256 hash
 */
function hashSHA256(input) {
  try {
    if (!input || typeof input !== 'string') {
      throw new Error('Input must be a non-empty string');
    }

    return crypto.createHash('sha256').update(input).digest('hex');
  } catch (error) {
    logger.error('Error hashing with SHA-256', { 
      error: error.message
    });
    throw new Error('SHA-256 hashing failed');
  }
}

/**
 * Hash a string using MD5
 * @param {string} input - Input string
 * @returns {string} MD5 hash
 */
function hashMD5(input) {
  try {
    if (!input || typeof input !== 'string') {
      throw new Error('Input must be a non-empty string');
    }

    return crypto.createHash('md5').update(input).digest('hex');
  } catch (error) {
    logger.error('Error hashing with MD5', { 
      error: error.message
    });
    throw new Error('MD5 hashing failed');
  }
}

/**
 * Create HMAC signature
 * @param {string} data - Data to sign
 * @param {string} secret - Secret key
 * @param {string} algorithm - Hash algorithm (default: sha256)
 * @returns {string} HMAC signature
 */
function createHMAC(data, secret, algorithm = 'sha256') {
  try {
    if (!data || !secret) {
      throw new Error('Data and secret are required');
    }

    return crypto.createHmac(algorithm, secret).update(data).digest('hex');
  } catch (error) {
    logger.error('Error creating HMAC', { 
      error: error.message,
      algorithm
    });
    throw new Error('HMAC creation failed');
  }
}

/**
 * Verify HMAC signature
 * @param {string} data - Original data
 * @param {string} signature - HMAC signature to verify
 * @param {string} secret - Secret key
 * @param {string} algorithm - Hash algorithm (default: sha256)
 * @returns {boolean} True if signature is valid
 */
function verifyHMAC(data, signature, secret, algorithm = 'sha256') {
  try {
    if (!data || !signature || !secret) {
      return false;
    }

    const expectedSignature = createHMAC(data, secret, algorithm);
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  } catch (error) {
    logger.error('Error verifying HMAC', { 
      error: error.message,
      algorithm
    });
    return false;
  }
}

/**
 * Generate a password reset token
 * @returns {string} Password reset token
 */
function generatePasswordResetToken() {
  try {
    return generateSecureToken(32);
  } catch (error) {
    logger.error('Error generating password reset token', { 
      error: error.message
    });
    throw new Error('Password reset token generation failed');
  }
}

/**
 * Generate an email verification token
 * @returns {string} Email verification token
 */
function generateEmailVerificationToken() {
  try {
    return generateSecureToken(32);
  } catch (error) {
    logger.error('Error generating email verification token', { 
      error: error.message
    });
    throw new Error('Email verification token generation failed');
  }
}

module.exports = {
  hashPassword,
  comparePassword,
  generateRandomString,
  generateSecureToken,
  generateUUID,
  hashSHA256,
  hashMD5,
  createHMAC,
  verifyHMAC,
  generatePasswordResetToken,
  generateEmailVerificationToken
};