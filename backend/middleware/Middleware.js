const { createClient } = require('@supabase/supabase-js');

// This middleware does NOT use a service key. It uses the anon key
// to verify the JWT provided by the client, which is highly secure.
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];

      const { data: { user }, error } = await supabase.auth.getUser(token);

      if (error) {
        return res.status(401).json({ error: 'Not authorized, token failed' });
      }

      req.user = user; // Attach user to the request object
      next();
    } catch (error) {
      res.status(401).json({ error: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    res.status(401).json({ error: 'Not authorized, no token' });
  }
};

module.exports = { protect };
