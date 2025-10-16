const express = require('express');
const router = express.Router();

// Menus routes
router.get('/menus', (req, res) => {
  res.json({
    success: true,
    message: 'Get all menus',
    data: [],
    timestamp: new Date().toISOString()
  });
});

router.get('/menus/:id', (req, res) => {
  res.json({
    success: true,
    message: 'Get menu by ID',
    data: { id: req.params.id },
    timestamp: new Date().toISOString()
  });
});

router.post('/menus', (req, res) => {
  res.json({
    success: true,
    message: 'Create new menu',
    data: req.body,
    timestamp: new Date().toISOString()
  });
});

router.put('/menus/:id', (req, res) => {
  res.json({
    success: true,
    message: 'Update menu',
    data: { id: req.params.id, ...req.body },
    timestamp: new Date().toISOString()
  });
});

router.delete('/menus/:id', (req, res) => {
  res.json({
    success: true,
    message: 'Delete menu',
    data: { id: req.params.id },
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
