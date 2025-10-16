const express = require('express');
const router = express.Router();

// Franchise routes
router.get('/franchises', (req, res) => {
  res.json({
    success: true,
    message: 'Get all franchises',
    data: [],
    timestamp: new Date().toISOString()
  });
});

router.get('/franchises/:id', (req, res) => {
  res.json({
    success: true,
    message: 'Get franchise by ID',
    data: { id: req.params.id },
    timestamp: new Date().toISOString()
  });
});

router.post('/franchises', (req, res) => {
  res.json({
    success: true,
    message: 'Create new franchise',
    data: req.body,
    timestamp: new Date().toISOString()
  });
});

router.put('/franchises/:id', (req, res) => {
  res.json({
    success: true,
    message: 'Update franchise',
    data: { id: req.params.id, ...req.body },
    timestamp: new Date().toISOString()
  });
});

router.delete('/franchises/:id', (req, res) => {
  res.json({
    success: true,
    message: 'Delete franchise',
    data: { id: req.params.id },
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
