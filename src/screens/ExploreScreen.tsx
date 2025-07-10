import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Platform,
  KeyboardAvoidingView,
  Keyboard,
  FlatList,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import VenueCard from "../components/venue/VenueCard";
import { venueService } from "../services/venueService";
import { Venue } from "../types";

// Filter types
interface Filters {
  categories: string[];
  priceRange: number[];
  minRating: number | null;
  moods: string[];
  accessibility: string[];
  dietary: string[];
  cultural: string[];
}

// Category options
const CATEGORIES = [
  { id: "restaurant", label: "Restaurants", icon: "restaurant" },
  { id: "bar", label: "Bars", icon: "wine" },
  { id: "activity", label: "Activities", icon: "bicycle" },
  { id: "hotel", label: "Hotels", icon: "bed" },
  { id: "entertainment", label: "Entertainment", icon: "musical-notes" },
];

// Mood options
const MOODS = [
  { id: "cozy", label: "Cozy", gradient: ["#FF6B6B", "#FF8787"] },
  { id: "energetic", label: "Energetic", gradient: ["#4ECDC4", "#44A08D"] },
  { id: "special", label: "Special", gradient: ["#A8E6CF", "#7FD1AE"] },
  { id: "surprise", label: "Surprise Me", gradient: ["#FFD93D", "#FCB045"] },
];

// Price range options
const PRICE_RANGES = [
  { value: 1, label: "$" },
  { value: 2, label: "$$" },
  { value: 3, label: "$$$" },
  { value: 4, label: "$$$$" },
];

// Rating options
const RATING_OPTIONS = [
  { value: 4.5, label: "4.5+ ⭐" },
  { value: 4.0, label: "4.0+ ⭐" },
  { value: 3.5, label: "3.5+ ⭐" },
];

// Accessibility options
const ACCESSIBILITY_OPTIONS = [
  { id: "wheelchairAccess", label: "Wheelchair Access", icon: "♿" },
  { id: "audioDescriptions", label: "Audio Support", icon: "🔊" },
  { id: "brailleMenu", label: "Braille Menu", icon: "🤲" },
  { id: "staffASL", label: "ASL Staff", icon: "🤟" },
];

// Dietary options
const DIETARY_OPTIONS = [
  { id: "nutFree", label: "Nut-Free", icon: "🥜" },
  { id: "glutenFree", label: "Gluten-Free", icon: "🌾" },
  { id: "vegan", label: "Vegan", icon: "🌱" },
  { id: "vegetarian", label: "Vegetarian", icon: "🥗" },
  { id: "halal", label: "Halal", icon: "🕌" },
  { id: "kosher", label: "Kosher", icon: "✡️" },
];

// Cultural tags
const CULTURAL_OPTIONS = [
  { id: "family-friendly", label: "Family Friendly", icon: "👨‍👩‍👧‍👦" },
  { id: "date-night", label: "Date Night", icon: "💕" },
  { id: "business", label: "Business Friendly", icon: "💼" },
  { id: "casual", label: "Casual", icon: "👕" },
  { id: "upscale", label: "Upscale", icon: "🎩" },
  { id: "pet-friendly", label: "Pet Friendly", icon: "🐕" },
];

const ExploreScreen = () => {
  // State management
  const [searchQuery, setSearchQuery] = useState("");
  const [venues, setVenues] = useState<Venue[]>([]);
  const [filteredVenues, setFilteredVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<Filters>({
    categories: [],
    priceRange: [],
    minRating: null,
    moods: [],
    accessibility: [],
    dietary: [],
    cultural: [],
  });

  // Animation values
  const filterHeight = useRef(new Animated.Value(0)).current;
  const searchFocusAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Load venues on mount
  useEffect(() => {
    loadVenues();
  }, []);

  // Filter venues when search or filters change
  useEffect(() => {
    filterVenues();
  }, [searchQuery, filters, venues]);

  // Animate content on load
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, []);

  const loadVenues = async () => {
    try {
      setLoading(true);
      const response = await venueService.getAllVenues();
      setVenues(response.data || []);
    } catch (error) {
      console.error("Error loading venues:", error);
    } finally {
      setLoading(false);
    }
  };

  const refreshVenues = async () => {
    setRefreshing(true);
    await loadVenues();
    setRefreshing(false);
  };

  const filterVenues = useCallback(() => {
    let filtered = [...venues];

    // Text search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (venue) =>
          venue.name.toLowerCase().includes(query) ||
          venue.description?.toLowerCase().includes(query) ||
          venue.address.toLowerCase().includes(query) ||
          venue.category.toLowerCase().includes(query) ||
          venue.subcategory?.toLowerCase().includes(query) ||
          venue.mood_tags?.some((tag) => tag.toLowerCase().includes(query)),
      );
    }

    // Category filter
    if (filters.categories.length > 0) {
      filtered = filtered.filter((venue) =>
        filters.categories.includes(venue.category.toLowerCase()),
      );
    }

    // Price range filter
    if (filters.priceRange.length > 0) {
      filtered = filtered.filter((venue) =>
        filters.priceRange.includes(venue.price_range),
      );
    }

    // Rating filter
    if (filters.minRating) {
      filtered = filtered.filter((venue) => venue.rating >= filters.minRating!);
    }

    // Mood filter
    if (filters.moods.length > 0) {
      filtered = filtered.filter((venue) =>
        venue.mood_tags?.some((tag) => filters.moods.includes(tag)),
      );
    }

    // Accessibility filter
    if (filters.accessibility.length > 0) {
      filtered = filtered.filter((venue) => {
        if (!venue.accessibility) return false;
        return filters.accessibility.every((need) => {
          switch (need) {
            case "wheelchairAccess":
              return venue.accessibility?.wheelchairAccess;
            case "audioDescriptions":
              return venue.accessibility?.audioDescriptions;
            case "brailleMenu":
              return venue.accessibility?.brailleMenu;
            case "staffASL":
              return venue.accessibility?.staffASL;
            default:
              return false;
          }
        });
      });
    }

    // Dietary filter
    if (filters.dietary.length > 0) {
      filtered = filtered.filter((venue) => {
        if (!venue.allergy_info) return false;
        return filters.dietary.every((diet) => {
          switch (diet) {
            case "nutFree":
              return venue.allergy_info?.nutFree;
            case "glutenFree":
              return venue.allergy_info?.glutenFreeOptions;
            case "vegan":
              return venue.allergy_info?.veganOptions;
            case "vegetarian":
              return venue.allergy_info?.veganOptions; // Assuming vegan covers vegetarian
            case "halal":
            case "kosher":
              return venue.allergy_info?.customAlerts?.includes(diet);
            default:
              return false;
          }
        });
      });
    }

    // Cultural filter
    if (filters.cultural.length > 0) {
      filtered = filtered.filter((venue) =>
        venue.cultural_tags?.some((tag) => filters.cultural.includes(tag)),
      );
    }

    setFilteredVenues(filtered);
  }, [venues, searchQuery, filters]);

  const toggleFilter = () => {
    const toValue = showFilters ? 0 : 300;
    Animated.spring(filterHeight, {
      toValue,
      useNativeDriver: false,
      tension: 65,
      friction: 11,
    }).start();
    setShowFilters(!showFilters);
  };

  const handleSearchFocus = () => {
    Animated.timing(searchFocusAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: false,
    }).start();
  };

  const handleSearchBlur = () => {
    Animated.timing(searchFocusAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  };

  const toggleCategory = (categoryId: string) => {
    setFilters((prev) => ({
      ...prev,
      categories: prev.categories.includes(categoryId)
        ? prev.categories.filter((c) => c !== categoryId)
        : [...prev.categories, categoryId],
    }));
  };

  const togglePriceRange = (value: number) => {
    setFilters((prev) => ({
      ...prev,
      priceRange: prev.priceRange.includes(value)
        ? prev.priceRange.filter((p) => p !== value)
        : [...prev.priceRange, value],
    }));
  };

  const toggleMood = (moodId: string) => {
    setFilters((prev) => ({
      ...prev,
      moods: prev.moods.includes(moodId)
        ? prev.moods.filter((m) => m !== moodId)
        : [...prev.moods, moodId],
    }));
  };

  const setRatingFilter = (rating: number | null) => {
    setFilters((prev) => ({
      ...prev,
      minRating: prev.minRating === rating ? null : rating,
    }));
  };

  const toggleAccessibility = (accessibility: string) => {
    setFilters((prev) => ({
      ...prev,
      accessibility: prev.accessibility.includes(accessibility)
        ? prev.accessibility.filter((a) => a !== accessibility)
        : [...prev.accessibility, accessibility],
    }));
  };

  const toggleDietary = (dietary: string) => {
    setFilters((prev) => ({
      ...prev,
      dietary: prev.dietary.includes(dietary)
        ? prev.dietary.filter((d) => d !== dietary)
        : [...prev.dietary, dietary],
    }));
  };

  const toggleCultural = (cultural: string) => {
    setFilters((prev) => ({
      ...prev,
      cultural: prev.cultural.includes(cultural)
        ? prev.cultural.filter((c) => c !== cultural)
        : [...prev.cultural, cultural],
    }));
  };

  const clearFilters = () => {
    setFilters({
      categories: [],
      priceRange: [],
      minRating: null,
      moods: [],
      accessibility: [],
      dietary: [],
      cultural: [],
    });
    setSearchQuery("");
    Keyboard.dismiss();
  };

  const activeFilterCount = useMemo(() => {
    return (
      filters.categories.length +
      filters.priceRange.length +
      (filters.minRating ? 1 : 0) +
      filters.moods.length +
      filters.accessibility.length +
      filters.dietary.length +
      filters.cultural.length
    );
  }, [filters]);

  const renderVenueItem = ({ item }: { item: Venue }) => (
    <Animated.View
      style={{
        opacity: fadeAnim,
        transform: [
          {
            translateY: fadeAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [50, 0],
            }),
          },
        ],
      }}
    >
      <VenueCard venue={item} />
    </Animated.View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="search" size={64} color="#CBD5E1" />
      <Text style={styles.emptyStateTitle}>No venues found</Text>
      <Text style={styles.emptyStateText}>
        Try adjusting your search or filters
      </Text>
      <TouchableOpacity
        onPress={clearFilters}
        style={styles.clearFiltersButton}
      >
        <Text style={styles.clearFiltersText}>Clear Filters</Text>
      </TouchableOpacity>
    </View>
  );

  const renderHeader = () => (
    <Animated.View style={{ opacity: fadeAnim }}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Animated.View
          style={[
            styles.searchBar,
            {
              shadowOpacity: searchFocusAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0.1, 0.2],
              }),
              elevation: searchFocusAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [2, 8],
              }),
            },
          ]}
        >
          <Ionicons name="search" size={20} color="#6B7280" />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            onFocus={handleSearchFocus}
            onBlur={handleSearchBlur}
            placeholder="Search venues, moods, or areas..."
            placeholderTextColor="#9CA3AF"
            style={styles.searchInput}
            returnKeyType="search"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery("")}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close-circle" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </Animated.View>
      </View>

      {/* Filter Button */}
      <View style={styles.filterButtonContainer}>
        <TouchableOpacity
          onPress={toggleFilter}
          style={[
            styles.filterButton,
            activeFilterCount > 0 && styles.filterButtonActive,
          ]}
          activeOpacity={0.7}
        >
          <View style={styles.filterButtonContent}>
            <View style={styles.filterButtonLeft}>
              <Ionicons
                name="filter"
                size={20}
                color={activeFilterCount > 0 ? "#3B82F6" : "#6B7280"}
              />
              <Text
                style={[
                  styles.filterButtonText,
                  activeFilterCount > 0 && styles.filterButtonTextActive,
                ]}
              >
                Filters
                {activeFilterCount > 0 && ` (${activeFilterCount})`}
              </Text>
            </View>
            <Ionicons
              name={showFilters ? "chevron-up" : "chevron-down"}
              size={20}
              color="#6B7280"
            />
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.sortButton} activeOpacity={0.7}>
          <Ionicons name="swap-vertical" size={20} color="#6B7280" />
          <Text style={styles.sortButtonText}>Sort</Text>
        </TouchableOpacity>
      </View>

      {/* Animated Filter Panel */}
      <Animated.View
        style={[
          styles.filterPanel,
          {
            height: filterHeight,
            overflow: "hidden",
          },
        ]}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          bounces={false}
          contentContainerStyle={styles.filterScrollContent}
        >
          {/* Categories */}
          <View style={styles.filterSection}>
            <Text style={styles.filterSectionTitle}>Categories</Text>
            <View style={styles.filterChips}>
              {CATEGORIES.map((category) => {
                const isActive = filters.categories.includes(category.id);
                return (
                  <TouchableOpacity
                    key={category.id}
                    onPress={() => toggleCategory(category.id)}
                    style={[styles.chip, isActive && styles.chipActive]}
                  >
                    <Ionicons
                      name={category.icon as any}
                      size={16}
                      color={isActive ? "white" : "#4B5563"}
                    />
                    <Text
                      style={[
                        styles.chipText,
                        isActive && styles.chipTextActive,
                      ]}
                    >
                      {category.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Price Range */}
          <View style={styles.filterSection}>
            <Text style={styles.filterSectionTitle}>Price Range</Text>
            <View style={styles.filterChips}>
              {PRICE_RANGES.map((price) => {
                const isActive = filters.priceRange.includes(price.value);
                return (
                  <TouchableOpacity
                    key={price.value}
                    onPress={() => togglePriceRange(price.value)}
                    style={[styles.chip, isActive && styles.chipActive]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        isActive && styles.chipTextActive,
                      ]}
                    >
                      {price.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Rating */}
          <View style={styles.filterSection}>
            <Text style={styles.filterSectionTitle}>Minimum Rating</Text>
            <View style={styles.filterChips}>
              {RATING_OPTIONS.map((rating) => {
                const isActive = filters.minRating === rating.value;
                return (
                  <TouchableOpacity
                    key={rating.value}
                    onPress={() => setRatingFilter(rating.value)}
                    style={[styles.chip, isActive && styles.chipActive]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        isActive && styles.chipTextActive,
                      ]}
                    >
                      {rating.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Moods */}
          <View style={styles.filterSection}>
            <Text style={styles.filterSectionTitle}>Moods</Text>
            <View style={styles.filterChips}>
              {MOODS.map((mood) => {
                const isActive = filters.moods.includes(mood.id);
                return (
                  <TouchableOpacity
                    key={mood.id}
                    onPress={() => toggleMood(mood.id)}
                    style={styles.moodChipContainer}
                  >
                    {isActive ? (
                      <LinearGradient
                        colors={mood.gradient as [string, string]}
                        style={styles.moodChip}
                      >
                        <Text style={styles.moodChipText}>{mood.label}</Text>
                      </LinearGradient>
                    ) : (
                      <View style={[styles.moodChip, styles.moodChipInactive]}>
                        <Text style={styles.moodChipTextInactive}>
                          {mood.label}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Accessibility */}
          <View style={styles.filterSection}>
            <Text style={styles.filterSectionTitle}>Accessibility</Text>
            <View style={styles.filterChips}>
              {ACCESSIBILITY_OPTIONS.map((option) => {
                const isActive = filters.accessibility.includes(option.id);
                return (
                  <TouchableOpacity
                    key={option.id}
                    onPress={() => toggleAccessibility(option.id)}
                    style={[styles.chip, isActive && styles.chipActive]}
                  >
                    <Text style={styles.chipIcon}>{option.icon}</Text>
                    <Text
                      style={[
                        styles.chipText,
                        isActive && styles.chipTextActive,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Dietary */}
          <View style={styles.filterSection}>
            <Text style={styles.filterSectionTitle}>Dietary Options</Text>
            <View style={styles.filterChips}>
              {DIETARY_OPTIONS.map((option) => {
                const isActive = filters.dietary.includes(option.id);
                return (
                  <TouchableOpacity
                    key={option.id}
                    onPress={() => toggleDietary(option.id)}
                    style={[styles.chip, isActive && styles.chipActive]}
                  >
                    <Text style={styles.chipIcon}>{option.icon}</Text>
                    <Text
                      style={[
                        styles.chipText,
                        isActive && styles.chipTextActive,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Cultural Tags */}
          <View style={styles.filterSection}>
            <Text style={styles.filterSectionTitle}>Venue Style</Text>
            <View style={styles.filterChips}>
              {CULTURAL_OPTIONS.map((option) => {
                const isActive = filters.cultural.includes(option.id);
                return (
                  <TouchableOpacity
                    key={option.id}
                    onPress={() => toggleCultural(option.id)}
                    style={[styles.chip, isActive && styles.chipActive]}
                  >
                    <Text style={styles.chipIcon}>{option.icon}</Text>
                    <Text
                      style={[
                        styles.chipText,
                        isActive && styles.chipTextActive,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Clear Filters */}
          {activeFilterCount > 0 && (
            <TouchableOpacity
              onPress={clearFilters}
              style={styles.clearAllButton}
            >
              <Text style={styles.clearAllText}>Clear All Filters</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </Animated.View>

      {/* Results Count */}
      <View style={styles.resultsCount}>
        <Text style={styles.resultsCountText}>
          {loading
            ? "Loading venues..."
            : `${filteredVenues.length} venue${
                filteredVenues.length !== 1 ? "s" : ""
              } found`}
        </Text>
      </View>
    </Animated.View>
  );

  if (loading && venues.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Discovering venues...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
      >
        <FlatList
          data={filteredVenues}
          renderItem={renderVenueItem}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={renderEmptyState}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onRefresh={refreshVenues}
          refreshing={refreshing}
          keyboardShouldPersistTaps="handled"
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          windowSize={10}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    color: "#6B7280",
    fontSize: 16,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  searchBar: {
    backgroundColor: "white",
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
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
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: "#1F2937",
  },
  filterButtonContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    flexDirection: "row",
    gap: 8,
  },
  filterButton: {
    flex: 1,
    backgroundColor: "#E5E7EB",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginRight: 8,
  },
  filterButtonActive: {
    backgroundColor: "#EBF5FF",
  },
  filterButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  filterButtonLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  filterButtonText: {
    marginLeft: 8,
    fontSize: 15,
    fontWeight: "500",
    color: "#374151",
  },
  filterButtonTextActive: {
    color: "#3B82F6",
  },
  sortButton: {
    backgroundColor: "#E5E7EB",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  sortButtonText: {
    marginLeft: 8,
    fontSize: 15,
    fontWeight: "500",
    color: "#374151",
  },
  filterPanel: {
    backgroundColor: "#F3F4F6",
  },
  filterScrollContent: {
    paddingHorizontal: 16,
  },
  filterSection: {
    marginBottom: 16,
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 12,
    letterSpacing: -0.3,
  },
  filterChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#E5E7EB",
    flexDirection: "row",
    alignItems: "center",
    marginRight: 8,
    marginBottom: 8,
  },
  chipActive: {
    backgroundColor: "#3B82F6",
  },
  chipIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  chipText: {
    fontSize: 14,
    color: "#374151",
  },
  chipTextActive: {
    color: "white",
  },
  moodChipContainer: {
    marginRight: 8,
    marginBottom: 8,
  },
  moodChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  moodChipInactive: {
    backgroundColor: "#E5E7EB",
  },
  moodChipText: {
    fontSize: 14,
    color: "white",
    fontWeight: "500",
  },
  moodChipTextInactive: {
    fontSize: 14,
    color: "#374151",
    fontWeight: "500",
  },
  clearAllButton: {
    paddingVertical: 12,
    marginBottom: 16,
  },
  clearAllText: {
    color: "#EF4444",
    fontSize: 15,
    fontWeight: "500",
    textAlign: "center",
  },
  resultsCount: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  resultsCountText: {
    fontSize: 14,
    color: "#6B7280",
  },
  listContent: {
    paddingBottom: 20,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
    paddingVertical: 80,
  },
  emptyStateTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1F2937",
    marginTop: 16,
    textAlign: "center",
    letterSpacing: -0.5,
  },
  emptyStateText: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    marginTop: 8,
  },
  clearFiltersButton: {
    marginTop: 32,
    backgroundColor: "#3B82F6",
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 24,
    shadowColor: "#3B82F6",
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  clearFiltersText: {
    color: "white",
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
});

export default ExploreScreen;
