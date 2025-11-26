const { GoogleGenerativeAI } = require('@google/generative-ai');
const { createClient } = require('@supabase/supabase-js');

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

// Initialize Supabase
const supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// --- Generate a New Learning Path ---
const generatePath = async (req, res) => {
  try {
    const { topic } = req.body;
    const userId = req.user.id;

    if (!topic) return res.status(400).json({ error: 'Topic is required' });

    console.log(`Generating learning path for '${topic}'...`);

    // 1. Get user profile for personalization
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('age_group, tone_pref')
      .eq('id', userId)
      .single();

    // 2. Prompt Engineering for Curriculum Generation
    const prompt = `
      You are an expert curriculum designer for a gamified learning app.
      Create a structured learning path for the subject: "${topic}".
      Target Audience: ${profile?.age_group || 'Adult'}, Tone: ${profile?.tone_pref || 'Casual'}.

      Output MUST be valid JSON with this structure:
      {
        "title": "Creative Title for the Path",
        "description": "Short, exciting description",
        "levels": [
          {
            "title": "Level 1: The Basics",
            "lessons": [
              { "title": "Lesson Name", "description": "What we will learn", "emoji": "🔰" },
              ... (3-4 lessons per level)
            ]
          },
          ... (Total 3 Levels)
        ],
        "final_boss": {
          "title": "The Final Boss: [Name]",
          "description": "A tough challenge to prove mastery.",
          "emoji": "👹"
        }
      }
      Make it feel rewarding and progressive.
    `;

    const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json" }
    });

    const pathData = JSON.parse(result.response.text());

    // 3. Save to Database
    const { data: savedPath, error } = await supabaseAdmin
      .from('learning_paths')
      .insert({
        creator_id: userId,
        title: pathData.title,
        modules_json: pathData, // Storing the whole structure here
      })
      .select()
      .single();

    if (error) throw error;

    // 4. Initialize Progress
    await supabaseAdmin.from('user_learning_progress').insert({
        learner_id: userId,
        path_id: savedPath.id,
        progress_json: { completed_lessons: [], is_boss_defeated: false }
    });

    res.status(200).json(savedPath);

  } catch (error) {
    console.error("Path generation failed:", error);
    res.status(500).json({ error: 'Failed to generate path' });
  }
};

// --- Get User's Paths ---
const getMyPaths = async (req, res) => {
  try {
    const userId = req.user.id;
    const { data, error } = await supabaseAdmin
      .from('learning_paths')
      .select('*, user_learning_progress(*)') // Join with progress
      .eq('creator_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.status(200).json(data);
  } catch (error) {
    console.error("Fetch paths error:", error);
    res.status(500).json({ error: 'Failed to fetch paths' });
  }
};

// --- Mark Lesson as Complete ---
const completeLesson = async (req, res) => {
  try {
    const userId = req.user.id;
    const { pathId } = req.params;
    const { lessonId } = req.body; // Format: "levelIndex-lessonIndex" (e.g., "0-1")

    if (!lessonId) {
      return res.status(400).json({ error: 'lessonId is required' });
    }

    console.log(`User ${userId} completing lesson ${lessonId} in path ${pathId}`);

    // 1. Fetch current progress
    const { data: progressData, error: fetchError } = await supabaseAdmin
      .from('user_learning_progress')
      .select('progress_json')
      .eq('learner_id', userId)
      .eq('path_id', pathId)
      .single();

    if (fetchError) {
      console.error("Error fetching progress:", fetchError);
      return res.status(404).json({ error: 'Progress record not found' });
    }

    // 2. Update progress JSON
    const currentProgress = progressData.progress_json || { completed_lessons: [], is_boss_defeated: false };
    
    // Only add if not already completed
    if (!currentProgress.completed_lessons.includes(lessonId)) {
      currentProgress.completed_lessons.push(lessonId);
    }

    // 3. Save updated progress
    const { data: updatedProgress, error: updateError } = await supabaseAdmin
      .from('user_learning_progress')
      .update({ 
        progress_json: currentProgress,
        updated_at: new Date().toISOString()
      })
      .eq('learner_id', userId)
      .eq('path_id', pathId)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating progress:", updateError);
      throw updateError;
    }

    console.log(`✅ Lesson ${lessonId} marked as complete!`);
    res.status(200).json({ 
      success: true, 
      progress: updatedProgress,
      message: `Lesson completed! ${currentProgress.completed_lessons.length} lessons done.`
    });

  } catch (error) {
    console.error("Complete lesson failed:", error);
    res.status(500).json({ error: 'Failed to complete lesson' });
  }
};

// --- Get Suggested/Curated Learning Paths ---
const getSuggestedPaths = async (req, res) => {
  try {
    const userId = req.user.id;
    console.log(`Generating suggested paths for user: ${userId}`);

    // 1. Get user profile and activity
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('age_group, tone_pref, interests_json')
      .eq('id', userId)
      .single();

    // 2. Get recent activity
    const { data: recentActivity } = await supabaseAdmin
      .from('user_activity')
      .select('content, activity_type')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);

    // 3. Get user's existing paths to avoid duplication
    const { data: existingPaths } = await supabaseAdmin
      .from('learning_paths')
      .select('title')
      .eq('creator_id', userId);

    const userInterests = profile?.interests_json?.detected_interests || [];
    const recentSearches = recentActivity?.filter(a => a.activity_type === 'search').map(a => a.content) || [];
    const existingTopics = existingPaths?.map(p => p.title) || [];

    const contextSummary = `
User Profile:
- Age Group: ${profile?.age_group || 'Adult'}
- Tone: ${profile?.tone_pref || 'Casual'}
- Detected Interests: ${userInterests.join(', ') || 'None yet'}
- Recent Searches: ${recentSearches.slice(0, 5).join(', ') || 'None'}
- Existing Paths: ${existingTopics.slice(0, 5).join(', ') || 'None'}
    `;

    // 4. Generate suggested paths with AI
    const prompt = `
You are a learning curator creating suggested paths for users.

${contextSummary}

Generate 6-8 suggested learning paths with a mix of PERSONALIZATION and DISCOVERY:

🎯 PATH MIX (CRITICAL):
${userInterests.length > 0 || recentSearches.length > 0 ? `
- Generate 3-4 PERSONALIZED paths based on their interests and searches
- Generate 3-4 WILDCARD paths: fascinating skills they wouldn't typically search for
  Examples of wildcards:
  * "Master the Art of Storytelling"
  * "Understanding Cryptocurrency & Blockchain"
  * "The Science of Sleep and Dreams"
  * "Photography Fundamentals"
  * "Ancient Philosophy for Modern Life"
  * "Climate Science Explained"
` : `
- Generate 6-8 WILDCARD paths: diverse, engaging topics from all domains
- Mix practical skills, fascinating knowledge, creative pursuits
- Topics that make people curious and excited to learn
`}

RULES:
- Avoid duplicating these existing paths: ${existingTopics.join(', ') || 'None'}
- Each path should be clear and achievable
- Mix difficulty levels (beginner to advanced)
- Use engaging, exciting language

Output MUST be valid JSON:
{
  "suggested_paths": [
    {
      "title": "Path Title",
      "description": "Exciting 1-sentence description",
      "category": "programming|language|science|creative|business|wellness|other",
      "difficulty": "beginner|intermediate|advanced",
      "estimated_hours": 5-20,
      "emoji": "📚",
      "type": "personalized|wildcard",
      "reason": "Why we suggest this"
    }
  ]
}

Make it feel like a curated collection from a wise mentor.
    `;

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json" }
    });

    const suggestions = JSON.parse(result.response.text());

    res.status(200).json({
      suggested_paths: suggestions.suggested_paths || [],
      user_context: {
        has_interests: userInterests.length > 0,
        recent_activity: recentSearches.length
      }
    });

  } catch (error) {
    console.error('Failed to generate suggested paths:', error);
    res.status(500).json({ error: 'Failed to generate suggestions' });
  }
};

module.exports = { generatePath, getMyPaths, completeLesson, getSuggestedPaths };
