# Network Error Fix Guide 🔧

## Issues Fixed

### 1. ❌ `leaderboard.filter is not a function`
**Problem:** Backend returns `{ success: true, leaderboard: [...] }` but frontend expected raw array.

**Solution:** Updated leaderboard screen to properly extract and map the data:
```typescript
const data = await response.json();
const leaderboardArray = data.leaderboard || [];
const mappedLeaderboard = leaderboardArray.map((entry, index) => ({
  user_id: entry.id || entry.user_id,
  username: entry.username || entry.full_name || 'Anonymous',
  total_xp: entry.total_xp || 0,
  current_streak: entry.current_streak || 0,
  rank: index + 1,
  squad_id: entry.squad_id || 'global',
}));
```

### 2. ❌ `Network request failed` errors
**Problem:** Backend server not running or wrong API URL.

**Diagnosis:**
- ✅ API URL configured: `http://192.168.100.59:3001/api/v1`
- ⚠️ Backend server needs to be running
- ⚠️ Device must be on same network as development machine

**Solution:** Added comprehensive error handling with helpful messages.

---

## Quick Start - Run Backend Server

### Option 1: Start Backend Server
```bash
# Navigate to backend folder
cd backend

# Start the server
node server.js
```

You should see:
```
🚀 ChitChat Backend Server running on port 3001
✅ Supabase connected
✅ Routes registered:
   - /api/v1/auth
   - /api/v1/chat
   - /api/v1/rewards
   - /api/v1/games
   ...
```

### Option 2: Check if Backend is Already Running
```bash
# Check if process is running on port 3001
netstat -ano | findstr :3001
```

---

## Improvements Added

### 1. Better Error States
The leaderboard now shows helpful error messages:

**Network Error:**
```
🚫 Cannot connect to server
Please make sure the backend is running:
cd backend && node server.js

[Retry Button]
```

**Empty State:**
```
👥 No leaderboard data yet
Be the first to complete some lessons!
```

### 2. Error Recovery
- **Retry button** - One-tap to retry fetching data
- **Loading states** - PyramidLoader shows while fetching
- **Graceful fallbacks** - Empty arrays instead of crashes

### 3. Defensive Programming
All API calls now have:
- ✅ Session validation
- ✅ Response status checks
- ✅ Data existence checks (`data.leaderboard || []`)
- ✅ Type mapping with fallbacks
- ✅ Comprehensive error logging

---

## Network Configuration

### Current Setup
```env
EXPO_PUBLIC_API_URL=http://192.168.100.59:3001/api/v1
```

### If You Get Network Errors:

1. **Check your IP address:**
   ```bash
   ipconfig
   # Look for IPv4 Address under your active network adapter
   ```

2. **Update .env file if IP changed:**
   ```env
   EXPO_PUBLIC_API_URL=http://YOUR_NEW_IP:3001/api/v1
   ```

3. **Restart Expo:**
   ```bash
   # Stop the dev server (Ctrl+C)
   # Clear cache
   npx expo start --clear
   ```

4. **Make sure devices are on same network:**
   - Dev machine and phone/emulator must be on same WiFi
   - Corporate/school WiFi may block connections (use hotspot)

---

## Debugging API Calls

### Frontend Console Logs
Check Expo console for:
```
[Leaderboard] Fetch error: Network request failed
```

### Backend Server Logs
Check terminal running `node server.js` for:
```
GET /api/v1/rewards/leaderboard 200 45ms
```

### Test Backend Directly
```bash
# Test from command line (replace with your IP)
curl -H "Authorization: Bearer YOUR_TOKEN" http://192.168.100.59:3001/api/v1/rewards/leaderboard
```

---

## Files Modified

### `chitchat-app/app/(tabs)/leaderboard.tsx`
✅ Fixed data extraction from API response  
✅ Added error state with retry button  
✅ Added empty state for no data  
✅ Added helpful error messages  
✅ Added defensive null checks  

**Changes:**
- Extract `data.leaderboard` instead of using `data` directly
- Map backend fields to frontend types
- Show connection error with server start command
- Graceful handling of empty leaderboard

---

## Expected Behavior

### ✅ When Backend is Running:
1. Leaderboard loads with rankings
2. Shows user's position
3. Global/Squad tabs work
4. Pull-to-refresh works

### ⚠️ When Backend is Not Running:
1. Shows error icon (WiFi off)
2. Shows error message: "Cannot connect to server"
3. Shows command to start backend
4. Shows retry button
5. **No crashes!**

### 📋 When Leaderboard is Empty:
1. Shows empty state icon
2. Shows "No leaderboard data yet"
3. Shows encouraging message

---

## Testing Checklist

- [ ] Start backend server
- [ ] Check backend console shows "Server running on port 3001"
- [ ] Open app - should see loading pyramid
- [ ] Leaderboard loads with data
- [ ] Switch between Global/Squad tabs
- [ ] Stop backend server
- [ ] Pull to refresh - should show error state
- [ ] Click Retry button
- [ ] Start backend again
- [ ] Click Retry - data should load

---

## Common Issues

### Issue: "Network request failed" even with backend running
**Solution:**
1. Check firewall isn't blocking port 3001
2. Try `localhost` if testing on same machine
3. Check `.env` has correct IP address
4. Restart both backend and Expo dev server

### Issue: "Cannot GET /api/v1/rewards/leaderboard"
**Solution:**
1. Check backend routes are registered
2. Look for "Routes registered" in server logs
3. Verify `rewardsRoutes.js` is imported in `server.js`

### Issue: Leaderboard shows but crashes on filter
**Solution:** ✅ Fixed! Make sure you're running the updated code.

---

## Next Steps

1. **Start the backend:**
   ```bash
   cd backend
   node server.js
   ```

2. **Verify it's working:**
   - Check console shows "Server running"
   - No errors in console

3. **Test the app:**
   - Open leaderboard
   - Should see data load
   - Try pull-to-refresh

4. **If still seeing errors:**
   - Check terminal logs
   - Verify IP address in `.env`
   - Ensure same network connection

---

## Summary

✅ **Fixed:** `leaderboard.filter is not a function` crash  
✅ **Fixed:** Network errors show helpful messages  
✅ **Added:** Retry functionality  
✅ **Added:** Empty states  
✅ **Added:** Better error logging  

The app should now handle network issues gracefully instead of crashing! 🎉
