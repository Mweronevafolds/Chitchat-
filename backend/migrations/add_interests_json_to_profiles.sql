-- Add interests_json column to profiles table for personalized recommendations

-- Add column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'profiles' AND column_name = 'interests_json') THEN
    ALTER TABLE profiles ADD COLUMN interests_json JSONB DEFAULT NULL;
  END IF;
END $$;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_profiles_interests_json ON profiles USING GIN (interests_json);

-- Add comment
COMMENT ON COLUMN profiles.interests_json IS 'AI-analyzed user interests and preferences for personalized recommendations';
