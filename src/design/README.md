# Scout App Design System

## Overview

This design system implements a clean, minimalist approach based on Yelp's professional aesthetic. It replaces the previous purple/gradient design with a content-focused, accessible interface that prioritizes usability and clarity.

## Key Design Principles

### 1. Minimalism

- Clean white backgrounds as primary surface
- Subtle gray sections for differentiation
- Reduced visual clutter
- Content-first approach

### 2. Professional Aesthetic

- Neutral color palette with strategic red accents
- Consistent typography hierarchy
- Subtle shadows and borders
- Outline-style icons

### 3. Accessibility

- High contrast text colors
- Touch-friendly sizing (44pt minimum)
- Clear visual hierarchy
- Consistent interactive elements

## Color System

### Primary Colors

```typescript
Colors.primary.red = "#DC2626"; // Primary actions, ratings
Colors.primary.redLight = "#FEF2F2"; // Error backgrounds
Colors.primary.redDark = "#B91C1C"; // Pressed states
```

### Neutral Palette

```typescript
Colors.neutral.white = "#FFFFFF"; // Primary background
Colors.neutral.gray100 = "#F7F7F7"; // Section backgrounds
Colors.neutral.gray200 = "#E5E5E5"; // Borders, dividers
Colors.neutral.gray500 = "#6B7280"; // Secondary text
Colors.neutral.gray700 = "#374151"; // Primary text
Colors.neutral.gray800 = "#1F2937"; // Headings
```

### Usage Guidelines

- **White**: Primary background for cards and main content
- **Gray 100**: Subtle background for sections and input fields
- **Gray 200**: Borders and dividers
- **Red**: Primary actions, ratings, and important elements only

## Typography

### Hierarchy

```typescript
// Headings
Typography.textStyles.h1; // 28px, Bold - Page titles
Typography.textStyles.h2; // 24px, Bold - Section headers
Typography.textStyles.h3; // 20px, SemiBold - Card titles
Typography.textStyles.h4; // 18px, SemiBold - Subsections

// Body Text
Typography.textStyles.body; // 16px, Normal - Primary text
Typography.textStyles.bodySmall; // 14px, Normal - Secondary info
Typography.textStyles.caption; // 12px, Medium - Labels, captions

// Special Text
Typography.textStyles.venueName; // 18px, SemiBold - Venue titles
Typography.textStyles.rating; // 14px, SemiBold - Rating display
Typography.textStyles.price; // 14px, SemiBold, Red - Price display
```

### Usage Guidelines

- **Venue names**: Should be prominent and easy to scan
- **Body text**: Use for descriptions and content
- **Captions**: For metadata and supplementary information
- **Consistent hierarchy**: Maintain size relationships across screens

## Spacing System

### Scale (Based on 4px unit)

```typescript
Spacing.xs = 4px      // Tight spacing within elements
Spacing.sm = 8px      // Small gaps
Spacing.md = 12px     // Standard element spacing
Spacing.lg = 16px     // Section padding, card spacing
Spacing.xl = 20px     // Large section gaps
Spacing['2xl'] = 24px // Major section separation
```

### Yelp-Style Tighter Spacing

- **Between related elements**: 12-16px
- **Card padding**: 16px
- **Section separation**: 20-24px
- **Screen padding**: 16px

## Component Library

### Cards

```typescript
// Standard card with subtle shadow
DSCard: {
  backgroundColor: Colors.neutral.white,
  borderRadius: 12px,
  padding: 16px,
  shadow: subtle (0 2px 4px rgba(0,0,0,0.08)),
  border: 1px solid #E5E5E5
}
```

### Buttons

```typescript
// Primary button
DSButton.primary: {
  backgroundColor: Colors.primary.red,
  color: white,
  borderRadius: 8px,
  padding: 12px 16px
}

// Secondary button
DSButton.secondary: {
  backgroundColor: white,
  color: Colors.neutral.gray700,
  border: 1px solid #E5E5E5,
  borderRadius: 8px
}
```

### Filter Pills

```typescript
// Inactive filter
DSFilterPill: {
  backgroundColor: white,
  border: 1px solid #E5E5E5,
  borderRadius: 999px,
  padding: 8px 12px
}

// Active filter
DSFilterPill.active: {
  backgroundColor: Colors.primary.red,
  color: white,
  border: 1px solid Colors.primary.red
}
```

### Search Bar

```typescript
DSSearchBar: {
  backgroundColor: Colors.neutral.gray100,
  borderRadius: 999px,
  padding: 12px 16px,
  border: none
}
```

## Icon System

### Style

- **Prefer outline icons** over filled icons
- Use Ionicons with `-outline` suffix when available
- Consistent sizing within sections

### Sizes

```typescript
Icons.size.xs = 12px    // Small labels
Icons.size.sm = 16px    // Filter pills, small buttons
Icons.size.md = 20px    // Standard icons
Icons.size.lg = 24px    // Headers, navigation
Icons.size.xl = 32px    // Feature icons
```

### Colors

```typescript
Icons.color.primary = Colors.neutral.gray600; // Default icon color
Icons.color.secondary = Colors.neutral.gray500; // Secondary icons
Icons.color.accent = Colors.primary.red; // Important icons
```

## Layout System

### Container Spacing

- **Screen padding**: 16px horizontal
- **Content spacing**: 16px between major sections
- **Card margins**: 12px bottom spacing
- **Grid gaps**: 12px between grid items

### Safe Areas

- Respect iOS/Android safe areas
- Header height: 60px
- Tab bar height: 80px (with safe area)

## Shadow System

### Card Shadows (Subtle)

```css
shadow: {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.08,
  shadowRadius: 4,
  elevation: 2 /* Android */
}
```

### Header Shadows (Minimal)

```css
headerShadow: {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.05,
  shadowRadius: 2,
  elevation: 1 /* Android */
}
```

## Border System

### Standard Borders

```typescript
border: {
  width: 1px,
  color: Colors.neutral.gray200,
  radius: 8px  // Standard radius
}

// Card borders
cardBorder: {
  width: 1px,
  color: Colors.neutral.gray200,
  radius: 12px
}

// Pill borders
pillBorder: {
  width: 1px,
  color: Colors.neutral.gray200,
  radius: 999px  // Full rounded
}
```

## Implementation Guidelines

### 1. Component Usage

```typescript
// Import design system components
import {
  DSText,
  DSButton,
  DSCard,
  DSFilterPill,
  DSSearchBar
} from '../components/ui/DesignSystem';

// Use semantic variants
<DSText variant="venueName">Restaurant Name</DSText>
<DSText variant="venueCategory">Italian Restaurant</DSText>
<DSButton variant="primary">Search</DSButton>
```

### 2. Style Guide Integration

```typescript
// Import style guide
import StyleGuide from "../design/StyleGuide";
const { Colors, Spacing, Typography } = StyleGuide;

// Use in StyleSheet
const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.neutral.white,
    padding: Spacing.lg,
  },
  title: {
    ...Typography.textStyles.h2,
    marginBottom: Spacing.md,
  },
});
```

### 3. Migration from Old Design

- Replace gradient backgrounds with white
- Convert purple/blue colors to neutral grays
- Update button styles to use red accent
- Change filled icons to outline versions
- Reduce padding/margins to tighter spacing
- Add subtle borders instead of colored backgrounds

## File Structure

```
src/design/
├── StyleGuide.ts          # Core design tokens
├── README.md             # This documentation
src/components/ui/
├── DesignSystem.tsx      # Reusable components
```

## Before & After Comparison

### Old Design (Purple/Gradient)

- Heavy purple gradients
- Bright, colorful buttons
- Filled icons
- Large spacing (20-24px)
- Colorful mood cards as primary navigation

### New Design (Minimalist)

- Clean white backgrounds
- Subtle gray sections
- Red accent color only
- Outline icons
- Tighter spacing (12-16px)
- Mood selection as filter options

## Best Practices

### Do's

✅ Use white backgrounds as primary surface  
✅ Apply red color sparingly for important actions  
✅ Maintain consistent spacing using the design tokens  
✅ Use outline icons consistently  
✅ Keep typography hierarchy clear and scannable  
✅ Use subtle shadows and borders

### Don'ts

❌ Don't use gradients or bright colors  
❌ Don't mix different icon styles (filled vs outline)  
❌ Don't use heavy shadows or glows  
❌ Don't break the spacing system  
❌ Don't make mood selection prominent like before  
❌ Don't use purple/blue color scheme

## Accessibility Considerations

- **Color contrast**: All text meets WCAG AA standards
- **Touch targets**: Minimum 44pt touch area
- **Typography**: Clear hierarchy with appropriate sizing
- **Interactive elements**: Clear visual feedback
- **Icons**: Paired with text labels where important

This design system creates a professional, content-focused experience that prioritizes usability while maintaining visual appeal through subtle design elements rather than flashy colors and effects.
