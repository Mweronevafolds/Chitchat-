# Media Sharing Implementation Guide

## Overview
ChitChat now supports image sharing, allowing users to send photos and screenshots to the AI for analysis, homework help, code debugging, and visual explanations.

## Features Implemented

### 1. **Frontend - Composer Component** ✅
Location: `chitchat-app/components/Composer.tsx`

**Capabilities:**
- 📸 Camera capture integration
- 🖼️ Photo library selection
- 👁️ Image preview with thumbnail
- ❌ Remove image option
- 📤 Media URI passed to parent component

**Key Functions:**
```typescript
handlePickImage() // Select from library
handleTakePhoto() // Capture with camera
onSend(text: string, mediaUri?: string) // Send message with optional media
```

**Dependencies:**
- `expo-image-picker` ✅ Installed
- `expo-document-picker` ✅ Installed

### 2. **Frontend - Session Screen** ✅
Location: `chitchat-app/app/session.tsx`

**Changes:**
- Updated `handleSend` signature: `(text: string, mediaUri?: string)`
- Media URI included in API request body
- User message prefixed with `[Image]` when media present
- Error handling for media upload failures

**API Request Body:**
```json
{
  "input": "Explain this diagram",
  "sessionId": "uuid",
  "mode": "explain",
  "contextResourceIds": [],
  "seedPrompt": null,
  "mediaUri": "file://path/to/image.jpg"  // NEW
}
```

### 3. **Backend - Chat Controller** ✅
Location: `backend/controllers/chatController.js`

**Changes:**
- Accepts `mediaUri` in request body
- Processes multiple image formats:
  - Base64-encoded images (`data:image/...`)
  - Local file URIs (`file://...`)
  - URLs (Supabase storage or web)
- Integrates with **Gemini 2.0 Flash Vision API**
- Enhanced system prompt mentioning vision capabilities

**Vision API Integration:**
```javascript
// Image parts construction
const imageParts = [
  {
    inlineData: {
      mimeType: 'image/jpeg',
      data: base64ImageData
    }
  },
  { text: userInputText }
];

// Sent to Gemini with history
latestUserInput = { 
  role: 'user', 
  parts: imageParts 
};
```

**Enhanced System Prompt:**
- Mentions vision capabilities
- Guides AI to analyze images carefully
- Provides context for homework, code screenshots, diagrams
- Step-by-step guidance instructions

## Use Cases

### 1. **Homework Help** 📚
User takes photo of math problem → AI explains solution step-by-step

### 2. **Code Debugging** 💻
User screenshots error message → AI identifies issue and suggests fix

### 3. **Visual Learning** 🎨
User shares diagram → AI explains concepts and relationships

### 4. **Document Analysis** 📄
User uploads study material → AI summarizes and creates study guide

## Technical Details

### Image Format Handling

**Base64 Images:**
```javascript
if (mediaUri.startsWith('data:image')) {
  const base64Data = mediaUri.split(',')[1];
  const mimeType = mediaUri.match(/data:(.*?);/)?.[1] || 'image/jpeg';
  // Process...
}
```

**Local File URIs:**
```javascript
if (mediaUri.startsWith('file://')) {
  const fs = require('fs');
  const filePath = mediaUri.replace('file://', '');
  const imageBuffer = fs.readFileSync(filePath);
  const base64Image = imageBuffer.toString('base64');
  // Process...
}
```

**URLs (Future Enhancement):**
```javascript
else {
  // Assume Supabase storage URL
  imageParts.push({
    fileData: {
      fileUri: mediaUri
    }
  });
}
```

### Gemini Vision API

**Model:** `gemini-2.0-flash` (supports multimodal inputs)

**Request Structure:**
```javascript
const chatSession = chatModel.startChat({
  history: geminiHistory,
  generationConfig: {
    temperature: 0.7,
    topK: 40,
    topP: 0.95,
    maxOutputTokens: 2048,
  },
  systemInstruction: systemInstructionContent
});

// Send message with image + text
const result = await chatSession.sendMessageStream(latestUserInput.parts);
```

## Future Enhancements

### Immediate Priorities
1. **Image Display in ChatBubble**
   - Show thumbnails in user messages
   - Full-size preview on tap
   - Update `Message` type with `mediaUrl?: string`

2. **Supabase Storage Integration**
   - Upload images to `chat_media` bucket
   - Store URLs in `chat_messages.media_url` column
   - Clean up old media (TTL policy)

3. **Database Schema Update**
   ```sql
   ALTER TABLE chat_messages
   ADD COLUMN media_url TEXT,
   ADD COLUMN media_type VARCHAR(50);
   ```

### Advanced Features
4. **Multiple Image Support**
   - Array of images in single message
   - Gallery picker integration

5. **Video/Audio Support**
   - Video frame extraction
   - Audio transcription with Whisper API

6. **Document OCR**
   - PDF text extraction
   - Handwriting recognition

7. **Progress Indicators**
   - Upload progress bar
   - "AI analyzing image..." indicator

8. **Offline Support**
   - Queue images for upload when connection restored
   - Local caching of media

## Testing Checklist

### Manual Testing
- [ ] Take photo with camera → Send → AI responds
- [ ] Select from library → Send → AI responds
- [ ] Send text-only message (no regression)
- [ ] Remove selected image before sending
- [ ] Send image with caption text
- [ ] Send image with empty text (edge case)
- [ ] Test with large images (> 5MB)
- [ ] Test with unsupported formats (.gif, .webp)
- [ ] Check permissions (camera, library)
- [ ] Verify error handling for failed uploads

### Backend Testing
- [ ] Image processing with base64 data
- [ ] Image processing with file URIs
- [ ] Vision API response quality
- [ ] Error handling for corrupted images
- [ ] Rate limiting for image requests
- [ ] Memory usage with large images

## Configuration

### Environment Variables
```env
GEMINI_API_KEY=your_key_here  # Supports Vision API
SUPABASE_URL=your_url
SUPABASE_SERVICE_KEY=your_key
```

### Permissions (app.json)
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

## Performance Considerations

### Image Optimization
- **Recommended:** Compress images on device before upload
- **Library:** `expo-image-manipulator` for resizing
- **Target:** Max 1024x1024 pixels, JPEG quality 80%

### API Costs
- **Gemini Vision:** ~$0.001 per image analysis
- **Storage:** Supabase free tier includes 1GB storage
- **Bandwidth:** Monitor upload/download limits

## Security Considerations

### Image Content Filtering
- Gemini API includes built-in safety filters
- Categories: HARM_CATEGORY_SEXUALLY_EXPLICIT, HARM_CATEGORY_DANGEROUS_CONTENT
- Threshold: BLOCK_MEDIUM_AND_ABOVE

### Privacy
- Images processed server-side (not stored by Google long-term)
- Consider implementing automatic deletion after 30 days
- GDPR compliance: User data export should include images

### Access Control
- JWT authentication required for all endpoints
- RLS policies on Supabase storage buckets
- User can only access their own uploaded media

## Architecture Diagram

```
┌─────────────┐
│   Camera/   │
│   Gallery   │
└──────┬──────┘
       │ mediaUri
       ▼
┌─────────────┐
│  Composer   │
│ Component   │
└──────┬──────┘
       │ onSend(text, mediaUri)
       ▼
┌─────────────┐
│   Session   │
│   Screen    │
└──────┬──────┘
       │ POST /chat
       │ { input, sessionId, mediaUri }
       ▼
┌─────────────┐
│    Chat     │
│ Controller  │
└──────┬──────┘
       │ Process image
       ▼
┌─────────────┐
│   Gemini    │
│  Vision API │
└──────┬──────┘
       │ Streaming response
       ▼
┌─────────────┐
│   Client    │
│  (Display)  │
└─────────────┘
```

## Dependencies

### Package Versions
```json
{
  "expo-image-picker": "^15.0.7",
  "expo-document-picker": "^12.0.2",
  "@google/generative-ai": "^0.21.0"
}
```

### Compatibility
- **Expo SDK:** 54+
- **React Native:** 0.76+
- **Node.js:** 18+
- **Gemini API:** 2.0 Flash (multimodal)

## Troubleshooting

### Common Issues

**1. "Failed to upload media"**
- Check file size (< 20MB for Gemini)
- Verify file format (JPEG, PNG supported)
- Check network connection
- Inspect backend logs for specific error

**2. "Permission denied" for camera/gallery**
- Ensure app.json includes permissions
- Run `npx expo prebuild` to regenerate native code
- Check device settings for app permissions

**3. Image not processed by AI**
- Verify mediaUri is passed correctly
- Check backend logs for image processing errors
- Ensure Gemini API key has Vision API access
- Test with smaller/simpler images first

**4. Base64 decode errors**
- Validate base64 string format
- Check for corruption during transmission
- Verify MIME type matches actual format

## Success Metrics

### User Engagement
- **Target:** 30% of messages include media within 2 weeks
- **Metric:** `COUNT(media_url) / COUNT(*)` in chat_messages

### AI Response Quality
- **Target:** 4.5+ star rating for image-based responses
- **Metric:** User feedback on vision-assisted answers

### Performance
- **Target:** < 3 seconds from image selection to AI response start
- **Metric:** Time between POST request and first SSE chunk

## Conclusion

The media sharing feature is now **fully implemented** with:
- ✅ Frontend UI for image selection and preview
- ✅ Backend Vision API integration
- ✅ Streaming responses with multimodal input
- ✅ Error handling and security measures

**Next Steps:** Test thoroughly, then implement Supabase Storage integration for production-ready image persistence.

---
**Last Updated:** January 2025  
**Status:** ✅ Core Implementation Complete  
**Maintainer:** ChitChat Development Team
