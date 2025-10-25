require('dotenv').config();
const { Worker } = require('bullmq');
const { createClient } = require('@supabase/supabase-js');
const OpenAI = require('openai');
const pdf = require('pdf-parse');
const { resourceQueue } = require('./lib/queue');

// Initialize clients
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const BUCKET_NAME = 'user_resources';

// --- Text Processing Helpers ---
const chunkText = (text, chunkSize = 800) => {
  const chunks = [];
  for (let i = 0; i < text.length; i += chunkSize) {
    chunks.push(text.substring(i, i + chunkSize));
  }
  return chunks;
};

// --- Main Processing Function ---
const processResource = async (job) => {
  const { resourceId, path } = job.data;
  console.log(`Processing resourceId: ${resourceId}`);

  try {
    // 1. Download file from Supabase Storage
    const { data: fileBlob, error: downloadError } = await supabase.storage
      .from(BUCKET_NAME)
      .download(path);

    if (downloadError) throw downloadError;

    // 2. Extract Text (example for PDF)
    const fileBuffer = Buffer.from(await fileBlob.arrayBuffer());
    // TODO: Add logic to handle different file types (audio, images with OCR)
    const pdfData = await pdf(fileBuffer);
    const text = pdfData.text.replace(/\s+/g, ' ').trim(); // Normalize whitespace

    // 3. Chunk the text
    const textChunks = chunkText(text);

    // 4. Create Embeddings for each chunk
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: textChunks,
    });

    // 5. Upsert chunks and embeddings into Supabase Vector
    const chunksToInsert = embeddingResponse.data.map((embeddingObj, i) => ({
      resource_id: resourceId,
      chunk_text: textChunks[i],
      embedding: embeddingObj.embedding,
    }));
    
    const { error: upsertError } = await supabase
      .from('resource_chunks')
      .insert(chunksToInsert);
      
    if (upsertError) throw upsertError;
    
    // 6. Update resource status to 'processed'
    // await supabase.from('resources').update({ status: 'processed' }).eq('id', resourceId);

    console.log(`✅ Successfully processed and embedded resource ${resourceId}`);

  } catch (error) {
    console.error(`❌ Failed to process resource ${resourceId}:`, error);
    // await supabase.from('resources').update({ status: 'failed' }).eq('id', resourceId);
    throw error; // This will make BullMQ retry the job if configured
  }
};

// --- Start the Worker ---
console.log('Worker is listening for jobs...');
const worker = new Worker('resource-processing', processResource, {
  connection: resourceQueue.opts.connection,
  concurrency: 5, // Process up to 5 jobs at a time
  limiter: { // Don't overwhelm the OpenAI API
    max: 10,
    duration: 1000,
  }
});

worker.on('failed', (job, err) => {
  console.error(`Job ${job.id} failed with error ${err.message}`);
});
