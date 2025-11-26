const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const { protect } = require('../middleware/authMiddleware');

// Daily Review System
router.get('/daily', protect, reviewController.getDailyReview);
router.post('/submit', protect, reviewController.submitReview);
router.get('/history', protect, reviewController.getReviewHistory);
router.get('/stats', protect, reviewController.getReviewStats);

module.exports = router;
