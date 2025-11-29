// backend/controllers/proactiveController.js
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { createClient } = require('@supabase/supabase-js');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const chatModel = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
const supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// Cache for proactive responses (in-memory for speed)
const responseCache = new Map();
const CACHE_TTL = 60000; // 1 minute cache

/**
 * Generate proactive greeting based on context
 */
async function generateProactiveGreeting(req, res) {
  try {
    const { context, topic, userInterests = [] } = req.body;
    const userId = req.user.id;
    
    // Check cache first
    const cacheKey = `greeting-${userId}-${topic || 'general'}`;
    const cached = responseCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return res.json({ greeting: cached.content, confidence: cached.confidence, cached: true });
    }
    
    // Fetch user's recent activity for personalization
    const { data: recentActivity } = await supabaseAdmin
      .from('chat_messages')
      .select('content')
      .eq('user_id', userId)
      .eq('role', 'user')
      .order('timestamp', { ascending: false })
      .limit(5);
    
    const recentTopics = recentActivity?.map(m => m.content).join(', ') || '';
    
    // Build context-aware prompt
    const prompt = `You are a proactive, friendly AI assistant in ChitChat. Generate an engaging, personalized greeting that:
1. Acknowledges the user naturally (don't say "hi" unless it fits)
2. Shows awareness of the topic: ${topic || 'general conversation'}
3. ${context ? `Considers context: ${context}` : 'Is welcoming and helpful'}
4. ${userInterests.length > 0 ? `References user interests: ${userInterests.join(', ')}` : ''}
5. ${recentTopics ? `Shows awareness of recent topics: ${recentTopics}` : ''}
6. Offers to help or dive deeper
7. Is concise (2-3 sentences max)

Generate a warm, intelligent greeting that makes the user feel understood and eager to engage.`;

    const result = await chatModel.generateContent(prompt);
    const greeting = result.response.text();
    
    // Cache the response
    responseCache.set(cacheKey, {
      content: greeting,
      confidence: 0.9,
      timestamp: Date.now(),
    });
    
    // Clean old cache entries
    if (responseCache.size > 1000) {
      const now = Date.now();
      for (const [key, value] of responseCache.entries()) {
        if (now - value.timestamp > CACHE_TTL) {
          responseCache.delete(key);
        }
      }
    }
    
    res.json({ greeting, confidence: 0.9, cached: false });
  } catch (error) {
    console.error('Error generating proactive greeting:', error);
    res.status(500).json({ error: 'Failed to generate greeting' });
  }
}

/**
 * Generate anticipatory suggestions
 */
async function generateSuggestions(req, res) {
  try {
    const { context, topic, userInterests = [], limit = 5 } = req.body;
    const userId = req.user.id;
    
    // Check cache
    const cacheKey = `suggestions-${userId}-${topic || 'general'}`;
    const cached = responseCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return res.json({ suggestions: cached.content, cached: true });
    }
    
    // Fetch user's learning patterns
    const { data: userStats } = await supabaseAdmin
      .from('user_profiles')
      .select('learning_style, preferred_topics, interaction_patterns')
      .eq('id', userId)
      .single();
    
    const prompt = `You are analyzing what a user might want to explore next. Generate ${limit} intelligent, proactive suggestions.

Context:
- Topic: ${topic || 'general learning'}
- ${context ? `Current context: ${context}` : ''}
- User interests: ${userInterests.join(', ') || 'general'}
- Learning style: ${userStats?.learning_style || 'visual'}

Generate ${limit} suggestions that:
1. Anticipate natural follow-up questions
2. Offer deeper exploration opportunities
3. Connect to user interests
4. Are specific and actionable
5. Range from simple to advanced

Return ONLY a JSON array of objects with this format:
[
  {"content": "suggestion text here", "confidence": 0.85, "category": "deeper_dive"},
  {"content": "another suggestion", "confidence": 0.90, "category": "related_topic"}
]

Categories: deeper_dive, related_topic, practical_application, creative_exploration, quick_fact`;

    const result = await chatModel.generateContent(prompt);
    let responseText = result.response.text();
    
    // Clean markdown code blocks if present
    responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    const suggestions = JSON.parse(responseText);
    
    // Cache the response
    responseCache.set(cacheKey, {
      content: suggestions,
      timestamp: Date.now(),
    });
    
    res.json({ suggestions, cached: false });
  } catch (error) {
    console.error('Error generating suggestions:', error);
    res.status(500).json({ error: 'Failed to generate suggestions' });
  }
}

/**
 * Prefetch common question answers
 */
async function prefetchAnswers(req, res) {
  try {
    const { topic, context, questionsToPreload = [] } = req.body;
    const userId = req.user.id;
    
    // Check cache
    const cacheKey = `prefetch-${userId}-${topic}`;
    const cached = responseCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL * 2) { // Longer cache for prefetch
      return res.json({ prefetched: cached.content, cached: true });
    }
    
    // Default questions if none provided
    const defaultQuestions = [
      'What is this about?',
      'Tell me more',
      'How does this work?',
      'Why is this important?',
      'Give me examples',
      'Explain like I\'m 5',
      'What are the key points?',
    ];
    
    const questions = questionsToPreload.length > 0 ? questionsToPreload : defaultQuestions;
    
    // Generate all answers in parallel
    const answerPromises = questions.map(async (question) => {
      const prompt = `Context: ${topic}${context ? ` - ${context}` : ''}

User asks: "${question}"

Provide a concise, informative answer (2-3 sentences). Be helpful and engaging.`;

      try {
        const result = await chatModel.generateContent(prompt);
        return {
          question,
          answer: result.response.text(),
          confidence: 0.85,
        };
      } catch (error) {
        console.error(`Error generating answer for "${question}":`, error);
        return {
          question,
          answer: `I'd be happy to discuss ${topic}! What specifically would you like to know?`,
          confidence: 0.5,
        };
      }
    });
    
    const prefetched = await Promise.all(answerPromises);
    
    // Cache the responses
    responseCache.set(cacheKey, {
      content: prefetched,
      timestamp: Date.now(),
    });
    
    res.json({ prefetched, cached: false });
  } catch (error) {
    console.error('Error prefetching answers:', error);
    res.status(500).json({ error: 'Failed to prefetch answers' });
  }
}

/**
 * Smart response - checks cache and generates instantly if available
 */
async function getSmartResponse(req, res) {
  try {
    const { message, sessionId, context, topic } = req.body;
    const userId = req.user.id;
    
    // Normalize message for matching
    const normalized = message.toLowerCase().trim();
    
    // Check if we have a prefetched answer
    const cacheKey = `prefetch-${userId}-${topic}`;
    const cached = responseCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < CACHE_TTL * 2) {
      // Try to find matching prefetched answer
      const match = cached.content.find(item => 
        normalized.includes(item.question.toLowerCase()) ||
        item.question.toLowerCase().includes(normalized)
      );
      
      if (match) {
        // We have an instant answer!
        return res.json({
          response: match.answer,
          instant: true,
          confidence: match.confidence,
          source: 'prefetched',
        });
      }
    }
    
    // No prefetch match - indicate we need to generate
    res.json({
      instant: false,
      message: 'No prefetched response available',
    });
  } catch (error) {
    console.error('Error getting smart response:', error);
    res.status(500).json({ error: 'Failed to get smart response' });
  }
}

module.exports = {
  generateProactiveGreeting,
  generateSuggestions,
  prefetchAnswers,
  getSmartResponse,
};
