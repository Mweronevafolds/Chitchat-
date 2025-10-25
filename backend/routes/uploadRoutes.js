const express = require('express');
const router = express.Router();
const uploadController = require('../controllers/uploadController');
const { protect } = require('../middleware/authMiddleware');

// POST /api/v1/upload/init - Get a presigned URL
router.post('/init', protect, uploadController.initUpload);

// POST /api/v1/upload/complete - Notify server of completion
router.post('/complete', protect, uploadController.completeUpload);

module.exports = router;
