const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

const generateFlashcards = async (req, res) => {
  try {
    const { topic } = req.body;
    
    if (!topic) {
      return res.status(400).json({ error: "Topic is required" });
    }
    
    const prompt = `
      Create 15 TRUE/FALSE flashcards for learning about: "${topic}".
      
      Requirements:
      - Mix of true and false statements (roughly 50/50)
      - Keep statements CONCISE (under 15 words)
      - Make them educational and challenging
      - Include brief explanations for learning
      - Cover different aspects of the topic
      
      Output JSON ONLY as an array in this exact format:
      [
        {
          "statement": "The statement text here",
          "isTrue": true,
          "explanation": "Brief explanation why this is true/false"
        }
      ]
      
      Example for topic "JavaScript":
      [
        {
          "statement": "JavaScript is a compiled language",
          "isTrue": false,
          "explanation": "JavaScript is an interpreted language that runs in browsers without compilation"
        },
        {
          "statement": "Arrays in JavaScript can hold multiple data types",
          "isTrue": true,
          "explanation": "JavaScript arrays are flexible and can contain strings, numbers, objects, etc."
        }
      ]
    `;

    const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { 
          responseMimeType: "application/json",
          temperature: 0.7 
        }
    });

    let flashcards = JSON.parse(result.response.text());
    
    // Validate the response structure
    if (!Array.isArray(flashcards)) {
      throw new Error("Invalid flashcard data structure from AI");
    }
    
    // Validate each flashcard has required fields
    flashcards = flashcards.filter(card => 
      card.statement && 
      typeof card.isTrue === 'boolean' && 
      card.explanation
    );
    
    if (flashcards.length === 0) {
      throw new Error("No valid flashcards generated");
    }
    
    // Shuffle the flashcards
    flashcards = flashcards.sort(() => Math.random() - 0.5);

    console.log(`Generated ${flashcards.length} flashcards for topic: ${topic}`);
    res.status(200).json(flashcards);

  } catch (error) {
    console.error("Flashcard generation error:", error);
    res.status(500).json({ 
      error: "Failed to generate flashcards", 
      details: error.message 
    });
  }
};

module.exports = { generateFlashcards };
