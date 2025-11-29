/**
 * ChitChat Variable Rewards Controller
 * Implements the Hook Model's Variable Reward phase
 * 
 * Psychology: Variable rewards trigger higher dopamine than fixed rewards
 * Reference: "Hooked" by Nir Eyal, Duolingo's gamification strategy
 */

const { supabase, supabaseAdmin } = require('../supabase');

/**
 * The Rewards Engine - Orchestrates all 3 reward types
 * Social (Tribe) + Material (Hunt) + Mastery (Self)
 */
class RewardsEngine {
    
    /**
     * Base XP values for different actions
     * Research: Variable amounts create anticipation
     */
    static XP_VALUES = {
        message_sent: { base: 10, bonus: { min: 5, max: 50 } },
        tile_completed: { base: 25, bonus: { min: 10, max: 100 } },
        lesson_completed: { base: 50, bonus: { min: 25, max: 150 } },
        path_completed: { base: 200, bonus: { min: 50, max: 300 } },
        daily_login: { base: 15, bonus: { min: 5, max: 30 } },
        friend_invited: { base: 100, bonus: { min: 50, max: 200 } },
    };

    /**
     * Type 1: Rewards of the Self (Mastery)
     * Progress bars, streaks, skill trees
     */
    static async getMasteryRewards(userId) {
        try {
            const { data: profile, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (error) throw error;

            // Calculate level (500 XP per level)
            const level = Math.floor(profile.total_xp / 500);
            const xpInCurrentLevel = profile.total_xp % 500;
            const xpNeededForNextLevel = 500;
            const progressPercentage = Math.round((xpInCurrentLevel / xpNeededForNextLevel) * 100);

            return {
                type: 'mastery',
                data: {
                    level: level,
                    currentLevelXp: xpInCurrentLevel,
                    nextLevelXp: xpNeededForNextLevel,
                    progressPercentage: progressPercentage,
                    totalXp: profile.total_xp,
                    currentStreak: profile.current_streak,
                    longestStreak: profile.longest_streak,
                    lessonsCompleted: profile.lessons_completed,
                    // Personal records
                    personalBests: {
                        longestStreak: profile.longest_streak,
                        totalLessons: profile.lessons_completed,
                        totalXp: profile.total_xp
                    }
                }
            };
        } catch (error) {
            console.error('[RewardsEngine] Mastery rewards error:', error);
            return null;
        }
    }

    /**
     * Type 2: Rewards of the Tribe (Social)
     * Leaderboards, friend activity, social proof
     */
    static async getSocialRewards(userId) {
        try {
            // Get user's rank (use supabaseAdmin to bypass RLS)
            const { data: leaderboard, error: leaderboardError } = await supabaseAdmin
                .from('leaderboards')
                .select('*')
                .limit(100);

            if (leaderboardError) throw leaderboardError;

            // Find user's position
            const userPosition = leaderboard.findIndex(entry => entry.id === userId);
            const userRank = userPosition !== -1 ? userPosition + 1 : null;

            // Get nearby users (social comparison)
            let nearbyUsers = [];
            if (userPosition !== -1) {
                const start = Math.max(0, userPosition - 1);
                const end = Math.min(leaderboard.length, userPosition + 2);
                nearbyUsers = leaderboard.slice(start, end).map((entry, idx) => ({
                    name: entry.full_name || 'Anonymous',
                    xp: entry.total_xp,
                    rank: start + idx + 1,
                    isCurrentUser: entry.id === userId,
                    avatar: entry.avatar_url || '👤'
                }));
            }

            // Get friend activity (if you add friends feature later)
            // For now, just show how many people are active
            const { count: activeUsersCount } = await supabase
                .from('profiles')
                .select('*', { count: 'exact', head: true })
                .gte('last_activity_date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

            return {
                type: 'social',
                data: {
                    userRank: userRank,
                    nearbyUsers: nearbyUsers,
                    topThree: leaderboard.slice(0, 3).map((entry, idx) => ({
                        name: entry.full_name || 'Anonymous',
                        xp: entry.total_xp,
                        rank: idx + 1,
                        avatar: entry.avatar_url || '👤'
                    })),
                    activeUsersThisWeek: activeUsersCount || 0,
                    socialProof: `${activeUsersCount || 0} learners active this week`
                }
            };
        } catch (error) {
            console.error('[RewardsEngine] Social rewards error:', error);
            return null;
        }
    }

    /**
     * Type 3: Rewards of the Hunt (Material)
     * XP bonuses, badges, unlockables - THE VARIABLE PART
     * This is where the slot machine magic happens
     */
    static async getMaterialRewards(userId, actionType) {
        try {
            const rewards = [];

            // Get base XP for action
            const xpConfig = this.XP_VALUES[actionType];
            if (!xpConfig) {
                console.log(`[RewardsEngine] Unknown action type: ${actionType}`);
                return null;
            }

            // Always give base XP
            const baseXp = xpConfig.base;

            // VARIABLE REWARD: Random bonus (30% chance)
            const bonusRoll = Math.random();
            let bonusXp = 0;
            
            if (bonusRoll < 0.3) { // 30% chance of bonus
                bonusXp = Math.floor(
                    Math.random() * (xpConfig.bonus.max - xpConfig.bonus.min) + xpConfig.bonus.min
                );
                rewards.push({
                    type: 'xp_bonus',
                    amount: bonusXp,
                    message: `🎉 Bonus XP! +${bonusXp}`,
                    rarity: bonusXp > 100 ? 'epic' : 'rare'
                });
            }

            // Award total XP
            const totalXp = baseXp + bonusXp;
            const { data: xpResult } = await supabase.rpc('award_xp', {
                p_user_id: userId,
                p_amount: totalXp,
                p_action_type: actionType
            });

            rewards.push({
                type: 'xp',
                amount: totalXp,
                message: `+${totalXp} XP`,
                levelUp: xpResult?.level_up || false,
                newLevel: xpResult?.level || 0
            });

            // VARIABLE REWARD: Mystery badge (5% chance - very rare)
            if (Math.random() < 0.05) {
                rewards.push({
                    type: 'mystery_badge',
                    message: '🎁 Mystery reward unlocked!',
                    rarity: 'legendary'
                });
            }

            // VARIABLE REWARD: Pro unlock (1% chance - super rare)
            if (Math.random() < 0.01) {
                rewards.push({
                    type: 'pro_unlock',
                    duration: '24_hours',
                    message: '✨ 1 day of Pro features - FREE!',
                    rarity: 'legendary'
                });
            }

            return {
                type: 'material',
                data: {
                    rewards: rewards,
                    totalXp: xpResult?.total_xp || 0
                }
            };
        } catch (error) {
            console.error('[RewardsEngine] Material rewards error:', error);
            return null;
        }
    }

    /**
     * Update user streak - Critical for retention
     * Research: Duolingo's streaks drive 55% retention
     */
    static async updateStreak(userId) {
        try {
            const { data, error } = await supabase.rpc('update_user_streak', {
                p_user_id: userId
            });

            if (error) throw error;

            return {
                currentStreak: data.current_streak,
                longestStreak: data.longest_streak,
                streakMaintained: data.streak_maintained,
                streakBroken: data.streak_broken,
                message: data.streak_broken 
                    ? '💔 Streak reset! Start a new one today!'
                    : `🔥 ${data.current_streak} day streak!`
            };
        } catch (error) {
            console.error('[RewardsEngine] Streak update error:', error);
            return null;
        }
    }

    /**
     * Check for new achievements
     * Runs after every action to see if user unlocked badges
     */
    static async checkAchievements(userId) {
        try {
            const { data, error } = await supabase.rpc('check_achievements', {
                p_user_id: userId
            });

            if (error) throw error;

            const newAchievements = data.new_achievements || [];
            
            return {
                newAchievements: newAchievements,
                count: newAchievements.length,
                message: newAchievements.length > 0 
                    ? `🏆 ${newAchievements.length} new badge${newAchievements.length > 1 ? 's' : ''} unlocked!`
                    : null
            };
        } catch (error) {
            console.error('[RewardsEngine] Achievement check error:', error);
            return null;
        }
    }

    /**
     * Increment lesson counter (for achievements)
     */
    static async incrementLessonCount(userId) {
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ lessons_completed: supabase.raw('lessons_completed + 1') })
                .eq('id', userId);

            if (error) throw error;
        } catch (error) {
            console.error('[RewardsEngine] Lesson count error:', error);
        }
    }
}

/**
 * Controller: Trigger a reward check after user action
 * This is the main endpoint the frontend will call
 */
exports.triggerRewardAction = async (req, res) => {
    try {
        const { actionType } = req.body;
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        if (!actionType) {
            return res.status(400).json({ error: 'actionType is required' });
        }

        console.log(`[Rewards] User ${userId} performed: ${actionType}`);

        // Run reward calculations in parallel
        const [materialRewards, masteryRewards, socialRewards, streakUpdate, achievements] = 
            await Promise.all([
                RewardsEngine.getMaterialRewards(userId, actionType),
                RewardsEngine.getMasteryRewards(userId),
                RewardsEngine.getSocialRewards(userId),
                RewardsEngine.updateStreak(userId),
                RewardsEngine.checkAchievements(userId)
            ]);

        // Increment lesson count for specific actions
        if (['lesson_completed', 'tile_completed'].includes(actionType)) {
            await RewardsEngine.incrementLessonCount(userId);
        }

        // Combine all rewards
        const rewardPackage = {
            success: true,
            material: materialRewards?.data,
            mastery: masteryRewards?.data,
            social: socialRewards?.data,
            streak: streakUpdate,
            achievements: achievements,
            // Frontend will display these based on rarity/importance
            displayPriority: determineDisplayPriority(materialRewards, achievements, streakUpdate)
        };

        res.json(rewardPackage);

    } catch (error) {
        console.error('[Rewards Controller] Error:', error);
        res.status(500).json({ 
            error: 'Failed to process rewards',
            details: error.message 
        });
    }
};

/**
 * Get user's complete reward profile
 * Used for profile screen, dashboard, etc.
 */
exports.getRewardProfile = async (req, res) => {
    try {
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        // Get all reward data
        const [mastery, social, achievements] = await Promise.all([
            RewardsEngine.getMasteryRewards(userId),
            RewardsEngine.getSocialRewards(userId),
            getUnlockedAchievements(userId)
        ]);

        res.json({
            success: true,
            mastery: mastery?.data,
            social: social?.data,
            achievements: achievements
        });

    } catch (error) {
        console.error('[Rewards Controller] Get profile error:', error);
        res.status(500).json({ 
            error: 'Failed to get reward profile',
            details: error.message 
        });
    }
};

/**
 * Get leaderboard
 */
exports.getLeaderboard = async (req, res) => {
    try {
        const { limit = 100 } = req.query;
        const userId = req.user?.id;

        // Use supabaseAdmin to bypass RLS for leaderboard view
        const { data: leaderboard, error } = await supabaseAdmin
            .from('leaderboards')
            .select('*')
            .limit(parseInt(limit));

        if (error) throw error;

        // Find current user's position
        const userPosition = leaderboard.findIndex(entry => entry.id === userId);

        res.json({
            success: true,
            leaderboard: leaderboard,
            userRank: userPosition !== -1 ? userPosition + 1 : null,
            totalUsers: leaderboard.length
        });

    } catch (error) {
        console.error('[Rewards Controller] Leaderboard error:', error);
        res.status(500).json({ 
            error: 'Failed to get leaderboard',
            details: error.message 
        });
    }
};

/**
 * Get user's achievements
 */
exports.getUserAchievements = async (req, res) => {
    try {
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const achievements = await getUnlockedAchievements(userId);

        res.json({
            success: true,
            achievements: achievements
        });

    } catch (error) {
        console.error('[Rewards Controller] Achievements error:', error);
        res.status(500).json({ 
            error: 'Failed to get achievements',
            details: error.message 
        });
    }
};

/**
 * Helper: Get unlocked achievements with details
 */
async function getUnlockedAchievements(userId) {
    const { data: userAchievements, error } = await supabase
        .from('user_achievements')
        .select(`
            unlocked_at,
            shared,
            achievements:achievement_id (
                id,
                name,
                description,
                icon,
                category,
                rarity,
                xp_reward
            )
        `)
        .eq('user_id', userId)
        .order('unlocked_at', { ascending: false });

    if (error) throw error;

    return userAchievements.map(ua => ({
        ...ua.achievements,
        unlockedAt: ua.unlocked_at,
        shared: ua.shared
    }));
}

/**
 * Helper: Decide what to show user first
 * Psychology: Don't overwhelm with all rewards at once
 */
function determineDisplayPriority(materialRewards, achievements, streakUpdate) {
    const priorities = [];

    // Priority 1: New achievements (most exciting)
    if (achievements?.count > 0) {
        priorities.push({
            type: 'achievement',
            importance: 'high',
            data: achievements.newAchievements[0] // Show first one
        });
    }

    // Priority 2: Legendary material rewards
    const legendaryReward = materialRewards?.data?.rewards?.find(r => r.rarity === 'legendary');
    if (legendaryReward) {
        priorities.push({
            type: 'legendary_reward',
            importance: 'high',
            data: legendaryReward
        });
    }

    // Priority 3: Streak milestones
    if (streakUpdate?.currentStreak && streakUpdate.currentStreak % 7 === 0) {
        priorities.push({
            type: 'streak_milestone',
            importance: 'medium',
            data: streakUpdate
        });
    }

    // Priority 4: Regular XP (always show, low priority)
    priorities.push({
        type: 'xp',
        importance: 'low',
        data: materialRewards?.data
    });

    return priorities;
}

module.exports = {
    triggerRewardAction: exports.triggerRewardAction,
    getRewardProfile: exports.getRewardProfile,
    getLeaderboard: exports.getLeaderboard,
    getUserAchievements: exports.getUserAchievements
};
