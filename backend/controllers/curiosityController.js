// backend/controllers/curiosityController.js
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { createClient } = require('@supabase/supabase-js');
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Supabase admin client for server-side activity logging
const supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// In-memory cache for tile openings (server-side)
const openingCache = new Map();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Generate an engaging opening message for a curiosity tile
 * This creates an immediate AI response that hooks the user into conversation
 * Includes server-side caching to reduce Gemini API calls across all users
 */
const generateTileOpening = async (req, res) => {
  try {
    const { hook, seed_prompt, type, style } = req.body; // Added 'style' for A/B testing

    if (!hook || !seed_prompt) {
      return res.status(400).json({ 
        error: 'Missing required fields: hook and seed_prompt' 
      });
    }

    // Create cache key from hook + style
    const cacheKey = `${hook}_${style || 'default'}`;
    
    // Check server-side cache first
    const cached = openingCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL_MS) {
      console.log(`[Curiosity Opening] Returning cached response for: "${hook}"`);
      // Server-side analytics log (fire-and-forget)
      try {
        const userId = req.user?.id || null;
        await supabaseAdmin.from('user_activity').insert({
          user_id: userId,
          activity_type: 'tile_opening_cached',
          content: hook,
          metadata: JSON.stringify({ style: style || 'default' })
        });
      } catch (logErr) {
        console.warn('[Curiosity Opening] Failed to log cached activity:', logErr?.message || logErr);
      }

      return res.json({
        success: true,
        opening: cached.opening,
        hook,
        seed_prompt,
        type: type || 'micro-lesson',
        cached: true,
        style: style || 'default'
      });
    }

    console.log(`[Curiosity Opening] Generating for: "${hook}" (style: ${style || 'default'})`);

    // Initialize Gemini model
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      generationConfig: {
        temperature: 0.8, // More creative and engaging
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 300, // Keep it concise but engaging
      },
    });

    // Craft the system instruction based on tile type and style
    let systemInstruction;
    
    if (style === 'concise') {
      // A/B Test Variant A: Concise, direct approach
      systemInstruction = `You are an AI tutor starting a conversation about: ${hook}

STYLE: Direct and concise
- Share ONE fascinating fact immediately (1-2 sentences max)
- End with ONE clear question
- No emojis, no fluff
- Total length: 2-3 sentences

TOPIC: ${seed_prompt}
TYPE: ${type || 'micro-lesson'}`;
    } else {
      // A/B Test Variant B: Playful, engaging approach (default)
      systemInstruction = `You are an enthusiastic AI tutor starting a conversation about an interesting topic. Your goal is to IMMEDIATELY engage the user with fascinating information and encourage them to explore further.

CRITICAL RULES:
1. Start with a hook - share the most fascinating fact or insight right away
2. Be conversational and friendly, not formal or academic
3. Create curiosity gaps - hint at more interesting things to come
4. End with an engaging question that invites the user to explore deeper
5. Keep it to 2-3 short paragraphs maximum
6. Use emojis sparingly but effectively (1-2 max)
7. Make it feel like a friend sharing something cool, not a lecture

TILE TYPE: ${type || 'micro-lesson'}
HOOK: ${hook}
TOPIC: ${seed_prompt}

Now generate an opening message that will make the user excited to continue this conversation.`;
    }

    // Generate the opening message
    const result = await model.generateContent(systemInstruction);
    const response = await result.response;
    const openingMessage = response.text().trim();

    console.log(`[Curiosity Opening] Generated ${openingMessage.length} chars (style: ${style || 'default'})`);

    // Cache the generated opening
    openingCache.set(cacheKey, {
      opening: openingMessage,
      timestamp: Date.now(),
      hook,
      style: style || 'default'
    });

    // Server-side analytics log for generated opening
    try {
      const userId = req.user?.id || null;
      await supabaseAdmin.from('user_activity').insert({
        user_id: userId,
        activity_type: 'tile_opening_generated',
        content: hook,
        metadata: JSON.stringify({ style: style || 'default', length: openingMessage.length })
      });
    } catch (logErr) {
      console.warn('[Curiosity Opening] Failed to log generated activity:', logErr?.message || logErr);
    }

    return res.json({
      success: true,
      opening: openingMessage,
      hook,
      seed_prompt,
      type: type || 'micro-lesson',
      cached: false,
      style: style || 'default'
    });

  } catch (error) {
    console.error('[Curiosity Opening] Generation failed:', error);
    
    // Return a fallback engaging message
    const fallbackMessage = `Hey! 🌟 Let's dive into something fascinating - ${req.body.hook}. I have some really interesting insights to share about this. What aspect would you like to explore first?`;
    
    return res.json({
      success: true,
      opening: fallbackMessage,
      hook: req.body.hook,
      seed_prompt: req.body.seed_prompt,
      type: req.body.type || 'micro-lesson',
      fallback: true,
      style: req.body.style || 'default'
    });
  }
};

/**
 * Clear the server-side cache (for admin/testing purposes)
 */
const clearCache = async (req, res) => {
  try {
    const sizeBefore = openingCache.size;
    openingCache.clear();
    console.log(`[Curiosity Opening] Cache cleared (${sizeBefore} entries removed)`);
    
    return res.json({
      success: true,
      message: `Cache cleared successfully`,
      entriesRemoved: sizeBefore
    });
  } catch (error) {
    console.error('[Curiosity Opening] Cache clear failed:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to clear cache'
    });
  }
};

/**
 * Get cache statistics
 */
const getCacheStats = async (req, res) => {
  try {
    const now = Date.now();
    let validEntries = 0;
    let expiredEntries = 0;
    
    openingCache.forEach((value) => {
      if ((now - value.timestamp) < CACHE_TTL_MS) {
        validEntries++;
      } else {
        expiredEntries++;
      }
    });
    
    return res.json({
      success: true,
      stats: {
        totalEntries: openingCache.size,
        validEntries,
        expiredEntries,
        ttlHours: CACHE_TTL_MS / (60 * 60 * 1000)
      }
    });
  } catch (error) {
    console.error('[Curiosity Opening] Stats failed:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get cache stats'
    });
  }
};

/**
 * Pre-warm cache for popular tiles
 */
const prewarmCache = async (req, res) => {
  try {
    const { tiles } = req.body; // Array of {hook, seed_prompt, type}
    
    if (!tiles || !Array.isArray(tiles)) {
      return res.status(400).json({
        error: 'Missing tiles array'
      });
    }
    
    console.log(`[Curiosity Opening] Pre-warming ${tiles.length} tiles...`);
    
    const results = [];
    
    for (const tile of tiles) {
      const cacheKey = `${tile.hook}_default`;
      
      // Skip if already cached
      if (openingCache.has(cacheKey)) {
        results.push({ hook: tile.hook, status: 'already_cached' });
        continue;
      }
      
      try {
        // Generate opening
        const model = genAI.getGenerativeModel({
          model: 'gemini-2.0-flash',
          generationConfig: {
            temperature: 0.8,
            topP: 0.95,
            topK: 40,
            maxOutputTokens: 300,
          },
        });
        
        const systemInstruction = `You are an enthusiastic AI tutor starting a conversation about an interesting topic. Your goal is to IMMEDIATELY engage the user with fascinating information and encourage them to explore further.

CRITICAL RULES:
1. Start with a hook - share the most fascinating fact or insight right away
2. Be conversational and friendly, not formal or academic
3. Create curiosity gaps - hint at more interesting things to come
4. End with an engaging question that invites the user to explore deeper
5. Keep it to 2-3 short paragraphs maximum
6. Use emojis sparingly but effectively (1-2 max)
7. Make it feel like a friend sharing something cool, not a lecture

TILE TYPE: ${tile.type || 'micro-lesson'}
HOOK: ${tile.hook}
TOPIC: ${tile.seed_prompt}

Now generate an opening message that will make the user excited to continue this conversation.`;
        
        const result = await model.generateContent(systemInstruction);
        const response = await result.response;
        const openingMessage = response.text().trim();
        
        // Cache it
        openingCache.set(cacheKey, {
          opening: openingMessage,
          timestamp: Date.now(),
          hook: tile.hook,
          style: 'default'
        });
        
        results.push({ hook: tile.hook, status: 'generated', length: openingMessage.length });
        
        // Rate limiting - small delay between generations
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error) {
        console.error(`[Curiosity Opening] Pre-warm failed for "${tile.hook}":`, error);
        results.push({ hook: tile.hook, status: 'error', error: error.message });
      }
    }
    
    console.log(`[Curiosity Opening] Pre-warming complete: ${results.filter(r => r.status === 'generated').length}/${tiles.length} generated`);
    
    return res.json({
      success: true,
      message: 'Pre-warming complete',
      results
    });
    
  } catch (error) {
    console.error('[Curiosity Opening] Pre-warm failed:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to pre-warm cache'
    });
  }
};

module.exports = {
  generateTileOpening,
  clearCache,
  getCacheStats,
  prewarmCache,
};
