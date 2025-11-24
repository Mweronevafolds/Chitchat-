// Test script to verify AI assistant configuration
require('dotenv').config();

console.log('\n=== AI Assistant Configuration Test ===\n');

// Check environment variables
const checks = {
  'GEMINI_API_KEY': process.env.GEMINI_API_KEY,
  'SUPABASE_URL': process.env.SUPABASE_URL,
  'SUPABASE_SERVICE_KEY': process.env.SUPABASE_SERVICE_KEY,
  'SUPABASE_ANON_KEY': process.env.SUPABASE_ANON_KEY,
  'PORT': process.env.PORT || '3001 (default)'
};

let allGood = true;

for (const [key, value] of Object.entries(checks)) {
  if (value && value !== 'undefined') {
    console.log(`✅ ${key}: SET (${value.substring(0, 20)}...)`);
  } else {
    console.log(`❌ ${key}: MISSING`);
    allGood = false;
  }
}

console.log('\n=== Testing Gemini API Connection ===\n');

const { GoogleGenerativeAI } = require('@google/generative-ai');

if (!process.env.GEMINI_API_KEY) {
  console.error('❌ Cannot test Gemini - API key missing');
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function testGemini() {
  try {
    console.log('Testing embedding model...');
    const embeddingModel = genAI.getGenerativeModel({ model: 'text-embedding-004' });
    const embeddingResult = await embeddingModel.embedContent('Hello world');
    console.log(`✅ Embedding model works! Vector dimensions: ${embeddingResult.embedding.values.length}`);

    console.log('\nTesting chat model...');
    const chatModel = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const result = await chatModel.generateContent('Say "Hello from ChitChat!" in exactly 4 words.');
    const response = result.response;
    console.log(`✅ Chat model works! Response: ${response.text()}`);

    console.log('\n=== All Tests Passed! ===\n');
    console.log('Your AI assistant is properly configured and ready to use.\n');
    console.log('Next steps:');
    console.log('1. Run: npm start');
    console.log('2. Start your Expo app');
    console.log('3. Test the chat feature\n');
  } catch (error) {
    console.error('\n❌ Gemini API Test Failed:', error.message);
    if (error.message.includes('API_KEY_INVALID')) {
      console.error('\nYour Gemini API key appears to be invalid.');
      console.error('Please check your .env file and verify the key at:');
      console.error('https://makersuite.google.com/app/apikey\n');
    }
    process.exit(1);
  }
}

// Test Supabase connection
console.log('\n=== Testing Supabase Connection ===\n');
const { createClient } = require('@supabase/supabase-js');

async function testSupabase() {
  try {
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
    
    // Try to query profiles table
    const { data, error } = await supabase.from('profiles').select('count').limit(1);
    
    if (error) {
      console.log(`⚠️  Supabase connection works, but query failed: ${error.message}`);
      console.log('   This is normal if your database is empty or RLS is enabled.');
    } else {
      console.log('✅ Supabase connection works!');
    }
  } catch (error) {
    console.error('❌ Supabase connection failed:', error.message);
    console.error('   Check your SUPABASE_URL and SUPABASE_ANON_KEY\n');
  }
}

// Run tests
(async () => {
  if (allGood) {
    await testSupabase();
    await testGemini();
  } else {
    console.error('\n❌ Configuration incomplete. Please check your .env file.\n');
    process.exit(1);
  }
})();
