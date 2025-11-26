-- Table: user_activity
-- Stores user actions like searches to personalize the AI.
CREATE TABLE IF NOT EXISTS public.user_activity (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    activity_type TEXT NOT NULL, -- e.g., 'search', 'create_path', 'view_path'
    content TEXT NOT NULL, -- e.g., "Python Basics", "French History"
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast retrieval of recent history
CREATE INDEX IF NOT EXISTS idx_user_activity_user_recent ON public.user_activity(user_id, created_at DESC);

-- RLS: Strict privacy. Users can only access their own history.
ALTER TABLE public.user_activity ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own activity" ON public.user_activity;
CREATE POLICY "Users manage own activity" ON public.user_activity
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
