import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Switch,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAnimationTrigger } from "@/hooks/useAnimationTrigger";
import StyleGuide from "@/design/StyleGuide";
import type { UserPreferences } from "@/types";

const { Colors, Typography, Spacing, Borders } = StyleGuide;

interface AnimationPreferencesProps {
  onPreferencesChange?: (preferences: UserPreferences) => void;
}

const AnimationPreferences: React.FC<AnimationPreferencesProps> = ({
  onPreferencesChange,
}) => {
  const { updateUserPreferences } = useAnimationTrigger();
  const [preferences, setPreferences] = useState<UserPreferences>({
    quickStart: false,
    animationPreference: "always",
  });

  const handleQuickStartToggle = async (value: boolean) => {
    const updated = { ...preferences, quickStart: value };
    setPreferences(updated);
    await updateUserPreferences(updated);
    onPreferencesChange?.(updated);
  };

  const handleAnimationPreferenceChange = async (
    preference: "always" | "reduced" | "minimal",
  ) => {
    const updated = { ...preferences, animationPreference: preference };
    setPreferences(updated);
    await updateUserPreferences(updated);
    onPreferencesChange?.(updated);
  };

  const handleSetBirthday = () => {
    // This would open a date picker modal
    Alert.alert(
      "Birthday Setting",
      "Birthday date picker would open here. For now, this is a placeholder.",
      [{ text: "OK" }],
    );
  };

  const renderAnimationOption = (
    value: "always" | "reduced" | "minimal",
    title: string,
    description: string,
  ) => (
    <TouchableOpacity
      style={[
        styles.optionContainer,
        preferences.animationPreference === value && styles.selectedOption,
      ]}
      onPress={() => handleAnimationPreferenceChange(value)}
    >
      <View style={styles.optionContent}>
        <Text style={styles.optionTitle}>{title}</Text>
        <Text style={styles.optionDescription}>{description}</Text>
      </View>
      {preferences.animationPreference === value && (
        <Ionicons
          name="checkmark-circle"
          size={24}
          color={Colors.primary.red}
        />
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Animation Preferences</Text>

      <View style={styles.settingGroup}>
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>Quick Start</Text>
            <Text style={styles.settingDescription}>
              Skip most landing animations and go straight to the app
            </Text>
          </View>
          <Switch
            value={preferences.quickStart}
            onValueChange={handleQuickStartToggle}
            trackColor={{
              false: Colors.neutral.gray300,
              true: Colors.primary.red,
            }}
            thumbColor={Colors.neutral.white}
          />
        </View>
      </View>

      <View style={styles.settingGroup}>
        <Text style={styles.groupTitle}>Animation Style</Text>

        {renderAnimationOption(
          "always",
          "Full Animations",
          "Show complete landing animations when appropriate",
        )}

        {renderAnimationOption(
          "reduced",
          "Reduced Animations",
          "Show shorter versions of landing animations",
        )}

        {renderAnimationOption(
          "minimal",
          "Minimal Animations",
          "Skip all landing animations except for first launch",
        )}
      </View>

      <View style={styles.settingGroup}>
        <Text style={styles.groupTitle}>Special Occasions</Text>

        <TouchableOpacity style={styles.settingRow} onPress={handleSetBirthday}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>Birthday</Text>
            <Text style={styles.settingDescription}>
              {preferences.birthday
                ? `Set to ${new Date(preferences.birthday).toLocaleDateString()}`
                : "Set your birthday for special animations"}
            </Text>
          </View>
          <Ionicons
            name="chevron-forward"
            size={20}
            color={Colors.neutral.gray400}
          />
        </TouchableOpacity>
      </View>

      <View style={styles.infoBox}>
        <Ionicons
          name="information-circle-outline"
          size={20}
          color={Colors.semantic.info}
          style={styles.infoIcon}
        />
        <Text style={styles.infoText}>
          Scout shows different landing experiences based on when you open the
          app. First launches and major updates always show full animations
          regardless of these settings.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: Spacing.lg,
  },
  sectionTitle: {
    ...Typography.textStyles.h2,
    marginBottom: Spacing.xl,
  },
  settingGroup: {
    backgroundColor: Colors.neutral.white,
    marginBottom: Spacing.lg,
    ...Borders.card,
  },
  groupTitle: {
    ...Typography.textStyles.h4,
    padding: Spacing.lg,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral.gray200,
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    minHeight: 60,
  },
  settingInfo: {
    flex: 1,
    marginRight: Spacing.md,
  },
  settingTitle: {
    ...Typography.textStyles.body,
    fontWeight: "600",
    marginBottom: Spacing.xs,
  },
  settingDescription: {
    ...Typography.textStyles.bodySmall,
    color: Colors.neutral.gray500,
  },
  optionContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral.gray200,
  },
  selectedOption: {
    backgroundColor: Colors.primary.redLight,
  },
  optionContent: {
    flex: 1,
    marginRight: Spacing.md,
  },
  optionTitle: {
    ...Typography.textStyles.body,
    fontWeight: "600",
    marginBottom: Spacing.xs,
  },
  optionDescription: {
    ...Typography.textStyles.bodySmall,
    color: Colors.neutral.gray500,
  },
  infoBox: {
    flexDirection: "row",
    backgroundColor: Colors.semantic.infoLight,
    padding: Spacing.lg,
    borderRadius: Borders.radius.md,
    marginTop: Spacing.lg,
  },
  infoIcon: {
    marginRight: Spacing.sm,
    marginTop: 2,
  },
  infoText: {
    ...Typography.textStyles.bodySmall,
    color: Colors.semantic.info,
    flex: 1,
    lineHeight: 18,
  },
});

export default AnimationPreferences;
