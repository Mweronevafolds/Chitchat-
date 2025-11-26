# 🚀 Media Sharing Deployment Checklist

## Pre-Deployment Verification

### ✅ Code Changes
- [x] Backend: `chatController.js` updated with upload logic
- [x] Backend: Migrations created for database schema
- [x] Frontend: `ChatBubble.tsx` updated with image display
- [x] Frontend: `Composer.tsx` updated with media picker & progress
- [x] Frontend: `session.tsx` updated with media handling
- [x] All TypeScript errors resolved
- [x] No compilation errors

### ✅ Dependencies
- [x] `expo-image-picker` installed
- [x] `expo-document-picker` installed
- [x] No new backend dependencies needed

---

## Deployment Steps

### Step 1: Database Migration 🗃️

**Run in Supabase SQL Editor:**

```sql
-- 1. Add media columns to chat_messages
ALTER TABLE chat_messages
ADD COLUMN IF NOT EXISTS media_url TEXT,
ADD COLUMN IF NOT EXISTS media_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS media_size BIGINT;

-- 2. Add index for media queries
CREATE INDEX IF NOT EXISTS idx_chat_messages_media_url 
ON chat_messages(media_url) 
WHERE media_url IS NOT NULL;

-- 3. Update save_chat_message function (see update_save_chat_message_function.sql)
-- Copy and paste the entire function from the migration file
```

**Verify:**
```sql
-- Check columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'chat_messages' 
AND column_name IN ('media_url', 'media_type', 'media_size');

-- Expected: 3 rows returned
```

---

### Step 2: Supabase Storage Setup ☁️

**2.1. Create Storage Bucket**

Navigate to: Supabase Dashboard → Storage → Create Bucket

OR run in SQL Editor:
```sql
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) 
VALUES (
  'chat-media', 
  'chat-media', 
  false,
  20971520,  -- 20MB
  ARRAY['image/jpeg', 'image/png', 'image/jpg', 'image/webp', 'image/gif']
);
```

**2.2. Enable RLS**
```sql
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
```

**2.3. Create RLS Policies**

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

**Verify:**
```sql
-- Check bucket exists
SELECT * FROM storage.buckets WHERE id = 'chat-media';

-- Check policies are active
SELECT * FROM pg_policies WHERE tablename = 'objects' AND policyname LIKE '%chat media%';
```

---

### Step 3: Backend Deployment 🔧

**3.1. Verify Environment Variables**
```bash
cd backend
cat .env  # Check GEMINI_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_KEY
```

**3.2. Restart Backend Server**
```bash
# Stop current server (Ctrl+C if running)
npm start
```

**3.3. Test Backend**
```bash
# Test health endpoint
curl http://localhost:3000/api/v1/debug/health

# Expected: {"status":"ok",...}
```

---

### Step 4: Frontend Deployment 📱

**4.1. Rebuild Native Code (for permissions)**
```bash
cd chitchat-app
npx expo prebuild --clean
```

**4.2. Update app.json (if not already done)**
```json
{
  "expo": {
    "plugins": [
      [
        "expo-image-picker",
        {
          "photosPermission": "Allow ChitChat to access your photos for sharing with AI tutor",
          "cameraPermission": "Allow ChitChat to use your camera for capturing study materials"
        }
      ]
    ]
  }
}
```

**4.3. Start Development Server**
```bash
npx expo start
```

**4.4. Test on Device/Emulator**
- Scan QR code with Expo Go (or use emulator)
- Grant camera and photo permissions when prompted
- Test taking photo
- Test selecting from library
- Verify upload progress indicator
- Check image displays in chat

---

### Step 5: Functional Testing 🧪

**Test Scenario 1: Take Photo**
1. Open chat session
2. Tap paperclip icon
3. Select "Take Photo"
4. Grant camera permission
5. Take photo
6. Add caption: "What do you see in this image?"
7. Tap send
8. **Verify:**
   - [ ] Upload progress indicator shows
   - [ ] Image thumbnail displays in chat
   - [ ] AI responds with image analysis
   - [ ] Tap thumbnail opens fullscreen modal

**Test Scenario 2: Select from Library**
1. Tap paperclip icon
2. Select "Choose from Library"
3. Grant photos permission
4. Select an image
5. Add caption: "Explain this diagram"
6. Tap send
7. **Verify:**
   - [ ] Upload progress indicator shows
   - [ ] Image thumbnail displays in chat
   - [ ] AI provides explanation
   - [ ] Tap thumbnail opens fullscreen modal

**Test Scenario 3: Text Only (Regression Test)**
1. Type message without image
2. Tap send
3. **Verify:**
   - [ ] No upload indicator (since no image)
   - [ ] AI responds normally
   - [ ] No errors in console

**Test Scenario 4: Persistence**
1. Send message with image
2. Close chat session
3. Reopen chat session
4. **Verify:**
   - [ ] Previous image still displays
   - [ ] Tap still opens fullscreen modal
   - [ ] No broken image placeholders

---

### Step 6: Database Verification 🔍

**Check uploaded media in Supabase:**

```sql
-- View messages with media
SELECT 
  id, 
  sender, 
  content, 
  media_url, 
  media_type, 
  media_size,
  created_at
FROM chat_messages
WHERE media_url IS NOT NULL
ORDER BY created_at DESC
LIMIT 10;
```

**Check storage objects:**

Navigate to: Supabase Dashboard → Storage → chat-media

**Verify folder structure:**
```
chat-media/
  └── {user_id}/
      └── {session_id}/
          └── {timestamp}_{random}.jpg
```

---

### Step 7: Error Monitoring 📊

**Backend Logs:**
```bash
# Watch for errors
tail -f backend/logs/error.log  # If you have logging enabled

# Or monitor console output
npm start  # Keep running and watch for errors
```

**Common Issues & Solutions:**

| Error | Solution |
|-------|----------|
| "Permission denied" | Check RLS policies, verify user is authenticated |
| "Bucket not found" | Create chat-media bucket in Supabase |
| "File too large" | Check file_size_limit in bucket (should be 20MB) |
| "MIME type not allowed" | Update allowed_mime_types in bucket |
| "Failed to upload media" | Check backend logs, verify Supabase credentials |
| Image not displaying | Check media_url is valid, test URL in browser |

**Frontend Console:**
```javascript
// In Expo Dev Tools, check for errors like:
// - "Failed to process media"
// - "Permission Required"
// - Network errors
```

---

### Step 8: Performance Check ⚡

**Measure upload times:**
- Small image (< 500KB): Should be < 1 second
- Medium image (1-2MB): Should be < 2 seconds
- Large image (5MB): Should be < 5 seconds

**If uploads are slow:**
- Check network connection
- Verify Supabase region (should be close to users)
- Consider image compression on device before upload

**Monitor storage usage:**
```sql
SELECT 
  bucket_id,
  COUNT(*) as file_count,
  SUM((metadata->>'size')::bigint) / 1024 / 1024 as size_mb
FROM storage.objects
WHERE bucket_id = 'chat-media'
GROUP BY bucket_id;
```

---

### Step 9: Security Audit 🔒

**Verify security measures:**

- [ ] Only authenticated users can upload
- [ ] Users can only access their own media
- [ ] File size limit enforced (20MB)
- [ ] MIME type validation active
- [ ] JWT authentication required
- [ ] RLS policies prevent cross-user access
- [ ] Gemini safety filters active

**Test unauthorized access:**
```bash
# Try accessing another user's image URL without auth token
curl https://your-project.supabase.co/storage/v1/object/public/chat-media/other-user-id/image.jpg

# Expected: 403 Forbidden or 401 Unauthorized
```

---

### Step 10: User Acceptance Testing 👥

**Ask beta testers to:**
1. Take photos of homework problems
2. Upload screenshots of code errors
3. Share diagrams or charts
4. Test on different devices (iOS, Android)
5. Test on different network conditions (WiFi, 4G, slow 3G)

**Collect feedback on:**
- Upload speed
- Image quality
- AI response accuracy
- UI/UX clarity
- Any bugs or crashes

---

## Post-Deployment Checklist

### Immediate (Day 1)
- [ ] Monitor error logs for issues
- [ ] Check storage bucket for successful uploads
- [ ] Verify at least 1 successful image upload end-to-end
- [ ] Test on both iOS and Android
- [ ] Confirm AI vision responses are accurate

### Week 1
- [ ] Analyze adoption rate (% messages with media)
- [ ] Check average upload time
- [ ] Review user feedback
- [ ] Monitor storage costs
- [ ] Identify and fix any edge cases

### Week 2
- [ ] Optimize image compression if needed
- [ ] Add analytics tracking for media usage
- [ ] Consider implementing multiple image selection
- [ ] Plan content moderation if abuse detected

---

## Rollback Plan 🔙

**If critical issues arise:**

**Option 1: Disable Media Upload (Quick Fix)**
```typescript
// In Composer.tsx, disable image picker temporarily
const handleAttachOptions = () => {
  Alert.alert('Maintenance', 'Media upload is temporarily disabled. We\'ll be back soon!');
  return;
};
```

**Option 2: Revert Database Changes**
```sql
-- Remove media columns (if absolutely necessary)
ALTER TABLE chat_messages
DROP COLUMN media_url,
DROP COLUMN media_type,
DROP COLUMN media_size;

-- Revert save_chat_message function to old version
-- (Re-run create_save_chat_message_function.sql from backup)
```

**Option 3: Delete Storage Bucket**
```sql
-- Only if completely broken
DELETE FROM storage.buckets WHERE id = 'chat-media';
```

---

## Success Criteria ✅

**Deployment is successful if:**

1. ✅ Users can take photos and send to AI
2. ✅ Users can select images from library
3. ✅ Images upload within 3 seconds
4. ✅ AI provides accurate vision analysis
5. ✅ Images persist across sessions
6. ✅ No security vulnerabilities
7. ✅ Error rate < 5%
8. ✅ No crashes or freezes

---

## Contact & Support

**If issues arise:**
- Check error logs first
- Review SUPABASE_STORAGE_SETUP.md
- Test with Supabase dashboard tools
- Verify RLS policies are active
- Check JWT token is valid
- Monitor network requests in browser DevTools

**Emergency Contacts:**
- Supabase Support: https://supabase.com/support
- Expo Support: https://expo.dev/support
- Gemini API Support: https://ai.google.dev/support

---

## Congratulations! 🎉

If you've reached this point and all checks pass, you've successfully deployed the media sharing feature!

**Next Steps:**
- Announce feature to users
- Monitor adoption and feedback
- Plan for multiple image selection (future enhancement)
- Consider video support (long-term roadmap)

---

**Deployment Date:** _______________  
**Deployed By:** _______________  
**Version:** 2.0.0 (Media Sharing Release)
