/**
 * Scout App Design System - Minimalist Style Guide
 * Based on Yelp's clean, professional design approach
 *
 * This replaces the previous purple/gradient design with a clean,
 * minimalist approach focusing on content and usability.
 */

// =============================================================================
// COLOR PALETTE
// =============================================================================

export const Colors = {
  // Primary Colors (Minimal use of accent colors)
  primary: {
    red: "#DC2626", // For primary actions, ratings, important elements
    redLight: "#FEF2F2", // Light red background for error states
    redDark: "#B91C1C", // Darker red for pressed states
  },

  // Neutral Colors (Main palette)
  neutral: {
    white: "#FFFFFF", // Primary background
    gray50: "#F9FAFB", // Very light gray for subtle backgrounds
    gray100: "#F7F7F7", // Section backgrounds
    gray200: "#E5E5E5", // Borders, dividers
    gray300: "#D1D5DB", // Inactive elements
    gray400: "#9CA3AF", // Placeholder text
    gray500: "#6B7280", // Secondary text
    gray600: "#4B5563", // Primary text
    gray700: "#374151", // Headings
    gray800: "#1F2937", // Dark headings
    gray900: "#111827", // Darkest text
  },

  // Semantic Colors
  semantic: {
    success: "#10B981",
    successLight: "#D1FAE5",
    warning: "#F59E0B",
    warningLight: "#FEF3C7",
    error: "#EF4444",
    errorLight: "#FEE2E2",
    info: "#3B82F6",
    infoLight: "#DBEAFE",
  },

  // Legacy colors (deprecated - to be removed)
  deprecated: {
    purple: "#667eea",
    purpleLight: "#764ba2",
    gradient: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  },
} as const;

// =============================================================================
// TYPOGRAPHY
// =============================================================================

export const Typography = {
  // Font Family
  fontFamily: {
    primary: "System", // Uses iOS San Francisco / Android Roboto
    secondary: "System",
  },

  // Font Sizes (Following Yelp's hierarchy)
  fontSize: {
    xs: 12, // Small labels, captions
    sm: 14, // Body text, secondary info
    base: 16, // Primary body text
    lg: 18, // Subheadings
    xl: 20, // Card titles, section headers
    "2xl": 24, // Page titles
    "3xl": 28, // Large headings
    "4xl": 32, // Hero text
  },

  // Font Weights
  fontWeight: {
    light: "300",
    normal: "400",
    medium: "500",
    semibold: "600",
    bold: "700",
    extrabold: "800",
  },

  // Line Heights
  lineHeight: {
    tight: 1.2,
    normal: 1.4,
    relaxed: 1.6,
  },

  // Text Styles (Pre-defined combinations)
  textStyles: {
    // Headings
    h1: {
      fontSize: 28,
      fontWeight: "700",
      color: Colors.neutral.gray800,
      lineHeight: 1.2,
    },
    h2: {
      fontSize: 24,
      fontWeight: "700",
      color: Colors.neutral.gray800,
      lineHeight: 1.2,
    },
    h3: {
      fontSize: 20,
      fontWeight: "600",
      color: Colors.neutral.gray700,
      lineHeight: 1.3,
    },
    h4: {
      fontSize: 18,
      fontWeight: "600",
      color: Colors.neutral.gray700,
      lineHeight: 1.3,
    },

    // Body Text
    bodyLarge: {
      fontSize: 18,
      fontWeight: "400",
      color: Colors.neutral.gray600,
      lineHeight: 1.4,
    },
    body: {
      fontSize: 16,
      fontWeight: "400",
      color: Colors.neutral.gray600,
      lineHeight: 1.4,
    },
    bodySmall: {
      fontSize: 14,
      fontWeight: "400",
      color: Colors.neutral.gray500,
      lineHeight: 1.4,
    },

    // Special Text
    venueName: {
      fontSize: 18,
      fontWeight: "600",
      color: Colors.neutral.gray800,
      lineHeight: 1.3,
    },
    venueCategory: {
      fontSize: 14,
      fontWeight: "500",
      color: Colors.neutral.gray500,
      lineHeight: 1.4,
    },
    rating: {
      fontSize: 14,
      fontWeight: "600",
      color: Colors.neutral.gray700,
      lineHeight: 1.4,
    },
    price: {
      fontSize: 14,
      fontWeight: "600",
      color: Colors.primary.red,
      lineHeight: 1.4,
    },
    caption: {
      fontSize: 12,
      fontWeight: "500",
      color: Colors.neutral.gray400,
      lineHeight: 1.4,
    },
  },
} as const;

// =============================================================================
// SPACING
// =============================================================================

export const Spacing = {
  // Base spacing unit (4px)
  unit: 4,

  // Spacing scale (following Yelp's tighter spacing)
  xs: 4, // 4px
  sm: 8, // 8px
  md: 12, // 12px
  lg: 16, // 16px
  xl: 20, // 20px
  "2xl": 24, // 24px
  "3xl": 32, // 32px
  "4xl": 40, // 40px
  "5xl": 48, // 48px

  // Specific use cases
  cardPadding: 16,
  sectionPadding: 16,
  screenPadding: 16,
  elementGap: 12,
  itemGap: 8,
} as const;

// =============================================================================
// SHADOWS
// =============================================================================

export const Shadows = {
  // Card shadows (subtle, following Yelp's approach)
  card: {
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2, // Android
  },

  // Slight shadow for modals/overlays
  modal: {
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4, // Android
  },

  // Header shadow
  header: {
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1, // Android
  },

  // No shadow (for elements that shouldn't have shadows)
  none: {
    shadowColor: "transparent",
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
} as const;

// =============================================================================
// BORDERS
// =============================================================================

export const Borders = {
  // Border widths
  width: {
    none: 0,
    thin: 1,
    medium: 2,
    thick: 3,
  },

  // Border colors
  color: {
    light: Colors.neutral.gray200,
    medium: Colors.neutral.gray300,
    dark: Colors.neutral.gray400,
  },

  // Border radius
  radius: {
    none: 0,
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    full: 999,
  },

  // Common border styles
  default: {
    borderWidth: 1,
    borderColor: Colors.neutral.gray200,
  },

  card: {
    borderWidth: 1,
    borderColor: Colors.neutral.gray200,
    borderRadius: 12,
  },

  input: {
    borderWidth: 1,
    borderColor: Colors.neutral.gray300,
    borderRadius: 8,
  },

  button: {
    borderWidth: 1,
    borderColor: Colors.neutral.gray200,
    borderRadius: 8,
  },
} as const;

// =============================================================================
// COMPONENT STYLES
// =============================================================================

export const Components = {
  // Card styles
  card: {
    backgroundColor: Colors.neutral.white,
    padding: Spacing.cardPadding,
    marginBottom: Spacing.md,
    ...Shadows.card,
    ...Borders.card,
  },

  // Button styles
  button: {
    primary: {
      backgroundColor: Colors.primary.red,
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.md,
      borderRadius: Borders.radius.md,
      ...Shadows.none,
    },
    secondary: {
      backgroundColor: Colors.neutral.white,
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.md,
      ...Borders.button,
      ...Shadows.none,
    },
    outline: {
      backgroundColor: "transparent",
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.md,
      ...Borders.button,
      ...Shadows.none,
    },
  },

  // Input styles
  input: {
    backgroundColor: Colors.neutral.white,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    ...Borders.input,
    ...Shadows.none,
  },

  // Filter pill styles
  filterPill: {
    backgroundColor: Colors.neutral.white,
    borderRadius: Borders.radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    ...Borders.default,
    ...Shadows.none,
  },

  filterPillActive: {
    backgroundColor: Colors.primary.red,
    borderRadius: Borders.radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.primary.red,
    ...Shadows.none,
  },

  // Search bar styles
  searchBar: {
    backgroundColor: Colors.neutral.gray100,
    borderRadius: Borders.radius.full,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderWidth: 0,
    ...Shadows.none,
  },

  // Section styles
  section: {
    backgroundColor: Colors.neutral.gray50,
    paddingHorizontal: Spacing.sectionPadding,
    paddingVertical: Spacing.md,
  },

  // List item styles
  listItem: {
    backgroundColor: Colors.neutral.white,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral.gray200,
  },
} as const;

// =============================================================================
// ICON STYLES
// =============================================================================

export const Icons = {
  // Icon sizes
  size: {
    xs: 12,
    sm: 16,
    md: 20,
    lg: 24,
    xl: 32,
  },

  // Icon colors (should match text colors)
  color: {
    primary: Colors.neutral.gray600,
    secondary: Colors.neutral.gray500,
    tertiary: Colors.neutral.gray400,
    accent: Colors.primary.red,
  },

  // Icon style preferences
  style: "outline", // Prefer outline over filled icons
} as const;

// =============================================================================
// LAYOUT
// =============================================================================

export const Layout = {
  // Container padding
  containerPadding: Spacing.screenPadding,

  // Content spacing
  contentSpacing: Spacing.lg,

  // Grid spacing
  gridGap: Spacing.md,

  // Header height
  headerHeight: 60,

  // Tab bar height
  tabBarHeight: 80,

  // Safe area adjustments
  safeArea: {
    top: 44,
    bottom: 34,
  },
} as const;

// =============================================================================
// TRANSITIONS
// =============================================================================

export const Transitions = {
  // Duration
  duration: {
    fast: 150,
    normal: 250,
    slow: 350,
  },

  // Easing
  easing: {
    ease: "ease",
    easeIn: "ease-in",
    easeOut: "ease-out",
    easeInOut: "ease-in-out",
  },
} as const;

// =============================================================================
// BREAKPOINTS (for responsive design)
// =============================================================================

export const Breakpoints = {
  sm: 390, // iPhone 12 Pro
  md: 428, // iPhone 12 Pro Max
  lg: 768, // iPad Mini
  xl: 1024, // iPad
} as const;

// =============================================================================
// USAGE GUIDELINES
// =============================================================================

/**
 * USAGE GUIDELINES:
 *
 * 1. COLORS:
 *    - Use white backgrounds as primary
 *    - Use gray100 for subtle section backgrounds
 *    - Use red sparingly for primary actions and important elements
 *    - Avoid gradients and bright colors
 *
 * 2. TYPOGRAPHY:
 *    - Venue names should be prominent (venueName style)
 *    - Use consistent hierarchy throughout the app
 *    - Prefer darker grays for better readability
 *
 * 3. SPACING:
 *    - Use tighter spacing (12-16px) between related elements
 *    - Maintain consistent padding and margins
 *    - Give cards breathing room with proper margins
 *
 * 4. SHADOWS:
 *    - Use subtle shadows only
 *    - Cards should have minimal shadow for depth
 *    - Avoid heavy shadows or glows
 *
 * 5. BORDERS:
 *    - Use thin gray borders instead of colored backgrounds
 *    - Prefer subtle dividers over heavy separators
 *    - Round corners appropriately for context
 *
 * 6. ICONS:
 *    - Use outline style icons consistently
 *    - Match icon colors to text colors
 *    - Keep icon sizes consistent within sections
 */

export default {
  Colors,
  Typography,
  Spacing,
  Shadows,
  Borders,
  Components,
  Icons,
  Layout,
  Transitions,
  Breakpoints,
};
