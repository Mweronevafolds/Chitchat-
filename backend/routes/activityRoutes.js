const express = require('express');
const router = express.Router();
const activityController = require('../controllers/activityController');
const { protect } = require('../middleware/authMiddleware');

// POST /api/v1/activity/log - Log user activity (searches, views, etc.)
router.post('/log', protect, activityController.logActivity);

module.exports = router;
