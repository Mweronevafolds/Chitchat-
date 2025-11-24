// Script to test which Gemini models are available
require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function testModels() {
  console.log('\n=== Testing Available Gemini Models ===\n');
  
  const modelsToTest = [
    // Latest Gemini 2.0 models
    'gemini-2.0-flash',
    'gemini-2.0-flash-exp',
    // Gemini 1.5 variants
    'gemini-1.5-pro-latest',
    'gemini-1.5-flash-latest',
    'gemini-1.5-pro',
    'gemini-1.5-flash',
    'gemini-1.5-flash-8b',
    'gemini-1.5-flash-8b-latest',
    // Gemini 1.0 variants
    'gemini-pro',
    'gemini-pro-vision',
    'gemini-1.0-pro',
    'gemini-1.0-pro-latest',
    'gemini-1.0-pro-001',
    'gemini-1.0-pro-vision-latest',
  ];
  
  const embeddingModelsToTest = [
    'text-embedding-004',
    'embedding-001',
    'text-embedding-preview-0409',
  ];
  
  console.log('Testing Chat/Content Generation Models:\n');
  
  for (const modelName of modelsToTest) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent('Say hi');
      console.log(`✅ ${modelName} - WORKS`);
    } catch (error) {
      if (error.message.includes('404')) {
        console.log(`❌ ${modelName} - NOT FOUND (404)`);
      } else if (error.message.includes('API key')) {
        console.log(`⚠️  ${modelName} - API KEY ISSUE`);
      } else {
        console.log(`❌ ${modelName} - ERROR: ${error.message.substring(0, 50)}`);
      }
    }
  }
  
  console.log('\n\nTesting Embedding Models:\n');
  
  for (const modelName of embeddingModelsToTest) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.embedContent('test');
      console.log(`✅ ${modelName} - WORKS (${result.embedding.values.length} dimensions)`);
    } catch (error) {
      if (error.message.includes('404')) {
        console.log(`❌ ${modelName} - NOT FOUND (404)`);
      } else {
        console.log(`❌ ${modelName} - ERROR: ${error.message.substring(0, 50)}`);
      }
    }
  }
  
  console.log('\n=== Test Complete ===\n');
}

testModels().catch(err => {
  console.error('Fatal error:', err);
});

