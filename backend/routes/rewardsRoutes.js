/**
 * ChitChat Rewards Routes
 * API endpoints for the Variable Rewards System
 */

const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
    triggerRewardAction,
    getRewardProfile,
    getLeaderboard,
    getUserAchievements
} = require('../controllers/rewardsController');

/**
 * @route   POST /api/v1/rewards/action
 * @desc    Trigger reward check after user action
 * @access  Private
 * @body    { actionType: 'message_sent' | 'tile_completed' | 'lesson_completed' | etc }
 */
router.post('/action', protect, triggerRewardAction);

/**
 * @route   GET /api/v1/rewards/profile
 * @desc    Get user's complete reward profile (XP, streaks, achievements)
 * @access  Private
 */
router.get('/profile', protect, getRewardProfile);

/**
 * @route   GET /api/v1/rewards/leaderboard
 * @desc    Get leaderboard with rankings
 * @access  Private
 * @query   ?limit=100
 */
router.get('/leaderboard', protect, getLeaderboard);

/**
 * @route   GET /api/v1/rewards/achievements
 * @desc    Get user's unlocked achievements/badges
 * @access  Private
 */
router.get('/achievements', protect, getUserAchievements);

module.exports = router;
