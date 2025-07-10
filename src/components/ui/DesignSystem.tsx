/**
 * Design System Components
 * Implements the new minimalist design system based on Yelp's approach
 */

import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ViewStyle,
  TextStyle,
  TouchableOpacityProps,
  TextInputProps,
  TextProps,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import StyleGuide from "../../design/StyleGuide";

const { Colors, Typography, Spacing, Shadows, Borders, Components } =
  StyleGuide;

// =============================================================================
// ANIMATED GRADIENT SEARCH BUTTON
// =============================================================================

const AnimatedGradientSearchButton: React.FC = () => {
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const rotateAnimation = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 8000, // 8 seconds for slow, smooth rotation
        useNativeDriver: true,
      }),
    );

    rotateAnimation.start();

    return () => rotateAnimation.stop();
  }, [rotateAnim]);

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <Animated.View
      style={[
        styles.searchIconContainer,
        {
          transform: [{ rotate }],
        },
      ]}
    >
      <LinearGradient
        colors={["#667eea", "#764ba2", "#f093fb"]} // Blue, purple, pink gradient
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradientContainer}
      >
        <Ionicons
          name="search"
          size={Icons.size.md}
          color={Colors.neutral.white}
          style={styles.searchIcon}
        />
      </LinearGradient>
    </Animated.View>
  );
};

// =============================================================================
// TYPOGRAPHY COMPONENTS
// =============================================================================

interface DSTextProps extends TextProps {
  variant?: keyof typeof Typography.textStyles;
  color?: string;
}

export const DSText: React.FC<DSTextProps> = ({
  variant = "body",
  color,
  style,
  ...props
}) => {
  const textStyle = Typography.textStyles[variant];
  return <Text style={[textStyle, color && { color }, style]} {...props} />;
};

// =============================================================================
// BUTTON COMPONENTS
// =============================================================================

interface DSButtonProps extends TouchableOpacityProps {
  variant?: "primary" | "secondary" | "outline";
  size?: "sm" | "md" | "lg";
  children: React.ReactNode;
}

export const DSButton: React.FC<DSButtonProps> = ({
  variant = "primary",
  size = "md",
  children,
  style,
  disabled,
  ...props
}) => {
  const buttonStyle = Components.button[variant];
  const sizeStyles = getButtonSizeStyles(size);

  return (
    <TouchableOpacity
      style={[
        buttonStyle,
        sizeStyles,
        disabled && styles.buttonDisabled,
        style,
      ]}
      disabled={disabled}
      activeOpacity={0.7}
      {...props}
    >
      {typeof children === "string" ? (
        <DSText
          variant={variant === "primary" ? "body" : "body"}
          color={
            variant === "primary"
              ? Colors.neutral.white
              : Colors.neutral.gray700
          }
          style={styles.buttonText}
        >
          {children}
        </DSText>
      ) : (
        children
      )}
    </TouchableOpacity>
  );
};

const getButtonSizeStyles = (size: "sm" | "md" | "lg"): ViewStyle => {
  switch (size) {
    case "sm":
      return {
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
      };
    case "lg":
      return {
        paddingHorizontal: Spacing.xl,
        paddingVertical: Spacing.lg,
      };
    default:
      return {
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
      };
  }
};

// =============================================================================
// CARD COMPONENTS
// =============================================================================

interface DSCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
  padding?: number;
}

export const DSCard: React.FC<DSCardProps> = ({
  children,
  style,
  onPress,
  padding = Spacing.cardPadding,
}) => {
  const cardStyle = {
    ...Components.card,
    padding,
  };

  if (onPress) {
    return (
      <TouchableOpacity
        style={[cardStyle, style]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={[cardStyle, style]}>{children}</View>;
};

// =============================================================================
// INPUT COMPONENTS
// =============================================================================

interface DSInputProps extends TextInputProps {
  leftIcon?: string;
  rightIcon?: string;
  onRightIconPress?: () => void;
}

export const DSInput: React.FC<DSInputProps> = ({
  leftIcon,
  rightIcon,
  onRightIconPress,
  style,
  ...props
}) => {
  return (
    <View style={[Components.input, styles.inputContainer, style]}>
      {leftIcon && (
        <Ionicons
          name={leftIcon as any}
          size={Icons.size.md}
          color={Icons.color.secondary}
          style={styles.inputIcon}
        />
      )}
      <TextInput
        style={[
          styles.input,
          leftIcon && styles.inputWithLeftIcon,
          rightIcon && styles.inputWithRightIcon,
        ]}
        placeholderTextColor={Colors.neutral.gray400}
        {...props}
      />
      {rightIcon && (
        <TouchableOpacity
          onPress={onRightIconPress}
          style={styles.inputIconRight}
        >
          <Ionicons
            name={rightIcon as any}
            size={Icons.size.md}
            color={Icons.color.secondary}
          />
        </TouchableOpacity>
      )}
    </View>
  );
};

// =============================================================================
// FILTER PILL COMPONENT
// =============================================================================

interface DSFilterPillProps {
  label: string;
  active?: boolean;
  onPress: () => void;
  icon?: string;
}

export const DSFilterPill: React.FC<DSFilterPillProps> = ({
  label,
  active = false,
  onPress,
  icon,
}) => {
  const pillStyle = active
    ? Components.filterPillActive
    : Components.filterPill;
  const textColor = active ? Colors.neutral.white : Colors.neutral.gray600;
  const iconColor = active ? Colors.neutral.white : Colors.neutral.gray500;

  return (
    <TouchableOpacity style={pillStyle} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.filterPillContent}>
        {icon && (
          <Ionicons
            name={icon as any}
            size={Icons.size.sm}
            color={iconColor}
            style={styles.filterPillIcon}
          />
        )}
        <DSText
          variant="bodySmall"
          color={textColor}
          style={styles.filterPillText}
        >
          {label}
        </DSText>
      </View>
    </TouchableOpacity>
  );
};

// =============================================================================
// SEARCH BAR COMPONENT
// =============================================================================

interface DSSearchBarProps extends TextInputProps {
  onFocus?: () => void;
  navigateToSearch?: boolean;
}

export const DSSearchBar: React.FC<DSSearchBarProps> = ({
  onFocus,
  navigateToSearch = false,
  style,
  ...props
}) => {
  const handlePress = () => {
    if (navigateToSearch && onFocus) {
      onFocus();
    }
  };

  const content = (
    <>
      <AnimatedGradientSearchButton />
      <TextInput
        style={styles.searchInput}
        placeholderTextColor={Colors.neutral.gray400}
        editable={!navigateToSearch}
        pointerEvents={navigateToSearch ? "none" : "auto"}
        {...props}
      />
    </>
  );

  if (navigateToSearch) {
    return (
      <TouchableOpacity
        style={[styles.yelpSearchBar, style]}
        onPress={handlePress}
        activeOpacity={0.7}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return <View style={[styles.yelpSearchBar, style]}>{content}</View>;
};

// =============================================================================
// SECTION HEADER COMPONENT
// =============================================================================

interface DSSectionHeaderProps {
  title: string;
  subtitle?: string;
  rightElement?: React.ReactNode;
}

export const DSSectionHeader: React.FC<DSSectionHeaderProps> = ({
  title,
  subtitle,
  rightElement,
}) => {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionHeaderText}>
        <DSText variant="h3">{title}</DSText>
        {subtitle && (
          <DSText variant="bodySmall" color={Colors.neutral.gray500}>
            {subtitle}
          </DSText>
        )}
      </View>
      {rightElement}
    </View>
  );
};

// =============================================================================
// VENUE CARD COMPONENT
// =============================================================================

interface DSVenueCardProps {
  venue: {
    name: string;
    category: string;
    rating: number;
    reviewCount: number;
    priceRange: number;
    image?: string;
  };
  onPress: () => void;
}

export const DSVenueCard: React.FC<DSVenueCardProps> = ({ venue, onPress }) => {
  const priceSymbols = "$".repeat(venue.priceRange);

  return (
    <DSCard onPress={onPress} style={styles.venueCard}>
      <View style={styles.venueCardContent}>
        <View style={styles.venueCardInfo}>
          <DSText variant="venueName" numberOfLines={1}>
            {venue.name}
          </DSText>
          <DSText variant="venueCategory" numberOfLines={1}>
            {venue.category}
          </DSText>
          <View style={styles.venueCardMeta}>
            <View style={styles.ratingContainer}>
              <Ionicons
                name="star"
                size={Icons.size.sm}
                color={Colors.semantic.warning}
              />
              <DSText variant="rating" style={styles.ratingText}>
                {venue.rating}
              </DSText>
              <DSText variant="caption">({venue.reviewCount})</DSText>
            </View>
            <DSText variant="price">{priceSymbols}</DSText>
          </View>
        </View>
      </View>
    </DSCard>
  );
};

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  // Button styles
  buttonText: {
    textAlign: "center",
    fontWeight: "600",
  },
  buttonDisabled: {
    opacity: 0.5,
  },

  // Input styles
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  input: {
    flex: 1,
    fontSize: Typography.fontSize.base,
    color: Colors.neutral.gray700,
    paddingVertical: 0, // Remove default padding on iOS
  },
  inputWithLeftIcon: {
    marginLeft: Spacing.sm,
  },
  inputWithRightIcon: {
    marginRight: Spacing.sm,
  },
  inputIcon: {
    marginRight: Spacing.sm,
  },
  inputIconRight: {
    marginLeft: Spacing.sm,
  },

  // Filter pill styles
  filterPillContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  filterPillIcon: {
    marginRight: Spacing.xs,
  },
  filterPillText: {
    fontWeight: "500",
  },

  // Search bar styles
  yelpSearchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.neutral.white,
    borderRadius: 8,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginHorizontal: Spacing.md,
    marginVertical: Spacing.sm,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  searchIconContainer: {
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.md,
    overflow: "hidden", // Ensures gradient stays within bounds
  },
  gradientContainer: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 20,
  },
  searchIcon: {
    // Icon styles are handled by the container
  },
  searchInput: {
    flex: 1,
    fontSize: Typography.fontSize.base,
    color: Colors.neutral.gray700,
    paddingVertical: 0,
  },

  // Section header styles
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: Spacing.lg,
  },
  sectionHeaderText: {
    flex: 1,
  },

  // Venue card styles
  venueCard: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  venueCardContent: {
    flexDirection: "row",
  },
  venueCardInfo: {
    flex: 1,
  },
  venueCardMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: Spacing.xs,
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  ratingText: {
    marginLeft: Spacing.xs,
    marginRight: Spacing.xs,
  },
});

// Re-export Icons from StyleGuide for convenience
export const { Icons } = StyleGuide;
