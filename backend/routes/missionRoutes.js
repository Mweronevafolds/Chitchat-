const express = require('express');
const router = express.Router();
const missionController = require('../controllers/missionController');
const { protect } = require('../middleware/authMiddleware');

// GET /api/v1/missions/today - Get or generate today's personalized mission
router.get('/today', protect, missionController.getTodaysMission);

// POST /api/v1/missions/complete - Mark mission as completed
router.post('/complete', protect, missionController.completeMission);

// GET /api/v1/missions/stats - Get mission completion stats and streaks
router.get('/stats', protect, missionController.getMissionStats);

module.exports = router;
