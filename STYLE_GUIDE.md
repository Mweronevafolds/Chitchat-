# ChitChat Design System & Style Guide

## 🎨 Color Palette

### Primary Colors
```
Indigo 500: #6366F1 (Main Brand Color)
Indigo 400: #818CF8 (Light Variant)
Indigo 600: #4F46E5 (Dark Variant)
```

### Accent Colors
```
Pink 500: #EC4899 (Primary Accent)
Purple 500: #8B5CF6 (Secondary Accent)
Cyan 500: #06B6D4 (Tertiary Accent)
```

### Neutral Colors
```
Slate 900: #0F172A (Primary Text)
Slate 600: #64748B (Secondary Text)
Slate 400: #94A3B8 (Tertiary Text)
Slate 50: #F8FAFC (Background)
Slate 100: #F1F5F9 (Secondary Background)
White: #FFFFFF (Cards & Surfaces)
```

### Status Colors
```
Success: #10B981 (Green)
Warning: #F59E0B (Amber)
Error: #EF4444 (Red)
Info: #3B82F6 (Blue)
```

## 📐 Spacing System

Uses an 8px base grid:
```
xs: 4px
sm: 8px
md: 12px
base: 16px
lg: 20px
xl: 24px
2xl: 32px
3xl: 48px
```

## 🔤 Typography

### Font Weights
```
Regular: 400
Medium: 500
Semibold: 600
Bold: 700
Extrabold: 800
```

### Font Sizes
```
xs: 11px
sm: 12px
base: 14px
md: 15px
lg: 16px
xl: 18px
2xl: 20px
3xl: 22px
4xl: 32px
5xl: 36px
```

### Text Hierarchy
```
Hero Title: 36px, Extrabold
Page Title: 32px, Bold
Section Header: 22px, Bold
Card Title: 20px, Bold
Body Large: 16px, Medium
Body: 16px, Regular
Body Small: 14px, Regular
Caption: 12px, Medium
Label: 11px, Semibold
```

## 🔲 Border Radius

```
sm: 8px - Small buttons, badges
md: 12px - Icons, small containers
base: 16px - Buttons, inputs
lg: 20px - Cards, tiles
xl: 24px - Large cards, modals
2xl: 28px - Input composers
round: 50% - Circular elements
```

## 🎭 Shadows

### Shadow Levels
```css
/* Level 1 - Subtle */
shadowColor: '#000'
shadowOffset: { width: 0, height: 2 }
shadowOpacity: 0.05
shadowRadius: 8
elevation: 2

/* Level 2 - Default */
shadowColor: '#000'
shadowOffset: { width: 0, height: 4 }
shadowOpacity: 0.1
shadowRadius: 12
elevation: 4

/* Level 3 - Elevated */
shadowColor: '#000'
shadowOffset: { width: 0, height: 6 }
shadowOpacity: 0.15
shadowRadius: 16
elevation: 6

/* Level 4 - Floating (Colored) */
shadowColor: '#6366F1'
shadowOffset: { width: 0, height: 8 }
shadowOpacity: 0.3
shadowRadius: 20
elevation: 8
```

## 🎨 Gradients

### Primary Gradient
```javascript
colors: ['#6366F1', '#8B5CF6']
start: { x: 0, y: 0 }
end: { x: 1, y: 1 }
```

### Accent Gradients
```javascript
// Pink to Amber
['#EC4899', '#F59E0B']

// Cyan to Blue
['#06B6D4', '#3B82F6']

// Green to Cyan
['#10B981', '#06B6D4']

// Purple to Pink
['#8B5CF6', '#EC4899']
```

## 🧩 Component Specifications

### Buttons

#### Primary Button
```
Height: 56px
Padding: 14px 20px
Border Radius: 16px
Background: Linear Gradient
Font: 18px, Bold
Shadow: Level 4 (Colored)
```

#### Secondary Button
```
Height: 48px
Padding: 12px 16px
Border Radius: 16px
Background: Card Color
Border: 1.5px
Font: 16px, Semibold
Shadow: Level 2
```

#### Icon Button
```
Size: 48x48px
Border Radius: 24px
Background: Card Color
Border: 1.5px
Shadow: Level 2
```

### Input Fields
```
Height: 56px
Padding: 16px
Border Radius: 16px
Border: 1.5px
Font: 16px, Medium
Shadow: Level 1
Icon Padding: 12px
```

### Cards
```
Padding: 20px
Border Radius: 24px
Background: Card Color
Border: 1px
Shadow: Level 3
Gap: 12px
```

### Chat Bubbles

#### User Bubble
```
Padding: 14px 20px
Border Radius: 24px
Border Bottom Right Radius: 6px
Background: Gradient
Font: 16px, Medium
Line Height: 24px
Shadow: Level 4 (Colored)
```

#### AI Bubble
```
Padding: 14px 20px
Border Radius: 24px
Border Bottom Left Radius: 6px
Background: Card Color
Border: 1px
Font: 16px, Regular
Line Height: 24px
Shadow: Level 2
```

### Tiles (Curiosity)
```
Aspect Ratio: 1:1.1
Padding: 16px
Border Radius: 20px
Background: Card Color
Border: 1px
Shadow: Level 3
Icon Size: 48x48px
Icon Border Radius: 16px
```

### Tab Bar
```
Height: 88px (iOS), 70px (Android)
Background: Blur Effect (iOS) / Card (Android)
Icon Size: 24-26px
Label: 11px, Semibold
Spacing: 8px
Shadow: Level 2
```

## 🎯 Interactive States

### Hover (Web/Tablet)
```
Scale: 0.98
Opacity: 0.8
Transition: 150ms ease
```

### Active/Pressed
```
Scale: 0.95
Opacity: 0.6
Transition: 100ms ease
```

### Focus
```
Border Color: Primary
Border Width: 2px
Shadow: Colored (Primary)
```

### Disabled
```
Opacity: 0.5
Cursor: not-allowed
Interaction: none
```

## ⚡ Animations

### Timing Functions
```javascript
// Ease In Out - General purpose
Easing.inOut(Easing.ease)

// Ease Out - Entrances
Easing.out(Easing.quad)

// Ease In - Exits
Easing.in(Easing.quad)

// Spring - Playful interactions
{ tension: 100, friction: 10 }
```

### Duration Guidelines
```
Micro: 100-150ms (Button press, toggle)
Quick: 200-300ms (Fade, slide)
Standard: 300-500ms (Cards, modals)
Slow: 500-800ms (Page transitions)
```

## 🎨 Glassmorphism

### Glass Card Effect
```javascript
background: 'rgba(255, 255, 255, 0.9)'
backdropFilter: 'blur(20px)'
borderWidth: 1
borderColor: 'rgba(255, 255, 255, 0.2)'
shadow: Level 2
```

### Glass Blur Intensity
```
Light: 40-60
Medium: 60-80
Strong: 80-100
```

## 📱 Responsive Breakpoints

```
Mobile: 0-480px
Tablet: 481-768px
Desktop: 769px+
```

## ♿ Accessibility

### Color Contrast Ratios
```
Normal Text: 4.5:1 minimum
Large Text: 3:1 minimum
UI Components: 3:1 minimum
```

### Touch Targets
```
Minimum Size: 44x44px (iOS), 48x48px (Android)
Spacing Between: 8px minimum
```

### Text Scaling
Support dynamic type/font scaling up to 200%

## 🎨 Icon Guidelines

### Icon Sizes
```
xs: 16px - Labels, badges
sm: 18px - Secondary actions
md: 20px - Primary actions
lg: 22px - Navigation
xl: 24px - Features
2xl: 36px - Hero elements
```

### Icon Style
- Feather Icons (default)
- Stroke width: 2px
- Rounded caps and joins
- Consistent optical sizing

## 📐 Layout Grid

### Padding/Margins
```
Screen Edge: 16px
Between Sections: 24px
Between Elements: 12px
Between Related Items: 8px
```

### Component Spacing
```
Vertical: 16px default, 24px between sections
Horizontal: 12px between items, 8px in groups
```

## 🎯 Best Practices

1. **Consistency**: Always use design tokens from Colors.ts
2. **Hierarchy**: Establish clear visual hierarchy through size, weight, and color
3. **Whitespace**: Don't be afraid of whitespace - it improves readability
4. **Feedback**: Provide visual feedback for all interactions
5. **Performance**: Use native animations and avoid over-animation
6. **Accessibility**: Test with screen readers and different font sizes
7. **Platform**: Respect platform conventions (iOS blur, Android elevation)
8. **Testing**: Test on multiple devices and screen sizes

## 🔄 Version History

- v2.0.0 (Nov 24, 2025) - Futuristic redesign with gradients and glassmorphism
- v1.0.0 (Previous) - Initial design system

---

This style guide ensures consistency across all ChitChat components and provides clear guidelines for future development.
