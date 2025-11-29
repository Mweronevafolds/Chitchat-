# 🔗 Integrating the Share Button - Quick Examples

## Overview
This guide shows you how to add the viral sharing capability to your existing components.

---

## 1. Add ShareButton to Tile Completion Screen

**File to modify:** `app/(tabs)/explore.tsx` or wherever tiles are displayed

### Before (Current):
```tsx
// User completes a tile lesson
<View style={styles.completionScreen}>
  <Text>🎉 Lesson Complete!</Text>
  <Button title="Continue" onPress={getNextTile} />
</View>
```

### After (With Sharing):
```tsx
import ShareButton from '@/components/ShareButton';

// User completes a tile lesson
<View style={styles.completionScreen}>
  <Text style={styles.title}>🎉 Lesson Complete!</Text>
  <Text style={styles.subtitle}>+100 XP Earned!</Text>
  
  <View style={styles.actionButtons}>
    <ShareButton 
      title={completedTile.hook}
      message={`I just learned: ${completedTile.hook}`}
      contentId={completedTile.id}
      type="tile"
    />
    <Button title="Continue" onPress={getNextTile} />
  </View>
</View>
```

---

## 2. Add ShareButton to Achievement Unlocks

**File to modify:** `components/AchievementModal.tsx` (if it exists) or create a new one

```tsx
import ShareButton from '@/components/ShareButton';

export default function AchievementModal({ achievement, onClose }) {
  return (
    <Modal visible={true} animationType="slide">
      <View style={styles.container}>
        <Text style={styles.icon}>{achievement.icon}</Text>
        <Text style={styles.title}>{achievement.name}</Text>
        <Text style={styles.description}>{achievement.description}</Text>
        <Text style={styles.xp}>+{achievement.xp_reward} XP</Text>
        
        {/* Viral share button */}
        <ShareButton 
          title={`Achievement Unlocked: ${achievement.name}`}
          message={`I just unlocked "${achievement.name}" on ChitChat! ${achievement.description}`}
          contentId={achievement.id}
          type="achievement"
        />
        
        <Button title="Awesome!" onPress={onClose} />
      </View>
    </Modal>
  );
}
```

---

## 3. Add ShareButton to Learning Path Completions

**File to modify:** Your paths screen (e.g., `app/(tabs)/paths.tsx`)

```tsx
import ShareButton from '@/components/ShareButton';

// After user completes a path
<View style={styles.pathCompleteCard}>
  <Text style={styles.congrats}>🏆 Path Completed!</Text>
  <Text style={styles.pathName}>{path.name}</Text>
  <Text style={styles.stats}>
    {path.lessons_count} lessons • {path.total_time_min} minutes
  </Text>
  
  <ShareButton 
    title={`Completed: ${path.name}`}
    message={`I just finished the "${path.name}" learning path on ChitChat! Ready to level up? 🚀`}
    contentId={path.id}
    type="path"
  />
</View>
```

---

## 4. Add ShareButton to CuriosityTile Component (Optional)

If you want users to share tiles **before** completing them (creates urgency):

**File:** `components/CuriosityTile.tsx`

### Option A: Add to bottom of tile card
```tsx
import ShareButton from '@/components/ShareButton';

const CuriosityTile = ({ tile, onPress }: CuriosityTileProps) => {
  // ... existing code ...
  
  return (
    <TouchableOpacity style={styles.container} onPress={onPress}>
      <View style={styles.cardContainer}>
        {/* ... existing content ... */}
        
        {/* Add share button at bottom */}
        <View style={styles.footer}>
          <ShareButton 
            title={tile.hook}
            message={`Check this out: ${tile.hook}`}
            contentId={tile.id}
            type="tile"
          />
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  // ... existing styles ...
  footer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
});
```

### Option B: Add as overlay icon (cleaner UI)
```tsx
<TouchableOpacity style={styles.container} onPress={onPress}>
  <View style={styles.cardContainer}>
    {/* Existing content */}
    
    {/* Small share icon in corner */}
    <View style={styles.shareIconCorner}>
      <ShareButton 
        title={tile.hook}
        message={`Check this out: ${tile.hook}`}
        contentId={tile.id}
        type="tile"
      />
    </View>
  </View>
</TouchableOpacity>

// Add style:
shareIconCorner: {
  position: 'absolute',
  top: 12,
  right: 12,
  zIndex: 10,
}
```

---

## 5. Add Streak Check-in on App Launch

**File:** `app/_layout.tsx` or your main navigation file

```tsx
import { useEffect } from 'react';
import { api } from './api';
import { useAuth } from './context/AuthContext';

export default function RootLayout() {
  const { session } = useAuth();

  // Check in user's streak when app opens
  useEffect(() => {
    if (session) {
      handleStreakCheckIn();
    }
  }, [session]);

  const handleStreakCheckIn = async () => {
    try {
      const result = await api.post(
        '/api/v1/streak/check-in',
        {},
        session.access_token
      );
      
      // Show reward toast if streak continued
      if (result.streak_maintained && result.bonus_xp > 0) {
        Alert.alert(
          `🔥 ${result.current_streak} Day Streak!`,
          `+${result.bonus_xp} XP Bonus`
        );
      }
      
      // Show warning if streak broken
      if (result.streak_broken) {
        Alert.alert(
          "Streak Reset",
          "Don't worry! Start a new streak today. 💪"
        );
      }
    } catch (error) {
      console.error('Streak check-in failed:', error);
    }
  };

  return (
    // ... your layout
  );
}
```

---

## 6. Display Streak Counter in Profile/Stats

**File:** `components/StatsCard.tsx` (or create it)

```tsx
import { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';

export default function StatsCard() {
  const { session } = useAuth();
  const [streak, setStreak] = useState(null);

  useEffect(() => {
    loadStreak();
  }, []);

  const loadStreak = async () => {
    try {
      const data = await api.get('/api/v1/streak/status', session.access_token);
      setStreak(data);
    } catch (error) {
      console.error('Failed to load streak:', error);
    }
  };

  if (!streak) return null;

  return (
    <View style={styles.card}>
      <Text style={styles.emoji}>🔥</Text>
      <View style={styles.content}>
        <Text style={styles.value}>{streak.current_streak}</Text>
        <Text style={styles.label}>Day Streak</Text>
      </View>
      <View style={styles.recordBadge}>
        <Text style={styles.recordText}>Best: {streak.longest_streak}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  emoji: {
    fontSize: 40,
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  value: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FF4500',
  },
  label: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  recordBadge: {
    backgroundColor: '#FFF5E1',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  recordText: {
    fontSize: 12,
    color: '#F59E0B',
    fontWeight: '600',
  },
});
```

---

## 7. Testing the Integration

### Manual Test Checklist:
1. ✅ Complete a tile → See share button
2. ✅ Tap share button → Native share sheet opens
3. ✅ Share via WhatsApp/other app → Alert shows "+50 XP"
4. ✅ Check profile → XP increased
5. ✅ Share 5 times → "Viral Spreader" achievement unlocks
6. ✅ Open app next day → Streak increases
7. ✅ Miss a day (>48h) → Streak resets gracefully

### Automated Test (Optional):
```typescript
// In your test suite:
describe('ShareButton', () => {
  it('should reward XP on successful share', async () => {
    const { getByText } = render(
      <ShareButton 
        title="Test"
        message="Test message"
        contentId="test-123"
        type="tile"
      />
    );
    
    fireEvent.press(getByText('Share'));
    // Mock Share.share to return sharedAction
    // Verify API call was made
    // Verify alert was shown
  });
});
```

---

## 🎨 UI/UX Best Practices

### 1. **Timing Matters**
- ✅ Show share button **after** user completes action (post-achievement high)
- ❌ Don't show on failed attempts or errors

### 2. **Messaging Matters**
- ✅ "Share this with a friend who needs to know this!"
- ❌ "Please share" (sounds desperate)

### 3. **Visual Hierarchy**
- Primary action: Continue/Next
- Secondary action: Share (styled as accent button)

### 4. **Mobile-First Design**
```tsx
// Good: Uses native share capabilities
Share.share({ message: "..." })

// Bad: Custom share modal that requires selecting platform
<ShareModal platforms={['facebook', 'twitter', ...]} />
```

---

## 🔧 Advanced: Customizing the ShareButton

### Add different styling per context:

```tsx
// In ShareButton.tsx
type Variant = 'default' | 'compact' | 'pill';

interface Props {
  // ... existing props
  variant?: Variant;
}

const getButtonStyle = (variant: Variant) => {
  switch(variant) {
    case 'compact':
      return { padding: 4, borderRadius: 12 };
    case 'pill':
      return { paddingHorizontal: 20, borderRadius: 999 };
    default:
      return styles.button;
  }
};

// Usage:
<ShareButton variant="compact" {...props} />
```

---

## 📊 Analytics Integration (Future)

Track share effectiveness:

```tsx
// In ShareButton.tsx
const handleShare = async () => {
  // ... existing code
  
  // Log to analytics
  analytics.track('content_shared', {
    content_type: type,
    content_id: contentId,
    platform: result.activityType,
    user_id: session.user.id,
  });
};
```

---

## 🚨 Common Issues & Solutions

### Issue: Share button not appearing
**Solution:** Check if `@expo/vector-icons` is installed:
```bash
npx expo install @expo/vector-icons
```

### Issue: API call fails silently
**Solution:** Check network tab, verify:
- Token is valid (`session.access_token`)
- Backend route is registered (`/api/v1/viral/share`)
- CORS is enabled

### Issue: Alert doesn't show on Android
**Solution:** Use Toast library instead:
```bash
npm install react-native-toast-message
```

---

## ✅ Deployment Checklist

Before pushing to production:
- [ ] Run database migration (`create_addiction_engine.sql`)
- [ ] Test streak check-in on app launch
- [ ] Test share button on all platforms (iOS/Android/Web)
- [ ] Verify XP rewards appear in real-time
- [ ] Test achievement unlocks
- [ ] Monitor error logs for first 24 hours

---

**Created:** November 26, 2025  
**Status:** Ready for Integration  
**Next:** Add rate limiting to prevent XP farming
