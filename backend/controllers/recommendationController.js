const { GoogleGenerativeAI } = require('@google/generative-ai');
const { createClient } = require('@supabase/supabase-js');

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

// Initialize Supabase
const supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// --- Analyze User Activity and Generate Interest Profile ---
const analyzeUserInterests = async (userId) => {
  try {
    console.log(`Analyzing interests for user: ${userId}`);

    // 1. Get chat history - analyze topics discussed
    const { data: chatSessions, error: chatError } = await supabaseAdmin
      .from('chat_sessions')
      .select('id, mode, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (chatError) throw chatError;

    // Get messages from recent sessions
    const recentMessages = [];
    if (chatSessions && chatSessions.length > 0) {
      const sessionIds = chatSessions.map(s => s.id);
      const { data: messages } = await supabaseAdmin
        .from('chat_messages')
        .select('content, sender, created_at')
        .in('session_id', sessionIds)
        .eq('sender', 'user')
        .order('created_at', { ascending: false })
        .limit(50);

      if (messages) recentMessages.push(...messages);
    }

    // 2. Get learning paths - topics they're studying
    const { data: learningPaths, error: pathError } = await supabaseAdmin
      .from('learning_paths')
      .select('title, modules_json, created_at, user_learning_progress(progress_json)')
      .eq('creator_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (pathError) throw pathError;

    // 3. Get completed lessons for engagement metrics
    const completedLessonsCount = learningPaths?.reduce((sum, path) => {
      const progress = path.user_learning_progress?.[0]?.progress_json;
      return sum + (progress?.completed_lessons?.length || 0);
    }, 0) || 0;

    // 4. Get user profile preferences
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('age_group, tone_pref, interests_json')
      .eq('id', userId)
      .single();

    return {
      chatSessions: chatSessions || [],
      recentMessages: recentMessages || [],
      learningPaths: learningPaths || [],
      completedLessonsCount,
      profile: profile || {},
    };
  } catch (error) {
    console.error('Error analyzing user interests:', error);
    throw error;
  }
};

// --- Generate Personalized Recommendations ---
const getRecommendations = async (req, res) => {
  try {
    const userId = req.user.id;
    console.log(`Generating personalized recommendations for user: ${userId}`);

    // 1. Analyze user activity
    const userActivity = await analyzeUserInterests(userId);

    // 2. Build a summary for Gemini
    const topicsDiscussed = userActivity.recentMessages
      .slice(0, 20)
      .map(m => m.content)
      .join('\n- ');

    const pathTitles = userActivity.learningPaths
      .map(p => p.title)
      .join(', ');

    const activitySummary = `
User Activity Summary:
- Age Group: ${userActivity.profile.age_group || 'Unknown'}
- Preferred Tone: ${userActivity.profile.tone_pref || 'Casual'}
- Total Chat Sessions: ${userActivity.chatSessions.length}
- Learning Paths Created: ${userActivity.learningPaths.length}
- Lessons Completed: ${userActivity.completedLessonsCount}
- Current Learning Paths: ${pathTitles || 'None yet'}

Recent Topics They've Been Asking About:
- ${topicsDiscussed || 'No recent activity'}

Based on this, provide insights about what they're interested in.
    `;

    // 3. Generate AI recommendations with serendipity
    const prompt = `
You are an intelligent learning assistant analyzing a user's learning journey.

${activitySummary}

Generate 6-8 learning suggestions with a perfect balance of PERSONALIZATION and SERENDIPITY:

🎯 COMPOSITION (CRITICAL):
${userActivity.chatSessions.length > 0 || userActivity.learningPaths.length > 0 ? `
- Generate 3-4 PERSONALIZED recommendations based on their learning history
- Generate 3-4 WILDCARD recommendations: fascinating, unexpected topics they wouldn't typically search for
  Examples of wildcards:
  * "The Psychology of Color in Ancient Civilizations"
  * "How Quantum Computing Could Change Medicine"
  * "The Secret Language of Dolphins"
  * "Ancient Navigation Techniques Still Used Today"
  * "The Mathematics Behind Music"
  * "How Fungi Could Save the Planet"
` : `
- Generate 6-8 WILDCARD recommendations: captivating topics from diverse fields
- Focus on topics that spark curiosity and make people say "I never knew that!"
- Mix domains: science, history, art, nature, technology, culture, psychology
`}

Each suggestion should:
1. Be engaging and thought-provoking
2. Include a clear reason WHY you're suggesting it
3. Use an encouraging, enthusiastic tone

Output MUST be valid JSON with this structure:
{
  "user_interests": ["interest1", "interest2", "interest3"],
  "recommendations": [
    {
      "title": "Suggested Topic",
      "description": "Short, exciting description of what they'll learn",
      "reason": "Why we think they'll love this (for personalized) OR what makes this fascinating (for wildcards)",
      "category": "programming|language|science|math|creative|other",
      "difficulty": "beginner|intermediate|advanced",
      "emoji": "📚",
      "type": "personalized|wildcard"
    }
  ]
}

Make it feel like a curated discovery experience that respects their interests while expanding their horizons.
    `;

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json" }
    });

    const recommendations = JSON.parse(result.response.text());

    // 4. Update user profile with detected interests
    if (recommendations.user_interests && recommendations.user_interests.length > 0) {
      await supabaseAdmin
        .from('profiles')
        .update({ 
          interests_json: { 
            detected_interests: recommendations.user_interests,
            last_analyzed: new Date().toISOString(),
            activity_level: userActivity.chatSessions.length > 10 ? 'active' : 'casual'
          }
        })
        .eq('id', userId);
    }

    res.status(200).json({
      recommendations: recommendations.recommendations || [],
      interests: recommendations.user_interests || [],
      activityStats: {
        totalChats: userActivity.chatSessions.length,
        learningPaths: userActivity.learningPaths.length,
        lessonsCompleted: userActivity.completedLessonsCount
      }
    });

  } catch (error) {
    console.error('Failed to generate recommendations:', error);
    res.status(500).json({ error: 'Failed to generate recommendations' });
  }
};

// --- Get User's Interest Profile (for transparency) ---
const getMyInterests = async (req, res) => {
  try {
    const userId = req.user.id;

    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select('interests_json')
      .eq('id', userId)
      .single();

    if (error) throw error;

    res.status(200).json({
      interests: profile?.interests_json || null,
      message: profile?.interests_json 
        ? 'Your personalized profile helps us suggest relevant content'
        : 'Start chatting and learning to build your personalized profile!'
    });

  } catch (error) {
    console.error('Error fetching user interests:', error);
    res.status(500).json({ error: 'Failed to fetch interests' });
  }
};

// --- Clear User Data (Privacy Control) ---
const clearMyData = async (req, res) => {
  try {
    const userId = req.user.id;
    const { dataType } = req.body; // 'interests', 'history', or 'all'

    if (dataType === 'interests' || dataType === 'all') {
      // Clear detected interests
      await supabaseAdmin
        .from('profiles')
        .update({ interests_json: null })
        .eq('id', userId);
    }

    if (dataType === 'history' || dataType === 'all') {
      // Optionally delete chat history (be careful with this!)
      // For now, we'll just mark sessions as archived
      await supabaseAdmin
        .from('chat_sessions')
        .update({ archived: true })
        .eq('user_id', userId);
    }

    res.status(200).json({ 
      message: `Your ${dataType} data has been cleared successfully.`,
      success: true 
    });

  } catch (error) {
    console.error('Error clearing user data:', error);
    res.status(500).json({ error: 'Failed to clear data' });
  }
};

module.exports = { 
  getRecommendations, 
  getMyInterests,
  clearMyData 
};
