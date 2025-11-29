const { createClient } = require('@supabase/supabase-js');
const supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const trackShare = async (req, res) => {
    try {
        const userId = req.user.id;
        const { content_type, content_id, platform } = req.body;

        // 1. Log the share in history
        await supabaseAdmin.from('user_activity').insert({
            user_id: userId,
            activity_type: 'share',
            content: `Shared ${content_type} on ${platform}`
        });

        // 2. Increment 'invites_sent' counter for achievements
        // (Using a raw SQL increment for efficiency)
        await supabaseAdmin.rpc('award_xp', {
            p_user_id: userId,
            p_amount: 50, // Immediate reward for sharing
            p_action_type: 'share_bonus'
        });

        // 3. Update stats
        const { data } = await supabaseAdmin
            .from('profiles')
            .select('invites_sent')
            .eq('id', userId)
            .single();
            
        await supabaseAdmin
            .from('profiles')
            .update({ invites_sent: (data.invites_sent || 0) + 1 })
            .eq('id', userId);

        res.status(200).json({ success: true, message: "+50 XP for sharing!" });

    } catch (error) {
        console.error("Viral track error:", error);
        res.status(500).json({ error: 'Failed to track share' });
    }
};

module.exports = { trackShare };
