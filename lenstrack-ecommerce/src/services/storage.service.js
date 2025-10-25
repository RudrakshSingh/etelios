const { BlobServiceClient, StorageSharedKeyCredential } = require('@azure/storage-blob');
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;
const winston = require('winston');

// Logger setup
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/storage.log' })
  ]
});

class StorageService {
  constructor() {
    this.blobServiceClient = null;
    this.containerName = process.env.AZURE_STORAGE_CONTAINER || 'lenstrack-ecommerce';
    this.accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
    this.accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY;
    this.isInitialized = false;
  }

  /**
   * Initialize storage service
   */
  async initialize() {
    try {
      // Check if Azure credentials are available
      if (!this.accountName || !this.accountKey) {
        logger.warn('Azure Storage credentials not configured, using local storage fallback');
        this.isInitialized = false;
        return;
      }

      // Configure Azure Blob Storage
      const sharedKeyCredential = new StorageSharedKeyCredential(this.accountName, this.accountKey);
      this.blobServiceClient = new BlobServiceClient(
        `https://${this.accountName}.blob.core.windows.net`,
        sharedKeyCredential
      );

      // Test connection by creating container if it doesn't exist
      const containerClient = this.blobServiceClient.getContainerClient(this.containerName);
      await containerClient.createIfNotExists();

      this.isInitialized = true;
      logger.info('Azure Storage service initialized successfully');

    } catch (error) {
      logger.error('Storage service initialization failed:', error);
      throw error;
    }
  }

  /**
   * Upload file to Azure Blob Storage
   */
  async uploadFile(file, key, options = {}) {
    try {
      if (!this.isInitialized) {
        throw new Error('Storage service not initialized');
      }

      const containerClient = this.blobServiceClient.getContainerClient(this.containerName);
      const blockBlobClient = containerClient.getBlockBlobClient(key);

      const uploadOptions = {
        blobHTTPHeaders: {
          blobContentType: file.mimetype || options.contentType
        },
        metadata: options.metadata || {}
      };

      const result = await blockBlobClient.upload(file.buffer || file, file.size, uploadOptions);

      logger.info('File uploaded to Azure Blob Storage', {
        key,
        container: this.containerName,
        size: file.size,
        contentType: file.mimetype
      });

      return {
        url: blockBlobClient.url,
        key: key,
        container: this.containerName,
        etag: result.etag
      };
    } catch (error) {
      logger.error('Failed to upload file to Azure Blob Storage:', error);
      throw error;
    }
  }

  /**
   * Upload multiple files
   */
  async uploadFiles(files, keyPrefix, options = {}) {
    try {
      const uploadPromises = files.map((file, index) => {
        const key = `${keyPrefix}/${Date.now()}-${index}-${file.originalname}`;
        return this.uploadFile(file, key, options);
      });

      const results = await Promise.all(uploadPromises);

      logger.info('Multiple files uploaded to Azure Blob Storage', {
        count: files.length,
        keyPrefix
      });

      return results;
    } catch (error) {
      logger.error('Failed to upload multiple files:', error);
      throw error;
    }
  }

  /**
   * Generate presigned URL for upload
   */
  async generatePresignedUploadUrl(key, contentType, expiresIn = 3600) {
    try {
      const params = {
        Bucket: this.bucket,
        Key: key,
        ContentType: contentType,
        Expires: expiresIn
      };

      const url = await this.s3.getSignedUrlPromise('putObject', params);

      logger.info('Presigned upload URL generated', {
        key,
        contentType,
        expiresIn
      });

      return url;
    } catch (error) {
      logger.error('Failed to generate presigned upload URL:', error);
      throw error;
    }
  }

  /**
   * Generate presigned URL for download
   */
  async generatePresignedDownloadUrl(key, expiresIn = 3600) {
    try {
      const params = {
        Bucket: this.bucket,
        Key: key,
        Expires: expiresIn
      };

      const url = await this.s3.getSignedUrlPromise('getObject', params);

      logger.info('Presigned download URL generated', {
        key,
        expiresIn
      });

      return url;
    } catch (error) {
      logger.error('Failed to generate presigned download URL:', error);
      throw error;
    }
  }

  /**
   * Delete file from S3
   */
  async deleteFile(key) {
    try {
      const params = {
        Bucket: this.bucket,
        Key: key
      };

      await this.s3.deleteObject(params).promise();

      logger.info('File deleted from S3', { key });

      return true;
    } catch (error) {
      logger.error('Failed to delete file from S3:', error);
      throw error;
    }
  }

  /**
   * Delete multiple files
   */
  async deleteFiles(keys) {
    try {
      const params = {
        Bucket: this.bucket,
        Delete: {
          Objects: keys.map(key => ({ Key: key }))
        }
      };

      const result = await this.s3.deleteObjects(params).promise();

      logger.info('Multiple files deleted from S3', {
        count: keys.length,
        deleted: result.Deleted.length,
        errors: result.Errors.length
      });

      return result;
    } catch (error) {
      logger.error('Failed to delete multiple files:', error);
      throw error;
    }
  }

  /**
   * Get file metadata
   */
  async getFileMetadata(key) {
    try {
      const params = {
        Bucket: this.bucket,
        Key: key
      };

      const result = await this.s3.headObject(params).promise();

      return {
        key,
        size: result.ContentLength,
        contentType: result.ContentType,
        lastModified: result.LastModified,
        etag: result.ETag,
        metadata: result.Metadata
      };
    } catch (error) {
      if (error.code === 'NotFound') {
        return null;
      }
      logger.error('Failed to get file metadata:', error);
      throw error;
    }
  }

  /**
   * List files in directory
   */
  async listFiles(prefix, maxKeys = 1000) {
    try {
      const params = {
        Bucket: this.bucket,
        Prefix: prefix,
        MaxKeys: maxKeys
      };

      const result = await this.s3.listObjectsV2(params).promise();

      return result.Contents.map(item => ({
        key: item.Key,
        size: item.Size,
        lastModified: item.LastModified,
        etag: item.ETag
      }));
    } catch (error) {
      logger.error('Failed to list files:', error);
      throw error;
    }
  }

  /**
   * Copy file
   */
  async copyFile(sourceKey, destinationKey) {
    try {
      const params = {
        Bucket: this.bucket,
        CopySource: `${this.bucket}/${sourceKey}`,
        Key: destinationKey
      };

      await this.s3.copyObject(params).promise();

      logger.info('File copied in S3', {
        sourceKey,
        destinationKey
      });

      return true;
    } catch (error) {
      logger.error('Failed to copy file:', error);
      throw error;
    }
  }

  /**
   * Process and upload image
   */
  async processAndUploadImage(file, key, options = {}) {
    try {
      const {
        width,
        height,
        quality = 80,
        format = 'jpeg',
        resize = true
      } = options;

      let processedImage = sharp(file.buffer);

      if (resize && (width || height)) {
        processedImage = processedImage.resize(width, height, {
          fit: 'inside',
          withoutEnlargement: true
        });
      }

      processedImage = processedImage[format]({ quality });

      const processedBuffer = await processedImage.toBuffer();

      const processedFile = {
        ...file,
        buffer: processedBuffer,
        size: processedBuffer.length,
        mimetype: `image/${format}`
      };

      return await this.uploadFile(processedFile, key, options);
    } catch (error) {
      logger.error('Failed to process and upload image:', error);
      throw error;
    }
  }

  /**
   * Generate thumbnail
   */
  async generateThumbnail(file, key, size = 300) {
    try {
      const thumbnailBuffer = await sharp(file.buffer)
        .resize(size, size, {
          fit: 'cover',
          position: 'center'
        })
        .jpeg({ quality: 80 })
        .toBuffer();

      const thumbnailKey = `${key}_thumb_${size}`;
      const thumbnailFile = {
        buffer: thumbnailBuffer,
        mimetype: 'image/jpeg',
        size: thumbnailBuffer.length
      };

      return await this.uploadFile(thumbnailFile, thumbnailKey);
    } catch (error) {
      logger.error('Failed to generate thumbnail:', error);
      throw error;
    }
  }

  /**
   * Setup multer for file uploads
   */
  setupMulter() {
    const storage = multer.memoryStorage();
    
    return multer({
      storage,
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
        files: 10
      },
      fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|webp|pdf|doc|docx|xls|xlsx/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (mimetype && extname) {
          return cb(null, true);
        } else {
          cb(new Error('Invalid file type'));
        }
      }
    });
  }

  /**
   * Get storage statistics
   */
  async getStorageStats() {
    try {
      const params = {
        Bucket: this.bucket
      };

      const result = await this.s3.listObjectsV2(params).promise();
      
      const totalSize = result.Contents.reduce((sum, obj) => sum + obj.Size, 0);
      const fileCount = result.Contents.length;

      return {
        totalFiles: fileCount,
        totalSize,
        totalSizeMB: Math.round(totalSize / (1024 * 1024) * 100) / 100,
        bucket: this.bucket,
        region: this.region
      };
    } catch (error) {
      logger.error('Failed to get storage stats:', error);
      throw error;
    }
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      await this.s3.headBucket({ Bucket: this.bucket }).promise();
      
      return {
        status: 'healthy',
        isInitialized: this.isInitialized,
        bucket: this.bucket,
        region: this.region
      };
    } catch (error) {
      logger.error('Storage health check failed:', error);
      return {
        status: 'unhealthy',
        isInitialized: this.isInitialized,
        error: error.message
      };
    }
  }
}

module.exports = StorageService;
