const express = require('express');
const router = express.Router();

// Learning Tracks
router.get('/tracks', (req, res) => {
  res.json({
    success: true,
    message: 'Learning tracks endpoint',
    data: [
      { id: 'S1', name: 'Sales Track 1', modules: 8 },
      { id: 'O1', name: 'Optometrist Track 1', modules: 8 }
    ]
  });
});

router.get('/tracks/:id', (req, res) => {
  res.json({
    success: true,
    message: 'Learning track details',
    data: { id: req.params.id, name: 'Track Name' }
  });
});

// Lessons
router.get('/lessons', (req, res) => {
  res.json({
    success: true,
    message: 'Lessons endpoint',
    data: [
      { id: 'L1', title: 'Lesson 1', type: 'video' },
      { id: 'L2', title: 'Lesson 2', type: 'quiz' }
    ]
  });
});

router.get('/lessons/:id', (req, res) => {
  res.json({
    success: true,
    message: 'Lesson details',
    data: { id: req.params.id, title: 'Lesson Title' }
  });
});

// Progress
router.get('/progress', (req, res) => {
  res.json({
    success: true,
    message: 'User progress',
    data: { completed: 5, total: 16, xp: 250 }
  });
});

router.post('/progress', (req, res) => {
  res.json({
    success: true,
    message: 'Progress updated',
    data: { xp: 300 }
  });
});

module.exports = router;
