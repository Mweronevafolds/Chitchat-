const { GoogleGenerativeAI } = require('@google/generative-ai');
const { createClient } = require('@supabase/supabase-js');

// Initialize Google AI Client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
// *** Try gemini-pro WITH the streaming method ***
const tileGenerationModel = genAI.getGenerativeModel({ model: "gemini-pro" }); // Using gemini-pro

// Initialize Supabase Admin Client
const supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const generateTiles = async (req, res) => {
  try {
    // 1. Fetch user profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('age_group, tone_pref')
      .eq('id', req.user.id)
      .single();

    if (profileError) throw profileError;
    if (!profile) return res.status(404).json({ error: 'Profile not found.' });

    // 2. System Prompt instructing JSON output
    const systemPrompt = `You are the Curiosity Editor for ChitChat... (Your full prompt)... Your output MUST be ONLY a valid JSON object... Structure: {"tiles": [{"id": "...", "type": "...", ...}]}`; // Ensure JSON instruction is clear
    const userPrompt = `Generate tiles for this profile: ${JSON.stringify(profile)}`;

    // 3. Call Gemini API using generateContentStream with gemini-pro
    console.log(`Generating tiles for User ${req.user.id} using STREAMING model 'gemini-pro'...`);

    const contents = [{ role: 'user', parts: [{ text: userPrompt }] }];

    const result = await tileGenerationModel.generateContentStream({
        contents: contents,
        systemInstruction: systemPrompt,
    });

    // 4. Accumulate the streamed response (Same as before)
    let accumulatedJsonText = '';
    for await (const chunk of result.stream) {
        try {
            const chunkText = chunk.text();
            accumulatedJsonText += chunkText;
        } catch (streamError) {
             console.error("Gemini stream processing error during tile generation:", streamError);
             // Accumulate error message?
        }
    }
    console.log("Accumulated raw text response from Gemini stream:", accumulatedJsonText);

    if (!accumulatedJsonText) {
        // Check safety feedback if response is empty
        // const safetyFeedback = await result.response.promptFeedback(); // Need to adapt if using stream result directly
        throw new Error('Gemini returned empty stream response for tiles.');
    }

    // 5. Parse the accumulated JSON response (Same as before)
    let tilesObject;
    try {
        const jsonStart = accumulatedJsonText.indexOf('{');
        const jsonEnd = accumulatedJsonText.lastIndexOf('}') + 1;
        if (jsonStart !== -1 && jsonEnd !== -1) {
             const potentialJson = accumulatedJsonText.substring(jsonStart, jsonEnd);
             tilesObject = JSON.parse(potentialJson);
        } else {
             throw new Error("Could not find valid JSON object braces {} in response.")
        }
    } catch(parseError) {
        console.error("Failed to parse accumulated JSON from Gemini stream:", parseError);
        console.error("Accumulated Text was:", accumulatedJsonText);
        throw new Error("Failed to parse AI stream response into JSON format.");
    }

    // 6. Send back the array of tiles
    res.status(200).json(tilesObject.tiles || []);
    console.log(`Successfully generated ${tilesObject.tiles?.length || 0} tiles via stream for User ${req.user.id}.`);

  } catch (error) {
    console.error(`Error generating tiles for User ${req.user.id}:`, error);
    // Log more details if it's a Google specific error
    if (error.message.includes("GoogleGenerativeAI")) {
        console.error("Gemini API Error details:", error);
    }
    res.status(500).json({ error: 'Failed to generate curiosity feed', details: error.message });
  }
};

module.exports = {
  generateTiles,
};