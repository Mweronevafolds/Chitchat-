const express = require('express');
const router = express.Router();
const recommendationController = require('../controllers/recommendationController');
const { protect } = require('../middleware/authMiddleware');

// GET /api/v1/recommendations - Get personalized suggestions
router.get('/', protect, recommendationController.getRecommendations);

// GET /api/v1/recommendations/interests - View my interest profile
router.get('/interests', protect, recommendationController.getMyInterests);

// POST /api/v1/recommendations/clear - Clear tracked data (privacy)
router.post('/clear', protect, recommendationController.clearMyData);

module.exports = router;
