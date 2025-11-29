const { GoogleGenerativeAI } = require('@google/generative-ai');
const { createClient } = require('@supabase/supabase-js');

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

// Initialize Supabase
const supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// --- Get or Generate Today's Mission ---
const getTodaysMission = async (req, res) => {
  try {
    const userId = req.user.id;
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

    console.log(`📋 Fetching today's mission for user: ${userId}`);

    // 1. Check if mission already exists for today
    const { data: existingMission, error: fetchError } = await supabaseAdmin
      .from('daily_missions')
      .select('*')
      .eq('user_id', userId)
      .eq('mission_date', today)
      .single();

    if (existingMission && !fetchError) {
      console.log(`✓ Found existing mission for today`);
      return res.status(200).json(existingMission);
    }

    // 2. No mission exists, generate a new one
    console.log(`🎯 Generating new personalized mission...`);

    // Get user profile
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('age_group, tone_pref, interests_json')
      .eq('id', userId)
      .single();

    // Get recent activity for personalization
    const { data: recentActivity } = await supabaseAdmin
      .from('user_activity')
      .select('content, activity_type')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);

    // Get current learning paths for context
    const { data: learningPaths } = await supabaseAdmin
      .from('learning_paths')
      .select('title, modules_json')
      .eq('creator_id', userId)
      .order('created_at', { ascending: false })
      .limit(3);

    // Get recent completed missions to avoid repetition
    const { data: recentMissions } = await supabaseAdmin
      .from('daily_missions')
      .select('title, category')
      .eq('user_id', userId)
      .order('mission_date', { ascending: false })
      .limit(7);

    // Build context for AI
    const userInterests = profile?.interests_json?.detected_interests || [];
    const recentSearches = recentActivity?.filter(a => a.activity_type === 'search').map(a => a.content) || [];
    const currentPaths = learningPaths?.map(p => p.title) || [];
    const recentTopics = recentMissions?.map(m => m.title) || [];

    const contextSummary = `
User Profile:
- Age Group: ${profile?.age_group || 'Adult'}
- Tone: ${profile?.tone_pref || 'Casual'}
- Detected Interests: ${userInterests.join(', ') || 'None yet'}
- Recent Searches: ${recentSearches.slice(0, 5).join(', ') || 'None'}
- Current Learning Paths: ${currentPaths.join(', ') || 'None'}
- Recent Mission Topics (avoid these): ${recentTopics.join(', ') || 'None'}
    `;

    // Generate mission with AI
    const prompt = `
You are creating a personalized "Mission of the Day" for a learning app user.

${contextSummary}

Generate ONE daily mission that:
1. Is personalized to their interests and current learning
2. Is achievable in 5-10 minutes
3. Is engaging and slightly challenging
4. Doesn't repeat recent topics
5. Has a clear, measurable goal
6. Uses an encouraging, ${profile?.tone_pref || 'casual'} tone

The mission should be a mini-challenge like:
- "Explain [concept] in 3 sentences"
- "Write a haiku about [topic]"
- "Teach me [skill] like I'm 5"
- "Debug this code: [simple problem]"
- "Translate this phrase: [text]"

Output MUST be valid JSON:
{
  "title": "Short, catchy title (max 50 chars)",
  "description": "What they'll do (1 sentence)",
  "challenge_prompt": "The full prompt to start the chat session",
  "difficulty": "easy|medium|hard",
  "category": "programming|language|science|math|creative|other",
  "estimated_minutes": 5-10
}

Make it feel personal and exciting!
    `;

    let result;
    let missionData;
    
    try {
      result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json" }
      });

      const responseText = result.response.text();
      console.log('AI Response:', responseText);
      
      missionData = JSON.parse(responseText);
    } catch (aiError) {
      console.error('AI generation failed:', aiError);
      throw new Error(`AI generation failed: ${aiError.message}`);
    }

    // 3. Save the mission to database
    const { data: newMission, error: insertError } = await supabaseAdmin
      .from('daily_missions')
      .insert({
        user_id: userId,
        mission_date: today,
        title: missionData.title,
        description: missionData.description,
        challenge_prompt: missionData.challenge_prompt,
        difficulty: missionData.difficulty,
        category: missionData.category,
        estimated_minutes: missionData.estimated_minutes,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    console.log(`✅ Generated new mission: "${newMission.title}"`);
    res.status(200).json(newMission);

  } catch (error) {
    console.error('Failed to get/generate mission:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Failed to generate mission',
      details: error.message,
      type: error.constructor.name
    });
  }
};

// --- Complete Today's Mission ---
const completeMission = async (req, res) => {
  try {
    const userId = req.user.id;
    const { missionId, timeSpentSeconds } = req.body;

    if (!missionId) {
      return res.status(400).json({ error: 'missionId is required' });
    }

    console.log(`✓ User ${userId} completing mission ${missionId}`);

    // 1. Mark mission as completed
    const { data: mission, error: updateError } = await supabaseAdmin
      .from('daily_missions')
      .update({ 
        is_completed: true,
        completed_at: new Date().toISOString()
      })
      .eq('id', missionId)
      .eq('user_id', userId)
      .select()
      .single();

    if (updateError) throw updateError;

    // 2. Record the completion
    const { error: completionError } = await supabaseAdmin
      .from('mission_completions')
      .insert({
        user_id: userId,
        mission_id: missionId,
        time_spent_seconds: timeSpentSeconds || null,
      });

    if (completionError) throw completionError;

    // 3. Calculate streak
    const { data: completions } = await supabaseAdmin
      .from('mission_completions')
      .select('completed_at')
      .eq('user_id', userId)
      .order('completed_at', { ascending: false })
      .limit(30);

    let currentStreak = 1; // At least today
    if (completions && completions.length > 1) {
      const today = new Date().toISOString().split('T')[0];
      const dates = completions.map(c => c.completed_at.split('T')[0]);
      const uniqueDates = [...new Set(dates)];

      for (let i = 1; i < uniqueDates.length; i++) {
        const prevDate = new Date(uniqueDates[i]);
        const currDate = new Date(uniqueDates[i - 1]);
        const diffDays = Math.round((currDate - prevDate) / (1000 * 60 * 60 * 24));
        
        if (diffDays === 1) {
          currentStreak++;
        } else {
          break;
        }
      }
    }

    res.status(200).json({
      success: true,
      mission,
      streak: currentStreak,
      message: currentStreak > 1 
        ? `🔥 ${currentStreak} day streak! Keep it up!` 
        : `🎉 Mission complete! Come back tomorrow!`
    });

  } catch (error) {
    console.error('Failed to complete mission:', error);
    res.status(500).json({ error: 'Failed to complete mission' });
  }
};

// --- Get Mission Stats ---
const getMissionStats = async (req, res) => {
  try {
    const userId = req.user.id;

    // Total completed missions
    const { count: totalCompleted } = await supabaseAdmin
      .from('mission_completions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    // Current streak
    const { data: completions } = await supabaseAdmin
      .from('mission_completions')
      .select('completed_at')
      .eq('user_id', userId)
      .order('completed_at', { ascending: false })
      .limit(30);

    let currentStreak = 0;
    if (completions && completions.length > 0) {
      const today = new Date().toISOString().split('T')[0];
      const dates = completions.map(c => c.completed_at.split('T')[0]);
      const uniqueDates = [...new Set(dates)];

      // Check if today or yesterday has a completion
      const latestDate = uniqueDates[0];
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      
      if (latestDate === today || latestDate === yesterday) {
        currentStreak = 1;
        for (let i = 1; i < uniqueDates.length; i++) {
          const prevDate = new Date(uniqueDates[i]);
          const currDate = new Date(uniqueDates[i - 1]);
          const diffDays = Math.round((currDate - prevDate) / (1000 * 60 * 60 * 24));
          
          if (diffDays === 1) {
            currentStreak++;
          } else {
            break;
          }
        }
      }
    }

    res.status(200).json({
      totalCompleted: totalCompleted || 0,
      currentStreak,
      lastCompleted: completions?.[0]?.completed_at || null,
    });

  } catch (error) {
    console.error('Failed to get mission stats:', error);
    res.status(500).json({ error: 'Failed to get stats' });
  }
};

module.exports = { 
  getTodaysMission, 
  completeMission,
  getMissionStats 
};
