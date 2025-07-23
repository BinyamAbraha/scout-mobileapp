// src/hooks/useHaptic.ts
import { Platform } from "react-native";
import * as Haptics from "expo-haptics";

export type HapticFeedbackType =
  | "light"
  | "medium"
  | "heavy"
  | "error"
  | "success"
  | "warning";

export const useHaptic = () => {
  const triggerImpact = async (type: HapticFeedbackType = "light") => {
    // Only works on iOS and some Android devices
    if (Platform.OS === "web") return;

    try {
      switch (type) {
        case "light":
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          break;
        case "medium":
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          break;
        case "heavy":
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          break;
        case "error":
          await Haptics.notificationAsync(
            Haptics.NotificationFeedbackType.Error,
          );
          break;
        case "success":
          await Haptics.notificationAsync(
            Haptics.NotificationFeedbackType.Success,
          );
          break;
        case "warning":
          await Haptics.notificationAsync(
            Haptics.NotificationFeedbackType.Warning,
          );
          break;
      }
    } catch (error) {
      // Fail silently - haptics are enhancement only
      console.log("Haptic feedback not available");
    }
  };

  const triggerSelection = async () => {
    if (Platform.OS === "web") return;

    try {
      await Haptics.selectionAsync();
    } catch (error) {
      console.log("Haptic selection not available");
    }
  };

  return {
    triggerImpact,
    triggerSelection,
  };
};
