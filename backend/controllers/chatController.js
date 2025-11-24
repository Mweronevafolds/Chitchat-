// backend/controllers/chatController.js
const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require('@google/generative-ai');
const { createClient } = require('@supabase/supabase-js');

// --- Initialization ---
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const embeddingModelName = "text-embedding-004";
const chatModelName = "gemini-2.0-flash";
const embeddingModel = genAI.getGenerativeModel({ model: embeddingModelName });
const chatModel = genAI.getGenerativeModel({
  model: chatModelName,
  safetySettings: [
    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  ]
});
const supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const MAX_HISTORY = 10;
const MAX_CONTEXT_CHUNKS = 3;
const RAG_SIMILARITY_THRESHOLD = 0.75;
const EMBEDDING_DIMENSIONS = 768;

const postChatMessage = async (req, res) => {
  let currentSessionId = null;
  try {
    let { sessionId, input, mode, contextResourceIds, seedPrompt } = req.body;
    const userId = req.user?.id;

    // --- Input Validation & Session Creation (same as before) ---
    if (!userId) return res.status(401).json({ error: 'User not authenticated.' });
    if (!input || typeof input !== 'string' || input.trim() === '') {
      return res.status(400).json({ error: 'Input text is required.' });
    }
    console.log(`--- Gemini RAG Request --- User: ${userId}, Session: ${sessionId}, Input: "${input.substring(0, 50)}...", Resources: [${contextResourceIds?.join(',') || 'None'}], SeedPrompt: ${seedPrompt ? '"' + seedPrompt.substring(0, 30) + '..."' : 'None'}`);
    currentSessionId = sessionId;
    
    // Create new session if needed
    if (!currentSessionId) {
        const { data: newSessionId, error: rpcError } = await supabaseAdmin.rpc('create_chat_session', { 
          p_user_id: userId, 
          p_mode: mode || 'explain' 
        });
        if (rpcError) throw new Error(`Failed to create chat session via RPC: ${rpcError.message}`);
        if (!newSessionId) throw new Error(`RPC create_chat_session returned null ID`);
        currentSessionId = newSessionId;
        console.log(`Successfully created new session via RPC: ${currentSessionId}`);
        
        // --- SAVE SEED PROMPT if provided (from tile) ---
        if (seedPrompt && typeof seedPrompt === 'string' && seedPrompt.trim()) {
          try {
            const { error: saveSeedErr } = await supabaseAdmin.rpc('save_chat_message', {
              p_session_id: currentSessionId,
              p_sender: 'ai',
              p_content: seedPrompt.trim()
            });
            if (saveSeedErr) {
              console.error("Failed to save seed prompt:", saveSeedErr);
            } else {
              console.log(`✓ Seed prompt saved for session ${currentSessionId}`);
            }
          } catch (seedError) {
            console.error("Error saving seed prompt:", seedError);
          }
        }
    } else { 
        console.log(`Continuing session: ${currentSessionId}`); 
    }

    // --- Fetch History ---
    const { data: history, error: historyError } = await supabaseAdmin
      .from('chat_messages')
      .select('sender, content')
      .eq('session_id', currentSessionId)
      .order('created_at', { ascending: false })
      .limit(MAX_HISTORY);
      
    if (historyError) throw new Error(`Failed to fetch chat history: ${historyError.message}`);
    
    // --- Format History for Gemini (CRITICAL FIX) ---
    const geminiHistory = history ? history.reverse().map(msg => ({ 
      role: msg.sender === 'user' ? 'user' : 'model', 
      parts: [{ text: msg.content }] 
    })) : [];

    // *** FIX: Ensure history starts with 'user' ***
    // Gemini API requires the first message in history to be from 'user'.
    // Since our seed prompt is saved as 'model', we prepend a dummy user message.
    if (geminiHistory.length > 0 && geminiHistory[0].role === 'model') {
        console.log("⚠️ Fixing history order: Prepending dummy user message to satisfy Gemini API requirements.");
        geminiHistory.unshift({
            role: 'user',
            parts: [{ text: "Hello, I'm interested in this topic. Please guide me." }] 
        });
    }

    console.log(`Loaded ${geminiHistory.length} messages for context.`);

    // --- RAG Context Fetch ---
    let contextText = '';
    if (contextResourceIds && Array.isArray(contextResourceIds) && contextResourceIds.length > 0) {
        try {
            const embeddingResult = await embeddingModel.embedContent(input);
            const queryEmbedding = embeddingResult.embedding.values;
            
            const { data: chunks, error: matchError } = await supabaseAdmin
              .rpc('match_resource_chunks', { 
                p_query_embedding: queryEmbedding, 
                p_owner_id: userId, 
                p_match_threshold: RAG_SIMILARITY_THRESHOLD, 
                p_match_count: MAX_CONTEXT_CHUNKS 
              })
              .in('resource_id', contextResourceIds);
              
            if (matchError) throw new Error(`Vector search failed: ${matchError.message}`);
            
            if (chunks && chunks.length > 0) { 
              contextText = chunks.map((chunk, i) => `Chunk ${i+1}:\n${chunk.chunk_text}`).join('\n\n---\n\n'); 
            } else { 
              contextText = "No relevant info found in selected documents."; 
            }
        } catch (ragError) { 
            console.error("RAG processing failed:", ragError); 
            contextText = "[[Error retrieving context]]"; 
        }
    } else { 
        console.log("No context resource IDs provided."); 
    }

    // --- Prepare Prompt & History for Gemini ---
    // Enhanced system prompts based on mode
    let systemPromptText = '';
    
    if (mode === 'tutor') {
      systemPromptText = `You are ChitChat, an expert AI tutor in teaching mode. 🎓

Your mission: TEACH the user about the topic they're learning, step by step.

Guidelines:
- Start by explaining the core concept clearly and simply
- Use analogies, real-world examples, and metaphors
- Break down complex ideas into bite-sized pieces
- Ask questions to check understanding (Socratic method)
- Encourage the learner and celebrate progress
- If they seem confused, rephrase and try a different approach
- Always end with: "Ready for the next step?" or a practice question

Tone: ${mode === 'tutor' ? 'Patient and encouraging' : 'casual'}

Context from resources:
"""${contextText || 'None provided.'}"""

Remember: You're not just answering questions—you're actively teaching!`;
    } else if (mode === 'exam') {
      systemPromptText = `You are ChitChat in FINAL BOSS mode! 👹

Your mission: TEST the user's mastery of the topic through challenging questions.

Guidelines:
- Start by asking a moderately difficult question about the core concepts
- If they answer correctly, increase the difficulty progressively
- If they struggle, provide hints but don't give away the answer
- Ask follow-up questions that require deep understanding, not just memorization
- Mix question types: multiple choice, true/false, scenario-based, and open-ended
- Keep track of their performance mentally (you can't save state, but be fair)
- After 5-7 questions, provide a "Boss Battle Summary" with:
  * What they mastered
  * Areas for improvement
  * A final rating (e.g., "Boss Defeated! 🏆" or "Almost there! Try again?")

Tone: Challenging but fair, with a gamified vibe

Context from resources:
"""${contextText || 'None provided.'}"""

Remember: This is a TEST. Be thorough, fair, and provide constructive feedback!`;
    } else {
      // Default mode (explain, casual, etc.)
      systemPromptText = `You are ChitChat, an expert and engaging AI assistant. 
Your goal is to HELP the user based on the current conversation context.

- If the conversation started with a "Seed Prompt" (where you proposed a topic), your job is to address that topic immediately
- Use analogies and real-world examples to make concepts clear
- Break complex topics into digestible pieces
- Always end with a "micro-action" or a thought-provoking question
- Keep your tone ${mode || 'casual'} and helpful

Context from user's resources:
"""${contextText || 'None provided.'}"""

Remember: Be proactive, clear, and make interactions enjoyable!`;
    }

    // Wrap systemInstruction in the correct Content object structure
    const systemInstructionContent = {
        role: "system",
        parts: [{ text: systemPromptText }]
    };

    const contents = [ ...geminiHistory ]; // History only for startChat
    const latestUserInput = { role: 'user', parts: [{ text: input }] }; // Latest input for sendMessageStream

    console.log(`Prepared ${contents.length} history parts + system instruction for Gemini.`);

    // --- Call Gemini API for Streaming Response ---
    let stream;
    try {
      console.log(`Initiating stream with Gemini model '${chatModelName}'...`);
      
      // Pass systemInstruction in the correct format
      const chatSession = chatModel.startChat({
        history: contents, // Pass existing history here
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 2048,
        },
        systemInstruction: systemInstructionContent, // Pass the structured object
      });
      
      // Send only the newest user message to continue the stream
      const result = await chatSession.sendMessageStream(latestUserInput.parts); // Pass only parts
      stream = result.stream;
      console.log(`Stream initiated successfully with Gemini.`);
    } catch (geminiError) {
      console.error(`Gemini API error during stream initiation:`, geminiError);
      // Try to log specific details if available
      if (geminiError.errorDetails) console.error("Gemini Error Details:", geminiError.errorDetails);
      throw new Error(`Gemini API Error: ${geminiError.message}`);
    }

    // --- Stream Response back to Client (SSE) ---
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    
    // Notify client of new session ID if created
    if (!sessionId && currentSessionId) { 
      res.write(`event: sessionCreated\ndata: ${JSON.stringify({ sessionId: currentSessionId })}\n\n`); 
    }
    
    let aiResponseContent = '';
    try {
      for await (const chunk of stream) {
        try {
          const chunkText = chunk.text();
          if (chunkText) {
            aiResponseContent += chunkText;
            res.write(`data: ${JSON.stringify({ content: chunkText })}\n\n`);
          }
        } catch (chunkError) {
          // Handle safety blocks in chunks
          if (chunkError.message?.includes('SAFETY')) {
            console.warn('Chunk blocked by safety filter');
            const safetyMessage = "I apologize, but I can't respond to that. Could you rephrase your question?";
            aiResponseContent = safetyMessage;
            res.write(`data: ${JSON.stringify({ content: safetyMessage })}\n\n`);
            break;
          }
          throw chunkError;
        }
      }
    } catch (streamError) {
      // Handle safety blocks at stream level
      if (streamError.message?.includes('SAFETY')) {
        console.warn('Response blocked by safety filter');
        const safetyMessage = "I apologize, but I can't respond to that. Could you rephrase your question?";
        aiResponseContent = safetyMessage;
        res.write(`data: ${JSON.stringify({ content: safetyMessage })}\n\n`);
      } else {
        throw streamError;
      }
    }
    res.end();
    console.log(`Gemini stream finished. Full response length: ${aiResponseContent.length}`);

    // --- Save Messages using Secure RPC Function ---
    // CRITICAL: We use the secure RPC function 'save_chat_message' to bypass RLS policies
    // and ensure the messages are actually written to the DB.
    try {
      console.log(`Saving messages to session ${currentSessionId}...`);
      
      // Save user message
      const { error: saveUserErr } = await supabaseAdmin.rpc('save_chat_message', {
        p_session_id: currentSessionId,
        p_sender: 'user',
        p_content: input
      });

      if (saveUserErr) {
        console.error("Failed to save user message:", saveUserErr);
        throw saveUserErr;
      }

      // Save AI response
      const { error: saveAiErr } = await supabaseAdmin.rpc('save_chat_message', {
        p_session_id: currentSessionId,
        p_sender: 'ai',
        p_content: aiResponseContent
      });

      if (saveAiErr) {
        console.error("Failed to save AI message:", saveAiErr);
        throw saveAiErr;
      }

      console.log(`✓ Messages saved successfully for session ${currentSessionId}`);
    } catch (saveError) {
      console.error("CRITICAL: Message save failed:", saveError);
      // Don't crash the request, but log prominently so we know memory is broken
      console.error("⚠️ AI MEMORY WILL NOT WORK - MESSAGES NOT SAVED ⚠️");
    }

  } catch (error) {
    // --- Top-Level Error Handling ---
    console.error(`CRITICAL ERROR in chat endpoint:`, error);
    if (!res.headersSent) { 
      res.status(500).json({ 
        error: 'Failed to process chat message', 
        details: error.message 
      }); 
    } else { 
      res.end(); 
    }
  }
};

// --- Get list of chat sessions for the user ---
const getChatSessions = async (req, res) => {
  try {
    const userId = req.user.id;

    // Fetch sessions with the most recent message preview
    const { data: sessions, error } = await supabaseAdmin
      .from('chat_sessions')
      .select(`
        id,
        mode,
        created_at,
        summary,
        chat_messages (
          content,
          created_at
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Format the data for the frontend
    const formattedSessions = sessions.map(session => {
      // Get the last message or the summary as the "preview"
      const lastMessage = session.chat_messages && session.chat_messages.length > 0 
        ? session.chat_messages[session.chat_messages.length - 1].content 
        : "New conversation";
      
      // Truncate for preview
      const preview = lastMessage.substring(0, 60) + (lastMessage.length > 60 ? "..." : "");

      return {
        id: session.id,
        mode: session.mode,
        date: session.created_at,
        preview: session.summary || preview, // Use AI summary if available, else last message
      };
    });

    res.status(200).json(formattedSessions);

  } catch (error) {
    console.error("Error fetching sessions:", error);
    res.status(500).json({ error: 'Failed to fetch chat history' });
  }
};

// --- Get all messages for a specific session ---
const getSessionMessages = async (req, res) => {
  try {
    const userId = req.user.id;
    const sessionId = req.params.sessionId;

    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required' });
    }

    // Verify the session belongs to the authenticated user
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('chat_sessions')
      .select('id, user_id')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      console.error("Session not found:", sessionError);
      return res.status(404).json({ error: 'Session not found' });
    }

    if (session.user_id !== userId) {
      console.error("Unauthorized access attempt to session:", sessionId);
      return res.status(403).json({ error: 'Unauthorized access to this session' });
    }

    // Fetch all messages for this session, ordered chronologically
    const { data: messages, error: messagesError } = await supabaseAdmin
      .from('chat_messages')
      .select('id, sender, content, created_at')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    if (messagesError) throw messagesError;

    // Format messages for frontend
    const formattedMessages = messages.map(msg => ({
      id: msg.id,
      role: msg.sender, // 'user' or 'ai'
      content: msg.content,
      timestamp: msg.created_at,
    }));

    res.status(200).json(formattedMessages);

  } catch (error) {
    console.error("Error fetching session messages:", error);
    res.status(500).json({ error: 'Failed to fetch session messages' });
  }
};

module.exports = { 
  postChatMessage,
  getChatSessions,
  getSessionMessages,
};