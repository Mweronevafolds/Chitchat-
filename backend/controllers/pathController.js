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

module.exports = { generatePath, getMyPaths };
