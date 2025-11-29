-- =====================================================
-- ChitChat Addiction Engine - Streak & Viral Systems
-- This migration adds the final pieces for the growth engine
-- =====================================================
-- PREREQUISITE: Run create_gamification_system.sql first!
-- =====================================================

-- Check if prerequisite tables exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'achievements') THEN
        RAISE EXCEPTION 'Table "achievements" does not exist. Please run create_gamification_system.sql first!';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_achievements') THEN
        RAISE EXCEPTION 'Table "user_achievements" does not exist. Please run create_gamification_system.sql first!';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'reward_history') THEN
        RAISE EXCEPTION 'Table "reward_history" does not exist. Please run create_gamification_system.sql first!';
    END IF;
    
    RAISE NOTICE '✅ Prerequisites verified. Proceeding with Addiction Engine migration...';
END $$;

-- Add viral tracking columns if they don't exist
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS invites_sent INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS referral_signups INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS shares_count INTEGER DEFAULT 0;

-- Update the update_user_streak function to return more detailed info
CREATE OR REPLACE FUNCTION update_user_streak(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_profile RECORD;
    v_hours_since_last_activity NUMERIC;
    v_streak_maintained BOOLEAN;
    v_streak_broken BOOLEAN;
    v_result JSONB;
    v_bonus_xp INTEGER := 0;
BEGIN
    -- Get current profile data
    SELECT * INTO v_profile FROM profiles WHERE id = p_user_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('error', 'User not found');
    END IF;
    
    -- Calculate hours since last activity
    v_hours_since_last_activity := EXTRACT(EPOCH FROM (NOW() - v_profile.last_activity_date)) / 3600;
    
    -- Streak logic with XP bonuses
    IF v_hours_since_last_activity < 24 THEN
        -- Activity within 24 hours: increment streak
        v_bonus_xp := 10 + (v_profile.current_streak * 5); -- Escalating rewards!
        
        UPDATE profiles 
        SET 
            current_streak = current_streak + 1,
            longest_streak = GREATEST(longest_streak, current_streak + 1),
            last_activity_date = CURRENT_DATE,
            total_xp = total_xp + v_bonus_xp
        WHERE id = p_user_id;
        
        v_streak_maintained := TRUE;
        v_streak_broken := FALSE;
        
        -- Log the streak bonus
        INSERT INTO reward_history (user_id, action_type, reward_type, reward_value)
        VALUES (p_user_id, 'daily_checkin', 'streak_bonus', v_bonus_xp);
        
    ELSIF v_hours_since_last_activity < 48 THEN
        -- Grace period (24-48 hours): maintain streak (no bonus)
        UPDATE profiles 
        SET last_activity_date = CURRENT_DATE
        WHERE id = p_user_id;
        
        v_streak_maintained := TRUE;
        v_streak_broken := FALSE;
        
    ELSE
        -- Streak broken (>48 hours) - Start fresh
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
    
    -- Check for streak achievements
    PERFORM check_achievements(p_user_id);
    
    -- Return result
    v_result := jsonb_build_object(
        'current_streak', v_profile.current_streak,
        'longest_streak', v_profile.longest_streak,
        'streak_maintained', v_streak_maintained,
        'streak_broken', v_streak_broken,
        'bonus_xp', v_bonus_xp,
        'total_xp', v_profile.total_xp
    );
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- Add index for viral sharing performance
CREATE INDEX IF NOT EXISTS idx_profiles_shares_count ON profiles(shares_count DESC);
CREATE INDEX IF NOT EXISTS idx_user_activity_share ON user_activity(user_id, activity_type) 
WHERE activity_type = 'share';

-- Create a function to calculate viral coefficient (internal metrics)
CREATE OR REPLACE FUNCTION calculate_viral_coefficient()
RETURNS TABLE(
    user_id UUID,
    shares_sent INTEGER,
    referrals_completed INTEGER,
    viral_coefficient NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id as user_id,
        p.invites_sent as shares_sent,
        p.referral_signups as referrals_completed,
        CASE 
            WHEN p.invites_sent > 0 THEN 
                ROUND((p.referral_signups::NUMERIC / p.invites_sent::NUMERIC), 2)
            ELSE 0
        END as viral_coefficient
    FROM profiles p
    WHERE p.invites_sent > 0
    ORDER BY viral_coefficient DESC;
END;
$$ LANGUAGE plpgsql;

-- First, check if achievements table needs the category column
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'achievements') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'achievements' AND column_name = 'category'
        ) THEN
            ALTER TABLE achievements ADD COLUMN category VARCHAR(50);
        END IF;
    END IF;
END $$;

-- Add viral achievements if they don't exist
-- Only insert if achievements table has all required columns
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'achievements' 
        AND column_name IN ('name', 'description', 'icon', 'category', 'rarity', 'xp_reward', 'criteria')
        GROUP BY table_name
        HAVING COUNT(*) = 7
    ) THEN
        INSERT INTO achievements (name, description, icon, category, rarity, xp_reward, criteria) VALUES
        ('Viral Spreader', 'Share content 5 times', '📣', 'social', 'rare', 250, '{"shares_count": 5}'),
        ('Influencer', 'Refer 5 friends who sign up', '⭐', 'social', 'epic', 500, '{"referral_signups": 5}')
        ON CONFLICT (name) DO NOTHING;
    ELSE
        RAISE NOTICE 'Achievements table missing required columns. Skipping achievement inserts. Please run create_gamification_system.sql first.';
    END IF;
END $$;

-- Update check_achievements to include viral achievements
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
        ELSIF v_achievement.criteria ? 'shares_count' THEN
            v_criteria_met := v_profile.shares_count >= (v_achievement.criteria->>'shares_count')::INTEGER;
        ELSIF v_achievement.criteria ? 'referral_signups' THEN
            v_criteria_met := v_profile.referral_signups >= (v_achievement.criteria->>'referral_signups')::INTEGER;
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

-- =====================================================
-- Migration Complete! 🚀
-- =====================================================
-- The Addiction Engine is now live:
-- ✅ Streak system with escalating rewards
-- ✅ Viral sharing tracking
-- ✅ Achievement checks for social actions
-- =====================================================
