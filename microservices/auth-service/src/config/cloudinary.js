const cloudinary = require('cloudinary').v2;
const logger = require('./logger');

const config = {
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
};

// Only configure if credentials are provided
if (config.cloud_name && config.api_key && config.api_secret) {
  cloudinary.config(config);
  logger.info('Cloudinary configured successfully');
} else {
  logger.warn('Cloudinary credentials not provided. Upload functionality will be disabled.');
}

const uploadImage = async (fileBuffer, options = {}) => {
  if (!config.cloud_name || !config.api_key || !config.api_secret) {
    throw new Error('Cloudinary not configured');
  }

  const defaultOptions = {
    folder: 'hrms/attendance',
    resource_type: 'image',
    quality: 'auto',
    fetch_format: 'auto',
    ...options
  };

  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      defaultOptions,
      (error, result) => {
        if (error) {
          logger.error('Cloudinary upload error', { error: error.message });
          reject(error);
        } else {
          logger.info('Image uploaded to Cloudinary', { 
            public_id: result.public_id,
            url: result.secure_url 
          });
          resolve(result);
        }
      }
    ).end(fileBuffer);
  });
};

const uploadDocument = async (fileBuffer, options = {}) => {
  if (!config.cloud_name || !config.api_key || !config.api_secret) {
    throw new Error('Cloudinary not configured');
  }

  const defaultOptions = {
    folder: 'hrms/documents',
    resource_type: 'raw',
    ...options
  };

  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      defaultOptions,
      (error, result) => {
        if (error) {
          logger.error('Cloudinary document upload error', { error: error.message });
          reject(error);
        } else {
          logger.info('Document uploaded to Cloudinary', { 
            public_id: result.public_id,
            url: result.secure_url 
          });
          resolve(result);
        }
      }
    ).end(fileBuffer);
  });
};

const deleteFile = async (publicId, resourceType = 'image') => {
  if (!config.cloud_name || !config.api_key || !config.api_secret) {
    throw new Error('Cloudinary not configured');
  }

  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType
    });
    logger.info('File deleted from Cloudinary', { public_id: publicId, result });
    return result;
  } catch (error) {
    logger.error('Cloudinary delete error', { error: error.message, public_id: publicId });
    throw error;
  }
};

module.exports = {
  cloudinary,
  uploadImage,
  uploadDocument,
  deleteFile
};