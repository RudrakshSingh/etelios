const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/rbac.middleware');

// Mock CMS controller
const cmsController = {
  getPages: (req, res) => {
    res.json({
      success: true,
      message: 'Pages retrieved successfully',
      data: []
    });
  },
  
  createPage: (req, res) => {
    res.json({
      success: true,
      message: 'Page created successfully',
      data: {}
    });
  }
};

// Routes
router.get('/', authenticate, requireRole(['admin', 'manager']), cmsController.getPages);
router.post('/', authenticate, requireRole(['admin']), cmsController.createPage);

module.exports = router;