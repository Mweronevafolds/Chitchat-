const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

const generateNinjaGame = async (req, res) => {
  try {
    const { topic } = req.body;
    
    if (!topic) {
      return res.status(400).json({ error: "Topic is required" });
    }
    
    // Prompt to get categorical data
    const prompt = `
      Create a "Fruit Ninja" style learning game dataset for the topic: "${topic}".
      
      1. Choose a specific category to "Slice" (e.g. for topic 'Math', slice 'Prime Numbers').
      2. Generate 10 correct items ("Fruits") - these should be items that belong to your chosen category.
      3. Generate 10 incorrect items ("Bombs") - these should be similar but DO NOT belong to the category.
      4. Keep text SHORT (1-3 words maximum per item).
      5. Make it educational and fun!
      
      Output JSON ONLY in this exact format:
      {
        "instruction": "Slice the [Category Name]!",
        "items": [
          { "text": "Item 1", "isTarget": true }, 
          { "text": "Item 2", "isTarget": false }
        ]
      }
      
      Example for topic "Programming":
      {
        "instruction": "Slice the JavaScript Keywords!",
        "items": [
          { "text": "const", "isTarget": true },
          { "text": "let", "isTarget": true },
          { "text": "hello", "isTarget": false }
        ]
      }
    `;

    const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { 
          responseMimeType: "application/json",
          temperature: 0.8 
        }
    });

    let gameData = JSON.parse(result.response.text());
    
    // Validate the response structure
    if (!gameData.instruction || !Array.isArray(gameData.items)) {
      throw new Error("Invalid game data structure from AI");
    }
    
    // Ensure we have both target and non-target items
    const hasTargets = gameData.items.some(item => item.isTarget === true);
    const hasBombs = gameData.items.some(item => item.isTarget === false);
    
    if (!hasTargets || !hasBombs) {
      throw new Error("Game data must include both targets and bombs");
    }
    
    // Shuffle the items server-side for randomness
    gameData.items = gameData.items.sort(() => Math.random() - 0.5);

    console.log(`Generated Ninja game for topic: ${topic}`);
    res.status(200).json(gameData);

  } catch (error) {
    console.error("Game generation error:", error);
    res.status(500).json({ 
      error: "Failed to generate game", 
      details: error.message 
    });
  }
};

module.exports = { generateNinjaGame };
