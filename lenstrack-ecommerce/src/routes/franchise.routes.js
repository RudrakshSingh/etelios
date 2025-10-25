const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/rbac.middleware');

// Mock franchise controller
const franchiseController = {
  getFranchises: (req, res) => {
    res.json({
      success: true,
      message: 'Franchises retrieved successfully',
      data: []
    });
  },
  
  createFranchise: (req, res) => {
    res.json({
      success: true,
      message: 'Franchise created successfully',
      data: {}
    });
  }
};

// Routes
router.get('/', authenticate, requireRole(['admin', 'manager']), franchiseController.getFranchises);
router.post('/', authenticate, requireRole(['admin']), franchiseController.createFranchise);

module.exports = router;