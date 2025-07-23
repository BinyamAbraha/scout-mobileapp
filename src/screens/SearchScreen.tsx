import React, { useState, useRef, useEffect } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  Keyboard,
  Animated,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import {
  DSText,
  DSButton,
  DSFilterPill,
  DSSectionHeader,
  Icons,
} from "../components/ui/DesignSystem";
import StyleGuide from "../design/StyleGuide";

const { Colors, Spacing, Typography, Borders, Shadows } = StyleGuide;

interface SearchScreenProps {
  route?: {
    params?: {
      initialQuery?: string;
    };
  };
}

const SearchScreen: React.FC<SearchScreenProps> = ({ route }) => {
  const navigation = useNavigation();
  const [searchQuery, setSearchQuery] = useState(
    route?.params?.initialQuery || "",
  );
  const [recentSearches, setRecentSearches] = useState([
    "Sushi",
    "Best Restaurants",
  ]);
  const searchInputRef = useRef<TextInput>(null);
  const slideAnim = useRef(new Animated.Value(0)).current;

  const quickFilters = [
    { id: "restaurants", name: "Restaurants", icon: "restaurant-outline" },
    { id: "food-trucks", name: "Food Trucks", icon: "car-outline" },
    { id: "grocery", name: "Grocery", icon: "storefront-outline" },
    { id: "laundromat", name: "Laundromat", icon: "shirt-outline" },
    { id: "slushie", name: "Slushie", icon: "snow-outline" },
  ];

  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);

  const handleFilterPress = (filterId: string) => {
    setSelectedFilters((prev) =>
      prev.includes(filterId)
        ? prev.filter((id) => id !== filterId)
        : [...prev, filterId],
    );
  };

  useEffect(() => {
    // Focus input and show keyboard
    const focusInput = () => {
      searchInputRef.current?.focus();
    };

    // Slide in animation
    Animated.spring(slideAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 100,
      friction: 8,
    }).start();

    // Small delay to ensure component is mounted
    const timer = setTimeout(focusInput, 100);
    return () => clearTimeout(timer);
  }, [slideAnim]);

  const handleSearch = () => {
    if (searchQuery.trim()) {
      // Add to recent searches if not already there
      if (!recentSearches.includes(searchQuery.trim())) {
        setRecentSearches((prev) => [searchQuery.trim(), ...prev.slice(0, 4)]);
      }

      Keyboard.dismiss();
      // Navigate back to home with search results
      navigation.goBack();
    }
  };

  const handleRecentSearch = (query: string) => {
    setSearchQuery(query);
    handleSearch();
  };

  const handleQuickFilter = (filterId: string) => {
    const filter = quickFilters.find((f) => f.id === filterId);
    if (filter) {
      setSearchQuery(filter.name);
      handleFilterPress(filterId);
    }
  };

  const handleBack = () => {
    Keyboard.dismiss();
    navigation.goBack();
  };

  const animatedStyle = {
    transform: [
      {
        translateY: slideAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [50, 0],
        }),
      },
    ],
    opacity: slideAnim,
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      <Animated.View style={[styles.content, animatedStyle]}>
        {/* Header with search input */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Ionicons
              name="arrow-back-outline"
              size={Icons.size.lg}
              color={Colors.neutral.gray700}
            />
          </TouchableOpacity>

          <View style={styles.searchContainer}>
            <TextInput
              ref={searchInputRef}
              style={styles.searchInput}
              placeholder="cleaners, movers, sushi, delivery, etc."
              placeholderTextColor={Colors.neutral.gray400}
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleSearch}
              returnKeyType="search"
              selectionColor={Colors.primary.red}
            />
          </View>

          <DSButton variant="primary" size="sm" onPress={handleSearch}>
            search
          </DSButton>
        </View>

        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Current Location */}
          <View style={styles.locationSection}>
            <TouchableOpacity style={styles.locationButton}>
              <Ionicons name="location" size={20} color="#007AFF" />
              <DSText style={styles.locationText}>Current Location</DSText>
            </TouchableOpacity>
          </View>

          {/* Quick Filters */}
          <View style={styles.quickFiltersSection}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.quickFiltersScroll}
            >
              {quickFilters.map((filter) => (
                <TouchableOpacity
                  key={filter.id}
                  style={styles.quickFilter}
                  onPress={() => handleQuickFilter(filter.id)}
                >
                  <Ionicons name={filter.icon as any} size={16} color="#666" />
                  <DSText style={styles.quickFilterText}>{filter.name}</DSText>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Recently searched */}
          {recentSearches.length > 0 && (
            <View style={styles.recentSection}>
              <DSText style={styles.sectionTitle}>Recently searched</DSText>
              {recentSearches.map((query, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.recentItem}
                  onPress={() => handleRecentSearch(query)}
                >
                  <Ionicons name="time-outline" size={20} color="#999" />
                  <DSText style={styles.recentText}>{query}</DSText>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>
      </Animated.View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e5e5",
    backgroundColor: "#fff",
  },
  backButton: {
    marginRight: 12,
    padding: 4,
  },
  searchContainer: {
    flex: 1,
    marginRight: 12,
  },
  searchInput: {
    backgroundColor: Colors.neutral.gray100,
    borderRadius: Borders.radius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    fontSize: Typography.fontSize.base,
    color: Colors.neutral.gray700,
    borderWidth: Borders.width.thin,
    borderColor: Colors.neutral.gray200,
  },
  scrollView: {
    flex: 1,
  },
  locationSection: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xl,
    borderBottomWidth: Borders.width.thin,
    borderBottomColor: Colors.neutral.gray200,
  },
  locationButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.sm,
  },
  locationText: {
    marginLeft: Spacing.md,
    fontWeight: "500",
  },
  quickFiltersSection: {
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    borderBottomWidth: Borders.width.thin,
    borderBottomColor: Colors.neutral.gray200,
  },
  quickFiltersScroll: {
    gap: Spacing.sm,
    paddingRight: Spacing.lg,
  },
  recentSection: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xl,
  },
  recentItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.md,
    borderBottomWidth: Borders.width.thin,
    borderBottomColor: Colors.neutral.gray200,
  },
  recentText: {
    marginLeft: Spacing.md,
  },
  quickFilter: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.neutral.gray100,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Borders.radius.md,
    marginRight: Spacing.sm,
  },
  quickFilterText: {
    marginLeft: Spacing.sm,
    fontSize: Typography.fontSize.sm,
    color: Colors.neutral.gray600,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.neutral.gray900,
    marginBottom: Spacing.md,
  },
});

export default SearchScreen;
