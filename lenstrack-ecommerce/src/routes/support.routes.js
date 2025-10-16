const express = require('express');
const router = express.Router();

// Support routes
router.get('/tickets', (req, res) => {
  res.json({
    success: true,
    message: 'Get all support tickets',
    data: [],
    timestamp: new Date().toISOString()
  });
});

router.get('/tickets/:id', (req, res) => {
  res.json({
    success: true,
    message: 'Get ticket by ID',
    data: { id: req.params.id },
    timestamp: new Date().toISOString()
  });
});

router.post('/tickets', (req, res) => {
  res.json({
    success: true,
    message: 'Create new support ticket',
    data: req.body,
    timestamp: new Date().toISOString()
  });
});

router.put('/tickets/:id', (req, res) => {
  res.json({
    success: true,
    message: 'Update ticket',
    data: { id: req.params.id, ...req.body },
    timestamp: new Date().toISOString()
  });
});

router.delete('/tickets/:id', (req, res) => {
  res.json({
    success: true,
    message: 'Close ticket',
    data: { id: req.params.id },
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
