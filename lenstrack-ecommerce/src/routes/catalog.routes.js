const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/rbac.middleware');

// Mock catalog controller
const catalogController = {
  getProducts: (req, res) => {
    res.json({
      success: true,
      message: 'Products retrieved successfully',
      data: []
    });
  },
  
  getProduct: (req, res) => {
    res.json({
      success: true,
      message: 'Product retrieved successfully',
      data: {}
    });
  },
  
  createProduct: (req, res) => {
    res.json({
      success: true,
      message: 'Product created successfully',
      data: {}
    });
  },
  
  updateProduct: (req, res) => {
    res.json({
      success: true,
      message: 'Product updated successfully',
      data: {}
    });
  },
  
  deleteProduct: (req, res) => {
    res.json({
      success: true,
      message: 'Product deleted successfully'
    });
  }
};

// Routes
router.get('/', authenticate, requireRole(['admin', 'manager']), catalogController.getProducts);
router.get('/:id', authenticate, requireRole(['admin', 'manager']), catalogController.getProduct);
router.post('/', authenticate, requireRole(['admin']), catalogController.createProduct);
router.put('/:id', authenticate, requireRole(['admin']), catalogController.updateProduct);
router.delete('/:id', authenticate, requireRole(['admin']), catalogController.deleteProduct);

module.exports = router;