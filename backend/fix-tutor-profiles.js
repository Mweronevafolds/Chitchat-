// Fix: Ensure tutor_profiles table has all required columns
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function fixTutorProfilesTable() {
  console.log('🔧 Checking tutor_profiles table schema...');
  
  try {
    // Try to select with ai_persona column
    const { data, error } = await supabase
      .from('tutor_profiles')
      .select('ai_persona')
      .limit(1);
    
    if (error && error.message.includes('ai_persona')) {
      console.log('❌ ai_persona column is missing from tutor_profiles table.');
      console.log('\n📋 Run this SQL in Supabase Dashboard > SQL Editor:\n');
      console.log('--- COPY THIS SQL ---\n');
      console.log(`
-- Add missing ai_persona column to tutor_profiles
ALTER TABLE tutor_profiles 
ADD COLUMN IF NOT EXISTS ai_persona JSONB DEFAULT '{"tone": "friendly", "style": "conversational", "formality": "casual"}'::jsonb;

-- Verify the column was added
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'tutor_profiles' 
  AND column_name = 'ai_persona';
      `);
      console.log('\n--- END SQL ---\n');
      console.log('✅ After running this SQL, try upgrading to tutor again.');
    } else if (error) {
      console.log('⚠️ Error checking table:', error.message);
      
      // Check if table exists at all
      const { data: tableCheck, error: tableError } = await supabase
        .from('tutor_profiles')
        .select('id')
        .limit(1);
        
      if (tableError && tableError.message.includes('does not exist')) {
        console.log('\n❌ tutor_profiles table does not exist!');
        console.log('📋 Run the FULL migration in Supabase Dashboard > SQL Editor:\n');
        const fs = require('fs');
        const migrationSQL = fs.readFileSync('./migrations/create_tutor_system.sql', 'utf8');
        console.log('--- COPY ALL THIS SQL ---\n');
        console.log(migrationSQL);
        console.log('\n--- END SQL ---\n');
      }
    } else {
      console.log('✅ tutor_profiles table structure is correct!');
      console.log('📊 Sample data:', data);
    }
  } catch (err) {
    console.error('❌ Unexpected error:', err.message);
  }
}

fixTutorProfilesTable();
