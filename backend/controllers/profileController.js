const { createClient } = require('@supabase/supabase-js');

const supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const getMyProfile = async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', req.user.id)
      .single();
    if (error && error.code !== 'PGRST116') throw error;
    res.status(200).json(data);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
};

const onboardProfile = async (req, res) => {
  try {
    const { age_group, tone_pref, daily_time } = req.body;
    if (!age_group || !tone_pref || !daily_time) {
      return res.status(400).json({ error: 'Missing required onboarding fields.' });
    }

    // --- FINAL FIX ---
    // Instead of a direct UPDATE, we now call our secure database function.
    // This is safer and solves the race condition.
    const { error } = await supabaseAdmin.rpc('onboard_user', {
      user_id: req.user.id,
      age_group_param: age_group,
      tone_pref_param: tone_pref,
      daily_time_param: daily_time,
    });

    if (error) {
      console.error('RPC onboard_user error:', error);
      throw error;
    }
    
    res.status(200).json({ message: 'Profile onboarded successfully.' });
    
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to onboard profile.',
      details: error.message
    });
  }
};

module.exports = {
  getMyProfile,
  onboardProfile,
};

