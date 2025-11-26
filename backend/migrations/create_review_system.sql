-- Create user_reviews table for spaced repetition system
CREATE TABLE IF NOT EXISTS user_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  hint TEXT,
  topic TEXT NOT NULL,
  emoji TEXT,
  completed BOOLEAN DEFAULT false,
  user_answer TEXT,
  evaluation JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_reviews_user_id ON user_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_user_reviews_created_at ON user_reviews(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_reviews_completed ON user_reviews(completed);
CREATE INDEX IF NOT EXISTS idx_user_reviews_user_completed ON user_reviews(user_id, completed, created_at DESC);

-- Enable Row Level Security
ALTER TABLE user_reviews ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_reviews
CREATE POLICY "Users can view their own reviews"
  ON user_reviews FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert reviews"
  ON user_reviews FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update their own reviews"
  ON user_reviews FOR UPDATE
  USING (auth.uid() = user_id);

-- Grant permissions
GRANT ALL ON user_reviews TO authenticated;

-- Create function to increment user XP (if not exists)
CREATE OR REPLACE FUNCTION increment_user_xp(user_id_param UUID, xp_amount INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE users 
  SET xp = COALESCE(xp, 0) + xp_amount
  WHERE id = user_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add XP column to users table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'users' AND column_name = 'xp') THEN
    ALTER TABLE users ADD COLUMN xp INTEGER DEFAULT 0;
  END IF;
END $$;

-- Create index on XP for leaderboards
CREATE INDEX IF NOT EXISTS idx_users_xp ON users(xp DESC);
