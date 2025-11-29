-- Migration: Add updated_at column to chat_sessions table
-- This column is used to track when sessions are modified

-- Add updated_at column if it doesn't exist
ALTER TABLE chat_sessions 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create or replace the function to automatically update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop the trigger if it exists and recreate it
DROP TRIGGER IF EXISTS update_chat_sessions_updated_at ON chat_sessions;

CREATE TRIGGER update_chat_sessions_updated_at
    BEFORE UPDATE ON chat_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Backfill existing rows with created_at value
UPDATE chat_sessions 
SET updated_at = created_at 
WHERE updated_at IS NULL;

-- Make updated_at NOT NULL after backfill
ALTER TABLE chat_sessions 
ALTER COLUMN updated_at SET NOT NULL;
