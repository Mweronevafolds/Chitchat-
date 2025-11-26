-- Table: daily_missions
-- Stores personalized daily missions for each user
CREATE TABLE IF NOT EXISTS public.daily_missions (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    mission_date DATE NOT NULL DEFAULT CURRENT_DATE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    challenge_prompt TEXT NOT NULL, -- The actual prompt to start the session
    difficulty TEXT NOT NULL, -- 'easy', 'medium', 'hard'
    category TEXT, -- 'programming', 'language', 'science', etc.
    estimated_minutes INT DEFAULT 5,
    is_completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, mission_date) -- One mission per user per day
);

-- Table: mission_completions
-- Track when users complete missions for streaks and rewards
CREATE TABLE IF NOT EXISTS public.mission_completions (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    mission_id BIGINT NOT NULL REFERENCES public.daily_missions(id) ON DELETE CASCADE,
    completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    time_spent_seconds INT,
    quality_score INT -- Optional: AI could rate the quality of the response
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_daily_missions_user_date ON public.daily_missions(user_id, mission_date DESC);
CREATE INDEX IF NOT EXISTS idx_mission_completions_user ON public.mission_completions(user_id, completed_at DESC);

-- RLS: Users can only access their own missions
ALTER TABLE public.daily_missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mission_completions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own missions" ON public.daily_missions;
CREATE POLICY "Users manage own missions" ON public.daily_missions
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own completions" ON public.mission_completions;
CREATE POLICY "Users manage own completions" ON public.mission_completions
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
