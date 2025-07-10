import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface Category {
  id: string;
  name: string;
  icon: string;
}

interface CategoryPillsProps {
  categories: Category[];
  selectedCategory?: string;
  onCategoryPress: (categoryId: string) => void;
  style?: any;
}

const CategoryPills: React.FC<CategoryPillsProps> = ({
  categories,
  selectedCategory,
  onCategoryPress,
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {categories.map((category) => (
          <TouchableOpacity
            key={category.id}
            style={[
              styles.pill,
              selectedCategory === category.id && styles.pillSelected,
            ]}
            onPress={() => onCategoryPress(category.id)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={category.icon as any}
              size={16}
              color={selectedCategory === category.id ? "#666" : "#999"}
              style={styles.pillIcon}
            />
            <Text
              style={[
                styles.pillText,
                selectedCategory === category.id && styles.pillTextSelected,
              ]}
            >
              {category.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#e5e5e5",
    minWidth: 80,
  },
  pillSelected: {
    backgroundColor: "#fff",
    borderColor: "#d1d5db",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  pillIcon: {
    marginRight: 6,
  },
  pillText: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  pillTextSelected: {
    color: "#333",
    fontWeight: "600",
  },
});

export default CategoryPills;
