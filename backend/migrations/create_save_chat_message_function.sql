-- Create secure function to save chat messages
-- This bypasses RLS and ensures messages are always saved

CREATE OR REPLACE FUNCTION save_chat_message(
  p_session_id UUID,
  p_sender TEXT,
  p_content TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER -- Run with elevated privileges (bypasses RLS)
SET search_path = public
AS $$
BEGIN
  -- Insert the message into chat_messages table
  INSERT INTO chat_messages (session_id, sender, content)
  VALUES (p_session_id, p_sender, p_content);
  
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
GRANT EXECUTE ON FUNCTION save_chat_message(UUID, TEXT, TEXT) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION save_chat_message IS 
'Securely saves a chat message bypassing RLS policies. Used by the backend to ensure messages are always persisted.';
