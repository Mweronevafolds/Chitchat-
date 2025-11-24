# Quick Setup Guide - Navigation Restructure

## 🚀 Setup Steps

### 1. Install Dependencies (if not already done)
```bash
cd chitchat-app
npx expo install expo-linear-gradient expo-blur
```

### 2. Restart Backend Server
```bash
cd backend
npm run dev
```
This will load the new endpoints:
- `GET /api/v1/chat/sessions` - Fetch user's chat history

### 3. Start Frontend (with cache clear)
```bash
cd chitchat-app
npx expo start -c
```

## 🧪 Testing the New Flow

### Test 1: Browse from Home
1. Open the app
2. Go to **Home** tab
3. Tap any curiosity tile
4. Should navigate to **Session Screen**
5. See the seed prompt from the tile
6. Send a message
7. Verify streaming works
8. Tap back button → Should return to Home

### Test 2: Ask New Question
1. Go to **Chat** tab (now "My Learning")
2. See the "Ask a Question" button
3. Tap the button
4. Should navigate to **Session Screen** (empty)
5. Ask a question
6. Verify response streams
7. Tap back button → Should see session in history

### Test 3: Resume Session
1. Go to **Chat** tab
2. See your past sessions listed
3. Tap any session card
4. Should navigate to **Session Screen**
5. See session history (currently placeholder)
6. Continue conversation
7. Tap back → Return to Learning Hub

### Test 4: Multiple Sessions
1. Create session from Home (tile)
2. Go back, create from Chat Hub (new question)
3. Go back, create from another tile
4. Check Chat Hub → Should see all 3 sessions
5. Pull to refresh → List should update
6. Verify dates show correctly

## 🎨 Visual Verification

### Learning Hub (Chat Tab)
- [ ] "My Learning" header with gradient underline
- [ ] Large gradient "Ask a Question" button
- [ ] Session cards with:
  - [ ] Gradient icon
  - [ ] Preview text (max 2 lines)
  - [ ] Mode badge
  - [ ] Relative date
  - [ ] Right chevron
- [ ] Empty state (if no sessions):
  - [ ] Large gradient icon
  - [ ] "No Conversations Yet" title
  - [ ] Subtitle text

### Session Screen
- [ ] Back button (top left)
- [ ] Gradient session icon
- [ ] Session title in header
- [ ] Chat bubbles with gradients
- [ ] Glassmorphic composer
- [ ] Smooth scrolling

## 🐛 Common Issues

### Issue: "Cannot find module 'expo-linear-gradient'"
**Solution**: 
```bash
cd chitchat-app
npx expo install expo-linear-gradient expo-blur
```

### Issue: Sessions not showing in Chat Hub
**Solution**: 
- Check backend is running
- Check API_BASE_URL in `api.ts`
- Check auth token is valid
- Check console for fetch errors

### Issue: Session screen shows blank
**Solution**:
- Verify params are passed correctly
- Check router.push() calls
- Verify sessionId format

### Issue: Back button doesn't work
**Solution**:
- Use `router.back()` not `navigation.goBack()`
- Verify imports from `expo-router`

## 📊 Backend Verification

### Check Session Creation
```bash
# In Supabase SQL Editor
SELECT * FROM chat_sessions 
ORDER BY created_at DESC 
LIMIT 10;
```

### Check Messages
```bash
# Verify messages are saving
SELECT 
  cs.id, 
  cs.mode, 
  cm.sender, 
  cm.content, 
  cm.created_at 
FROM chat_sessions cs
JOIN chat_messages cm ON cm.session_id = cs.id
ORDER BY cm.created_at DESC
LIMIT 20;
```

### Test API Endpoint
```bash
# Using curl (replace with your auth token)
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3001/api/v1/chat/sessions
```

## 🎯 Success Criteria

- [x] Backend: `getChatSessions` function added
- [x] Backend: GET route `/chat/sessions` added
- [x] Frontend: `session.tsx` screen created
- [x] Frontend: Chat tab transformed to Learning Hub
- [x] Frontend: Home navigation updated
- [ ] Testing: All user flows work
- [ ] Testing: Sessions save correctly
- [ ] Testing: Sessions display in hub
- [ ] Testing: Resume works (pending history loading)

## 📝 Next Steps

1. **Implement Session History Loading**
   - Create `GET /api/v1/chat/sessions/:id/messages`
   - Update `fetchSessionHistory()` in `session.tsx`

2. **Add Session Deletion**
   - Add swipe-to-delete on session cards
   - Create `DELETE /api/v1/chat/sessions/:id`

3. **Improve Session Summaries**
   - Generate AI summaries instead of using last message
   - Update `getChatSessions` to use summaries

4. **Add Loading States**
   - Show skeleton screens while loading
   - Add loading indicator in session screen

5. **Error Handling**
   - Add error states for failed fetches
   - Add retry mechanisms
   - Add offline support

## 🎨 Design Notes

All screens follow the new futuristic design system:
- **Colors**: Indigo/Purple gradients
- **Shadows**: Multi-layer with appropriate opacity
- **Borders**: 1-1.5px subtle borders
- **Radius**: 12-24px rounded corners
- **Spacing**: 8px grid system
- **Typography**: System fonts, bold headers

---

**Ready to test!** 🚀

Start with the backend, then the frontend, and test each user flow systematically.
