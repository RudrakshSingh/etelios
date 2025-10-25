const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/rbac.middleware');

// Mock stores controller
const storesController = {
  getStores: (req, res) => {
    res.json({
      success: true,
      message: 'Stores retrieved successfully',
      data: []
    });
  },
  
  createStore: (req, res) => {
    res.json({
      success: true,
      message: 'Store created successfully',
      data: {}
    });
  }
};

// Routes
router.get('/', authenticate, requireRole(['admin', 'manager']), storesController.getStores);
router.post('/', authenticate, requireRole(['admin']), storesController.createStore);

module.exports = router;