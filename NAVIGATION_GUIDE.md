# ChitChat Navigation Guide

## Overview
ChitChat uses **Expo Router** (file-based routing) with a clean tab-based navigation structure optimized for learning and engagement.

## Navigation Structure

### 🎯 Main Tab Bar (5 Tabs)
1. **Home** (`/(tabs)/`) - Discovery feed, daily missions, quick play
2. **Discover** (`/(tabs)/discover`) - Explore learning paths and content
3. **Chat** (`/(tabs)/chat`) - AI conversations and tutor chats
4. **Compete** (`/(tabs)/leaderboard`) - Leaderboards and challenges
5. **Profile** (`/(tabs)/profile`) - Settings, quick access, creator studio

### 📚 Hidden/Accessible Screens
- **Library** (`/(tabs)/library`) - Accessible via Profile → Quick Access
- **Games** - Accessible via Home Quick Play or Profile Quick Access
  - Ninja Mode (`/ninja-mode`)
  - Rapid Fire (`/rapid-fire`)
- **Learning Path** (`/learning-path`) - Deep dive into structured content
- **Session** (`/session`) - Active learning session

### 🎮 Game Modes
All game screens use **fullScreenModal** presentation for immersive gameplay:
- **Ninja Mode**: Fruit ninja-style vocabulary slicing
- **Rapid Fire**: Speed-based question answering

### 👨‍🏫 Tutor Features
- **Tutor Onboarding** (`/tutor-onboarding`) - Become a content creator
- **Tutor Dashboard** (`/tutor/dashboard`) - Manage paths and students

## Using the Navigation Helper

### Import
```typescript
import { 
  navigateToHome, 
  navigateToGame, 
  navigateToSession,
  navigateBack 
} from '@/lib/navigation';
```

### Examples

#### Navigate to Games
```typescript
// Ninja Mode
navigateToGame('ninja', { topic: 'Spanish Verbs', difficulty: 'medium' });

// Rapid Fire
navigateToGame('rapid-fire', { topic: 'Quick Math' });
```

#### Navigate to Learning Session
```typescript
navigateToSession({ 
  topicId: '123', 
  topic: 'React Hooks',
  difficulty: 'hard',
  mode: 'challenge' 
});
```

#### Navigate to Chat
```typescript
navigateToChat({ conversationId: 'abc-123' });
```

#### Safe Back Navigation
```typescript
// Will fallback to Home if no back stack
navigateBack();

// Or use with custom fallback
const handleBack = getSafeBackAction('/(tabs)/discover');
```

## Deep Linking

### URL Scheme: `chitchat://`

#### Examples
```
chitchat://ninja-mode?topic=Math&difficulty=easy
chitchat://session?topicId=123
chitchat://learning-path?pathId=456
chitchat://(tabs)/chat?conversationId=abc-123
```

### Building Deep Links
```typescript
import { buildDeepLink } from '@/lib/navigation';

const shareUrl = buildDeepLink('/ninja-mode', { 
  topic: 'Vocabulary', 
  difficulty: 'hard' 
});
// Result: "chitchat://ninja-mode?topic=Vocabulary&difficulty=hard"
```

### Parsing Deep Links
```typescript
import { parseDeepLinkParams } from '@/lib/navigation';

const params = parseDeepLinkParams('chitchat://session?topicId=123&mode=challenge');
// Result: { topicId: '123', mode: 'challenge' }
```

## Accessibility Features

### Tab Bar
- ✅ Accessibility labels on all tabs
- ✅ Test IDs for automated testing
- ✅ Proper icon sizing (24px inactive, 26px active)
- ✅ High contrast colors

### Screen Options
```typescript
// Example: Game screen with proper accessibility
<Stack.Screen 
  name="ninja-mode" 
  options={{ 
    title: 'Ninja Mode', // Screen reader announces this
    presentation: 'fullScreenModal',
    gestureEnabled: false, // Prevents accidental exits during gameplay
    animation: 'fade'
  }} 
/>
```

## Navigation Patterns

### Modal Presentations
- **modal**: Onboarding, settings modals
- **fullScreenModal**: Games (ninja-mode, rapid-fire)
- **card**: Regular screens with slide animation

### Preventing Dismissal
Use `gestureEnabled: false` for:
- ✅ Game screens (prevent accidental exits)
- ✅ Onboarding flows (ensure completion)
- ❌ Regular content screens (allow easy exit)

### Animation Types
- `slide_from_right`: Default card navigation
- `fade`: Smooth transitions for games
- `slide_from_bottom`: Modals

## Quick Access Menu (Profile)

Located in Profile tab for easy discovery:
```typescript
Quick Access Section:
├── My Library (hidden from tab bar)
├── Learning Paths
├── Ninja Mode
└── Rapid Fire
```

## Screen Configuration Summary

| Screen | Presentation | Gesture | Animation | Purpose |
|--------|-------------|---------|-----------|---------|
| (tabs) | default | ✅ | slide | Main navigation |
| login | card | ✅ | slide | Authentication |
| onboarding | modal | ❌ | default | First-time setup |
| session | card | ✅ | slide | Learning session |
| ninja-mode | fullScreenModal | ❌ | fade | Game immersion |
| rapid-fire | fullScreenModal | ❌ | fade | Game immersion |
| learning-path | card | ✅ | slide | Content exploration |
| tutor-onboarding | modal | ✅ | default | Creator signup |

## Migration from Old Structure

### Before (6 tabs):
```
Home | Chat | Library | Leaderboard | Discover | Profile
```

### After (5 tabs + Quick Access):
```
Home | Discover | Chat | Compete | Profile
       ↓
   (Library moved to Profile → Quick Access)
```

### Why?
- ✅ Reduced cognitive load (5 is optimal for mobile tabs)
- ✅ Better prioritization (Discover promoted)
- ✅ Library still accessible but not cluttering main nav
- ✅ Cleaner visual design

## Best Practices

### DO ✅
- Use navigation helper functions for consistency
- Add accessibility labels to all interactive elements
- Use type-safe route parameters
- Provide fallback routes for back navigation
- Test deep links thoroughly

### DON'T ❌
- Don't use `router.push()` directly without type checking
- Don't create navigation loops
- Don't forget gestureEnabled on game screens
- Don't hardcode route strings (use helper functions)
- Don't skip accessibility testing

## Testing Navigation

### Manual Testing Checklist
- [ ] All 5 tabs navigate correctly
- [ ] Quick Access menu items work
- [ ] Back buttons function properly
- [ ] Games launch in fullscreen
- [ ] Deep links open correct screens
- [ ] Screen reader announces screen titles
- [ ] Tab icons update on focus

### Automated Testing
```typescript
// Example test ID usage
<Tab.Screen 
  options={{ 
    tabBarTestID: 'home-tab' 
  }} 
/>

// In tests:
await element(by.id('home-tab')).tap();
```

## Future Enhancements

### Planned Features
- 🔮 Web deep linking support
- 🔮 Navigation analytics
- 🔮 Breadcrumb navigation for complex flows
- 🔮 Tab badge notifications
- 🔮 Gesture-based quick switching

### Performance Optimizations
- Lazy load game screens
- Preload tab content
- Optimize transition animations
- Cache navigation state

## Troubleshooting

### "Cannot go back" Error
**Solution**: Use `getSafeBackAction()` with fallback route

### Deep Links Not Working
**Solution**: Check scheme in app.json matches URL scheme

### Tab Icons Not Showing
**Solution**: Verify Feather icon names are correct

### Screen Overlapping
**Solution**: Check presentation mode and adjust screenOptions

## Resources

- [Expo Router Docs](https://docs.expo.dev/router/introduction/)
- [React Navigation Accessibility](https://reactnavigation.org/docs/accessibility)
- [Mobile Navigation Best Practices](https://www.nngroup.com/articles/mobile-navigation-patterns/)

---

**Last Updated**: November 2025
**Maintained By**: ChitChat Team
