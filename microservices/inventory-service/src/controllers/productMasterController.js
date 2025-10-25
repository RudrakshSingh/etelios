const ProductMaster = require('../models/ProductMaster.model');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const sharp = require('sharp');
const logger = require('../config/logger');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = 'storage/images/product-master/';
    // Ensure directory exists
    fs.mkdir(uploadPath, { recursive: true }).then(() => {
      cb(null, uploadPath);
    }).catch(err => {
      cb(err, null);
    });
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: function (req, file, cb) {
    // Allow only images
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

/**
 * @desc Get all products
 * @route GET /api/inventory/products
 * @access Private
 */
const getProducts = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, category, brand, status, search } = req.query;
    
    const filter = {};
    if (category) filter.category = category;
    if (brand) filter.brand = brand;
    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const products = await ProductMaster.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('-__v');

    const total = await ProductMaster.countDocuments(filter);

    res.status(200).json({
      success: true,
      message: 'Products retrieved successfully',
      data: {
        products,
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total
        }
      }
    });
  } catch (error) {
    logger.error('Error in getProducts controller:', error);
    next(error);
  }
};

/**
 * @desc Get single product
 * @route GET /api/inventory/products/:id
 * @access Private
 */
const getProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const product = await ProductMaster.findById(id).select('-__v');
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Product retrieved successfully',
      data: product
    });
  } catch (error) {
    logger.error('Error in getProduct controller:', error);
    next(error);
  }
};

/**
 * @desc Create new product
 * @route POST /api/inventory/products
 * @access Private
 */
const createProduct = async (req, res, next) => {
  try {
    const productData = req.body;
    
    // Check if SKU already exists
    const existingProduct = await ProductMaster.findOne({ sku: productData.sku });
    if (existingProduct) {
      return res.status(400).json({
        success: false,
        message: 'Product with this SKU already exists'
      });
    }

    const product = new ProductMaster(productData);
    await product.save();

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: product
    });
  } catch (error) {
    logger.error('Error in createProduct controller:', error);
    next(error);
  }
};

/**
 * @desc Update product
 * @route PUT /api/inventory/products/:id
 * @access Private
 */
const updateProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    const product = await ProductMaster.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).select('-__v');

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Product updated successfully',
      data: product
    });
  } catch (error) {
    logger.error('Error in updateProduct controller:', error);
    next(error);
  }
};

/**
 * @desc Delete product
 * @route DELETE /api/inventory/products/:id
 * @access Private
 */
const deleteProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const product = await ProductMaster.findByIdAndDelete(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    logger.error('Error in deleteProduct controller:', error);
    next(error);
  }
};

/**
 * @desc Upload product image
 * @route POST /api/inventory/products/:id/image
 * @access Private
 */
const uploadProductImage = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file provided'
      });
    }

    const product = await ProductMaster.findById(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Process image with sharp for optimization
    const imagePath = req.file.path;
    const optimizedPath = imagePath.replace(path.extname(imagePath), '_optimized.jpg');
    
    await sharp(imagePath)
      .resize(800, 600, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toFile(optimizedPath);

    // Delete original file
    await fs.unlink(imagePath);

    // Update product with image URL
    const imageUrl = `/uploads/product-master/${path.basename(optimizedPath)}`;
    
    // Add image to images array or set as primary
    const imageData = {
      url: imageUrl,
      alt: req.body.alt || product.name,
      isPrimary: req.body.isPrimary === 'true' || product.images.length === 0
    };

    // If setting as primary, unset other primary images
    if (imageData.isPrimary) {
      await ProductMaster.updateMany(
        { _id: id, 'images.isPrimary': true },
        { $set: { 'images.$.isPrimary': false } }
      );
    }

    product.images.push(imageData);
    await product.save();

    res.status(200).json({
      success: true,
      message: 'Product image uploaded successfully',
      data: {
        imageUrl,
        isPrimary: imageData.isPrimary
      }
    });
  } catch (error) {
    logger.error('Error in uploadProductImage controller:', error);
    next(error);
  }
};

/**
 * @desc Delete product image
 * @route DELETE /api/inventory/products/:id/image/:imageId
 * @access Private
 */
const deleteProductImage = async (req, res, next) => {
  try {
    const { id, imageId } = req.params;
    
    const product = await ProductMaster.findById(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    const imageIndex = product.images.findIndex(img => img._id.toString() === imageId);
    if (imageIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Image not found'
      });
    }

    // Delete file from storage
    const imagePath = path.join('storage/images/product-master/', path.basename(product.images[imageIndex].url));
    try {
      await fs.unlink(imagePath);
    } catch (err) {
      logger.warn('Could not delete image file:', err.message);
    }

    // Remove image from array
    product.images.splice(imageIndex, 1);
    await product.save();

    res.status(200).json({
      success: true,
      message: 'Product image deleted successfully'
    });
  } catch (error) {
    logger.error('Error in deleteProductImage controller:', error);
    next(error);
  }
};

/**
 * @desc Set primary image
 * @route PUT /api/inventory/products/:id/image/:imageId/primary
 * @access Private
 */
const setPrimaryImage = async (req, res, next) => {
  try {
    const { id, imageId } = req.params;
    
    const product = await ProductMaster.findById(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Unset all primary images
    product.images.forEach(img => {
      img.isPrimary = false;
    });

    // Set selected image as primary
    const image = product.images.id(imageId);
    if (!image) {
      return res.status(404).json({
        success: false,
        message: 'Image not found'
      });
    }

    image.isPrimary = true;
    await product.save();

    res.status(200).json({
      success: true,
      message: 'Primary image set successfully'
    });
  } catch (error) {
    logger.error('Error in setPrimaryImage controller:', error);
    next(error);
  }
};

module.exports = {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  uploadProductImage,
  deleteProductImage,
  setPrimaryImage,
  upload // Export multer middleware
};
