const express = require('express');
const router = express.Router();

// Catalog routes
router.get('/products', (req, res) => {
  res.json({
    success: true,
    message: 'Get all products',
    data: [],
    timestamp: new Date().toISOString()
  });
});

router.get('/products/:id', (req, res) => {
  res.json({
    success: true,
    message: 'Get product by ID',
    data: { id: req.params.id },
    timestamp: new Date().toISOString()
  });
});

router.post('/products', (req, res) => {
  res.json({
    success: true,
    message: 'Create new product',
    data: req.body,
    timestamp: new Date().toISOString()
  });
});

router.put('/products/:id', (req, res) => {
  res.json({
    success: true,
    message: 'Update product',
    data: { id: req.params.id, ...req.body },
    timestamp: new Date().toISOString()
  });
});

router.delete('/products/:id', (req, res) => {
  res.json({
    success: true,
    message: 'Delete product',
    data: { id: req.params.id },
    timestamp: new Date().toISOString()
  });
});

router.get('/categories', (req, res) => {
  res.json({
    success: true,
    message: 'Get all categories',
    data: [],
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
