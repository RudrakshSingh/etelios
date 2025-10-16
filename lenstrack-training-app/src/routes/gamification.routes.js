const express = require('express');
const router = express.Router();

// XP and Levels
router.get('/xp', (req, res) => {
  res.json({
    success: true,
    message: 'User XP',
    data: { xp: 1250, level: 5, nextLevel: 1500 }
  });
});

router.post('/xp', (req, res) => {
  res.json({
    success: true,
    message: 'XP awarded',
    data: { xp: 1500, level: 6 }
  });
});

// Badges
router.get('/badges', (req, res) => {
  res.json({
    success: true,
    message: 'User badges',
    data: [
      { id: 'B1', name: 'First Lesson', earned: true },
      { id: 'B2', name: 'Streak Master', earned: false }
    ]
  });
});

router.post('/badges', (req, res) => {
  res.json({
    success: true,
    message: 'Badge awarded',
    data: { badge: 'B2', name: 'Streak Master' }
  });
});

// Leaderboards
router.get('/leaderboard', (req, res) => {
  res.json({
    success: true,
    message: 'Leaderboard',
    data: [
      { rank: 1, name: 'User 1', xp: 2000 },
      { rank: 2, name: 'User 2', xp: 1800 }
    ]
  });
});

// Streaks
router.get('/streaks', (req, res) => {
  res.json({
    success: true,
    message: 'User streaks',
    data: { current: 5, longest: 10 }
  });
});

module.exports = router;
