// components/ui/GlassmorphicComponents.tsx
import React, { useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ViewStyle,
  Platform,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from "react-native-reanimated";
import { BlurView } from "@react-native-community/blur";
import LinearGradient from "react-native-linear-gradient";
import { useTheme } from "../../hooks/useTheme";

// Glass Card Component
interface GlassCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  intensity?: number;
  onPress?: () => void;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  style,
  intensity = 20,
  onPress,
}) => {
  const { theme } = useTheme();
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.98, { damping: 15 });
    opacity.value = withTiming(0.8, { duration: 100 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15 });
    opacity.value = withTiming(1, { duration: 100 });
  };

  const content = (
    <Animated.View style={[styles.glassCard, style, animatedStyle]}>
      {Platform.OS === "ios" ? (
        <BlurView
          style={StyleSheet.absoluteFillObject}
          blurType={theme.isDark ? "dark" : "light"}
          blurAmount={intensity}
        />
      ) : (
        <View
          style={[
            StyleSheet.absoluteFillObject,
            {
              backgroundColor: theme.isDark
                ? "rgba(255, 255, 255, 0.1)"
                : "rgba(0, 0, 0, 0.05)",
            },
          ]}
        />
      )}
      <LinearGradient
        colors={
          theme.isDark
            ? ["rgba(255,255,255,0.1)", "rgba(255,255,255,0.05)"]
            : ["rgba(255,255,255,0.8)", "rgba(255,255,255,0.4)"]
        }
        style={[StyleSheet.absoluteFillObject, styles.gradientBorder]}
      />
      <View style={styles.cardContent}>{children}</View>
    </Animated.View>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        {content}
      </Pressable>
    );
  }

  return content;
};

// Animated Mood Button with Gradient
interface MoodButtonProps {
  mood: string;
  icon: string;
  colors: string[];
  description: string;
  onPress: () => void;
  delay?: number;
}

export const AnimatedMoodButton: React.FC<MoodButtonProps> = ({
  mood,
  icon,
  colors,
  description,
  onPress,
  delay = 0,
}) => {
  const scale = useSharedValue(0);
  const rotate = useSharedValue(0);
  // const { theme } = useTheme(); // Uncomment if theme styling is needed

  useEffect(() => {
    scale.value = withDelay(
      delay,
      withSpring(1, {
        damping: 12,
        stiffness: 150,
      }),
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { rotate: `${rotate.value}deg` }],
  }));

  const handlePress = () => {
    rotate.value = withSequence(
      withTiming(-10, { duration: 50 }),
      withSpring(0, { damping: 8 }),
    );
    runOnJS(onPress)();
  };

  return (
    <Pressable onPress={handlePress}>
      <Animated.View style={animatedStyle}>
        <LinearGradient
          colors={colors}
          style={styles.moodButton}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Text style={styles.moodIcon}>{icon}</Text>
          <Text style={[styles.moodTitle, { color: "#FFFFFF" }]}>{mood}</Text>
          <Text
            style={[styles.moodDescription, { color: "rgba(255,255,255,0.8)" }]}
          >
            {description}
          </Text>
        </LinearGradient>
      </Animated.View>
    </Pressable>
  );
};

// Weather-Aware Header
interface WeatherHeaderProps {
  greeting: string;
  subGreeting: string;
  weather: {
    temp: number;
    icon: string;
    description: string;
  };
}

export const WeatherAwareHeader: React.FC<WeatherHeaderProps> = ({
  greeting,
  subGreeting,
  weather,
}) => {
  const translateY = useSharedValue(-50);
  const opacity = useSharedValue(0);
  const { theme } = useTheme();

  useEffect(() => {
    translateY.value = withSpring(0, { damping: 20 });
    opacity.value = withTiming(1, { duration: 800 });
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={animatedStyle}>
      <GlassCard style={styles.headerCard}>
        <View style={styles.headerContent}>
          <View style={styles.greetingSection}>
            <Text style={[styles.greeting, theme.textStyles.heading]}>
              {greeting}
            </Text>
            <Text style={[styles.subGreeting, theme.textStyles.subheading]}>
              {subGreeting}
            </Text>
          </View>
          <View style={styles.weatherSection}>
            <Text style={styles.weatherIcon}>{weather.icon}</Text>
            <Text style={[styles.weatherTemp, theme.textStyles.body]}>
              {weather.temp}°
            </Text>
            <Text style={[styles.weatherDesc, theme.textStyles.caption]}>
              {weather.description}
            </Text>
          </View>
        </View>
      </GlassCard>
    </Animated.View>
  );
};

// Smart Empty State
interface SmartEmptyStateProps {
  searchQuery: string;
  onSuggestionPress: (suggestion: string) => void;
}

export const SmartEmptyState: React.FC<SmartEmptyStateProps> = ({
  searchQuery,
  onSuggestionPress,
}) => {
  const scale = useSharedValue(0.8);
  const opacity = useSharedValue(0);
  const { theme } = useTheme();

  useEffect(() => {
    scale.value = withSpring(1, { damping: 15 });
    opacity.value = withTiming(1, { duration: 300 });
  }, [searchQuery]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const suggestions = generateSmartSuggestions(searchQuery);

  return (
    <Animated.View style={[styles.emptyState, animatedStyle]}>
      <Text style={[styles.emptyStateTitle, theme.textStyles.heading]}>
        No exact matches found
      </Text>
      <Text style={[styles.emptyStateSubtitle, theme.textStyles.body]}>
        But here are some similar options:
      </Text>

      <View style={styles.suggestionsContainer}>
        {suggestions.map((suggestion) => (
          <Pressable
            key={suggestion}
            onPress={() => onSuggestionPress(suggestion)}
            style={({ pressed }) => [
              styles.suggestionChip,
              pressed && styles.suggestionChipPressed,
            ]}
          >
            <Text style={[styles.suggestionText, theme.textStyles.body]}>
              {suggestion}
            </Text>
          </Pressable>
        ))}
      </View>
    </Animated.View>
  );
};

// Helper function for smart suggestions
const generateSmartSuggestions = (query: string): string[] => {
  const suggestions = [];
  const lowercaseQuery = query.toLowerCase();

  // Mood-based alternatives
  if (lowercaseQuery.includes("cozy")) {
    suggestions.push("intimate", "warm", "comfortable");
  } else if (lowercaseQuery.includes("energetic")) {
    suggestions.push("lively", "vibrant", "bustling");
  }

  // Food-based alternatives
  if (lowercaseQuery.includes("pizza")) {
    suggestions.push("italian", "casual dining", "comfort food");
  } else if (lowercaseQuery.includes("sushi")) {
    suggestions.push("japanese", "seafood", "asian cuisine");
  }

  // Time-based suggestions
  const hour = new Date().getHours();
  if (hour < 11) {
    suggestions.push("breakfast spots", "coffee shops", "bakeries");
  } else if (hour < 15) {
    suggestions.push("lunch specials", "quick bites", "food trucks");
  } else {
    suggestions.push("dinner spots", "bars", "late night eats");
  }

  return [...new Set(suggestions)].slice(0, 6);
};

// Helper animation functions
const withDelay = (delay: number, animation: any) => {
  "worklet";
  return withTiming(0, { duration: delay }, () => {
    "worklet";
    return animation;
  });
};

const withSequence = (...animations: any[]) => {
  "worklet";
  return animations.reduce((_acc, animation) => {
    return withTiming(0, { duration: 0 }, () => {
      "worklet";
      return animation;
    });
  });
};

// Styles
const styles = StyleSheet.create({
  glassCard: {
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  gradientBorder: {
    opacity: 0.3,
  },
  cardContent: {
    padding: 16,
  },
  moodButton: {
    width: 160,
    height: 160,
    borderRadius: 24,
    padding: 20,
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  moodIcon: {
    fontSize: 40,
  },
  moodTitle: {
    fontSize: 24,
    fontWeight: "600",
  },
  moodDescription: {
    fontSize: 14,
  },
  headerCard: {
    marginHorizontal: 16,
    marginTop: 16,
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  greetingSection: {
    flex: 1,
  },
  greeting: {
    fontSize: 28,
    fontWeight: "bold",
  },
  subGreeting: {
    fontSize: 16,
    marginTop: 4,
    opacity: 0.8,
  },
  weatherSection: {
    alignItems: "center",
    padding: 12,
  },
  weatherIcon: {
    fontSize: 32,
  },
  weatherTemp: {
    fontSize: 20,
    fontWeight: "600",
    marginTop: 4,
  },
  weatherDesc: {
    fontSize: 12,
    marginTop: 2,
    opacity: 0.7,
  },
  emptyState: {
    padding: 32,
    alignItems: "center",
  },
  emptyStateTitle: {
    fontSize: 24,
    fontWeight: "600",
    marginBottom: 8,
  },
  emptyStateSubtitle: {
    fontSize: 16,
    opacity: 0.7,
    marginBottom: 24,
    textAlign: "center",
  },
  suggestionsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
  },
  suggestionChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "rgba(0, 0, 0, 0.05)",
    margin: 4,
  },
  suggestionChipPressed: {
    backgroundColor: "rgba(0, 0, 0, 0.1)",
    transform: [{ scale: 0.95 }],
  },
  suggestionText: {
    fontSize: 14,
  },
});
