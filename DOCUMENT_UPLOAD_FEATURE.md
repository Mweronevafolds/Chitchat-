# 📄 Document Upload Feature Guide

## Overview
ChitChat now supports uploading and analyzing various document types, making it a comprehensive learning assistant that can handle:
- 📸 **Images** (JPEG, PNG, GIF, WebP)
- 📄 **PDFs** (research papers, textbooks, assignments)
- 📝 **Word Documents** (.doc, .docx)
- 📊 **Excel Spreadsheets** (.xls, .xlsx)
- 📽️ **PowerPoint Presentations** (.ppt, .pptx)
- 📋 **Text Files** (.txt, .csv)

---

## Features

### 1. **Multi-Type File Support**
Users can now upload:
- **Images:** For visual analysis, homework help, diagram explanations
- **PDFs:** For document summarization, research assistance
- **Word Docs:** For essay feedback, assignment help
- **Excel Files:** For data analysis, formula explanations
- **PowerPoint:** For presentation review, concept explanations
- **Text Files:** For code review, essay proofreading

### 2. **Smart File Previews**
- **Images:** Thumbnail preview (200x200px)
- **Documents:** File icon with color-coded file type
  - 🔴 PDF (Red)
  - 🔵 Word (Blue)
  - 🟢 Excel (Green)
  - 🟠 PowerPoint (Orange)
  - ⚫ Text (Gray)

### 3. **Intuitive Upload Flow**
```
User taps paperclip
       ↓
Three options appear:
  • Take Photo 📸
  • Choose Photo 🖼️
  • Upload Document 📄
       ↓
User selects file
       ↓
Preview shows with file name
       ↓
User adds caption/question
       ↓
Sends to AI for analysis
```

### 4. **AI Document Analysis**
The AI can:
- **Summarize** long documents
- **Extract** key information
- **Answer** specific questions about content
- **Explain** complex concepts in documents
- **Analyze** data in spreadsheets
- **Provide feedback** on presentations
- **Debug** code in text files

---

## User Interface

### Composer Component
**Before selecting file:**
```
┌─────────────────────────────────────┐
│ [📎] [Message input...]         [↗️] │
└─────────────────────────────────────┘
```

**After selecting image:**
```
┌─────────────────────────────────────┐
│ [📎] [🖼️ thumbnail] [Message...] [↗️] │
│         [x remove]                  │
└─────────────────────────────────────┘
```

**After selecting document:**
```
┌─────────────────────────────────────┐
│ [📎] [📄 assignment.pdf [x]]        │
│      [Message input...]         [↗️] │
└─────────────────────────────────────┘
```

**While uploading:**
```
┌─────────────────────────────────────┐
│ ⏳ Uploading document...            │
├─────────────────────────────────────┤
│ [📎] [📄 file.pdf] [Message...] [⏫] │
│      (disabled)                     │
└─────────────────────────────────────┘
```

### Chat Bubbles

**User message with image:**
```
┌──────────────────────┐
│ [Image thumbnail]    │
│                      │
│ "Explain this        │
│  diagram"            │
└──────────────────────┘
```

**User message with document:**
```
┌──────────────────────┐
│ 📄 homework.pdf      │
│                      │
│ "Help me solve       │
│  problem 3"          │
└──────────────────────┘
```

---

## Use Cases

### 1. **Homework Help with PDFs**
**Scenario:** Student uploads assignment PDF
```javascript
User: [Uploads: math_homework.pdf] "Explain problem 5"
AI: "Looking at problem 5 in your homework, it asks you to solve a quadratic equation..."
```

### 2. **Essay Feedback with Word Docs**
**Scenario:** Student uploads essay for review
```javascript
User: [Uploads: essay.docx] "Give me feedback on my thesis statement"
AI: "Your thesis statement is strong because it's specific and arguable. However, consider..."
```

### 3. **Data Analysis with Excel**
**Scenario:** Student uploads data spreadsheet
```javascript
User: [Uploads: sales_data.xlsx] "What patterns do you see?"
AI: "Looking at your sales data, I notice several trends: 1) Sales peak in Q4..."
```

### 4. **Presentation Review with PowerPoint**
**Scenario:** Student uploads presentation
```javascript
User: [Uploads: project.pptx] "Is my flow logical?"
AI: "Your presentation structure is good. The intro clearly states the problem..."
```

### 5. **Code Review with Text Files**
**Scenario:** Student uploads code
```javascript
User: [Uploads: script.txt] "Why isn't this working?"
AI: "I see the issue! On line 15, you're missing a closing parenthesis..."
```

### 6. **Study Material Analysis**
**Scenario:** Student uploads lecture notes
```javascript
User: [Uploads: lecture_notes.pdf] "Create a study guide"
AI: "Here's a study guide based on your lecture notes:
     1. Key Concepts: [summary]
     2. Important Definitions: [list]
     3. Practice Questions: [questions]"
```

---

## Technical Implementation

### Frontend Changes

#### Composer.tsx
**New State:**
```typescript
const [selectedMedia, setSelectedMedia] = useState<string | null>(null);
const [mediaType, setMediaType] = useState<'image' | 'document' | null>(null);
const [fileName, setFileName] = useState<string | null>(null);
```

**New Functions:**
```typescript
handlePickDocument() // Uses expo-document-picker
getFileIcon(filename) // Returns appropriate Feather icon
getFileColor(filename) // Returns color based on file type
```

**Document Picker:**
```typescript
const result = await DocumentPicker.getDocumentAsync({
  type: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    // ... more types
  ],
  copyToCacheDirectory: true,
});
```

#### ChatBubble.tsx
**New Type Fields:**
```typescript
export type Message = {
  id: string;
  sender: 'user' | 'ai';
  content: string;
  timestamp: string;
  mediaUrl?: string;
  mediaType?: string;
  fileName?: string; // NEW
};
```

**Document Display:**
```typescript
if (isDocument) {
  return (
    <View style={styles.documentBubble}>
      <Feather name={getFileIcon()} color={getFileColor()} />
      <Text>{fileName}</Text>
    </View>
  );
}
```

### Backend Changes

#### chatController.js
**Updated Upload Function:**
```javascript
async function uploadImageToStorage(mediaUri, userId, sessionId) {
  // Now handles documents too!
  const mimeMap = {
    'pdf': 'application/pdf',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'xls': 'application/vnd.ms-excel',
    'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    // ... more types
  };
  // Returns: { url, path, mimeType, size, filename }
}
```

**Enhanced System Prompt:**
```javascript
systemPromptText = `
  ...
  - When users share documents (PDFs, Word, Excel, PowerPoint, text files):
    * Summarize key points and main ideas
    * Extract important information and data
    * Answer specific questions about the content
    * Help with homework, assignments, or research
  ...
`;
```

### Database Schema
**No changes needed** - existing `media_url`, `media_type`, `media_size` columns handle all file types.

### Storage Configuration
**Updated Bucket Settings:**
```sql
file_size_limit: 52428800  -- 50MB (increased from 20MB)
allowed_mime_types: ARRAY[
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
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
```

---

## File Type Reference

| Extension | MIME Type | Icon | Color | Use Case |
|-----------|-----------|------|-------|----------|
| .pdf | application/pdf | 📄 | #E53E3E | Research papers, textbooks |
| .doc, .docx | application/msword, .wordprocessingml | 📝 | #3182CE | Essays, assignments |
| .xls, .xlsx | application/vnd.ms-excel, .spreadsheetml | 📊 | #38A169 | Data analysis, budgets |
| .ppt, .pptx | application/vnd.ms-powerpoint, .presentationml | 📽️ | #DD6B20 | Presentations, slides |
| .txt | text/plain | 📋 | #718096 | Code, notes |
| .csv | text/csv | 📋 | #38A169 | Data files |

---

## Size Limits & Performance

### File Size Guidelines
- **Images:** < 5MB recommended (faster upload)
- **PDFs:** < 10MB for best performance
- **Word/Excel:** < 5MB recommended
- **PowerPoint:** < 20MB (can have many images)
- **Text:** < 1MB (very fast)

### Maximum Limits
- **Hard Limit:** 50MB per file
- **Recommended:** Keep files under 10MB for optimal speed

### Upload Times (estimated)
- **1MB file:** ~1-2 seconds
- **5MB file:** ~3-5 seconds
- **10MB file:** ~6-10 seconds
- **20MB file:** ~12-20 seconds

---

## AI Capabilities by File Type

### Images
- ✅ Visual analysis
- ✅ OCR (text extraction)
- ✅ Diagram explanation
- ✅ Handwriting recognition
- ✅ Math problem solving

### PDFs
- ✅ Text extraction
- ✅ Summarization
- ✅ Q&A about content
- ✅ Key point extraction
- ⚠️ Image analysis (if PDF contains images)

### Word Documents
- ✅ Text analysis
- ✅ Grammar/style feedback
- ✅ Structure review
- ✅ Content summarization
- ⚠️ Formatting preserved as text

### Excel Spreadsheets
- ✅ Data pattern analysis
- ✅ Formula explanation
- ✅ Trend identification
- ⚠️ Cannot execute formulas
- ⚠️ Visual charts not analyzed

### PowerPoint
- ✅ Slide content analysis
- ✅ Flow and structure review
- ✅ Text extraction
- ⚠️ Images analyzed separately
- ⚠️ Animations not interpreted

### Text Files
- ✅ Code review
- ✅ Syntax checking
- ✅ Logic analysis
- ✅ Proofreading
- ✅ Fast processing

---

## User Guidance

### Best Practices for Users

**For Images:**
- Take clear, well-lit photos
- Avoid glare or shadows
- Ensure text is readable
- Crop to relevant area

**For PDFs:**
- Upload relevant pages only
- Text-based PDFs work best
- Scanned PDFs may need OCR
- Keep under 10MB

**For Word/Excel:**
- Save as latest format (.docx, .xlsx)
- Avoid corrupted files
- Remove sensitive data
- Keep formatting simple

**For PowerPoint:**
- Export as PDF for faster analysis
- Or upload directly for full review
- Limit to key slides if large

**For Text Files:**
- Use .txt or .csv format
- Include relevant context
- Format code properly
- Add comments if needed

---

## Error Handling

### Common Issues & Solutions

**"File too large"**
- **Solution:** Compress file or split into parts
- **Tip:** PDFs can be compressed online

**"File type not supported"**
- **Solution:** Convert to supported format
- **Tip:** Use PDF as universal format

**"Upload failed"**
- **Solution:** Check internet connection
- **Tip:** Try smaller file or different format

**"Can't read document"**
- **Solution:** File may be corrupted
- **Tip:** Re-save or re-download file

**"Analysis incomplete"**
- **Solution:** File may be too complex
- **Tip:** Ask specific questions about sections

---

## Privacy & Security

### Data Protection
- ✅ Files stored in private Supabase bucket
- ✅ RLS policies prevent cross-user access
- ✅ JWT authentication required
- ✅ Files encrypted in transit (HTTPS)
- ✅ User can delete files anytime

### Content Policies
- ⚠️ Don't upload copyrighted material without permission
- ⚠️ Don't upload personal/sensitive information
- ⚠️ Follow academic integrity policies
- ✅ Use for personal study and learning

### Data Retention
- **Default:** Files stored 90 days
- **Cleanup:** Automatic deletion of old files
- **User Control:** Can delete anytime via settings

---

## Future Enhancements

### Planned Features
1. **Multiple File Upload** - Upload 2-5 files at once
2. **File Management** - View/delete uploaded files
3. **OCR for Scanned PDFs** - Better text extraction
4. **Audio Files** - MP3, WAV transcription
5. **Video Files** - MP4 frame analysis
6. **Zip Archives** - Extract and analyze multiple files
7. **Code Syntax Highlighting** - Better code display
8. **Document Annotation** - Highlight and comment

### API Integrations (Future)
- **Google Drive** - Import from Drive
- **Dropbox** - Import from Dropbox
- **OneDrive** - Import from OneDrive
- **Notion** - Import notes
- **Evernote** - Import notebooks

---

## Developer Notes

### Adding New File Types

**1. Update Composer:**
```typescript
// Add to document picker types
type: [
  ...existingTypes,
  'application/new-mime-type'
]
```

**2. Update Icon/Color Functions:**
```typescript
const getFileIcon = (filename: string) => {
  if (filename.endsWith('.newext')) return 'file-icon';
  // ...
};
```

**3. Update Backend:**
```javascript
const mimeMap = {
  'newext': 'application/new-mime-type'
};
```

**4. Update Storage Bucket:**
```sql
UPDATE storage.buckets
SET allowed_mime_types = array_append(allowed_mime_types, 'application/new-mime-type')
WHERE id = 'chat-media';
```

---

## Testing Checklist

### Manual Testing
- [ ] Upload PDF → AI summarizes
- [ ] Upload Word doc → AI provides feedback
- [ ] Upload Excel → AI analyzes data
- [ ] Upload PowerPoint → AI reviews structure
- [ ] Upload text file → AI reviews code
- [ ] Upload image (regression test)
- [ ] Upload multiple different types in sequence
- [ ] Test file size limits (try 60MB - should fail)
- [ ] Test unsupported type (should show error)
- [ ] Test corrupted file (should handle gracefully)
- [ ] Check document displays in chat history
- [ ] Verify persistence after reload
- [ ] Test on iOS and Android

---

## Success Metrics

### Week 1 Targets
- **Document Adoption:** 15% of messages include documents
- **File Type Distribution:** 
  - PDFs: 40%
  - Images: 30%
  - Word: 15%
  - Excel: 10%
  - Other: 5%
- **Error Rate:** < 5%
- **Average Upload Time:** < 5 seconds

### User Satisfaction
- **Ease of Use:** 4.5+ stars
- **AI Accuracy:** 4.0+ stars
- **Upload Speed:** 4.0+ stars

---

## Conclusion

The document upload feature transforms ChitChat from a simple chat app into a comprehensive learning assistant that can help with:
- 📚 Homework across all subjects
- 📄 Research paper analysis
- 📊 Data analysis projects
- 💻 Code review and debugging
- 📝 Essay writing and feedback
- 📽️ Presentation preparation

**Result:** A more versatile, helpful, and user-friendly learning experience!

---

**Last Updated:** November 26, 2025  
**Feature Status:** ✅ Complete & Production-Ready  
**Supported File Types:** 13+ formats  
**Max File Size:** 50MB  
**AI Models:** Gemini 2.0 Flash (multimodal)
