const { createClient } = require('@supabase/supabase-js');

const supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// --- Update Streak Logic ---
const updateStreak = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // We use a secure RPC function (defined in your SQL schema) 
    // to handle the date math atomically in the database.
    const { data, error } = await supabaseAdmin.rpc('update_user_streak', {
        p_user_id: userId
    });

    if (error) throw error;

    console.log(`Streak updated for ${userId}:`, data);
    res.status(200).json(data);

  } catch (error) {
    console.error("Streak update error:", error);
    res.status(500).json({ error: 'Failed to update streak' });
  }
};

// --- Get Streak Status ---
const getStreakStatus = async (req, res) => {
    try {
        const { data, error } = await supabaseAdmin
            .from('profiles')
            .select('current_streak, longest_streak, last_activity_date')
            .eq('id', req.user.id)
            .single();
            
        if (error) throw error;
        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to get streak' });
    }
};

module.exports = { updateStreak, getStreakStatus };
