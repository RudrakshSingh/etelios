const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/rbac.middleware');

// Mock careers controller
const careersController = {
  getJobs: (req, res) => {
    res.json({
      success: true,
      message: 'Job listings retrieved successfully',
      data: []
    });
  },
  
  createJob: (req, res) => {
    res.json({
      success: true,
      message: 'Job listing created successfully',
      data: {}
    });
  }
};

// Routes
router.get('/', authenticate, requireRole(['admin', 'manager']), careersController.getJobs);
router.post('/', authenticate, requireRole(['admin']), careersController.createJob);

module.exports = router;