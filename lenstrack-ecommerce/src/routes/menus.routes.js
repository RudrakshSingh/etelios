const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/rbac.middleware');

// Mock menus controller
const menusController = {
  getMenus: (req, res) => {
    res.json({
      success: true,
      message: 'Menus retrieved successfully',
      data: []
    });
  },
  
  createMenu: (req, res) => {
    res.json({
      success: true,
      message: 'Menu created successfully',
      data: {}
    });
  }
};

// Routes
router.get('/', authenticate, requireRole(['admin', 'manager']), menusController.getMenus);
router.post('/', authenticate, requireRole(['admin']), menusController.createMenu);

module.exports = router;