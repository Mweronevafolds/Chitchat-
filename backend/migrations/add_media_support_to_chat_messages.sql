-- Migration: Add media support to chat_messages table
-- Created: 2025-11-26
-- Purpose: Enable storing image URLs and metadata for vision-enhanced conversations

-- Add media columns to chat_messages table
ALTER TABLE chat_messages
ADD COLUMN IF NOT EXISTS media_url TEXT,
ADD COLUMN IF NOT EXISTS media_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS media_size BIGINT;

-- Add index for efficient media queries
CREATE INDEX IF NOT EXISTS idx_chat_messages_media_url 
ON chat_messages(media_url) 
WHERE media_url IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN chat_messages.media_url IS 'Supabase Storage URL for attached image/video';
COMMENT ON COLUMN chat_messages.media_type IS 'MIME type of media (e.g., image/jpeg, image/png)';
COMMENT ON COLUMN chat_messages.media_size IS 'Size of media file in bytes';

-- Create storage bucket for chat media (run in Supabase dashboard)
-- INSERT INTO storage.buckets (id, name, public) 
-- VALUES ('chat-media', 'chat-media', false);

-- Enable RLS on storage.objects for chat-media bucket
-- ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy: Users can upload their own media
-- CREATE POLICY "Users can upload chat media"
-- ON storage.objects FOR INSERT
-- WITH CHECK (
--   bucket_id = 'chat-media' 
--   AND auth.uid()::text = (storage.foldername(name))[1]
-- );

-- Policy: Users can view their own media
-- CREATE POLICY "Users can view their own chat media"
-- ON storage.objects FOR SELECT
-- USING (
--   bucket_id = 'chat-media' 
--   AND auth.uid()::text = (storage.foldername(name))[1]
-- );

-- Policy: Users can delete their own media
-- CREATE POLICY "Users can delete their own chat media"
-- ON storage.objects FOR DELETE
-- USING (
--   bucket_id = 'chat-media' 
--   AND auth.uid()::text = (storage.foldername(name))[1]
-- );

-- Optional: Add function to clean up old media
CREATE OR REPLACE FUNCTION cleanup_old_chat_media()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete media records older than 90 days with no associated messages
  DELETE FROM storage.objects
  WHERE bucket_id = 'chat-media'
    AND created_at < NOW() - INTERVAL '90 days'
    AND name NOT IN (
      SELECT SUBSTRING(media_url FROM '.*/(.*)$')
      FROM chat_messages
      WHERE media_url IS NOT NULL
    );
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Schedule cleanup (optional - requires pg_cron extension)
-- SELECT cron.schedule(
--   'cleanup-old-media',
--   '0 2 * * 0', -- Every Sunday at 2 AM
--   'SELECT cleanup_old_chat_media();'
-- );
