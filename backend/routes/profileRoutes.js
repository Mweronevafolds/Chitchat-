const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profileController');
const { protect } = require('../middleware/authMiddleware');

// GET /api/v1/profiles/me - Get current user's profile
router.get('/me', protect, profileController.getMyProfile);

// POST /api/v1/profiles/onboard - Update profile after onboarding
router.post('/onboard', protect, profileController.onboardProfile);

module.exports = router;
