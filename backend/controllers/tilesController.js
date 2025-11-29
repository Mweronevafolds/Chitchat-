// backend/controllers/tilesController.js (Using startChat - Final Attempt)
const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require('@google/generative-ai');
const { createClient } = require('@supabase/supabase-js');

// Initialize Google AI Client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
// *** Use Gemini 2.0 Flash - Latest available model ***
const tileGenerationModel = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    safetySettings: [ // Relaxed safety settings
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
    ]
});

// Initialize Supabase Admin Client
const supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const generateTiles = async (req, res) => {
  try {
    console.log(`--- TILE GENERATION REQUEST --- User: ${req.user.id}`); // Log entry point

    // 1. Fetch user profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles').select('age_group, tone_pref').eq('id', req.user.id).single();

    if (profileError) throw profileError;
    if (!profile) {
        console.warn(`Profile not found for user ${req.user.id}`);
        return res.status(404).json({ error: 'Profile not found.' });
    }
    console.log(`User profile found:`, profile);

    // 2. *** PERSONALIZATION MAGIC *** Fetch recent search history
    const { data: recentActivity, error: activityError } = await supabaseAdmin
      .from('user_activity')
      .select('content, activity_type, created_at')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
      .limit(10); // Last 10 activities

    let historyContext = '';
    if (recentActivity && recentActivity.length > 0) {
      const searches = recentActivity.filter(a => a.activity_type === 'search').map(a => a.content);
      if (searches.length > 0) {
        historyContext = `\n\nRECENT USER INTERESTS (use these to personalize tiles):\n- ${searches.join('\n- ')}`;
        console.log(`📊 User has ${searches.length} recent searches. Personalizing tiles...`);
      }
    } else {
      console.log(`📊 No activity history found. Generating general tiles.`);
    }

    // 3. *** CURIOSITY ENGINE PROMPT *** - 60/30/10 Split (Slot Machine Effect)
    const systemInstruction = `You are the Curiosity Engine for ChitChat - a discovery platform that feeds the mind. Your job is to create the PERFECT ADDICTION LOOP using the 60/30/10 Variable Reward System.

Your output MUST be ONLY a valid JSON object containing a key "tiles" which is an array of exactly 10 tile objects.

� TILE COMPOSITION - THE SLOT MACHINE (CRITICAL):
This is NOT random. This is ENGINEERED ADDICTION using Nir Eyal's Hook Model.

${recentActivity && recentActivity.length > 0 ? `
📌 60% PERSONAL (6 tiles) - "Rewards of the Self" (Mastery)
- Directly related to user's recent searches and interests
- Make them feel smart, validated, like they're "leveling up"
- Use their search history below to create personalized learning paths
- Examples: "You searched Python? Here's Dynamic Programming Explained"

🎲 30% WILDCARD (3 tiles) - "Rewards of the Hunt" (Material)
- Adjacent topics, surprising connections, "Oh that's related!"
- Not what they searched for, but what they SHOULD know
- The "serendipity" that keeps them scrolling
- Examples: "You like Python? Meet the Creator: Guido van Rossum's Philosophy"

🎁 10% SURPRISE (1 tile) - "Rewards of the Tribe" (Social)
- Completely random, mind-blowing, "Wait, what?!"
- The dopamine spike that makes them come back
- Obscure facts, viral-worthy content, conversation starters
- Examples: "The Great Emu War of 1932" or "How Octopuses Edit Their Own RNA"
` : `
🎲 60% WILDCARD (6 tiles) - Fascinating foundational knowledge
🎁 30% SURPRISE (3 tiles) - Mind-blowing, shareable facts
🔥 10% VIRAL (1 tile) - "You HAVE to tell someone about this"
`}

📋 FORMATTING RULES:
- Safe for age group: ${profile.age_group || 'adult'}
- Tone: ${profile.tone_pref || 'Casual'}
- Types: micro-lesson, fact, challenge, quiz
- Each tile should spark genuine curiosity
- Hooks should be irresistible (use numbers, surprises, questions)

Structure: {"tiles": [{"id": "unique_string", "type": "micro-lesson|fact|challenge|quiz", "hook": "1-line teaser", "estimated_time_min": 1-10, "seed_prompt": "Text to start chat"}]}`;

    const userPrompt = `Generate tiles for profile: ${JSON.stringify(profile)}${historyContext}`;

    // Combine for a single message turn
    const fullPrompt = `${systemInstruction}\n\n${userPrompt}`;

    // 3. Call Gemini API using startChat + sendMessage
    console.log(`Generating tiles for user profile using model 'gemini-2.0-flash' via startChat/sendMessage...`);

    // Start a chat session (even for a single turn) - pass safety settings here too if needed
    const chat = tileGenerationModel.startChat({
        history: [], // No history for this specific task
        // safetySettings: [...] // Can be set here or during model init
    });

    // Send the full prompt as a single message
    const result = await chat.sendMessage(fullPrompt); // Use non-streaming sendMessage
    const response = result.response;

    console.log("Raw response object from sendMessage:", JSON.stringify(response, null, 2)); // Log the entire response

    // 4. Extract and Parse the JSON response
    const blockReason = response?.promptFeedback?.blockReason;
    if (blockReason) {
        console.error("Gemini response was blocked. Reason:", blockReason, "Safety Ratings:", response?.promptFeedback?.safetyRatings);
        throw new Error(`Gemini response blocked due to ${blockReason}.`);
    }

    const jsonText = response?.text(); // Use text() method on the response object
    if (!jsonText) {
        console.error("Gemini response missing text content. Full Response:", response);
        throw new Error(`Gemini returned empty or unexpected content structure.`);
    }
    console.log("Raw JSON text extracted:", jsonText);

    // 5. Parse the JSON string (with cleaning)
    let tilesObject;
    try {
        const cleanedJsonText = jsonText.replace(/^```json\s*/, '').replace(/```$/, '');
        const jsonStart = cleanedJsonText.indexOf('{');
        const jsonEnd = cleanedJsonText.lastIndexOf('}') + 1;
        if (jsonStart !== -1 && jsonEnd !== -1) {
             tilesObject = JSON.parse(cleanedJsonText.substring(jsonStart, jsonEnd));
        } else { throw new Error("Could not find valid JSON object braces {} in response."); }
    } catch(parseError) {
        console.error("Failed to parse JSON from sendMessage response:", parseError);
        console.error("Raw Text was:", jsonText);
        throw new Error("Failed to parse AI response into JSON format.");
    }

    // 6. Send back the array of tiles
    if (!tilesObject || !Array.isArray(tilesObject.tiles)) {
         console.error("Parsed object does not contain a 'tiles' array:", tilesObject);
        throw new Error("AI response did not match the expected JSON structure ('tiles' array missing).");
    }
    res.status(200).json(tilesObject.tiles);
    console.log(`Successfully generated ${tilesObject.tiles.length} tiles via startChat for User ${req.user.id}.`);

  } catch (error) {
    console.error(`Error generating tiles for User ${req.user.id}:`, error);
     // Log specific Google API errors if available
    if (error.message && error.message.includes("GoogleGenerativeAI")) {
        console.error("Detailed GoogleGenerativeAI Error:", JSON.stringify(error, null, 2));
    }
    res.status(500).json({ error: 'Failed to generate curiosity feed', details: error.message });
  }
};

module.exports = { generateTiles };