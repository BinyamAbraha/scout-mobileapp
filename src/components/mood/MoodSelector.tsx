import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Animated,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import StyleGuide from "../../design/StyleGuide";

const { Colors, Spacing, Typography, Shadows } = StyleGuide;

export type MoodType =
  | "Energetic"
  | "Cozy"
  | "Special"
  | "Relaxed"
  | "Surprise";

interface MoodOption {
  id: MoodType;
  name: string;
  colors: readonly [string, string, ...string[]];
}

interface MoodSelectorProps {
  onMoodSelect: (mood: MoodType) => void;
  selectedMood?: MoodType;
}

const moodOptions: MoodOption[] = [
  {
    id: "Energetic",
    name: "Energetic",
    colors: ["#3B82F6", "#8B5CF6"] as const,
  },
  {
    id: "Cozy",
    name: "Cozy",
    colors: ["#FDE047", "#F97316", "#DC2626"] as const,
  },
  {
    id: "Special",
    name: "Special",
    colors: ["#A855F7", "#EC4899", "#F9A8D4"] as const,
  },
  {
    id: "Relaxed",
    name: "Relaxed",
    colors: ["#10B981", "#3B82F6", "#06B6D4"] as const,
  },
  {
    id: "Surprise",
    name: "Surprise",
    colors: [
      "#FF6B6B",
      "#4ECDC4",
      "#45B7D1",
      "#96CEB4",
      "#FFEAA7",
      "#DDA0DD",
    ] as const,
  },
];

const MoodSelector: React.FC<MoodSelectorProps> = ({
  onMoodSelect,
  selectedMood,
}) => {
  const [animatedValues] = useState(
    () => new Map(moodOptions.map((mood) => [mood.id, new Animated.Value(1)])),
  );

  const handleMoodPress = (mood: MoodType) => {
    const animatedValue = animatedValues.get(mood);
    if (animatedValue) {
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 0.95,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();
    }

    onMoodSelect(mood);
    console.log("Selected mood:", mood);
  };

  const renderMoodCircle = (mood: MoodOption) => {
    const isSelected = selectedMood === mood.id;
    const animatedValue = animatedValues.get(mood.id);

    return (
      <Animated.View
        key={mood.id}
        style={[
          styles.moodContainer,
          { transform: [{ scale: animatedValue || 1 }] },
        ]}
      >
        <TouchableOpacity
          onPress={() => handleMoodPress(mood.id)}
          style={[styles.moodButton, isSelected && styles.selectedMoodButton]}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={mood.colors}
            style={styles.gradientCircle}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
        </TouchableOpacity>
        <Text style={styles.moodLabel}>{mood.name}</Text>
      </Animated.View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>How are you feeling?</Text>
      <ScrollView
        horizontal={true}
        showsHorizontalScrollIndicator={false}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {moodOptions.map(renderMoodCircle)}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.neutral.gray100,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.neutral.gray800,
    marginBottom: Spacing.md,
  },
  scrollView: {
    flexGrow: 0,
  },
  scrollContent: {
    paddingRight: Spacing.lg,
  },
  moodContainer: {
    alignItems: "center",
    marginRight: Spacing.md,
    minWidth: 70,
  },
  moodButton: {
    width: 65,
    height: 65,
    borderRadius: 32.5,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  selectedMoodButton: {
    borderWidth: 3,
    borderColor: Colors.neutral.white,
  },
  gradientCircle: {
    width: "100%",
    height: "100%",
    borderRadius: 32.5,
  },
  moodLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: Colors.neutral.gray600,
    marginTop: Spacing.sm,
    textAlign: "center",
  },
});

export default MoodSelector;
