const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');
const logger = require('../config/logger');

class EncryptionService {
  constructor() {
    this.algorithm = 'aes-256-gcm';
    this.keyLength = 32; // 256 bits
    this.ivLength = 16; // 128 bits
    this.tagLength = 16; // 128 bits
    this.saltLength = 64; // 512 bits
    
    // Get encryption key from environment or generate one
    this.masterKey = this.getMasterKey();
  }

  getMasterKey() {
    const envKey = process.env.ENCRYPTION_MASTER_KEY;
    if (envKey && envKey.length === 64) {
      return Buffer.from(envKey, 'hex');
    }
    
    // Generate a new key if not provided
    const key = crypto.randomBytes(this.keyLength);
    logger.warn('No encryption master key found in environment. Generated new key. Please set ENCRYPTION_MASTER_KEY in production!');
    return key;
  }

  generateKey() {
    return crypto.randomBytes(this.keyLength);
  }

  generateIV() {
    return crypto.randomBytes(this.ivLength);
  }

  generateSalt() {
    return crypto.randomBytes(this.saltLength);
  }

  deriveKey(password, salt) {
    return crypto.pbkdf2Sync(password, salt, 100000, this.keyLength, 'sha512');
  }

  encrypt(data, key = null) {
    try {
      const encryptionKey = key || this.masterKey;
      const iv = this.generateIV();
      const cipher = crypto.createCipher(this.algorithm, encryptionKey);
      
      let encrypted = cipher.update(data, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const tag = cipher.getAuthTag();
      
      return {
        encrypted: encrypted,
        iv: iv.toString('hex'),
        tag: tag.toString('hex'),
        algorithm: this.algorithm
      };
    } catch (error) {
      logger.error('Encryption failed', { error: error.message });
      throw new Error('Encryption failed');
    }
  }

  decrypt(encryptedData, key = null) {
    try {
      const encryptionKey = key || this.masterKey;
      const decipher = crypto.createDecipher(this.algorithm, encryptionKey);
      
      decipher.setAuthTag(Buffer.from(encryptedData.tag, 'hex'));
      
      let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      logger.error('Decryption failed', { error: error.message });
      throw new Error('Decryption failed');
    }
  }

  encryptFile(inputPath, outputPath, key = null) {
    return new Promise(async (resolve, reject) => {
      try {
        const data = await fs.readFile(inputPath);
        const encrypted = this.encrypt(data, key);
        
        const encryptedData = {
          ...encrypted,
          originalSize: data.length,
          timestamp: new Date().toISOString()
        };
        
        await fs.writeFile(outputPath, JSON.stringify(encryptedData));
        resolve(encryptedData);
      } catch (error) {
        logger.error('File encryption failed', { 
          inputPath, 
          outputPath, 
          error: error.message 
        });
        reject(error);
      }
    });
  }

  decryptFile(inputPath, outputPath, key = null) {
    return new Promise(async (resolve, reject) => {
      try {
        const encryptedData = JSON.parse(await fs.readFile(inputPath, 'utf8'));
        const decrypted = this.decrypt(encryptedData, key);
        
        await fs.writeFile(outputPath, Buffer.from(decrypted, 'binary'));
        resolve(decrypted);
      } catch (error) {
        logger.error('File decryption failed', { 
          inputPath, 
          outputPath, 
          error: error.message 
        });
        reject(error);
      }
    });
  }

  generateChecksum(data) {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  verifyChecksum(data, expectedChecksum) {
    const actualChecksum = this.generateChecksum(data);
    return actualChecksum === expectedChecksum;
  }

  generateDocumentKey(documentId, employeeId) {
    // Generate a unique key for each document
    const salt = this.generateSalt();
    const keyMaterial = `${documentId}_${employeeId}_${Date.now()}`;
    return this.deriveKey(keyMaterial, salt);
  }

  encryptDocumentMetadata(metadata, documentKey) {
    const metadataString = JSON.stringify(metadata);
    return this.encrypt(metadataString, documentKey);
  }

  decryptDocumentMetadata(encryptedMetadata, documentKey) {
    const decryptedString = this.decrypt(encryptedMetadata, documentKey);
    return JSON.parse(decryptedString);
  }

  // Secure file deletion
  async secureDelete(filePath, passes = 3) {
    try {
      const fileSize = (await fs.stat(filePath)).size;
      
      for (let i = 0; i < passes; i++) {
        const randomData = crypto.randomBytes(fileSize);
        await fs.writeFile(filePath, randomData);
      }
      
      await fs.unlink(filePath);
      logger.info('File securely deleted', { filePath, passes });
    } catch (error) {
      logger.error('Secure deletion failed', { filePath, error: error.message });
      throw error;
    }
  }

  // Generate secure random filename
  generateSecureFilename(originalName, extension) {
    const timestamp = Date.now();
    const random = crypto.randomBytes(16).toString('hex');
    const hash = crypto.createHash('sha256')
      .update(`${originalName}_${timestamp}_${random}`)
      .digest('hex')
      .substring(0, 16);
    
    return `${hash}_${timestamp}.${extension}`;
  }

  // Validate encryption key strength
  validateKeyStrength(key) {
    if (!key || key.length < 32) {
      return { valid: false, message: 'Key must be at least 32 characters long' };
    }
    
    const entropy = this.calculateEntropy(key);
    if (entropy < 4) {
      return { valid: false, message: 'Key entropy too low' };
    }
    
    return { valid: true, entropy };
  }

  calculateEntropy(str) {
    const freq = {};
    for (let i = 0; i < str.length; i++) {
      const char = str[i];
      freq[char] = (freq[char] || 0) + 1;
    }
    
    let entropy = 0;
    const length = str.length;
    
    for (const count of Object.values(freq)) {
      const p = count / length;
      entropy -= p * Math.log2(p);
    }
    
    return entropy;
  }
}

module.exports = new EncryptionService();
