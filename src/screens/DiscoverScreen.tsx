// src/screens/DiscoverScreen.tsx
import React, { useState, useEffect } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  FlatList,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import {
  DSText,
  DSSearchBar,
  DSFilterPill,
  DSVenueCard,
  DSSectionHeader,
} from "../components/ui/DesignSystem";
import StyleGuide from "../design/StyleGuide";
import {
  venueService,
  type Venue,
  type MoodType,
} from "../services/venueService";
import { VenueAggregationService } from "../services/VenueAggregationService";
import { weatherService } from "../services/weatherService";
import type { Weather } from "../types";
import { mockVenues, categories } from "../data/mockData";
import { useNavigation } from "@react-navigation/native";
import YelpVenueCard from "../components/venue/YelpVenueCard";
import FilterModal from "../components/modals/FilterModal";

const { Colors, Spacing, Typography } = StyleGuide;

const DiscoverScreen = () => {
  const navigation = useNavigation();
  const [venues, setVenues] = useState<Venue[]>(mockVenues);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);

  const aggregationService = VenueAggregationService.getInstance();

  // Filter venues based on search only
  const filteredVenues = venues.filter((venue) => {
    const matchesSearch =
      !searchQuery ||
      venue.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      venue.category.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesSearch;
  });

  // Handle search navigation
  const handleSearchFocus = () => {
    (navigation as any).navigate("Search", { initialQuery: searchQuery });
  };

  // Handle filter press
  const handleFilterPress = () => {
    setShowFilterModal(true);
  };

  // Handle filter selection
  const handleFilterSelection = (filterId: string) => {
    setSelectedFilters((prev) =>
      prev.includes(filterId)
        ? prev.filter((id) => id !== filterId)
        : [...prev, filterId],
    );
  };

  // Close filter modal
  const handleCloseFilterModal = () => {
    setShowFilterModal(false);
  };

  // Handle venue press
  const handleVenuePress = (venue: Venue) => {
    Alert.alert(
      venue.name,
      `${venue.description || "No description available"}\n\n📍 ${venue.address}\n⭐ ${venue.rating}/5 (${venue.review_count} reviews)`,
      [{ text: "OK" }],
    );
  };

  // Render venues list
  const renderVenuesList = () => (
    <View style={styles.venuesContainer}>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#dc2626" />
          <DSText style={styles.loadingText}>Finding perfect spots...</DSText>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <DSText style={styles.errorText}>{error}</DSText>
        </View>
      ) : filteredVenues.length > 0 ? (
        <FlatList
          data={filteredVenues}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <YelpVenueCard venue={item} onPress={handleVenuePress} />
          )}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.venuesList}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <DSText style={styles.emptyText}>No venues found.</DSText>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      {/* Header with search only */}
      <View style={styles.header}>
        <DSSearchBar
          placeholder="Find things to do in San Francisco"
          value={searchQuery}
          navigateToSearch={true}
          onFocus={handleSearchFocus}
          showFilterButton={true}
          onFilterPress={handleFilterPress}
        />
      </View>

      {/* Venues List */}
      {renderVenuesList()}

      {/* Filter Modal */}
      <FilterModal
        visible={showFilterModal}
        onClose={handleCloseFilterModal}
        selectedFilters={selectedFilters}
        onFilterPress={handleFilterSelection}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.neutral.gray100,
  },
  header: {
    backgroundColor: Colors.neutral.gray100,
    paddingHorizontal: 0,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
  },
  content: {
    flex: 1,
    backgroundColor: Colors.neutral.gray100,
  },
  venuesContainer: {
    flex: 1,
  },
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing["4xl"],
  },
  loadingText: {
    marginTop: Spacing.lg,
    textAlign: "center",
  },
  errorContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing["4xl"],
    paddingHorizontal: Spacing.lg,
  },
  errorText: {
    color: Colors.semantic.error,
    textAlign: "center",
  },
  emptyText: {
    color: Colors.neutral.gray500,
    textAlign: "center",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing["4xl"],
    paddingHorizontal: Spacing.lg,
  },
  emptyIcon: {
    marginBottom: Spacing.lg,
  },
  emptySubtext: {
    textAlign: "center",
    marginTop: Spacing.sm,
  },
  venuesList: {
    paddingBottom: Spacing["3xl"],
    backgroundColor: Colors.neutral.gray100,
  },
});

export default DiscoverScreen;
