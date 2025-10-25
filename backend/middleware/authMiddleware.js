const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client with the ANONYMOUS key.
// This key is safe to use here; its only power is to verify JWTs, not access data.
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

const protect = async (req, res, next) => {
  let token;

  // Check if the Authorization header exists and is in the correct "Bearer <token>" format
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Extract the token from the header
      token = req.headers.authorization.split(' ')[1];

      // Ask Supabase to verify the token and return the associated user
      const { data: { user }, error } = await supabase.auth.getUser(token);

      if (error) {
        // If Supabase returns an error (e.g., token expired, invalid signature), deny access
        return res.status(401).json({ error: 'Not authorized, token failed' });
      }

      // If successful, attach the user object to the request (`req`)
      // This allows downstream controllers to know who is making the request
      req.user = user;
      next(); // Proceed to the next step (the actual controller)
    } catch (error) {
      console.error('Auth middleware error:', error);
      res.status(401).json({ error: 'Not authorized, token failed' });
    }
  }

  // If there's no token at all, deny access
  if (!token) {
    res.status(401).json({ error: 'Not authorized, no token' });
  }
};

module.exports = { protect };

