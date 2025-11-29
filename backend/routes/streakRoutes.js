const express = require('express');
const router = express.Router();
const streakController = require('../controllers/streakController');
const { protect } = require('../middleware/authMiddleware');

router.post('/check-in', protect, streakController.updateStreak);
router.get('/status', protect, streakController.getStreakStatus);

module.exports = router;
