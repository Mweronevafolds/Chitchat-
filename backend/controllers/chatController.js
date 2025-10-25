const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require('@google/generative-ai');
const { createClient } = require('@supabase/supabase-js');

// --- Initialization ---
// Initialize Google Generative AI Client using the API key from your .env file
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Define the models you'll use (ensure these match your needs and API key access)
const embeddingModelName = "embedding-001"; // Or "text-embedding-004" if available/preferred
const chatModelName = "gemini-1.5-flash-latest"; // Fast and capable model

// Get model instances from the client
const embeddingModel = genAI.getGenerativeModel({ model: embeddingModelName });
const chatModel = genAI.getGenerativeModel({
  model: chatModelName,
  // --- Safety Settings ---
  // Configure content safety thresholds (adjust as needed, especially for younger users)
  safetySettings: [
    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  ],
});

// Initialize Supabase Admin client (using the service key from .env)
const supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// --- Constants ---
const MAX_HISTORY = 10; // Max number of user/model turns to include in history
const MAX_CONTEXT_CHUNKS = 3; // Max number of RAG chunks to retrieve
const RAG_SIMILARITY_THRESHOLD = 0.75; // Threshold for vector search (adjust based on testing)
const EMBEDDING_DIMENSIONS = 768; // Dimension for embedding-001 (adjust if using a different model)

// --- Controller Function ---
const postChatMessage = async (req, res) => {
  let currentSessionId = null; // To store the session ID for logging/saving
  try {
    // --- Request Data Extraction ---
    let { sessionId, input, mode, contextResourceIds } = req.body;
    const userId = req.user?.id; // User ID from auth middleware

    // --- Input Validation ---
    if (!userId) return res.status(401).json({ error: 'User not authenticated.' });
    if (!input || typeof input !== 'string' || input.trim() === '') {
      return res.status(400).json({ error: 'Input text is required.' });
    }
    console.log(`--- Gemini RAG Request --- User: ${userId}, Session: ${sessionId}, Input: "${input.substring(0, 50)}...", Resources: [${contextResourceIds?.join(',') || 'None'}]`);

    currentSessionId = sessionId;

    // --- 1. Ensure Session Exists (using RPC function in DB) ---
    if (!currentSessionId) {
      console.log(`No sessionId, calling create_chat_session RPC for User: ${userId}...`);
      const { data: newSessionId, error: rpcError } = await supabaseAdmin.rpc(
        'create_chat_session', { p_user_id: userId, p_mode: mode || 'explain' }
      );
      if (rpcError) throw new Error(`Failed to create chat session via RPC: ${rpcError.message}`);
      if (!newSessionId) throw new Error(`RPC create_chat_session returned null ID`);
      currentSessionId = newSessionId;
      console.log(`Successfully created new session via RPC: ${currentSessionId}`);
    } else {
      console.log(`Continuing session: ${currentSessionId}`);
    }

    // --- 2. Fetch Recent Message History ---
    console.log(`Fetching history (limit ${MAX_HISTORY}) for session: ${currentSessionId}`);
    const { data: history, error: historyError } = await supabaseAdmin
      .from('chat_messages').select('sender, content').eq('session_id', currentSessionId)
      .order('created_at', { ascending: false }).limit(MAX_HISTORY);
    if (historyError) throw new Error(`Failed to fetch chat history: ${historyError.message}`);
    console.log(`Fetched ${history?.length || 0} messages from history.`);

    // Format for Gemini API (alternating 'user' and 'model' roles)
    const geminiHistory = history ? history.reverse().map(msg => ({
      role: msg.sender === 'user' ? 'user' : 'model', // Gemini uses 'model' for the AI
      parts: [{ text: msg.content }]
    })) : [];

    // --- 3. RAG: Fetch Relevant Context Chunks ---
    let contextText = '';
    if (contextResourceIds && Array.isArray(contextResourceIds) && contextResourceIds.length > 0) {
      console.log(`RAG Step: Generating Gemini embedding for input...`);
      try {
        // Generate embedding for the user's input
        const embeddingResult = await embeddingModel.embedContent(input);
        const queryEmbedding = embeddingResult.embedding.values;

        // Validate embedding dimensions (optional but good practice)
        if (queryEmbedding.length !== EMBEDDING_DIMENSIONS) {
            throw new Error(`Generated embedding dimension (${queryEmbedding.length}) does not match expected dimension (${EMBEDDING_DIMENSIONS}).`);
        }

        console.log(`RAG Step: Searching relevant chunks using match_resource_chunks (dim: ${EMBEDDING_DIMENSIONS})...`);
        // Call the database function to find relevant chunks
        const { data: chunks, error: matchError } = await supabaseAdmin.rpc(
          'match_resource_chunks', {
            p_query_embedding: queryEmbedding,
            p_owner_id: userId,
            p_match_threshold: RAG_SIMILARITY_THRESHOLD,
            p_match_count: MAX_CONTEXT_CHUNKS
          }
        )
        // Filter the results to only include chunks from the resources the user selected
        .in('resource_id', contextResourceIds);

        if (matchError) throw new Error(`Vector search failed: ${matchError.message}`);

        if (chunks && chunks.length > 0) {
          // Format the context clearly for the AI
          contextText = chunks.map((chunk, i) => `Chunk ${i+1} (from resource ${chunk.resource_id.substring(0,4)}):\n${chunk.chunk_text}`).join('\n\n---\n\n');
          console.log(`RAG Step: Found ${chunks.length} relevant chunks.`);
        } else {
          console.log(`RAG Step: No relevant chunks found above threshold for specified resources.`);
          contextText = "No relevant information found in the selected documents for this query.";
        }
      } catch (ragError) {
          console.error("RAG processing failed:", ragError);
          contextText = "[[An error occurred while retrieving context from your documents.]]";
      }
    } else {
      console.log("No context resource IDs provided, skipping RAG step.");
    }

    // --- 4. Prepare Prompt & History for Gemini ---
    const systemInstruction = `You are ChitChat, a helpful and curious learning companion. Follow these instructions precisely:
1.  Analyze the "Provided Context" below. If it's relevant to the user's latest message, use it to form your answer. Prioritize information from the context.
2.  If you use context, briefly mention it (e.g., "Based on Chunk 1 from your document...").
3.  If the context is irrelevant or doesn't contain the answer, clearly state that (e.g., "The provided documents don't seem to cover that.") and answer using your general knowledge only if appropriate for a learning companion. Do NOT invent information.
4.  Maintain a conversational tone consistent with the user's preference (assume '${mode || 'casual'}' for now). Keep answers concise.
5.  After your main answer, suggest one relevant micro-action (like explaining further, quizzing, providing an example, or summarizing).
6.  Adapt language simplicity for the user's age group (assume 'adult' for now, add logic later if needed). Adhere strictly to safety guidelines.

Provided Context:
"""
${contextText || 'None provided.'}
"""
`;
    // Gemini uses `contents` for the history + current input
    const contents = [
      ...geminiHistory,
      { role: 'user', parts: [{ text: input }] }
    ];

    console.log(`Prepared ${contents.length} content parts + system instruction for Gemini.`);

    // --- 5. Call Gemini API for Streaming Response ---
    let stream;
    try {
      console.log(`Initiating stream with Gemini model '${chatModelName}'...`);
      // Start the chat session with history and instructions
      const chatSession = chatModel.startChat({
        history: geminiHistory, // Provide history separately for multi-turn context
        // System instructions can often be better here than in the first message
         generationConfig: {
            // Optional: control creativity, length etc.
            // maxOutputTokens: 200,
            // temperature: 0.7,
         },
         systemInstruction: systemInstruction,
      });
      // Send the latest message to continue the chat and get a stream
      const result = await chatSession.sendMessageStream(input); // Send only the latest input
      stream = result.stream;
      console.log(`Stream initiated successfully with Gemini.`);
    } catch (geminiError) {
      console.error(`Gemini API error during stream initiation:`, geminiError);
      throw new Error(`Gemini API Error: ${geminiError.message}`);
    }

    // --- 6. Stream Response back to Client (SSE) ---
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    if (!sessionId && currentSessionId) {
       console.log(`Sending sessionCreated event: ${currentSessionId}`);
       res.write(`event: sessionCreated\ndata: ${JSON.stringify({ sessionId: currentSessionId })}\n\n`);
    }

    let aiResponseContent = '';
    // Iterate through the stream from Gemini
    for await (const chunk of stream) {
      try {
        // Gemini stream chunks have a text() method
        const contentPiece = chunk.text();
        if (contentPiece) {
            aiResponseContent += contentPiece;
            // Send chunk to the client via SSE
            res.write(`data: ${JSON.stringify({ content: contentPiece })}\n\n`);
        }
      } catch (streamError) {
          console.error("Gemini stream processing error:", streamError);
          const errorContent = `[[Error: ${streamError.message}]]`;
          aiResponseContent += errorContent;
          res.write(`data: ${JSON.stringify({ content: errorContent })}\n\n`);
      }
    }
    res.end(); // Close the connection when the stream is finished
    console.log(`Gemini stream finished. Full response length: ${aiResponseContent.length}`);

    // --- 7. Save User and AI Messages to DB (Asynchronously) ---
    console.log(`Saving messages async for session: ${currentSessionId}`);
    Promise.all([
        supabaseAdmin.from('chat_messages').insert({ session_id: currentSessionId, sender: 'user', content: input }),
        supabaseAdmin.from('chat_messages').insert({ session_id: currentSessionId, sender: 'ai', content: aiResponseContent })
    ]).then(() => {
        console.log(`Async save complete for session: ${currentSessionId}`);
    }).catch(dbError => {
        console.error(`ASYNC SAVE FAILED for session ${currentSessionId}:`, dbError);
    });

  } catch (error) {
    // --- Top-Level Error Handling ---
    console.error(`CRITICAL ERROR in chat endpoint for session ${currentSessionId || 'unknown'}:`, error);
    if (!res.headersSent) {
      // Send JSON error if possible
      res.status(500).json({ error: 'Failed to process chat message', details: error.message });
    } else {
      // Otherwise, just end the broken stream
      console.error(`Headers already sent for session ${currentSessionId || 'unknown'}, ending stream due to error.`);
      res.end();
    }
  }
};

module.exports = {
  postChatMessage,
};