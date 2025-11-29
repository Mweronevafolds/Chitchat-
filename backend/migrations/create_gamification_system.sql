-- =====================================================
-- ChitChat Variable Rewards System - Gamification Layer
-- Based on Hook Model: Variable Rewards (Nir Eyal)
-- =====================================================

-- Step 1: Add gamification fields to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS total_xp INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS current_streak INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS longest_streak INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_activity_date DATE DEFAULT CURRENT_DATE,
ADD COLUMN IF NOT EXISTS ai_personality VARCHAR(50) DEFAULT 'friendly',
ADD COLUMN IF NOT EXISTS lessons_completed INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS paths_created INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS students_reached INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS invites_sent INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS referral_signups INTEGER DEFAULT 0;

-- Step 2: Create achievements table (Badge definitions)
CREATE TABLE IF NOT EXISTS achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    icon VARCHAR(10), -- Emoji
    category VARCHAR(50), -- 'social', 'material', 'mastery'
    rarity VARCHAR(20) DEFAULT 'common', -- 'common', 'rare', 'epic', 'legendary'
    xp_reward INTEGER DEFAULT 0,
    criteria JSONB, -- Flexible criteria like {"lessons_completed": 10}
    created_at TIMESTAMP DEFAULT NOW()
);

-- Step 3: Create user_achievements table (Unlocked badges)
CREATE TABLE IF NOT EXISTS user_achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    achievement_id UUID REFERENCES achievements(id) ON DELETE CASCADE,
    unlocked_at TIMESTAMP DEFAULT NOW(),
    shared BOOLEAN DEFAULT FALSE,
    UNIQUE(user_id, achievement_id)
);

-- Step 4: Create reward_history table (Audit log)
CREATE TABLE IF NOT EXISTS reward_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    action_type VARCHAR(50) NOT NULL, -- 'message_sent', 'tile_completed', etc.
    reward_type VARCHAR(50), -- 'xp_bonus', 'badge', 'streak_bonus'
    reward_value INTEGER,
    reward_metadata JSONB, -- Extra data like badge name
    created_at TIMESTAMP DEFAULT NOW()
);

-- Step 5: Create leaderboards view (Social rewards)
CREATE OR REPLACE VIEW leaderboards AS
SELECT 
    profiles.id,
    profiles.full_name,
    profiles.avatar_url,
    profiles.total_xp,
    profiles.current_streak,
    RANK() OVER (ORDER BY total_xp DESC) as rank
FROM profiles
WHERE total_xp > 0
ORDER BY total_xp DESC
LIMIT 100;

-- Step 6: Seed initial achievements
INSERT INTO achievements (name, description, icon, category, rarity, xp_reward, criteria) VALUES
-- Mastery Rewards (Self)
('First Steps', 'Complete your first lesson', '👣', 'mastery', 'common', 50, '{"lessons_completed": 1}'),
('Learning Streak', 'Maintain a 3-day learning streak', '🔥', 'mastery', 'rare', 100, '{"current_streak": 3}'),
('Knowledge Seeker', 'Complete 10 lessons', '🎓', 'mastery', 'rare', 200, '{"lessons_completed": 10}'),
('Master Learner', 'Complete 50 lessons', '🏆', 'mastery', 'epic', 500, '{"lessons_completed": 50}'),

-- Social Rewards (Tribe)
('Social Butterfly', 'Invite 3 friends', '🦋', 'social', 'rare', 150, '{"invites_sent": 3}'),
('Community Builder', 'Help 10 students as a tutor', '🌟', 'social', 'epic', 300, '{"students_reached": 10}'),

-- Material Rewards (Hunt)
('Curiosity Explorer', 'Discover a wildcard tile', '🔍', 'material', 'common', 50, '{"wildcard_discovered": 1}'),
('XP Hunter', 'Earn 1000 total XP', '💎', 'material', 'epic', 500, '{"total_xp": 1000}')

ON CONFLICT (name) DO NOTHING;

-- Step 7: Create function to update streaks
CREATE OR REPLACE FUNCTION update_user_streak(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_profile RECORD;
    v_hours_since_last_activity INTEGER;
    v_streak_maintained BOOLEAN;
    v_streak_broken BOOLEAN;
    v_result JSONB;
BEGIN
    -- Get current profile data
    SELECT * INTO v_profile FROM profiles WHERE id = p_user_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('error', 'User not found');
    END IF;
    
    -- Calculate hours since last activity
    v_hours_since_last_activity := EXTRACT(EPOCH FROM (NOW() - v_profile.last_activity_date)) / 3600;
    
    -- Streak logic
    IF v_hours_since_last_activity < 24 THEN
        -- Activity within 24 hours: increment streak
        UPDATE profiles 
        SET 
            current_streak = current_streak + 1,
            longest_streak = GREATEST(longest_streak, current_streak + 1),
            last_activity_date = CURRENT_DATE
        WHERE id = p_user_id;
        
        v_streak_maintained := TRUE;
        v_streak_broken := FALSE;
        
    ELSIF v_hours_since_last_activity < 48 THEN
        -- Grace period (24-48 hours): maintain streak
        UPDATE profiles 
        SET last_activity_date = CURRENT_DATE
        WHERE id = p_user_id;
        
        v_streak_maintained := TRUE;
        v_streak_broken := FALSE;
        
    ELSE
        -- Streak broken (>48 hours)
        UPDATE profiles 
        SET 
            current_streak = 1,
            last_activity_date = CURRENT_DATE
        WHERE id = p_user_id;
        
        v_streak_maintained := FALSE;
        v_streak_broken := TRUE;
    END IF;
    
    -- Get updated profile
    SELECT * INTO v_profile FROM profiles WHERE id = p_user_id;
    
    -- Return result
    v_result := jsonb_build_object(
        'current_streak', v_profile.current_streak,
        'longest_streak', v_profile.longest_streak,
        'streak_maintained', v_streak_maintained,
        'streak_broken', v_streak_broken
    );
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- Step 8: Create function to award XP
CREATE OR REPLACE FUNCTION award_xp(p_user_id UUID, p_amount INTEGER, p_action_type VARCHAR)
RETURNS JSONB AS $$
DECLARE
    v_new_total INTEGER;
    v_level_up BOOLEAN := FALSE;
    v_old_level INTEGER;
    v_new_level INTEGER;
BEGIN
    -- Update total XP
    UPDATE profiles 
    SET total_xp = total_xp + p_amount
    WHERE id = p_user_id
    RETURNING total_xp INTO v_new_total;
    
    -- Calculate levels (every 500 XP = 1 level)
    v_old_level := (v_new_total - p_amount) / 500;
    v_new_level := v_new_total / 500;
    
    IF v_new_level > v_old_level THEN
        v_level_up := TRUE;
    END IF;
    
    -- Log reward history
    INSERT INTO reward_history (user_id, action_type, reward_type, reward_value)
    VALUES (p_user_id, p_action_type, 'xp', p_amount);
    
    -- Return result
    RETURN jsonb_build_object(
        'total_xp', v_new_total,
        'xp_gained', p_amount,
        'level', v_new_level,
        'level_up', v_level_up
    );
END;
$$ LANGUAGE plpgsql;

-- Step 9: Create function to check and award achievements
CREATE OR REPLACE FUNCTION check_achievements(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_profile RECORD;
    v_achievement RECORD;
    v_new_achievements JSONB := '[]'::JSONB;
    v_criteria_met BOOLEAN;
BEGIN
    -- Get user profile
    SELECT * INTO v_profile FROM profiles WHERE id = p_user_id;
    
    -- Check each achievement
    FOR v_achievement IN 
        SELECT a.* FROM achievements a
        WHERE NOT EXISTS (
            SELECT 1 FROM user_achievements ua 
            WHERE ua.user_id = p_user_id AND ua.achievement_id = a.id
        )
    LOOP
        v_criteria_met := FALSE;
        
        -- Check if criteria is met
        IF v_achievement.criteria ? 'lessons_completed' THEN
            v_criteria_met := v_profile.lessons_completed >= (v_achievement.criteria->>'lessons_completed')::INTEGER;
        ELSIF v_achievement.criteria ? 'current_streak' THEN
            v_criteria_met := v_profile.current_streak >= (v_achievement.criteria->>'current_streak')::INTEGER;
        ELSIF v_achievement.criteria ? 'total_xp' THEN
            v_criteria_met := v_profile.total_xp >= (v_achievement.criteria->>'total_xp')::INTEGER;
        ELSIF v_achievement.criteria ? 'invites_sent' THEN
            v_criteria_met := v_profile.invites_sent >= (v_achievement.criteria->>'invites_sent')::INTEGER;
        ELSIF v_achievement.criteria ? 'students_reached' THEN
            v_criteria_met := v_profile.students_reached >= (v_achievement.criteria->>'students_reached')::INTEGER;
        END IF;
        
        -- Award achievement if criteria met
        IF v_criteria_met THEN
            INSERT INTO user_achievements (user_id, achievement_id)
            VALUES (p_user_id, v_achievement.id)
            ON CONFLICT DO NOTHING;
            
            -- Award XP bonus
            PERFORM award_xp(p_user_id, v_achievement.xp_reward, 'achievement_unlocked');
            
            -- Add to results
            v_new_achievements := v_new_achievements || jsonb_build_object(
                'id', v_achievement.id,
                'name', v_achievement.name,
                'description', v_achievement.description,
                'icon', v_achievement.icon,
                'rarity', v_achievement.rarity,
                'xp_reward', v_achievement.xp_reward
            );
        END IF;
    END LOOP;
    
    RETURN jsonb_build_object('new_achievements', v_new_achievements);
END;
$$ LANGUAGE plpgsql;

-- Step 10: Enable Row Level Security
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE reward_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Achievements are viewable by everyone" ON achievements FOR SELECT USING (true);

CREATE POLICY "Users can view their own achievements" ON user_achievements FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own achievements" ON user_achievements FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own reward history" ON reward_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can insert reward history" ON reward_history FOR INSERT WITH CHECK (true);

-- Step 11: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id ON user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_reward_history_user_id ON reward_history(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_total_xp ON profiles(total_xp DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_current_streak ON profiles(current_streak DESC);

-- =====================================================
-- Migration Complete! 🎉
-- =====================================================
-- Run this in your Supabase SQL Editor
-- Then restart your backend server
-- =====================================================
