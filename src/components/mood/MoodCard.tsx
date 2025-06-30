import React from 'react';
import { TouchableOpacity, Text, StyleSheet, Animated, ViewStyle } from 'react-native';
import { MoodType } from '../../types';

interface MoodCardProps {
  mood: MoodType;
  title: string;
  subtitle: string;
  icon: string;
  onPress: (mood: MoodType) => void;
  style?: ViewStyle;
}

const moodColors: Record<MoodType, string[]> = {
  cozy: ['#ffb347', '#ff8c42'],
  energetic: ['#00d4ff', '#ff6b6b'],
  special: ['#e8b4b8', '#c2185b'],
  surprise: ['#667eea', '#764ba2'],
};

export default function MoodCard({ mood, title, subtitle, icon, onPress, style }: MoodCardProps) {
  const scaleValue = new Animated.Value(1);

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

  const handlePress = () => {
    // Add haptic feedback
    onPress(mood);
  };

  const getMoodGradientStyle = (): ViewStyle => {
    const colors = moodColors[mood];
    return {
      backgroundColor: colors[0], // Fallback for devices that don't support gradients
    };
  };

  return (
    <Animated.View style={[{ transform: [{ scale: scaleValue }] }, style]}>
      <TouchableOpacity
        style={[styles.card, getMoodGradientStyle()]}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.9}
      >
        <Text style={styles.icon}>{icon}</Text>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '47%',
    borderRadius: 20,
    padding: 20,
    minHeight: 120,
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  icon: {
    fontSize: 32,
    marginBottom: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 16,
  },
});