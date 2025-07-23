// src/hooks/useTheme.ts
import { useContext, useEffect, useState } from "react";
import { useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Theme } from "../types";

// Light Theme
export const lightTheme: Theme = {
  isDark: false,
  colors: {
    primary: "#5F7FFF",
    secondary: "#FF6B6B",
    background: "#FFFFFF",
    surface: "#F5F5F5",
    text: "#000000",
    textSecondary: "#666666",
    border: "#E0E0E0",
    error: "#FF5252",
    success: "#4CAF50",
    warning: "#FFA726",
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  textStyles: {
    heading: {
      fontSize: 28,
      fontWeight: "bold",
    },
    subheading: {
      fontSize: 20,
      fontWeight: "600",
    },
    body: {
      fontSize: 16,
      fontWeight: "normal",
    },
    caption: {
      fontSize: 12,
      fontWeight: "normal",
    },
  },
};

// Dark Theme
export const darkTheme: Theme = {
  isDark: true,
  colors: {
    primary: "#7B8CFF",
    secondary: "#FF8585",
    background: "#121212",
    surface: "#1E1E1E",
    text: "#FFFFFF",
    textSecondary: "#B0B0B0",
    border: "#333333",
    error: "#FF6B6B",
    success: "#66BB6A",
    warning: "#FFB74D",
  },
  spacing: lightTheme.spacing,
  textStyles: lightTheme.textStyles,
};

// Theme Context
import React, { createContext } from "react";

interface ThemeContextType {
  theme: Theme;
  themeMode: "light" | "dark" | "auto";
  setThemeMode: (mode: "light" | "dark" | "auto") => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Theme Provider
export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<"light" | "dark" | "auto">(
    "auto",
  );
  const [isLoading, setIsLoading] = useState(true);

  // Load saved theme preference
  useEffect(() => {
    AsyncStorage.getItem("themeMode").then((saved) => {
      if (saved) {
        setThemeModeState(saved as "light" | "dark" | "auto");
      }
      setIsLoading(false);
    });
  }, []);

  // Determine active theme
  const getActiveTheme = (): Theme => {
    if (themeMode === "auto") {
      return systemColorScheme === "dark" ? darkTheme : lightTheme;
    }
    return themeMode === "dark" ? darkTheme : lightTheme;
  };

  const setThemeMode = async (mode: "light" | "dark" | "auto") => {
    setThemeModeState(mode);
    await AsyncStorage.setItem("themeMode", mode);
  };

  if (isLoading) {
    return null; // Or a loading component
  }

  return (
    <ThemeContext.Provider
      value={{
        theme: getActiveTheme(),
        themeMode,
        setThemeMode,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

// useTheme Hook
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
};

// Utility hook for themed styles
export const useThemedStyles = <T extends Record<string, any>>(
  stylesFn: (theme: Theme) => T,
): T => {
  const { theme } = useTheme();
  return stylesFn(theme);
};
