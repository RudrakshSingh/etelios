const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/rbac.middleware');

// Mock inventory controller
const inventoryController = {
  getInventory: (req, res) => {
    res.json({
      success: true,
      message: 'Inventory retrieved successfully',
      data: []
    });
  },
  
  updateStock: (req, res) => {
    res.json({
      success: true,
      message: 'Stock updated successfully',
      data: {}
    });
  }
};

// Routes
router.get('/', authenticate, requireRole(['admin', 'manager']), inventoryController.getInventory);
router.put('/:id/stock', authenticate, requireRole(['admin', 'manager']), inventoryController.updateStock);

module.exports = router;