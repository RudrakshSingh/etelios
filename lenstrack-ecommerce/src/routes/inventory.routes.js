const express = require('express');
const router = express.Router();

// Inventory routes
router.get('/stock', (req, res) => {
  res.json({
    success: true,
    message: 'Get all stock',
    data: [],
    timestamp: new Date().toISOString()
  });
});

router.get('/stock/:id', (req, res) => {
  res.json({
    success: true,
    message: 'Get stock by ID',
    data: { id: req.params.id },
    timestamp: new Date().toISOString()
  });
});

router.post('/stock', (req, res) => {
  res.json({
    success: true,
    message: 'Create new stock entry',
    data: req.body,
    timestamp: new Date().toISOString()
  });
});

router.put('/stock/:id', (req, res) => {
  res.json({
    success: true,
    message: 'Update stock',
    data: { id: req.params.id, ...req.body },
    timestamp: new Date().toISOString()
  });
});

router.delete('/stock/:id', (req, res) => {
  res.json({
    success: true,
    message: 'Delete stock entry',
    data: { id: req.params.id },
    timestamp: new Date().toISOString()
  });
});

router.get('/movements', (req, res) => {
  res.json({
    success: true,
    message: 'Get stock movements',
    data: [],
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
