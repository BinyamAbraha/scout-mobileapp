import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Animated,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface SearchSuggestionsProps {
  query: string;
  suggestions: string[];
  recentSearches: string[];
  popularSearches: string[];
  onSelectSuggestion: (suggestion: string) => void;
  onClearRecent: () => void;
  visible: boolean;
}

const SearchSuggestions: React.FC<SearchSuggestionsProps> = ({
  query,
  suggestions,
  recentSearches,
  popularSearches,
  onSelectSuggestion,
  onClearRecent,
  visible,
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-20)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 65,
          friction: 11,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: -20,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  if (!visible) return null;

  const renderSuggestionItem = (
    suggestion: string,
    icon: keyof typeof Ionicons.glyphMap,
    isRecent: boolean = false,
  ) => (
    <TouchableOpacity
      key={suggestion}
      onPress={() => onSelectSuggestion(suggestion)}
      style={styles.suggestionItem}
      activeOpacity={0.7}
    >
      <Ionicons
        name={icon}
        size={20}
        color={isRecent ? "#9CA3AF" : "#6B7280"}
      />
      <Text style={styles.suggestionText}>{suggestion}</Text>
      <Ionicons name="arrow-forward" size={16} color="#CBD5E1" />
    </TouchableOpacity>
  );

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        bounces={false}
      >
        {/* Search Suggestions */}
        {query.length > 0 && suggestions.length > 0 && (
          <View>
            <Text style={styles.sectionHeader}>Suggestions</Text>
            {suggestions.map((suggestion) =>
              renderSuggestionItem(suggestion, "search", false),
            )}
          </View>
        )}

        {/* Recent Searches */}
        {query.length === 0 && recentSearches.length > 0 && (
          <View>
            <View style={styles.recentHeader}>
              <Text style={styles.sectionHeader}>Recent</Text>
              <TouchableOpacity onPress={onClearRecent}>
                <Text style={styles.clearText}>Clear</Text>
              </TouchableOpacity>
            </View>
            {recentSearches.map((search) =>
              renderSuggestionItem(search, "time", true),
            )}
          </View>
        )}

        {/* Popular Searches */}
        {query.length === 0 && popularSearches.length > 0 && (
          <View>
            <Text style={styles.sectionHeader}>Popular in NYC</Text>
            {popularSearches.map((search) =>
              renderSuggestionItem(search, "trending-up", false),
            )}
          </View>
        )}

        {/* Quick Filters */}
        {query.length === 0 && (
          <View style={styles.quickFiltersContainer}>
            <Text style={styles.quickFiltersHeader}>Quick Filters</Text>
            <View style={styles.filtersGrid}>
              {[
                { label: "🍕 Pizza", query: "pizza" },
                { label: "☕ Coffee", query: "coffee" },
                { label: "🍜 Ramen", query: "ramen" },
                { label: "🌮 Tacos", query: "tacos" },
                { label: "🍺 Craft Beer", query: "craft beer" },
                { label: "🎭 Live Music", query: "live music" },
              ].map((filter) => (
                <TouchableOpacity
                  key={filter.query}
                  onPress={() => onSelectSuggestion(filter.query)}
                  style={styles.filterChip}
                >
                  <Text style={styles.filterChipText}>{filter.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    backgroundColor: "white",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    zIndex: 50,
    maxHeight: 384,
  },
  suggestionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  suggestionText: {
    flex: 1,
    marginLeft: 12,
    color: "#1F2937",
    fontSize: 16,
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
    textTransform: "uppercase",
  },
  recentHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  clearText: {
    fontSize: 12,
    color: "#3B82F6",
  },
  quickFiltersContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  quickFiltersHeader: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
    textTransform: "uppercase",
    marginBottom: 8,
  },
  filtersGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -4,
  },
  filterChip: {
    margin: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#F3F4F6",
    borderRadius: 20,
  },
  filterChipText: {
    fontSize: 14,
    color: "#374151",
  },
});

export default SearchSuggestions;
