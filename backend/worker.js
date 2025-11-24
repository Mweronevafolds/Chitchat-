require('dotenv').config();
const { Worker } = require('bullmq');
const { createClient } = require('@supabase/supabase-js');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const pdf = require('pdf-parse');
const { resourceQueue } = require('./queue');

// --- Configuration ---
// Use the service key to bypass RLS during processing
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const embeddingModel = genAI.getGenerativeModel({ model: "embedding-001" });

const BUCKET_NAME = 'user_resources';

// --- Helpers ---
const chunkText = (text, chunkSize = 800) => {
  const chunks = [];
  for (let i = 0; i < text.length; i += chunkSize) {
    chunks.push(text.substring(i, i + chunkSize));
  }
  return chunks;
};

// --- Main Processor ---
const processResource = async (job) => {
  const { resourceId, path } = job.data;
  console.log(`[Worker] Processing resource: ${resourceId}`);

  try {
    // 1. Update status to 'processing'
    await supabase.from('resources').update({ status: 'processing' }).eq('id', resourceId);

    // 2. Download file from Supabase Storage
    const { data: fileBlob, error: downloadError } = await supabase.storage
      .from(BUCKET_NAME)
      .download(path);

    if (downloadError) throw new Error(`Download failed: ${downloadError.message}`);

    // 3. Extract Text
    let text = '';
    const fileBuffer = Buffer.from(await fileBlob.arrayBuffer());
    
    // Simple check for PDF based on path extension, can be more robust
    if (path.toLowerCase().endsWith('.pdf')) {
        const pdfData = await pdf(fileBuffer);
        text = pdfData.text;
    } else {
        // Fallback for text files
        text = fileBuffer.toString('utf-8');
    }

    // Clean text
    text = text.replace(/\s+/g, ' ').trim();
    if (!text) throw new Error("No text extracted from file.");

    console.log(`[Worker] Extracted ${text.length} characters.`);

    // 4. Chunk Text
    const textChunks = chunkText(text);

    // 5. Generate Embeddings with Gemini
    // Gemini batch embedding isn't always standard, so we loop for safety
    // (Parallelize this in production for speed)
    const chunksToInsert = [];
    
    for (const chunk of textChunks) {
        const result = await embeddingModel.embedContent(chunk);
        const embedding = result.embedding.values;
        
        chunksToInsert.push({
            resource_id: resourceId,
            chunk_text: chunk,
            embedding: embedding, // Gemini embedding-001 is 768 dims
        });
    }

    // 6. Store in Vector Database
    const { error: insertError } = await supabase
      .from('resource_chunks')
      .insert(chunksToInsert);

    if (insertError) throw insertError;

    // 7. Mark as Processed
    await supabase.from('resources').update({ status: 'processed' }).eq('id', resourceId);
    console.log(`[Worker] ✅ Successfully processed ${resourceId}`);

  } catch (error) {
    console.error(`[Worker] ❌ Failed resource ${resourceId}:`, error);
    await supabase.from('resources').update({ status: 'failed' }).eq('id', resourceId);
  }
};

// --- Start Worker ---
console.log('[Worker] Listening for jobs...');
const worker = new Worker('resource-processing', processResource, {
  connection: resourceQueue.opts.connection,
  concurrency: 2, // Process 2 files at once
});

worker.on('failed', (job, err) => {
  console.error(`[Worker] Job ${job.id} failed: ${err.message}`);
});
