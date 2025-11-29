// backend/controllers/chatController.js
const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require('@google/generative-ai');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const { Buffer } = require('buffer');
const { checkUsageLimitHelper } = require('./monetizationController'); // Import usage checker

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

// Helper function to upload image to Supabase Storage
async function uploadImageToStorage(mediaUri, userId, sessionId) {
  try {
    let imageBuffer;
    let mimeType;
    let fileExtension;

    // Process different media URI formats
    if (mediaUri.startsWith('data:')) {
      // Base64 data URI (supports images and documents)
      const base64Data = mediaUri.split(',')[1];
      const mimeMatch = mediaUri.match(/data:(.*?);/);
      mimeType = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
      imageBuffer = Buffer.from(base64Data, 'base64');
      
      // Determine extension from MIME type
      if (mimeType.includes('pdf')) fileExtension = 'pdf';
      else if (mimeType.includes('word')) fileExtension = 'docx';
      else if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) fileExtension = 'xlsx';
      else if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) fileExtension = 'pptx';
      else if (mimeType.includes('text/plain')) fileExtension = 'txt';
      else if (mimeType.includes('text/csv')) fileExtension = 'csv';
      else fileExtension = mimeType.split('/')[1] || 'bin';
    } else if (mediaUri.startsWith('file://')) {
      // Local file URI
      const filePath = mediaUri.replace('file://', '');
      imageBuffer = fs.readFileSync(filePath);
      const ext = path.extname(filePath).toLowerCase();
      fileExtension = ext.substring(1);
      
      // Determine MIME type from extension
      const mimeMap = {
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'webp': 'image/webp',
        'gif': 'image/gif',
        'pdf': 'application/pdf',
        'doc': 'application/msword',
        'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'xls': 'application/vnd.ms-excel',
        'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'ppt': 'application/vnd.ms-powerpoint',
        'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'txt': 'text/plain',
        'csv': 'text/csv'
      };
      mimeType = mimeMap[fileExtension] || 'application/octet-stream';
    } else {
      throw new Error('Unsupported media URI format');
    }

    // Generate unique filename
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(7);
    const filename = `${timestamp}_${randomStr}.${fileExtension}`;
    const storagePath = `${userId}/${sessionId}/${filename}`;

    // Upload to Supabase Storage
    const { data, error } = await supabaseAdmin.storage
      .from('chat-media')
      .upload(storagePath, imageBuffer, {
        contentType: mimeType,
        upsert: false
      });

    if (error) {
      console.error('Supabase storage upload error:', error);
      throw new Error(`Storage upload failed: ${error.message}`);
    }

    // Get public URL (for private buckets, we'll use signed URLs later)
    const { data: urlData } = supabaseAdmin.storage
      .from('chat-media')
      .getPublicUrl(storagePath);

    console.log(`✓ File uploaded to storage: ${storagePath}`);
    
    return {
      url: urlData.publicUrl,
      path: storagePath,
      mimeType: mimeType,
      size: imageBuffer.length,
      filename: filename
    };
  } catch (error) {
    console.error('Error uploading file to storage:', error);
    throw error;
  }
}

const postChatMessage = async (req, res) => {
  let currentSessionId = null;
  try {
    let { sessionId, input, mode, contextResourceIds, seedPrompt, mediaUri } = req.body;
    const userId = req.user?.id;

    // --- 0. CHECK USAGE LIMIT ---
    const canChat = await checkUsageLimitHelper(userId, 'messages_sent');
    if (!canChat) {
      return res.status(403).json({ 
        error: 'Daily message limit reached.',
        upgrade_required: true, // Frontend uses this to show upgrade modal
        message: 'You\'ve reached your daily message limit. Upgrade to Plus for unlimited messages!'
      });
    }

    // --- Input Validation & Session Creation ---
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

    // --- Upload Media to Storage if provided ---
    let uploadedMedia = null;
    if (mediaUri) {
      // Check if mediaUri is already a Supabase Storage URL (pre-uploaded via /upload endpoint)
      const isSupabaseUrl = mediaUri.includes('supabase.co/storage/v1/object/public/');
      
      if (isSupabaseUrl) {
        // Already uploaded, extract path and use directly
        console.log(`✓ Using pre-uploaded media: ${mediaUri}`);
        uploadedMedia = {
          path: mediaUri.split('chat-media/')[1] || 'uploaded',
          publicUrl: mediaUri,
          mimeType: req.body.mediaType || 'application/octet-stream'
        };
      } else {
        // Need to upload (legacy base64 or file:// URIs)
        console.log(`Processing media upload for session ${currentSessionId}...`);
        try {
          uploadedMedia = await uploadImageToStorage(mediaUri, userId, currentSessionId);
          console.log(`✓ Media uploaded successfully: ${uploadedMedia.path}`);
        } catch (uploadError) {
          console.error('Failed to upload media:', uploadError);
          // Continue without media rather than failing the entire request
          uploadedMedia = null;
        }
      }
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
    
    // Get user's AI personality preference (if set)
    let userPersonality = 'balanced';
    try {
      const { data: profileData } = await supabaseAdmin
        .from('profiles')
        .select('ai_personality')
        .eq('id', userId)
        .single();
      if (profileData?.ai_personality) {
        userPersonality = profileData.ai_personality;
      }
    } catch (e) {
      console.log('Could not fetch user personality, using default');
    }
    
    // Personality-based tone adjustments
    const toneGuide = {
      'friendly': 'warm, encouraging, uses emojis occasionally, celebrates small wins',
      'professional': 'clear, concise, business-like, focused on efficiency',
      'playful': 'fun, uses humor, gamifies explanations, high energy',
      'balanced': 'adaptive, professional yet approachable, naturally conversational'
    };
    const userTone = toneGuide[userPersonality] || toneGuide['balanced'];
    
    if (mode === 'tutor') {
      systemPromptText = `You are ChitChat, a **Super-Tutor AI** — a patient, Socratic teacher who guides students to discover answers themselves. 🎓

## YOUR CORE PHILOSOPHY:
1. **Never dump information.** Instead, ask guiding questions that lead to insight.
2. **Use the Socratic Method:** Ask "Why do you think that is?" or "What would happen if...?"
3. **Visualize concepts** using ASCII art diagrams when explaining technical, scientific, or abstract ideas.
4. **Adapt your tone:** ${userTone}

## ASCII DIAGRAM GUIDELINES:
When explaining systems, processes, or relationships, draw ASCII diagrams inside code blocks:
\`\`\`
+---------------+       +---------------+
|   Frontend    | <---> |   Backend     |
|   (React)     |  API  |   (Express)   |
+---------------+       +---------------+
                             |
                             v
                      +-------------+
                      |  Database   |
                      |  (Supabase) |
                      +-------------+
\`\`\`

## TEACHING FLOW:
1. **Hook:** Start with an intriguing question or surprising fact
2. **Explore:** Guide with questions, don't lecture
3. **Visualize:** Use ASCII diagrams for complex concepts
4. **Check:** Ask the student to explain back in their own words
5. **Connect:** Link to real-world applications
6. **Challenge:** End with a thought-provoking question or mini-exercise

## EXAMPLE INTERACTION:
User: "How does a linked list work?"
You: "Great question! Before I explain, let me ask: if you had a chain where each link only knew about the *next* link, how would you find the 5th link? 🤔"
(Then draw a diagram, guide them through, etc.)

Context from resources:
"""${contextText || 'None provided.'}"""

Remember: **You are a TUTOR, not a Wikipedia.** Guide, don't dump!`;
    } else if (mode === 'exam') {
      systemPromptText = `You are ChitChat in **FINAL BOSS MODE**! 👹🎮

You are the ultimate test of knowledge — a challenging but fair examiner who respects the student's effort.

## BATTLE RULES:
1. **Progressive Difficulty:** Start at Level 1 (fundamentals), increase based on performance
2. **No Freebies:** Don't give away answers. Provide hints only after genuine struggle
3. **Variety:** Mix question types:
   - 🎯 Multiple Choice
   - ✅ True/False with explanation
   - 🧩 Scenario-based problems
   - 💬 Open-ended conceptual questions
   - 🔧 Debug/fix-this-code challenges (for programming topics)

## VISUAL CHALLENGES:
For technical topics, include ASCII diagrams in your questions:
\`\`\`
  ???
   |
[A] --> [B] --> [C]
         |
        ???

Q: What goes in the ??? boxes to complete this data flow?
\`\`\`

## SCORING (Track mentally):
- Each correct answer: +1 point
- Partial credit: +0.5 points
- Wrong but good reasoning: Acknowledge it!

## AFTER 5-7 QUESTIONS, GIVE A BOSS BATTLE SUMMARY:
\`\`\`
╔═══════════════════════════════════════╗
║       🏆 BOSS BATTLE RESULTS 🏆       ║
╠═══════════════════════════════════════╣
║  Score: X/Y                           ║
║  Mastered: [topic1], [topic2]         ║
║  Needs Work: [topic3]                 ║
║  Rating: [Boss Defeated! / Try Again] ║
╚═══════════════════════════════════════╝
\`\`\`

Context from resources:
"""${contextText || 'None provided.'}"""

Remember: Be tough but FAIR. Celebrate effort, challenge complacency!`;
    } else {
      // Default mode (explain, casual, etc.)
      systemPromptText = `You are ChitChat, an expert AI assistant with multimodal capabilities and a talent for visualization. 🧠✨

Your goal is to HELP the user understand and learn effectively.

## YOUR SUPERPOWERS:
1. **Visual Explanations:** Use ASCII diagrams to illustrate concepts
2. **Adaptive Teaching:** Adjust complexity based on the user's level
3. **Multimodal Analysis:** Analyze images, documents, code, and more
4. **Socratic Guidance:** Ask questions that spark insight

## ASCII DIAGRAM EXAMPLES:
For architecture/systems:
\`\`\`
┌─────────────┐     ┌─────────────┐
│   Client    │────▶│   Server    │
└─────────────┘     └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │  Database   │
                    └─────────────┘
\`\`\`

For trees/hierarchies:
\`\`\`
       [Root]
       /    \\
    [A]      [B]
    / \\      / \\
  [1] [2]  [3] [4]
\`\`\`

For flowcharts:
\`\`\`
  Start
    │
    ▼
┌───────┐
│ Check │──No──▶ Handle Error
└───┬───┘
    │Yes
    ▼
  Process
    │
    ▼
   End
\`\`\`

## WHEN USERS SHARE MEDIA:
- **Images:** Analyze carefully, describe what you see, answer questions
- **Documents:** Summarize key points, extract data, help with homework
- **Code:** Debug, explain, suggest improvements
- **Diagrams:** Explain the visualization, connect to their question

## CONVERSATION STYLE:
- Use analogies and real-world examples
- Break complex topics into digestible pieces
- End with a thought-provoking question or next step
- Tone: ${userTone}

Context from user's resources:
"""${contextText || 'None provided.'}"""

Remember: Be proactive, visual, and make learning enjoyable!`;
    }

    // Wrap systemInstruction in the correct Content object structure
    const systemInstructionContent = {
        role: "system",
        parts: [{ text: systemPromptText }]
    };

    const contents = [ ...geminiHistory ]; // History only for startChat
    
    // Prepare latest user input - with or without image
    let latestUserInput;
    if (uploadedMedia || mediaUri) {
      console.log(`User message includes media${uploadedMedia ? ' (from storage)' : ''}`);
      
      // Handle media from various sources
      const imageParts = [];
      
      if (mediaUri.startsWith('data:')) {
        // Base64 data (image or document)
        const base64Data = mediaUri.split(',')[1];
        const mimeType = mediaUri.match(/data:(.*?);/)?.[1] || 'image/jpeg';
        imageParts.push({
          inlineData: {
            mimeType: mimeType,
            data: base64Data
          }
        });
      } else if (mediaUri.startsWith('http://') || mediaUri.startsWith('https://')) {
        // URL (Supabase Storage or other)
        // Use fileData for images, or inlineData for documents if needed
        const fileUrl = uploadedMedia ? uploadedMedia.publicUrl : mediaUri;
        console.log(`Using file URL for Gemini: ${fileUrl}`);
        imageParts.push({
          fileData: {
            fileUri: fileUrl,
            mimeType: uploadedMedia?.mimeType || req.body.mediaType || 'image/jpeg'
          }
        });
      } else {
        // Fallback: treat as URL
        console.warn(`Unknown media URI format: ${mediaUri.substring(0, 50)}...`);
        imageParts.push({
          fileData: {
            fileUri: mediaUri
          }
        });
      }
      
      // Add text after image
      imageParts.push({ text: input });
      
      latestUserInput = { 
        role: 'user', 
        parts: imageParts
      };
    } else {
      // Text-only message
      latestUserInput = { role: 'user', parts: [{ text: input }] };
    }

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
      
      // Save user message with optional media
      const userMessageParams = {
        p_session_id: currentSessionId,
        p_sender: 'user',
        p_content: input
      };
      
      // Add media fields if image was uploaded
      if (uploadedMedia) {
        userMessageParams.p_media_url = uploadedMedia.url;
        userMessageParams.p_media_type = uploadedMedia.mimeType;
        userMessageParams.p_media_size = uploadedMedia.size;
      }
      
      const { error: saveUserErr } = await supabaseAdmin.rpc('save_chat_message', userMessageParams);

      if (saveUserErr) {
        console.error("Failed to save user message:", saveUserErr);
        throw saveUserErr;
      }

      // Save AI response (no media)
      const { error: saveAiErr } = await supabaseAdmin.rpc('save_chat_message', {
        p_session_id: currentSessionId,
        p_sender: 'ai',
        p_content: aiResponseContent
      });

      if (saveAiErr) {
        console.error("Failed to save AI message:", saveAiErr);
        throw saveAiErr;
      }

      console.log(`✓ Messages saved successfully for session ${currentSessionId}${uploadedMedia ? ' (with media)' : ''}`);
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
      .select('id, sender, content, created_at, media_url, media_type, media_size')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    if (messagesError) throw messagesError;

    // Format messages for frontend
    const formattedMessages = messages.map(msg => ({
      id: msg.id,
      role: msg.sender, // 'user' or 'ai'
      content: msg.content,
      timestamp: msg.created_at,
      media_url: msg.media_url,
      media_type: msg.media_type,
      media_size: msg.media_size,
    }));

    res.status(200).json(formattedMessages);

  } catch (error) {
    console.error("Error fetching session messages:", error);
    res.status(500).json({ error: 'Failed to fetch session messages' });
  }
};

// Upload file endpoint for multipart/form-data
const uploadFile = async (req, res) => {
  try {
    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const userId = req.user.id;
    const sessionId = req.body.sessionId;

    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required' });
    }

    const file = req.file;
    const mimeType = file.mimetype;
    const fileSize = file.size;
    const originalName = file.originalname;

    // Determine file extension from MIME type or original filename
    let fileExtension = path.extname(originalName).toLowerCase().slice(1) || 'bin';
    
    // Map MIME types to extensions if needed
    if (!fileExtension || fileExtension === 'bin') {
      if (mimeType.includes('pdf')) fileExtension = 'pdf';
      else if (mimeType.includes('word')) fileExtension = 'docx';
      else if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) fileExtension = 'xlsx';
      else if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) fileExtension = 'pptx';
      else if (mimeType.includes('text/plain')) fileExtension = 'txt';
      else if (mimeType.includes('text/csv')) fileExtension = 'csv';
      else if (mimeType.includes('jpeg')) fileExtension = 'jpg';
      else if (mimeType.includes('png')) fileExtension = 'png';
      else if (mimeType.includes('gif')) fileExtension = 'gif';
      else if (mimeType.includes('webp')) fileExtension = 'webp';
    }

    // Generate unique filename
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const fileName = `${userId}_${sessionId}_${timestamp}_${randomString}.${fileExtension}`;
    const filePath = `chat-media/${fileName}`;

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('chat-media')
      .upload(filePath, file.buffer, {
        contentType: mimeType,
        upsert: false
      });

    if (error) {
      console.error('Supabase storage upload error:', error);
      return res.status(500).json({ error: 'Failed to upload file to storage' });
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('chat-media')
      .getPublicUrl(filePath);

    // Return file information
    res.status(200).json({
      url: publicUrl,
      mimeType: mimeType,
      size: fileSize,
      filename: originalName
    });

  } catch (error) {
    console.error('Error in uploadFile:', error);
    res.status(500).json({ error: 'Failed to upload file' });
  }
};

module.exports = { 
  postChatMessage,
  getChatSessions,
  getSessionMessages,
  uploadFile,
};