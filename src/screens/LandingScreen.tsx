import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Animated,
  SafeAreaView,
  TouchableOpacity,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Circle } from "react-native-svg";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { useOnboarding } from "@/hooks/useOnboarding";
import { useAnimationTrigger } from "@/hooks/useAnimationTrigger";
import StyleGuide from "@/design/StyleGuide";
import type { RootStackParamList, AnimationMode } from "@/types";

const { width, height } = Dimensions.get("window");
const { Colors, Typography, Spacing } = StyleGuide;

const moodColors = [
  "#FF6B35", // Cozy - warm orange
  "#5B5FDE", // Energetic - electric blue
  "#E4B4A6", // Special - rose gold
  "#87A96B", // Relaxed - sage green
  "#9B59B6", // Surprise - purple
];

interface ParticleProps {
  id: number;
  targetX: number;
  targetY: number;
  color: string;
  phase: "scattered" | "converging" | "formed" | "exploding";
  animationMode: AnimationMode;
  onComplete?: () => void;
}

const Particle: React.FC<ParticleProps> = ({
  id,
  targetX,
  targetY,
  color,
  phase,
  animationMode,
  onComplete,
}) => {
  const animX = useRef(new Animated.Value(Math.random() * width)).current;
  const animY = useRef(new Animated.Value(Math.random() * height)).current;
  const animOpacity = useRef(new Animated.Value(0)).current;
  const animScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const getDurationMultiplier = () => {
      switch (animationMode) {
        case "brief":
          return 0.5;
        case "full":
          return 1;
        case "skip":
          return 0.1;
        default:
          return 1;
      }
    };

    const multiplier = getDurationMultiplier();

    switch (phase) {
      case "scattered":
        Animated.timing(animOpacity, {
          toValue: 1,
          duration: 500 * multiplier,
          useNativeDriver: true,
        }).start();
        break;

      case "converging":
        Animated.parallel([
          Animated.timing(animX, {
            toValue: targetX,
            duration: animationMode === "brief" ? 800 : 1500 * multiplier,
            useNativeDriver: true,
          }),
          Animated.timing(animY, {
            toValue: targetY,
            duration: animationMode === "brief" ? 800 : 1500 * multiplier,
            useNativeDriver: true,
          }),
        ]).start();
        break;

      case "formed":
        if (animationMode !== "skip") {
          Animated.loop(
            Animated.sequence([
              Animated.timing(animScale, {
                toValue: 1.2,
                duration: 1000 * multiplier,
                useNativeDriver: true,
              }),
              Animated.timing(animScale, {
                toValue: 1,
                duration: 1000 * multiplier,
                useNativeDriver: true,
              }),
            ]),
          ).start();
        }
        break;

      case "exploding":
        const angle = Math.atan2(targetY - height / 2, targetX - width / 2);
        const force = animationMode === "brief" ? 100 : 200;
        const explosionX = targetX + Math.cos(angle) * force;
        const explosionY = targetY + Math.sin(angle) * force;

        Animated.parallel([
          Animated.timing(animX, {
            toValue: explosionX,
            duration: 800 * multiplier,
            useNativeDriver: true,
          }),
          Animated.timing(animY, {
            toValue: explosionY,
            duration: 800 * multiplier,
            useNativeDriver: true,
          }),
          Animated.timing(animOpacity, {
            toValue: 0,
            duration: 800 * multiplier,
            useNativeDriver: true,
          }),
        ]).start(() => {
          if (onComplete) onComplete();
        });
        break;
    }
  }, [phase, animationMode]);

  return (
    <Animated.View
      style={[
        styles.particle,
        {
          transform: [
            { translateX: animX },
            { translateY: animY },
            { scale: animScale },
          ],
          opacity: animOpacity,
        },
      ]}
    >
      <View style={[styles.particleCore, { backgroundColor: color }]} />
    </Animated.View>
  );
};

type LandingScreenRouteProp = RouteProp<RootStackParamList, "Landing">;

const LandingScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<LandingScreenRouteProp>();
  const { completeOnboarding } = useAnimationTrigger();
  const animationMode = route.params?.animationMode || "full";

  const [phase, setPhase] = useState<
    "scattered" | "converging" | "formed" | "exploding"
  >("scattered");
  const [showLogo, setShowLogo] = useState(false);
  const [showContinue, setShowContinue] = useState(false);
  const [explosionComplete, setExplosionComplete] = useState(false);

  const logoOpacity = useRef(new Animated.Value(0)).current;
  const continueOpacity = useRef(new Animated.Value(0)).current;

  const centerX = width / 2;
  const centerY = height / 2;

  // Create S-shaped logo points
  const createLogoPoints = () => {
    const points = [];
    const scale = 40;

    for (let t = 0; t <= 1; t += 0.02) {
      if (t < 0.5) {
        const localT = t * 2;
        const x =
          centerX + (Math.cos(Math.PI * localT + Math.PI) * scale + scale);
        const y = centerY - scale + localT * scale * 2;
        points.push({ x, y });
      } else {
        const localT = (t - 0.5) * 2;
        const x = centerX + (Math.cos(Math.PI * localT) * scale - scale);
        const y = centerY + localT * scale * 2;
        points.push({ x, y });
      }
    }
    return points;
  };

  const logoPoints = createLogoPoints();
  const particleCount =
    animationMode === "brief"
      ? Math.min(40, logoPoints.length)
      : Math.min(80, logoPoints.length);

  useEffect(() => {
    if (animationMode === "skip") {
      // Skip directly to main app
      completeOnboarding();
      navigation.navigate("Main" as never);
      return;
    }

    const getTimings = () => {
      if (animationMode === "brief") {
        return {
          converge: 250,
          form: 1000,
          continue: 1500,
        };
      }
      return {
        converge: 500,
        form: 2000,
        continue: 3000,
      };
    };

    const timings = getTimings();

    const timer1 = setTimeout(() => setPhase("converging"), timings.converge);
    const timer2 = setTimeout(() => {
      setPhase("formed");
      setShowLogo(true);
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: animationMode === "brief" ? 500 : 1000,
        useNativeDriver: true,
      }).start();
    }, timings.form);
    const timer3 = setTimeout(() => {
      setShowContinue(true);
      Animated.timing(continueOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    }, timings.continue);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [animationMode]);

  const handleContinue = () => {
    setPhase("exploding");

    setTimeout(() => {
      completeOnboarding();
      navigation.navigate("Main" as never);
    }, 1000);
  };

  const handleParticleComplete = () => {
    setExplosionComplete(true);
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={["#1a1a1a", "#2d2d2d"]} style={styles.gradient}>
        <View style={styles.particleContainer}>
          {Array.from({ length: particleCount }, (_, i) => {
            const targetPoint = logoPoints[i % logoPoints.length];
            return (
              <Particle
                key={i}
                id={i}
                targetX={targetPoint.x}
                targetY={targetPoint.y}
                color={moodColors[i % moodColors.length]}
                phase={phase}
                animationMode={animationMode}
                onComplete={i === 0 ? handleParticleComplete : undefined}
              />
            );
          })}
        </View>

        {showLogo && (
          <Animated.View
            style={[
              styles.logoContainer,
              {
                opacity: logoOpacity,
              },
            ]}
          >
            <Text style={styles.logoText}>Scout</Text>
            <Text style={styles.tagline}>Discover Your Next Adventure</Text>
          </Animated.View>
        )}

        {showContinue && (
          <Animated.View
            style={[
              styles.continueContainer,
              {
                opacity: continueOpacity,
              },
            ]}
          >
            <TouchableOpacity
              style={styles.continueButton}
              onPress={handleContinue}
              activeOpacity={0.8}
            >
              <Text style={styles.continueText}>Continue</Text>
            </TouchableOpacity>
          </Animated.View>
        )}
      </LinearGradient>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1a1a1a",
  },
  gradient: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  particleContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  particle: {
    position: "absolute",
    width: 6,
    height: 6,
  },
  particleCore: {
    width: 6,
    height: 6,
    borderRadius: 3,
    shadowColor: "#fff",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 5,
  },
  logoContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 60,
  },
  logoText: {
    fontSize: 48,
    fontWeight: "700",
    color: Colors.neutral.white,
    marginBottom: Spacing.sm,
    textShadowColor: "rgba(255, 255, 255, 0.3)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  tagline: {
    fontSize: 18,
    fontWeight: "400",
    color: Colors.neutral.gray300,
    textAlign: "center",
    opacity: 0.9,
  },
  continueContainer: {
    position: "absolute",
    bottom: 100,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  continueButton: {
    backgroundColor: Colors.primary.red,
    paddingHorizontal: Spacing["3xl"],
    paddingVertical: Spacing.lg,
    borderRadius: 25,
    shadowColor: Colors.primary.red,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  continueText: {
    color: Colors.neutral.white,
    fontSize: 18,
    fontWeight: "600",
  },
});

export default LandingScreen;
