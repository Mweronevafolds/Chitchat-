// Quick fix: Add role column to profiles table
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function fixProfilesTable() {
  console.log('🔧 Adding role column to profiles table...');
  
  try {
    // Execute SQL directly using Supabase admin
    const { data, error } = await supabase
      .from('profiles')
      .select('role')
      .limit(1);
    
    if (error && error.message.includes('column "role" does not exist')) {
      console.log('❌ Role column does not exist. Please run this SQL in your Supabase SQL Editor:');
      console.log('\n--- Copy and paste this into Supabase Dashboard > SQL Editor ---\n');
      console.log(`
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'learner';
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
      `);
      console.log('\n--- End of SQL ---\n');
      console.log('After running the SQL, restart the backend server.');
    } else if (error) {
      console.log('❌ Error checking profiles table:', error);
    } else {
      console.log('✅ Role column already exists in profiles table!');
    }
  } catch (err) {
    console.error('Error:', err);
  }
}

fixProfilesTable();
