-- Fix tutor_profiles table - Add missing columns
-- Run this in Supabase Dashboard > SQL Editor

-- Ensure tutor_profiles table exists with all required columns
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

-- Add ai_persona column if it doesn't exist (for existing tables)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tutor_profiles' AND column_name = 'ai_persona'
  ) THEN
    ALTER TABLE tutor_profiles 
    ADD COLUMN ai_persona JSONB DEFAULT '{"tone": "friendly", "style": "conversational", "formality": "casual"}'::jsonb;
  END IF;
END $$;

-- Verify the fix
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'tutor_profiles'
ORDER BY ordinal_position;
