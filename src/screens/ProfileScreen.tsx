import React from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../hooks/useTheme";

export default function ProfileScreen() {
  const { theme, themeMode, setThemeMode } = useTheme();

  const handleThemeChange = async (mode: "light" | "dark" | "auto") => {
    await setThemeMode(mode);
  };

  const profileSections = [
    {
      title: "Appearance",
      items: [
        {
          icon: "color-palette",
          title: "Theme",
          subtitle: `Current: ${themeMode}`,
          onPress: () => {
            Alert.alert("Select Theme", "Choose your preferred theme", [
              { text: "Light", onPress: () => handleThemeChange("light") },
              { text: "Dark", onPress: () => handleThemeChange("dark") },
              { text: "Auto", onPress: () => handleThemeChange("auto") },
              { text: "Cancel", style: "cancel" },
            ]);
          },
        },
      ],
    },
    {
      title: "Preferences",
      items: [
        {
          icon: "accessibility",
          title: "Accessibility Needs",
          subtitle: "Set your accessibility preferences",
          onPress: () =>
            Alert.alert(
              "Coming Soon",
              "Accessibility preferences will be available soon!",
            ),
        },
        {
          icon: "restaurant",
          title: "Dietary Restrictions",
          subtitle: "Manage your dietary preferences",
          onPress: () =>
            Alert.alert(
              "Coming Soon",
              "Dietary preferences will be available soon!",
            ),
        },
        {
          icon: "location",
          title: "Location",
          subtitle: "NYC • Change location",
          onPress: () =>
            Alert.alert(
              "Coming Soon",
              "Location selection will be available soon!",
            ),
        },
      ],
    },
    {
      title: "Account",
      items: [
        {
          icon: "person",
          title: "Personal Information",
          subtitle: "Manage your profile",
          onPress: () =>
            Alert.alert(
              "Coming Soon",
              "Profile management will be available soon!",
            ),
        },
        {
          icon: "notifications",
          title: "Notifications",
          subtitle: "Push notification settings",
          onPress: () =>
            Alert.alert(
              "Coming Soon",
              "Notification settings will be available soon!",
            ),
        },
        {
          icon: "shield-checkmark",
          title: "Privacy & Security",
          subtitle: "Control your privacy settings",
          onPress: () =>
            Alert.alert(
              "Coming Soon",
              "Privacy settings will be available soon!",
            ),
        },
      ],
    },
    {
      title: "Support",
      items: [
        {
          icon: "help-circle",
          title: "Help & Support",
          subtitle: "Get help and contact support",
          onPress: () =>
            Alert.alert(
              "Help",
              "For support, please contact us at support@scout.app",
            ),
        },
        {
          icon: "information-circle",
          title: "About Scout",
          subtitle: "Version 1.0.0",
          onPress: () =>
            Alert.alert(
              "Scout",
              "Discover venues that match your vibe!\n\nVersion 1.0.0\nBuilt with ❤️ for venue discovery",
            ),
        },
      ],
    },
  ];

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <LinearGradient
        colors={theme.isDark ? ["#1e293b", "#334155"] : ["#667eea", "#764ba2"]}
        style={styles.header}
      >
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>JD</Text>
          </View>
          <Text style={styles.userName}>John Doe</Text>
          <Text style={styles.userEmail}>john.doe@example.com</Text>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {profileSections.map((section, sectionIndex) => (
          <View key={sectionIndex} style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              {section.title}
            </Text>

            <View
              style={[
                styles.sectionCard,
                { backgroundColor: theme.colors.surface },
              ]}
            >
              {section.items.map((item, itemIndex) => (
                <TouchableOpacity
                  key={itemIndex}
                  style={[
                    styles.settingItem,
                    itemIndex !== section.items.length - 1 && {
                      borderBottomColor: theme.colors.border,
                      borderBottomWidth: 1,
                    },
                  ]}
                  onPress={item.onPress}
                  activeOpacity={0.7}
                >
                  <View style={styles.settingLeft}>
                    <View
                      style={[
                        styles.iconContainer,
                        { backgroundColor: theme.colors.primary + "20" },
                      ]}
                    >
                      <Ionicons
                        name={item.icon as any}
                        size={20}
                        color={theme.colors.primary}
                      />
                    </View>
                    <View style={styles.settingText}>
                      <Text
                        style={[
                          styles.settingTitle,
                          { color: theme.colors.text },
                        ]}
                      >
                        {item.title}
                      </Text>
                      <Text
                        style={[
                          styles.settingSubtitle,
                          { color: theme.colors.textSecondary },
                        ]}
                      >
                        {item.subtitle}
                      </Text>
                    </View>
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={20}
                    color={theme.colors.textSecondary}
                  />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        <View style={styles.bottomPadding} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 32,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  profileHeader: {
    alignItems: "center",
  },
  avatarContainer: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.3)",
    shadowColor: "rgba(0, 0, 0, 0.2)",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  avatarText: {
    fontSize: 36,
    fontWeight: "700",
    color: "white",
    letterSpacing: -1,
  },
  userName: {
    fontSize: 28,
    fontWeight: "700",
    color: "white",
    marginBottom: 6,
    letterSpacing: -0.7,
  },
  userEmail: {
    fontSize: 17,
    color: "rgba(255, 255, 255, 0.9)",
    fontWeight: "500",
    letterSpacing: 0.2,
  },
  content: {
    flex: 1,
    paddingTop: 24,
  },
  section: {
    marginBottom: 24,
    paddingHorizontal: 24,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 16,
    letterSpacing: -0.5,
  },
  sectionCard: {
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.05)",
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 20,
  },
  settingLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  settingText: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  settingSubtitle: {
    fontSize: 15,
    fontWeight: "500",
    letterSpacing: -0.1,
  },
  bottomPadding: {
    height: 32,
  },
});
