import { useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppState, AppStateStatus } from "react-native";
import type {
  AnimationMode,
  AnimationTrigger,
  AppSession,
  UserPreferences,
} from "@/types";

const STORAGE_KEYS = {
  APP_SESSION: "@scout_app_session",
  APP_VERSION: "@scout_app_version",
  USER_PREFERENCES: "@scout_user_preferences",
  ONBOARDING_COMPLETED: "@scout_onboarding_completed",
  DAILY_LAUNCHES: "@scout_daily_launches",
  INSTALL_DATE: "@scout_install_date",
} as const;

// Import version from package.json in a production app
const CURRENT_VERSION = "1.0.0";

export const useAnimationTrigger = () => {
  const [animationMode, setAnimationMode] = useState<AnimationMode>("skip");
  const [trigger, setTrigger] = useState<AnimationTrigger>("active_session");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    initializeSession();
    const subscription = AppState.addEventListener(
      "change",
      handleAppStateChange,
    );
    return () => subscription?.remove();
  }, []);

  const initializeSession = async () => {
    try {
      const now = Date.now();
      const [
        sessionData,
        storedVersion,
        preferences,
        onboardingCompleted,
        dailyLaunches,
        installDate,
      ] = await Promise.all([
        getAppSession(),
        AsyncStorage.getItem(STORAGE_KEYS.APP_VERSION),
        getUserPreferences(),
        AsyncStorage.getItem(STORAGE_KEYS.ONBOARDING_COMPLETED),
        getDailyLaunches(),
        AsyncStorage.getItem(STORAGE_KEYS.INSTALL_DATE),
      ]);

      // Set install date if first launch
      if (!installDate) {
        await AsyncStorage.setItem(STORAGE_KEYS.INSTALL_DATE, now.toString());
      }

      const detectedTrigger = await detectTrigger({
        sessionData,
        storedVersion,
        preferences,
        onboardingCompleted: onboardingCompleted === "true",
        dailyLaunches,
      });

      const mode = determineAnimationMode(detectedTrigger, preferences);

      setTrigger(detectedTrigger);
      setAnimationMode(mode);

      // Update session data
      await updateAppSession({
        lastAppOpen: now,
        isFromBackground: sessionData?.backgroundTime
          ? now - sessionData.lastAppClose < 300000
          : false, // 5 min
      });

      // Update version if needed
      if (storedVersion !== CURRENT_VERSION) {
        await AsyncStorage.setItem(STORAGE_KEYS.APP_VERSION, CURRENT_VERSION);
      }

      // Track daily launch
      await updateDailyLaunches();
    } catch (error) {
      console.error("Error initializing animation trigger:", error);
      setAnimationMode("skip");
      setTrigger("active_session");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAppStateChange = async (nextAppState: AppStateStatus) => {
    const now = Date.now();

    if (nextAppState === "background" || nextAppState === "inactive") {
      await updateAppSession({ lastAppClose: now });
    } else if (nextAppState === "active") {
      const sessionData = await getAppSession();
      if (sessionData) {
        const backgroundTime = now - sessionData.lastAppClose;
        await updateAppSession({
          lastAppOpen: now,
          backgroundTime,
          isFromBackground: true,
        });
      }
    }
  };

  const detectTrigger = async ({
    sessionData,
    storedVersion,
    preferences,
    onboardingCompleted,
    dailyLaunches,
  }: {
    sessionData: AppSession | null;
    storedVersion: string | null;
    preferences: UserPreferences;
    onboardingCompleted: boolean;
    dailyLaunches: Record<string, number>;
  }): Promise<AnimationTrigger> => {
    const today = new Date().toDateString();

    // First launch ever
    if (!onboardingCompleted) {
      return "first_launch";
    }

    // App reinstall detection (onboarding completed but no version stored)
    if (!storedVersion || !sessionData) {
      return "reinstall";
    }

    // Major update detection
    if (
      storedVersion !== CURRENT_VERSION &&
      isMajorUpdate(storedVersion, CURRENT_VERSION)
    ) {
      return "major_update";
    }

    // Special occasions
    if (isSpecialOccasion(preferences)) {
      return "special_occasion";
    }

    // Quick start preference - skip most animations
    if (preferences.quickStart) {
      return "active_session";
    }

    // First daily launch
    if (!dailyLaunches[today]) {
      return "first_daily";
    }

    // Returning from background quickly (<5 min)
    if (sessionData.isFromBackground && sessionData.backgroundTime < 300000) {
      return "background_return";
    }

    // Long absence (6+ hours)
    if (sessionData.backgroundTime > 21600000) {
      return "long_absence";
    }

    // Force quit detection (last session ended abruptly)
    if (sessionData.forceQuitDetected) {
      return "force_quit";
    }

    // Location change (if we had location tracking)
    // This would require location permissions and tracking
    // if (await hasSignificantLocationChange(sessionData.lastLocation)) {
    //   return "location_change";
    // }

    // Quick app switch
    if (sessionData.backgroundTime < 60000) {
      // 1 minute
      return "quick_switch";
    }

    return "active_session";
  };

  const determineAnimationMode = (
    trigger: AnimationTrigger,
    preferences: UserPreferences,
  ): AnimationMode => {
    // User preference override
    if (preferences.animationPreference === "minimal") {
      return "skip";
    }

    switch (trigger) {
      // Full animation triggers
      case "first_launch":
      case "major_update":
      case "special_occasion":
      case "reinstall":
        return preferences.animationPreference === "reduced" ? "brief" : "full";

      // Brief animation triggers
      case "first_daily":
      case "long_absence":
      case "force_quit":
      case "location_change":
        return "brief";

      // Skip animation triggers
      case "background_return":
      case "quick_switch":
      case "active_session":
      default:
        return "skip";
    }
  };

  const isMajorUpdate = (oldVersion: string, newVersion: string): boolean => {
    const oldMajor = oldVersion.split(".")[0];
    const newMajor = newVersion.split(".")[0];
    return oldMajor !== newMajor;
  };

  const isSpecialOccasion = (preferences: UserPreferences): boolean => {
    const today = new Date();
    const todayString = today.toDateString();

    // New Year
    if (today.getMonth() === 0 && today.getDate() === 1) {
      return true;
    }

    // User birthday
    if (preferences.birthday) {
      const birthday = new Date(preferences.birthday);
      if (
        birthday.getMonth() === today.getMonth() &&
        birthday.getDate() === today.getDate()
      ) {
        return true;
      }
    }

    // Custom special dates
    if (preferences.specialDates?.includes(todayString)) {
      return true;
    }

    return false;
  };

  const getAppSession = async (): Promise<AppSession | null> => {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.APP_SESSION);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  };

  const updateAppSession = async (updates: Partial<AppSession>) => {
    try {
      const current = await getAppSession();
      const updated = { ...current, ...updates };
      await AsyncStorage.setItem(
        STORAGE_KEYS.APP_SESSION,
        JSON.stringify(updated),
      );
    } catch (error) {
      console.error("Error updating app session:", error);
    }
  };

  const getUserPreferences = async (): Promise<UserPreferences> => {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.USER_PREFERENCES);
      return data
        ? JSON.parse(data)
        : {
            quickStart: false,
            animationPreference: "always",
          };
    } catch {
      return {
        quickStart: false,
        animationPreference: "always",
      };
    }
  };

  const getDailyLaunches = async (): Promise<Record<string, number>> => {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.DAILY_LAUNCHES);
      return data ? JSON.parse(data) : {};
    } catch {
      return {};
    }
  };

  const updateDailyLaunches = async () => {
    try {
      const today = new Date().toDateString();
      const launches = await getDailyLaunches();
      launches[today] = (launches[today] || 0) + 1;

      // Clean up old entries (keep last 30 days)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      Object.keys(launches).forEach((date) => {
        if (new Date(date) < thirtyDaysAgo) {
          delete launches[date];
        }
      });

      await AsyncStorage.setItem(
        STORAGE_KEYS.DAILY_LAUNCHES,
        JSON.stringify(launches),
      );
    } catch (error) {
      console.error("Error updating daily launches:", error);
    }
  };

  const updateUserPreferences = async (
    preferences: Partial<UserPreferences>,
  ) => {
    try {
      const current = await getUserPreferences();
      const updated = { ...current, ...preferences };
      await AsyncStorage.setItem(
        STORAGE_KEYS.USER_PREFERENCES,
        JSON.stringify(updated),
      );
    } catch (error) {
      console.error("Error updating user preferences:", error);
    }
  };

  const completeOnboarding = async () => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.ONBOARDING_COMPLETED, "true");
    } catch (error) {
      console.error("Error completing onboarding:", error);
    }
  };

  return {
    animationMode,
    trigger,
    isLoading,
    updateUserPreferences,
    completeOnboarding,
  };
};
