import React, { useEffect, useRef } from "react";
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  Animated,
  ViewStyle,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MoodType } from "../../types";

interface MoodCardProps {
  mood: MoodType;
  title: string;
  subtitle: string;
  icon: string;
  onPress: (mood: MoodType) => void;
  style?: ViewStyle;
}

const moodColors: Record<MoodType, [string, string][]> = {
  cozy: [
    ["#ffb347", "#ff8c42"],
    ["#ff6b6b", "#ffb347"],
    ["#ff8c42", "#e67e22"],
  ],
  energetic: [
    ["#00d4ff", "#ff6b6b"],
    ["#ff6b6b", "#4ecdc4"],
    ["#4ecdc4", "#00d4ff"],
  ],
  special: [
    ["#e8b4b8", "#c2185b"],
    ["#c2185b", "#8e44ad"],
    ["#8e44ad", "#e8b4b8"],
  ],
  surprise: [
    ["#667eea", "#764ba2"],
    ["#764ba2", "#667eea"],
    ["#667eea", "#5a67d8"],
  ],
};

export default function MoodCard({
  mood,
  title,
  subtitle,
  icon,
  onPress,
  style,
}: MoodCardProps) {
  const scaleValue = new Animated.Value(1);
  const colorIndexRef = useRef(0);
  const [currentColors, setCurrentColors] = React.useState<[string, string]>(
    moodColors[mood][0],
  );

  const handlePressIn = () => {
    Animated.spring(scaleValue, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleValue, {
      toValue: 1,
      friction: 3,
      useNativeDriver: true,
    }).start();
  };

  useEffect(() => {
    const interval = setInterval(() => {
      const colors = moodColors[mood];
      colorIndexRef.current = (colorIndexRef.current + 1) % colors.length;
      setCurrentColors(colors[colorIndexRef.current]);
    }, 2000);

    return () => clearInterval(interval);
  }, [mood]);

  const handlePress = () => {
    onPress(mood);
  };

  return (
    <Animated.View style={[{ transform: [{ scale: scaleValue }] }, style]}>
      <TouchableOpacity
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.9}
        style={styles.touchable}
      >
        <LinearGradient
          colors={currentColors}
          style={styles.card}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Text style={styles.icon}>{icon}</Text>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  touchable: {
    width: 150,
    height: 150,
    borderRadius: 24,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 12,
    marginBottom: 16,
  },
  card: {
    width: "100%",
    height: "100%",
    borderRadius: 24,
    padding: 20,
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  icon: {
    fontSize: 32,
    marginBottom: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "white",
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.9)",
    lineHeight: 18,
    fontWeight: "500",
  },
});
