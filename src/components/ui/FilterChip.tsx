import React, { useRef, useEffect } from "react";
import {
  TouchableOpacity,
  Text,
  View,
  Animated,
  ViewStyle,
  TextStyle,
  StyleSheet,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

interface FilterChipProps {
  label: string;
  isActive: boolean;
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  gradient?: readonly [string, string, ...string[]];
  style?: ViewStyle;
  textStyle?: TextStyle;
  showCheckmark?: boolean;
  compact?: boolean;
}

const FilterChip: React.FC<FilterChipProps> = ({
  label,
  isActive,
  onPress,
  icon,
  gradient,
  style,
  textStyle,
  showCheckmark = false,
  compact = false,
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(isActive ? 1 : 0.6)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: isActive ? 1 : 0.6,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [isActive]);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
      speed: 50,
      bounciness: 0,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
      bounciness: 10,
    }).start();
  };

  const content = (
    <View
      style={[
        styles.contentContainer,
        compact ? styles.compactPadding : styles.normalPadding,
      ]}
    >
      {icon && (
        <Ionicons
          name={icon}
          size={compact ? 14 : 16}
          color={isActive ? "white" : "#4B5563"}
          style={{ marginRight: compact ? 6 : 8 }}
        />
      )}
      <Text
        style={[
          styles.label,
          compact ? styles.compactText : styles.normalText,
          { color: isActive ? "white" : "#374151" },
          textStyle,
        ]}
      >
        {label}
      </Text>
      {showCheckmark && isActive && (
        <Ionicons
          name="checkmark-circle"
          size={compact ? 14 : 16}
          color="white"
          style={{ marginLeft: compact ? 6 : 8 }}
        />
      )}
    </View>
  );

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={0.8}
      style={style}
    >
      <Animated.View
        style={{
          transform: [{ scale: scaleAnim }],
          opacity: fadeAnim,
        }}
      >
        {gradient && isActive ? (
          <LinearGradient
            colors={gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.rounded}
          >
            {content}
          </LinearGradient>
        ) : (
          <View
            style={[
              styles.rounded,
              isActive ? styles.activeBackground : styles.inactiveBackground,
            ]}
          >
            {content}
          </View>
        )}
      </Animated.View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  contentContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  compactPadding: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  normalPadding: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  label: {
    fontWeight: "500",
  },
  compactText: {
    fontSize: 14,
  },
  normalText: {
    fontSize: 16,
  },
  rounded: {
    borderRadius: 20,
  },
  activeBackground: {
    backgroundColor: "#3B82F6",
  },
  inactiveBackground: {
    backgroundColor: "#E5E7EB",
  },
});

export default FilterChip;
