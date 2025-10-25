const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/rbac.middleware');

// Mock campaigns controller
const campaignsController = {
  getCampaigns: (req, res) => {
    res.json({
      success: true,
      message: 'Campaigns retrieved successfully',
      data: []
    });
  },
  
  createCampaign: (req, res) => {
    res.json({
      success: true,
      message: 'Campaign created successfully',
      data: {}
    });
  }
};

// Routes
router.get('/', authenticate, requireRole(['admin', 'manager']), campaignsController.getCampaigns);
router.post('/', authenticate, requireRole(['admin']), campaignsController.createCampaign);

module.exports = router;