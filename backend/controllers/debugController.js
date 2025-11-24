// backend/controllers/debugController.js
const { GoogleGenerativeAI } = require('@google/generative-ai');

const listAvailableModels = async (req, res) => {
    try {
        console.log("Attempting to list available models...");
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

        const modelsToCheck = [
            "gemini-1.5-flash",
            "gemini-1.5-pro",
            "gemini-pro",
            "text-embedding-004",
            "embedding-001"
        ];
        const availability = {};

        for (const modelName of modelsToCheck) {
            try {
                genAI.getGenerativeModel({ model: modelName });
                console.log(`Model check SUCCESS for: ${modelName}`);
                availability[modelName] = "Likely Available (Initialization didn't throw)";
            } catch (error) {
                console.warn(`Model check FAILED for: ${modelName}`, error.message);
                availability[modelName] = `Unavailable or Error: ${error.message}`;
            }
        }

        res.status(200).json({
            message: "Attempted to check model availability. See server logs for details. Results below are indicative.",
            checkedModels: availability
        });

    } catch (error) {
        console.error('Error listing/checking models:', error);
        res.status(500).json({ error: 'Failed to list/check models', details: error.message });
    }
};

module.exports = { listAvailableModels };