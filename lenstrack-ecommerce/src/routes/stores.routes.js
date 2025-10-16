const express = require('express');
const router = express.Router();

// Stores routes
router.get('/stores', (req, res) => {
  res.json({
    success: true,
    message: 'Get all stores',
    data: [],
    timestamp: new Date().toISOString()
  });
});

router.get('/stores/:id', (req, res) => {
  res.json({
    success: true,
    message: 'Get store by ID',
    data: { id: req.params.id },
    timestamp: new Date().toISOString()
  });
});

router.post('/stores', (req, res) => {
  res.json({
    success: true,
    message: 'Create new store',
    data: req.body,
    timestamp: new Date().toISOString()
  });
});

router.put('/stores/:id', (req, res) => {
  res.json({
    success: true,
    message: 'Update store',
    data: { id: req.params.id, ...req.body },
    timestamp: new Date().toISOString()
  });
});

router.delete('/stores/:id', (req, res) => {
  res.json({
    success: true,
    message: 'Delete store',
    data: { id: req.params.id },
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
