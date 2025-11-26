const { createClient } = require('@supabase/supabase-js');

const supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const logActivity = async (req, res) => {
  try {
    const { type, content } = req.body;
    const userId = req.user.id;

    if (!type || !content) {
        return res.status(400).json({ error: 'Type and content required' });
    }

    console.log(`📊 Logging activity: ${type} - "${content.substring(0, 50)}" for user ${userId}`);

    // Fire and forget - we don't need to wait for this to render the UI
    // But we await here to ensure it saves.
    const { error } = await supabaseAdmin
      .from('user_activity')
      .insert({
        user_id: userId,
        activity_type: type,
        content: content
      });

    if (error) throw error;

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Log activity error:", error);
    // Don't block the app if logging fails
    res.status(200).json({ success: false, error: error.message }); 
  }
};

module.exports = { logActivity };
