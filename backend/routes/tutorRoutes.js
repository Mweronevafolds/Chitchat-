const express = require('express');
const router = express.Router();
const tutorController = require('../controllers/tutorController');
const authMiddleware = require('../middleware/authMiddleware');

// All routes require authentication
router.use(authMiddleware);

// Tutor Profile Management
router.post('/upgrade', tutorController.upgradeTutor);
router.get('/profile', tutorController.getTutorProfile);
router.put('/profile', tutorController.updateTutorProfile);
router.get('/analytics', tutorController.getTutorAnalytics);

// Learning Path Management
router.post('/paths', tutorController.createLearningPath);
router.get('/paths', tutorController.getMyLearningPaths);
router.put('/paths/:pathId', tutorController.updateLearningPath);
router.delete('/paths/:pathId', tutorController.deleteLearningPath);

// Public Learning Paths (Discovery)
router.get('/discover/paths', tutorController.getPublicLearningPaths);

module.exports = router;
