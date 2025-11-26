# Supabase Storage Setup Guide

## Create Chat Media Bucket

Run these commands in your Supabase SQL Editor:

### 1. Create Storage Bucket
```sql
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) 
VALUES (
  'chat-media', 
  'chat-media', 
  false,  -- Private bucket
  52428800,  -- 50MB limit (increased for documents)
  ARRAY[
    'image/jpeg', 
    'image/png', 
    'image/jpg', 
    'image/webp', 
    'image/gif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'text/csv'
  ]
);
```

### 2. Enable Row Level Security
```sql
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
```

### 3. Create RLS Policies

**Upload Policy:**
```sql
CREATE POLICY "Users can upload chat media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'chat-media' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);
```

**View Policy:**
```sql
CREATE POLICY "Users can view their own chat media"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'chat-media' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);
```

**Delete Policy:**
```sql
CREATE POLICY "Users can delete their own chat media"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'chat-media' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);
```

### 4. Verify Setup
```sql
-- Check bucket exists
SELECT * FROM storage.buckets WHERE id = 'chat-media';

-- Check policies are active
SELECT * FROM pg_policies WHERE tablename = 'objects' AND policyname LIKE '%chat media%';
```

## Folder Structure

Media will be stored with this structure:
```
chat-media/
  ├── {user_id}/
  │   ├── {session_id}/
  │   │   ├── {timestamp}_{random}.jpg
  │   │   ├── {timestamp}_{random}.png
  │   │   └── ...
```

Example:
```
chat-media/
  └── 550e8400-e29b-41d4-a716-446655440000/
      └── 7c9e6679-7425-40de-944b-e07fc1f90ae7/
          ├── 1732579200000_abc123.jpg
          └── 1732579245000_def456.png
```

## Storage Limits

- **Free Tier:** 1GB storage
- **Pro Tier:** 100GB storage
- **File Size Limit:** 50MB per file (increased for documents)
- **Bandwidth:** 2GB/month (free), 200GB/month (pro)
- **Supported Types:** Images (JPEG, PNG, GIF, WebP), Documents (PDF, Word, Excel, PowerPoint, Text, CSV)

## Security Notes

1. **Private Bucket:** Files are NOT publicly accessible
2. **User Isolation:** Users can only access their own media via RLS
3. **JWT Required:** All requests must include valid Supabase auth token
4. **MIME Type Validation:** Only allowed image types can be uploaded
5. **Folder-based Access:** User ID in folder path ensures isolation

## Testing

### Test Upload (from backend):
```javascript
const { data, error } = await supabaseAdmin.storage
  .from('chat-media')
  .upload(`${userId}/${sessionId}/${Date.now()}_test.jpg`, buffer, {
    contentType: 'image/jpeg',
    upsert: false
  });
```

### Test Get URL:
```javascript
const { data } = supabaseAdmin.storage
  .from('chat-media')
  .getPublicUrl(`${userId}/${sessionId}/test.jpg`);
// Note: Public URL requires signed token for private buckets
```

### Test Signed URL (recommended):
```javascript
const { data, error } = await supabaseAdmin.storage
  .from('chat-media')
  .createSignedUrl(`${userId}/${sessionId}/test.jpg`, 3600); // 1 hour expiry
```

## Cleanup Strategy

### Automatic Cleanup (90-day retention):
```sql
-- Run monthly via cron or manually
SELECT cleanup_old_chat_media();
```

### Manual Cleanup:
```sql
-- Delete all orphaned media (not referenced in chat_messages)
DELETE FROM storage.objects
WHERE bucket_id = 'chat-media'
  AND name NOT IN (
    SELECT SUBSTRING(media_url FROM '.*/(.*)$')
    FROM chat_messages
    WHERE media_url IS NOT NULL
  );
```

## Monitoring

### Check storage usage:
```sql
SELECT 
  bucket_id,
  COUNT(*) as file_count,
  SUM(metadata->>'size')::bigint / 1024 / 1024 as size_mb
FROM storage.objects
WHERE bucket_id = 'chat-media'
GROUP BY bucket_id;
```

### Top users by storage:
```sql
SELECT 
  (storage.foldername(name))[1] as user_id,
  COUNT(*) as file_count,
  SUM((metadata->>'size')::bigint) / 1024 / 1024 as size_mb
FROM storage.objects
WHERE bucket_id = 'chat-media'
GROUP BY user_id
ORDER BY size_mb DESC
LIMIT 10;
```

## Troubleshooting

**Issue:** "Policy violation" on upload
- **Solution:** Verify user is authenticated and folder path matches user ID

**Issue:** "File too large"
- **Solution:** Check file_size_limit in buckets table (default 20MB)

**Issue:** "MIME type not allowed"
- **Solution:** Update allowed_mime_types array in buckets table

**Issue:** Can't access uploaded files
- **Solution:** Use signed URLs for private buckets instead of public URLs

---
**Next Step:** Run the SQL commands above, then proceed to implement backend upload logic.
