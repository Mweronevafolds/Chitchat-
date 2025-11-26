-- Update save_chat_message function to support media
-- This adds optional parameters for media_url, media_type, and media_size

CREATE OR REPLACE FUNCTION save_chat_message(
  p_session_id UUID,
  p_sender TEXT,
  p_content TEXT,
  p_media_url TEXT DEFAULT NULL,
  p_media_type TEXT DEFAULT NULL,
  p_media_size BIGINT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER -- Run with elevated privileges (bypasses RLS)
SET search_path = public
AS $$
BEGIN
  -- Insert the message into chat_messages table with optional media fields
  INSERT INTO chat_messages (session_id, sender, content, media_url, media_type, media_size)
  VALUES (p_session_id, p_sender, p_content, p_media_url, p_media_type, p_media_size);
  
  -- Update the session's updated_at timestamp
  UPDATE chat_sessions
  SET updated_at = NOW()
  WHERE id = p_session_id;
  
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error (in production, you might want to use a proper logging system)
    RAISE WARNING 'Failed to save chat message: %', SQLERRM;
    RAISE;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION save_chat_message(UUID, TEXT, TEXT, TEXT, TEXT, BIGINT) TO authenticated;

-- Also keep backward compatibility with old 3-parameter signature
-- (PostgreSQL supports function overloading)
GRANT EXECUTE ON FUNCTION save_chat_message(UUID, TEXT, TEXT) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION save_chat_message IS 
'Securely saves a chat message bypassing RLS policies. Supports optional media attachments. Used by the backend to ensure messages are always persisted.';
