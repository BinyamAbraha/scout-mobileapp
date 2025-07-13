import React from "react";
import {
  View,
  Modal,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { DSText, DSFilterPill } from "../ui/DesignSystem";
import StyleGuide from "../../design/StyleGuide";

const { Colors, Spacing, Typography, Borders } = StyleGuide;

interface FilterModalProps {
  visible: boolean;
  onClose: () => void;
  selectedFilters: string[];
  onFilterPress: (filterId: string) => void;
}

const FilterModal: React.FC<FilterModalProps> = ({
  visible,
  onClose,
  selectedFilters,
  onFilterPress,
}) => {
  const quickFilters = [
    { id: "restaurants", name: "Restaurants", icon: "restaurant-outline" },
    { id: "food-trucks", name: "Food Trucks", icon: "car-outline" },
    { id: "grocery", name: "Grocery", icon: "storefront-outline" },
    { id: "laundromat", name: "Laundromat", icon: "shirt-outline" },
    { id: "slushie", name: "Slushie", icon: "snow-outline" },
    { id: "coffee", name: "Coffee", icon: "cafe-outline" },
    { id: "bars", name: "Bars", icon: "wine-outline" },
    { id: "shopping", name: "Shopping", icon: "bag-outline" },
    {
      id: "entertainment",
      name: "Entertainment",
      icon: "musical-notes-outline",
    },
    { id: "health", name: "Health & Fitness", icon: "fitness-outline" },
  ];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={Colors.neutral.gray700} />
          </TouchableOpacity>
          <DSText variant="h3" style={styles.headerTitle}>
            Filters
          </DSText>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Category Filters */}
          <View style={styles.section}>
            <DSText variant="h4" style={styles.sectionTitle}>
              Categories
            </DSText>
            <View style={styles.filtersGrid}>
              {quickFilters.map((filter) => (
                <DSFilterPill
                  key={filter.id}
                  label={filter.name}
                  icon={filter.icon}
                  active={selectedFilters.includes(filter.id)}
                  onPress={() => onFilterPress(filter.id)}
                />
              ))}
            </View>
          </View>

          {/* Price Range */}
          <View style={styles.section}>
            <DSText variant="h4" style={styles.sectionTitle}>
              Price Range
            </DSText>
            <View style={styles.filtersGrid}>
              {["$", "$$", "$$$", "$$$$"].map((price, index) => (
                <DSFilterPill
                  key={`price-${index}`}
                  label={price}
                  active={selectedFilters.includes(`price-${index}`)}
                  onPress={() => onFilterPress(`price-${index}`)}
                />
              ))}
            </View>
          </View>

          {/* Rating */}
          <View style={styles.section}>
            <DSText variant="h4" style={styles.sectionTitle}>
              Minimum Rating
            </DSText>
            <View style={styles.filtersGrid}>
              {["4.0+", "4.5+", "5.0"].map((rating) => (
                <DSFilterPill
                  key={`rating-${rating}`}
                  label={`⭐ ${rating}`}
                  active={selectedFilters.includes(`rating-${rating}`)}
                  onPress={() => onFilterPress(`rating-${rating}`)}
                />
              ))}
            </View>
          </View>
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.clearButton}
            onPress={() =>
              selectedFilters.forEach((filter) => onFilterPress(filter))
            }
          >
            <DSText style={styles.clearButtonText}>Clear All</DSText>
          </TouchableOpacity>
          <TouchableOpacity style={styles.applyButton} onPress={onClose}>
            <DSText style={styles.applyButtonText}>
              Apply{" "}
              {selectedFilters.length > 0 ? `(${selectedFilters.length})` : ""}
            </DSText>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.neutral.white,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: Borders.width.thin,
    borderBottomColor: Colors.neutral.gray200,
  },
  closeButton: {
    padding: Spacing.sm,
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontWeight: Typography.fontWeight.semibold,
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  section: {
    marginVertical: Spacing.lg,
  },
  sectionTitle: {
    marginBottom: Spacing.md,
    fontWeight: Typography.fontWeight.semibold,
  },
  filtersGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  footer: {
    flexDirection: "row",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    borderTopWidth: Borders.width.thin,
    borderTopColor: Colors.neutral.gray200,
    gap: Spacing.md,
  },
  clearButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: Borders.radius.md,
    borderWidth: Borders.width.thin,
    borderColor: Colors.neutral.gray300,
    alignItems: "center",
  },
  clearButtonText: {
    fontWeight: Typography.fontWeight.medium,
    color: Colors.neutral.gray700,
  },
  applyButton: {
    flex: 2,
    paddingVertical: Spacing.md,
    borderRadius: Borders.radius.md,
    backgroundColor: Colors.primary.red,
    alignItems: "center",
  },
  applyButtonText: {
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.neutral.white,
  },
});

export default FilterModal;
