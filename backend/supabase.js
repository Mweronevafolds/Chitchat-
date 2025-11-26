// Backend Supabase client configuration for Node.js
const { createClient } = require('@supabase/supabase-js');

// Get the variables from your .env file
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

// Initialize the Supabase client with service key for backend operations
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Also create a client with anon key for authentication
const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey);

module.exports = { supabase, supabaseAuth };