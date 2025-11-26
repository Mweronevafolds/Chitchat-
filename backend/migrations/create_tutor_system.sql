-- Create tutor_profiles table
CREATE TABLE IF NOT EXISTS tutor_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expertise TEXT[] NOT NULL,
  teaching_style TEXT NOT NULL,
  bio TEXT,
  ai_persona JSONB DEFAULT '{"tone": "friendly", "style": "conversational", "formality": "casual"}'::jsonb,
  total_students INTEGER DEFAULT 0,
  total_paths INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create tutor_learning_paths table
CREATE TABLE IF NOT EXISTS tutor_learning_paths (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tutor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  difficulty TEXT DEFAULT 'beginner',
  estimated_duration INTEGER DEFAULT 0,
  topics TEXT[] DEFAULT '{}',
  is_public BOOLEAN DEFAULT true,
  enrollment_count INTEGER DEFAULT 0,
  completion_count INTEGER DEFAULT 0,
  rating DECIMAL(3,2) DEFAULT 0.0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add role column to users table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'users' AND column_name = 'role') THEN
    ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'learner';
  END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tutor_profiles_user_id ON tutor_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_tutor_learning_paths_tutor_id ON tutor_learning_paths(tutor_id);
CREATE INDEX IF NOT EXISTS idx_tutor_learning_paths_is_public ON tutor_learning_paths(is_public);
CREATE INDEX IF NOT EXISTS idx_tutor_learning_paths_category ON tutor_learning_paths(category);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Enable Row Level Security
ALTER TABLE tutor_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tutor_learning_paths ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tutor_profiles
CREATE POLICY "Users can view their own tutor profile"
  ON tutor_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tutor profile"
  ON tutor_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tutor profile"
  ON tutor_profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for tutor_learning_paths
CREATE POLICY "Anyone can view public learning paths"
  ON tutor_learning_paths FOR SELECT
  USING (is_public = true OR auth.uid() = tutor_id);

CREATE POLICY "Tutors can insert their own learning paths"
  ON tutor_learning_paths FOR INSERT
  WITH CHECK (auth.uid() = tutor_id);

CREATE POLICY "Tutors can update their own learning paths"
  ON tutor_learning_paths FOR UPDATE
  USING (auth.uid() = tutor_id);

CREATE POLICY "Tutors can delete their own learning paths"
  ON tutor_learning_paths FOR DELETE
  USING (auth.uid() = tutor_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_tutor_profiles_updated_at ON tutor_profiles;
CREATE TRIGGER update_tutor_profiles_updated_at
  BEFORE UPDATE ON tutor_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_tutor_learning_paths_updated_at ON tutor_learning_paths;
CREATE TRIGGER update_tutor_learning_paths_updated_at
  BEFORE UPDATE ON tutor_learning_paths
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT ALL ON tutor_profiles TO authenticated;
GRANT ALL ON tutor_learning_paths TO authenticated;
