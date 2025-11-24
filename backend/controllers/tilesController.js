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

    // 2. System Prompt instructing JSON output
    const systemInstruction = `You are the Curiosity Editor for ChitChat. Your input is a user profile JSON object. Your output MUST be ONLY a valid JSON object (no surrounding text or explanations) containing a key "tiles" which is an array of exactly 6 "tile" objects. The tiles should be clicky, safe for age group '${profile.age_group || 'adult'}', and use a '${profile.tone_pref || 'Casual'}' tone. Structure: [{"id": "unique_string", "type": "micro-lesson|fact|challenge|quiz", "hook": "1-line teaser", "estimated_time_min": 1-10, "seed_prompt": "Text to start chat"}]`;
    const userPrompt = `Generate tiles for this profile: ${JSON.stringify(profile)}`;

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