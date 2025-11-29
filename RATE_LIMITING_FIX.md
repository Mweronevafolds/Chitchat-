# Rate Limiting & Database Fix

## Problem Summary

Your app was experiencing two critical issues:

### 1. **Gemini API Rate Limiting (429 errors)**
- **Error**: `GoogleGenerativeAIFetchError: [429 Too Many Requests]`
- **Cause**: The `useProactiveAI` hook was making too many API calls:
  - Initial prefetch on mount
  - Refresh every 30 seconds (120+ calls per hour!)
  - Additional prefetch on every context/topic change
  - Multiple screens using the hook simultaneously
- **Impact**: Exceeded Gemini's 10 requests per minute quota for `gemini-2.0-flash-exp`

### 2. **Database Missing Column Error**
- **Error**: `column "updated_at" of relation "chat_sessions" does not exist`
- **Cause**: The `chat_sessions` table was missing the `updated_at` column
- **Impact**: Chat messages couldn't be saved, breaking AI memory

## Solutions Implemented

### ✅ Fix 1: Rate Limiting in useProactiveAI Hook

**File**: `chitchat-app/lib/hooks/useProactiveAI.ts`

**Changes**:
1. **Added Rate Limiting**:
   ```typescript
   const lastPrefetchTimeRef = useRef<number>(0);
   const RATE_LIMIT_MS = 60000; // Only prefetch once per minute minimum
   ```

2. **Updated Prefetch Function**:
   - Added check: Skip prefetch if called within last 60 seconds
   - Logs when rate limited: `[useProactiveAI] Skipping prefetch - rate limited`

3. **Reduced Refresh Frequency**:
   - **Before**: Every 30 seconds (120 calls/hour)
   - **After**: Every 5 minutes (12 calls/hour)
   - **Reduction**: 90% fewer API calls!

4. **Disabled Context Change Trigger**:
   - Commented out the effect that triggered on `context`/`topic` changes
   - Prevents cascade of prefetch calls when navigating screens
   - Users can manually refresh if needed via `refresh()` function

**Impact**:
- Drastically reduced API calls from ~120/hour to ~12/hour
- Prevents 429 rate limit errors
- Still maintains proactive AI functionality with smart caching

### ✅ Fix 2: Database Migration for updated_at Column

**File**: `backend/migrations/010_add_updated_at_column.sql`

**What it does**:
1. Adds `updated_at` column to `chat_sessions` table
2. Creates trigger to auto-update timestamp on row changes
3. Backfills existing rows with `created_at` value
4. Sets column as NOT NULL after backfill

**To apply this fix**:
1. Open Supabase Dashboard → SQL Editor
2. Copy contents of `backend/migrations/010_add_updated_at_column.sql`
3. Paste and run the migration
4. Verify: Check that `chat_sessions` table now has `updated_at` column

## Testing

### Test Rate Limiting Fix:
1. Restart the Expo app: `npx expo start -c`
2. Navigate between screens
3. Check terminal - should see `[useProactiveAI] Skipping prefetch - rate limited` messages
4. No more 429 errors in logs

### Test Database Fix:
1. Run the migration in Supabase
2. Send a message in the chat
3. Backend should log: `Saving messages to session [session-id]...`
4. No more `column "updated_at"... does not exist` errors
5. Messages should persist (AI memory works)

## Additional Recommendations

### 1. Consider Disabling Proactive AI in Development
If you're still testing and hitting rate limits, you can temporarily disable it:

```typescript
// In session.tsx or other screens
const {
  greeting,
  suggestions,
  //... other returns
} = useProactiveAI({
  enabled: false, // <-- Set to false during heavy development
  context: params.title || undefined,
  topic: seedMessage || params.title || undefined,
});
```

### 2. Monitor API Usage
Keep an eye on your Gemini API quota at:
https://ai.google.dev/gemini-api/docs/rate-limits

### 3. Upgrade Gemini Model (Optional)
If you need higher quota limits, consider upgrading to:
- `gemini-2.0-flash` (stable, higher quota)
- Or follow Google's suggestion to migrate to `gemini-2.0-flash-preview-image-generation`

To change model, update in `backend/controllers/proactiveController.js`:
```javascript
const model = genAI.getGenerativeModel({ 
  model: 'gemini-2.0-flash' // Change from gemini-2.0-flash-exp
});
```

## Summary of Files Changed

1. ✅ `chitchat-app/lib/hooks/useProactiveAI.ts` - Added rate limiting (60s minimum, 5min refresh)
2. ✅ `backend/migrations/010_add_updated_at_column.sql` - Created migration for missing column

## Next Steps

1. **Apply database migration** in Supabase SQL Editor
2. **Restart both servers**:
   ```powershell
   # Terminal 1 - Backend
   cd backend
   npm run dev

   # Terminal 2 - Frontend
   cd chitchat-app
   npx expo start -c
   ```
3. **Test the app** - Errors should be gone!
4. **Monitor logs** - Confirm rate limiting is working

## Success Criteria

✅ No more 429 rate limit errors
✅ No more "column updated_at does not exist" errors  
✅ Chat messages save successfully
✅ AI memory works across sessions
✅ Proactive AI still functions (just less frequently)
✅ App remains responsive and fast
