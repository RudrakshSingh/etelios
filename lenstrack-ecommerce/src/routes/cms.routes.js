const express = require('express');
const router = express.Router();

// CMS routes
router.get('/pages', (req, res) => {
  res.json({
    success: true,
    message: 'Get all pages',
    data: [],
    timestamp: new Date().toISOString()
  });
});

router.get('/pages/:id', (req, res) => {
  res.json({
    success: true,
    message: 'Get page by ID',
    data: { id: req.params.id },
    timestamp: new Date().toISOString()
  });
});

router.post('/pages', (req, res) => {
  res.json({
    success: true,
    message: 'Create new page',
    data: req.body,
    timestamp: new Date().toISOString()
  });
});

router.put('/pages/:id', (req, res) => {
  res.json({
    success: true,
    message: 'Update page',
    data: { id: req.params.id, ...req.body },
    timestamp: new Date().toISOString()
  });
});

router.delete('/pages/:id', (req, res) => {
  res.json({
    success: true,
    message: 'Delete page',
    data: { id: req.params.id },
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
