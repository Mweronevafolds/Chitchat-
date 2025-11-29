// Execute SQL migration to fix tutor_profiles
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

async function executeMigration() {
  console.log('🚀 Executing tutor_profiles schema fix...\n');
  
  const sql = `
    -- Add ai_persona column if it doesn't exist
    DO $$ 
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tutor_profiles' AND column_name = 'ai_persona'
      ) THEN
        ALTER TABLE tutor_profiles 
        ADD COLUMN ai_persona JSONB DEFAULT '{"tone": "friendly", "style": "conversational", "formality": "casual"}'::jsonb;
        RAISE NOTICE 'Column ai_persona added successfully';
      ELSE
        RAISE NOTICE 'Column ai_persona already exists';
      END IF;
    END $$;
  `;
  
  try {
    // Use the REST API to execute raw SQL (if available)
    const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/rpc/exec`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': process.env.SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`
      },
      body: JSON.stringify({ sql })
    });
    
    if (!response.ok) {
      console.log('⚠️ Direct SQL execution not available via REST API.');
      console.log('📋 Please run this SQL manually in Supabase Dashboard:\n');
      console.log('--- COPY THIS ---\n');
      console.log(sql);
      console.log('\n--- END ---\n');
      return;
    }
    
    const result = await response.json();
    console.log('✅ Migration executed successfully!');
    console.log('Result:', result);
    
  } catch (error) {
    console.log('⚠️ Could not execute SQL automatically.');
    console.log('📋 Please copy and run this SQL in your Supabase SQL Editor:\n');
    console.log('='.repeat(60));
    console.log(sql);
    console.log('='.repeat(60));
    console.log('\nSteps:');
    console.log('1. Go to https://supabase.com/dashboard');
    console.log('2. Select your project');
    console.log('3. Click "SQL Editor" in the left sidebar');
    console.log('4. Create a new query');
    console.log('5. Paste the SQL above');
    console.log('6. Click "Run" or press Ctrl+Enter');
    console.log('\n✅ Then restart your backend server.\n');
  }
}

executeMigration();
