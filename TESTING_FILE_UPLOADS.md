# 🧪 Testing File Upload Feature

## Overview
This guide helps you test the complete file upload functionality, including images and documents (PDFs, Word, Excel, PowerPoint, text files).

## Prerequisites Checklist

### ✅ Database Setup
- [ ] Run migration: `backend/migrations/add_media_support_to_chat_messages.sql`
- [ ] Run migration: `backend/migrations/update_save_chat_message_function.sql`

### ✅ Supabase Storage Setup
1. Go to Supabase Dashboard → Storage → Create bucket
2. Create bucket named: `chat-media`
3. Set as **Public bucket**
4. Configure policies:

```sql
-- Allow authenticated users to upload
CREATE POLICY "Allow authenticated uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'chat-media');

-- Allow public read access
CREATE POLICY "Public read access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'chat-media');

-- Allow users to delete their own uploads
CREATE POLICY "Users can delete own uploads"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'chat-media' AND auth.uid()::text = (storage.foldername(name))[1]);
```

5. Update allowed MIME types (Settings → MIME types):
```
image/jpeg
image/png
image/gif
image/webp
application/pdf
application/msword
application/vnd.openxmlformats-officedocument.wordprocessingml.document
application/vnd.ms-excel
application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
application/vnd.ms-powerpoint
application/vnd.openxmlformats-officedocument.presentationml.presentation
text/plain
text/csv
```

6. Set file size limit: **50 MB**

### ✅ Backend Dependencies
```bash
cd backend
npm install multer
```

## Test Cases

### 1️⃣ Image Upload Test

**Steps:**
1. Open ChitChat app on your mobile device
2. Navigate to any chat session
3. Tap the camera icon in the composer
4. Choose "Take Photo" or "Choose from Gallery"
5. Select an image (JPEG, PNG, GIF, or WebP)
6. Type a message: "What do you see in this image?"
7. Send the message

**Expected Results:**
- ✅ "Uploading..." indicator appears
- ✅ Image preview shows in composer before sending
- ✅ Image uploads to Supabase Storage
- ✅ User message displays with image thumbnail
- ✅ AI analyzes the image and provides detailed description
- ✅ Image can be tapped to view full-screen

**Error Checks:**
- ❌ No "ENOENT" errors in backend logs
- ❌ No "file not found" errors
- ❌ Upload completes without timeouts

---

### 2️⃣ PDF Document Upload Test

**Steps:**
1. In chat session, tap the document icon (📄)
2. Select a PDF file from your device
3. Verify PDF filename appears in composer preview
4. Type: "Summarize this document for me"
5. Send the message

**Expected Results:**
- ✅ Document preview shows with red PDF icon
- ✅ Correct filename displays
- ✅ "Uploading..." progress indicator
- ✅ PDF uploads to Supabase Storage
- ✅ User message shows document bubble with PDF icon
- ✅ AI provides summary of PDF content
- ✅ No file reading errors

---

### 3️⃣ Word Document Upload Test

**Steps:**
1. Tap document icon
2. Select a .docx or .doc file
3. Type: "Extract the main points from this document"
4. Send

**Expected Results:**
- ✅ Blue Word icon appears in preview
- ✅ Upload succeeds
- ✅ AI analyzes Word document content
- ✅ Response includes key points from document

---

### 4️⃣ Excel Spreadsheet Upload Test

**Steps:**
1. Tap document icon
2. Select a .xlsx or .xls file
3. Type: "What data is in this spreadsheet?"
4. Send

**Expected Results:**
- ✅ Green Excel icon in preview
- ✅ Upload completes
- ✅ AI describes spreadsheet data
- ✅ Correct MIME type detected

---

### 5️⃣ PowerPoint Upload Test

**Steps:**
1. Tap document icon
2. Select a .pptx file
3. Type: "Explain the key concepts in this presentation"
4. Send

**Expected Results:**
- ✅ Orange PowerPoint icon
- ✅ Upload succeeds
- ✅ AI provides overview of presentation

---

### 6️⃣ Text File Upload Test

**Steps:**
1. Tap document icon
2. Select a .txt file
3. Type: "Analyze this text"
4. Send

**Expected Results:**
- ✅ Gray text file icon
- ✅ Upload completes
- ✅ AI reads and analyzes text content

---

### 7️⃣ Large File Upload Test

**Steps:**
1. Select a file close to 50MB limit
2. Upload and send

**Expected Results:**
- ✅ Upload progress indicator
- ✅ File uploads successfully (may take longer)
- ✅ No timeout errors

**Failure Case:**
- If file > 50MB: Should show error message

---

### 8️⃣ Multiple File Upload Test

**Steps:**
1. Upload an image → Send
2. Upload a PDF → Send
3. Upload a Word doc → Send
4. Verify all appear in chat history

**Expected Results:**
- ✅ Each file displays correctly
- ✅ AI analyzes each individually
- ✅ Correct icons for each type
- ✅ Chat history preserves all uploads

---

### 9️⃣ Session Persistence Test

**Steps:**
1. Upload a document and get AI response
2. Close the app
3. Reopen and navigate back to same session
4. Scroll to uploaded document

**Expected Results:**
- ✅ Document still visible with correct icon
- ✅ Image/document URL still accessible
- ✅ AI response preserved

---

### 🔟 Error Handling Test

**Test A: No File Selected**
- Tap document icon → Cancel
- Expected: No error, composer returns to normal

**Test B: Network Failure During Upload**
- Start upload → Turn off WiFi
- Expected: Error alert "Failed to upload file"

**Test C: Invalid File Type**
- Try to upload unsupported file (e.g., .exe)
- Expected: Either blocked by picker or graceful error

---

## Backend Logs to Monitor

Start backend with:
```bash
cd backend
npm start
```

**Watch for these logs:**

✅ **Successful Upload:**
```
Processing media upload for session abc123...
✓ Media uploaded successfully: user_session_timestamp_random.pdf
```

✅ **Pre-uploaded File Detected:**
```
✓ Using pre-uploaded media: https://...supabase.co/storage/v1/object/public/chat-media/...
```

❌ **Failed Upload (Old Error - Should NOT Appear):**
```
ENOENT: no such file or directory, open 'C:\var\mobile\...'
```

---

## Frontend Debug Console

In Expo dev client, check for:

✅ **Upload Success:**
```
Uploaded media: {url: "https://...", mimeType: "application/pdf", filename: "document.pdf"}
```

❌ **Upload Failure:**
```
Failed to upload media: Error: Upload failed
```

---

## Architecture Validation

### Upload Flow (New Architecture)
```
1. User selects file
   ↓
2. Composer shows preview with icon
   ↓
3. User taps send
   ↓
4. Frontend: fetch(fileUri) → Blob
   ↓
5. Frontend: FormData.append('file', blob)
   ↓
6. POST /chat/upload (with multer middleware)
   ↓
7. Backend: uploadFile() receives Buffer
   ↓
8. Backend: Uploads Buffer to Supabase Storage
   ↓
9. Backend: Returns {url, mimeType, size, filename}
   ↓
10. Frontend: Stores uploadedMediaUrl
    ↓
11. POST /chat with mediaUri = uploadedMediaUrl
    ↓
12. Backend: Detects Supabase URL, skips re-upload
    ↓
13. Backend: Sends URL to Gemini Vision API
    ↓
14. Gemini: Analyzes file content
    ↓
15. Frontend: Displays AI response
```

### Key Differences from Old Architecture
| Aspect | Old (Broken) | New (Working) |
|--------|--------------|---------------|
| File Transfer | Device file path (URI) | Actual file content (Buffer) |
| Upload Method | fs.readFileSync() | multer multipart/form-data |
| Endpoint | Single POST /chat | Two steps: POST /upload + POST /chat |
| Error | ENOENT on mobile paths | ✅ Works on all devices |

---

## Troubleshooting

### Issue: "ENOENT: no such file or directory"
**Cause:** Backend trying to read mobile device path
**Solution:** ✅ Fixed in new architecture - files uploaded as buffers

### Issue: "Upload failed" alert
**Possible Causes:**
1. No internet connection
2. Supabase Storage bucket not created
3. MIME type not allowed
4. File size exceeds 50MB
5. Missing multer dependency

**Debug:**
```bash
# Check backend logs
cd backend
npm start

# Check Supabase Storage bucket
# Dashboard → Storage → chat-media → Files
```

### Issue: AI doesn't analyze document content
**Possible Causes:**
1. Document uploaded but URL not sent to Gemini
2. Gemini API doesn't support that file type
3. File corrupted during upload

**Debug:**
- Check backend logs for Gemini API response
- Verify file URL is accessible (open in browser)
- Check file size (very large files may timeout)

### Issue: Wrong file icon displayed
**Cause:** File type detection logic incorrect
**Solution:** Update `getFileIcon()` in Composer.tsx or ChatBubble.tsx

---

## Success Criteria

🎉 **Feature is working correctly if:**
- ✅ All 10 test cases pass
- ✅ No ENOENT errors in logs
- ✅ Files upload to Supabase Storage
- ✅ AI accurately analyzes file content
- ✅ Correct icons display for each file type
- ✅ Images show thumbnails, documents show icons
- ✅ Chat history preserves uploads after app restart

---

## Next Steps (Optional Enhancements)

1. **Multiple File Selection**
   - Allow selecting multiple images at once
   - Display as gallery in chat bubble

2. **Upload Progress Bar**
   - Show % complete for large files
   - Replace spinner with progress indicator

3. **File Size Warnings**
   - Alert if file > 50MB before upload
   - Suggest compression for large images

4. **Document Preview**
   - Tap document bubble to preview PDF/Word in modal
   - Use react-native-pdf or similar library

5. **Voice Memo Support**
   - Add audio file upload
   - Integrate expo-av for recording

---

## Files Modified

### Backend
- ✅ `backend/controllers/chatController.js` - Added `uploadFile()` function
- ✅ `backend/routes/chatRoutes.js` - Added multer and POST /upload route
- ✅ `backend/migrations/add_media_support_to_chat_messages.sql` - New columns
- ✅ `backend/migrations/update_save_chat_message_function.sql` - Updated RPC

### Frontend
- ✅ `chitchat-app/app/session.tsx` - FormData upload logic
- ✅ `chitchat-app/components/Composer.tsx` - Document picker + preview
- ✅ `chitchat-app/components/ChatBubble.tsx` - Image/document display

---

## Support

If tests fail:
1. Check this guide's prerequisites
2. Review backend logs for specific errors
3. Verify Supabase Storage bucket configuration
4. Confirm multer dependency installed
5. Test with simple image first, then documents

Happy testing! 🚀
