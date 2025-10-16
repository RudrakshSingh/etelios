const { cloudinary } = require('../config/cloudinary');
const logger = require('../config/logger');

/**
 * Upload file to Cloudinary
 * @param {Buffer} fileBuffer - File buffer
 * @param {string} fileName - Original file name
 * @param {string} folder - Cloudinary folder (default: 'hrms')
 * @param {object} options - Additional upload options
 * @returns {Promise<object>} Upload result
 */
async function uploadFile(fileBuffer, fileName, folder = 'hrms', options = {}) {
  try {
    if (!fileBuffer || !fileName) {
      throw new Error('File buffer and file name are required');
    }

    // Convert buffer to base64
    const base64String = fileBuffer.toString('base64');
    const dataURI = `data:${getMimeType(fileName)};base64,${base64String}`;

    // Default upload options
    const uploadOptions = {
      folder: folder,
      resource_type: 'auto',
      quality: 'auto',
      fetch_format: 'auto',
      ...options
    };

    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(dataURI, uploadOptions);

    logger.info('File uploaded to Cloudinary', {
      publicId: result.public_id,
      fileName,
      folder,
      size: result.bytes
    });

    return {
      public_id: result.public_id,
      secure_url: result.secure_url,
      format: result.format,
      width: result.width,
      height: result.height,
      bytes: result.bytes,
      created_at: result.created_at
    };

  } catch (error) {
    logger.error('Error uploading file to Cloudinary', { 
      error: error.message,
      fileName,
      folder
    });
    throw new Error('File upload failed');
  }
}

/**
 * Delete file from Cloudinary
 * @param {string} publicId - Cloudinary public ID
 * @param {string} resourceType - Resource type (default: 'auto')
 * @returns {Promise<object>} Delete result
 */
async function deleteFile(publicId, resourceType = 'auto') {
  try {
    if (!publicId) {
      throw new Error('Public ID is required');
    }

    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType
    });

    logger.info('File deleted from Cloudinary', {
      publicId,
      result: result.result
    });

    return result;

  } catch (error) {
    logger.error('Error deleting file from Cloudinary', { 
      error: error.message,
      publicId
    });
    throw new Error('File deletion failed');
  }
}

/**
 * Get file information from Cloudinary
 * @param {string} publicId - Cloudinary public ID
 * @param {string} resourceType - Resource type (default: 'auto')
 * @returns {Promise<object>} File information
 */
async function getFileInfo(publicId, resourceType = 'auto') {
  try {
    if (!publicId) {
      throw new Error('Public ID is required');
    }

    const result = await cloudinary.api.resource(publicId, {
      resource_type: resourceType
    });

    return {
      public_id: result.public_id,
      secure_url: result.secure_url,
      format: result.format,
      width: result.width,
      height: result.height,
      bytes: result.bytes,
      created_at: result.created_at,
      tags: result.tags
    };

  } catch (error) {
    logger.error('Error getting file info from Cloudinary', { 
      error: error.message,
      publicId
    });
    throw new Error('File info retrieval failed');
  }
}

/**
 * Generate image transformation URL
 * @param {string} publicId - Cloudinary public ID
 * @param {object} transformations - Transformation options
 * @returns {string} Transformed image URL
 */
function generateImageUrl(publicId, transformations = {}) {
  try {
    if (!publicId) {
      throw new Error('Public ID is required');
    }

    return cloudinary.url(publicId, {
      secure: true,
      ...transformations
    });

  } catch (error) {
    logger.error('Error generating image URL', { 
      error: error.message,
      publicId
    });
    throw new Error('Image URL generation failed');
  }
}

/**
 * Create image thumbnail
 * @param {string} publicId - Cloudinary public ID
 * @param {number} width - Thumbnail width
 * @param {number} height - Thumbnail height
 * @param {string} crop - Crop mode (default: 'fill')
 * @returns {string} Thumbnail URL
 */
function createThumbnail(publicId, width = 150, height = 150, crop = 'fill') {
  try {
    return generateImageUrl(publicId, {
      width,
      height,
      crop,
      quality: 'auto',
      fetch_format: 'auto'
    });

  } catch (error) {
    logger.error('Error creating thumbnail', { 
      error: error.message,
      publicId,
      width,
      height
    });
    throw new Error('Thumbnail creation failed');
  }
}

/**
 * Get MIME type from file extension
 * @param {string} fileName - File name
 * @returns {string} MIME type
 */
function getMimeType(fileName) {
  const ext = fileName.split('.').pop().toLowerCase();
  
  const mimeTypes = {
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'pdf': 'application/pdf',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'xls': 'application/vnd.ms-excel',
    'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'txt': 'text/plain',
    'csv': 'text/csv'
  };

  return mimeTypes[ext] || 'application/octet-stream';
}

/**
 * Validate file type
 * @param {string} fileName - File name
 * @param {array} allowedTypes - Allowed file types
 * @returns {boolean} True if file type is allowed
 */
function validateFileType(fileName, allowedTypes = ['image', 'document']) {
  try {
    const ext = fileName.split('.').pop().toLowerCase();
    
    const typeMap = {
      'jpg': 'image',
      'jpeg': 'image',
      'png': 'image',
      'gif': 'image',
      'webp': 'image',
      'pdf': 'document',
      'doc': 'document',
      'docx': 'document',
      'xls': 'document',
      'xlsx': 'document',
      'txt': 'document',
      'csv': 'document'
    };

    const fileType = typeMap[ext];
    return allowedTypes.includes(fileType);

  } catch (error) {
    logger.error('Error validating file type', { 
      error: error.message,
      fileName
    });
    return false;
  }
}

/**
 * Get file size in human readable format
 * @param {number} bytes - File size in bytes
 * @returns {string} Human readable file size
 */
function formatFileSize(bytes) {
  try {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];

  } catch (error) {
    logger.error('Error formatting file size', { 
      error: error.message,
      bytes
    });
    return 'Unknown size';
  }
}

/**
 * Upload multiple files to Cloudinary
 * @param {array} files - Array of file objects
 * @param {string} folder - Cloudinary folder
 * @param {object} options - Additional upload options
 * @returns {Promise<array>} Array of upload results
 */
async function uploadMultipleFiles(files, folder = 'hrms', options = {}) {
  try {
    if (!Array.isArray(files) || files.length === 0) {
      throw new Error('Files array is required');
    }

    const uploadPromises = files.map(file => 
      uploadFile(file.buffer, file.originalname, folder, options)
    );

    const results = await Promise.all(uploadPromises);

    logger.info('Multiple files uploaded to Cloudinary', {
      count: results.length,
      folder
    });

    return results;

  } catch (error) {
    logger.error('Error uploading multiple files to Cloudinary', { 
      error: error.message,
      fileCount: files?.length,
      folder
    });
    throw new Error('Multiple file upload failed');
  }
}

module.exports = {
  uploadFile,
  deleteFile,
  getFileInfo,
  generateImageUrl,
  createThumbnail,
  getMimeType,
  validateFileType,
  formatFileSize,
  uploadMultipleFiles
};