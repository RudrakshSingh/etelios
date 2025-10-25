const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/rbac.middleware');

// Mock support controller
const supportController = {
  getTickets: (req, res) => {
    res.json({
      success: true,
      message: 'Support tickets retrieved successfully',
      data: []
    });
  },
  
  createTicket: (req, res) => {
    res.json({
      success: true,
      message: 'Support ticket created successfully',
      data: {}
    });
  }
};

// Routes
router.get('/', authenticate, requireRole(['admin', 'manager']), supportController.getTickets);
router.post('/', authenticate, requireRole(['admin', 'manager']), supportController.createTicket);

module.exports = router;