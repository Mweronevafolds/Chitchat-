const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const authMiddleware = require('../middleware/authMiddleware');

// All routes require authentication
router.use(authMiddleware);

// Daily Review System
router.get('/daily', reviewController.getDailyReview);
router.post('/submit', reviewController.submitReview);
router.get('/history', reviewController.getReviewHistory);
router.get('/stats', reviewController.getReviewStats);

module.exports = router;
