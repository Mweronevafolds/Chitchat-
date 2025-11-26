const express = require('express');
const router = express.Router();
const tutorController = require('../controllers/tutorController');
const { protect } = require('../middleware/authMiddleware');

// Note: Routes use protect middleware individually instead of router.use()

// Note: Routes use protect middleware individually instead of router.use()

// Tutor Profile Management
router.post('/upgrade', protect, tutorController.upgradeTutor);
router.get('/profile', protect, tutorController.getTutorProfile);
router.put('/profile', protect, tutorController.updateTutorProfile);
router.get('/analytics', protect, tutorController.getTutorAnalytics);

// Learning Path Management
router.post('/paths', protect, tutorController.createLearningPath);
router.get('/paths', protect, tutorController.getMyLearningPaths);
router.put('/paths/:pathId', protect, tutorController.updateLearningPath);
router.delete('/paths/:pathId', protect, tutorController.deleteLearningPath);

// Public Learning Paths (Discovery)
router.get('/discover/paths', protect, tutorController.getPublicLearningPaths);

module.exports = router;
