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
  RefreshControl,
  TouchableOpacity,
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
import MoodSelector, {
  type MoodType as MoodSelectorType,
} from "../components/mood/MoodSelector";
import { useLocation } from "../hooks/useLocation";
import { foursquareService } from "../services/foursquareService";

const { Colors, Spacing, Typography } = StyleGuide;

const DiscoverScreen = () => {
  const navigation = useNavigation();
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(false); // Fix: Start with false, not true
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
  const [selectedMood, setSelectedMood] = useState<MoodSelectorType>();
  const [refreshing, setRefreshing] = useState(false);

  const aggregationService = VenueAggregationService.getInstance();
  const {
    location,
    loading: locationLoading,
    error: locationError,
    requestLocation,
  } = useLocation();

  // Emergency fallback - show mock data after 10 seconds if still loading
  useEffect(() => {
    const emergencyTimeout = setTimeout(() => {
      if (loading && venues.length === 0) {
        console.log("🚨 EMERGENCY: Still loading after 10s, forcing mock data");
        setLoading(false);
        setVenues(mockVenues);
        setError(null);
      }
    }, 10000);

    return () => clearTimeout(emergencyTimeout);
  }, [loading, venues.length]);

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

  // Handle mood selection
  const handleMoodSelect = (mood: MoodSelectorType) => {
    setSelectedMood(mood);
  };

  // Fetch nearby venues
  const fetchNearbyVenues = async (retryCount = 0) => {
    if (!location && retryCount === 0) {
      setLoading(false);
      setError("Unable to get location. Please enable location services.");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      console.log(
        `🔍 Fetching venues for location: ${location!.latitude}, ${location!.longitude}`,
      );

      // PHASE 1: Use direct Foursquare API (bypassing complex aggregation service)
      try {
        const foursquareVenues = await foursquareService.searchNearbyVenues(
          location!.latitude,
          location!.longitude,
          1600, // 1 mile in meters
          20,
        );

        if (foursquareVenues.length > 0) {
          console.log(
            `✅ Successfully fetched ${foursquareVenues.length} venues from Foursquare`,
          );
          setVenues(foursquareVenues);
          return;
        }
      } catch (foursquareError) {
        console.warn(
          "⚠️ Foursquare API failed, trying fallback methods:",
          foursquareError,
        );
      }

      // Temporarily skip problematic services to focus on Foursquare
      console.log("ℹ️ Skipping aggregation service and Supabase for now");

      // Fallback 3: Use mock data as last resort
      console.log("ℹ️ Using mock venues as final fallback");
      console.log("📝 Mock venues data:", mockVenues.length, "venues");
      // Add coordinates to mock venues if missing
      const venuesWithCoords = mockVenues.map((venue) => ({
        ...venue,
        coordinates: venue.coordinates || { lat: 37.7749, lng: -122.4194 },
      }));
      setVenues(venuesWithCoords);
    } catch (err) {
      console.error("❌ Error in fetchNearbyVenues:", err);
      setError("Failed to load venues. Please try again.");
      setVenues(mockVenues);
    } finally {
      setLoading(false);
    }
  };

  // Handle refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchNearbyVenues();
    setRefreshing(false);
  };

  // Handle retry
  const handleRetry = () => {
    if (locationError) {
      requestLocation();
    } else {
      fetchNearbyVenues();
    }
  };

  // Handle venue press
  const handleVenuePress = (venue: Venue) => {
    Alert.alert(
      venue.name,
      `${venue.description || "No description available"}\n\n📍 ${venue.address}\n⭐ ${venue.rating}/5 (${venue.review_count} reviews)`,
      [{ text: "OK" }],
    );
  };

  // Calculate distance for display
  const calculateDistance = (venueLat: number, venueLng: number): string => {
    if (!location || !venueLat || !venueLng) return "";

    const R = 6371; // Earth's radius in km
    const dLat = ((venueLat - location.latitude) * Math.PI) / 180;
    const dLon = ((venueLng - location.longitude) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((location.latitude * Math.PI) / 180) *
        Math.cos((venueLat * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    if (distance < 1) {
      return `${Math.round(distance * 1000)}m`;
    }
    return `${distance.toFixed(1)}mi`;
  };

  // Auto-fetch venues when location is available
  useEffect(() => {
    console.log("🔄 DiscoverScreen useEffect triggered:", {
      location: location
        ? `${location.latitude}, ${location.longitude}`
        : "null",
      loading,
      locationLoading,
      venuesCount: venues.length,
    });

    if (location && !locationLoading && venues.length === 0) {
      console.log("✅ Conditions met, calling fetchNearbyVenues");
      fetchNearbyVenues();
    } else {
      console.log("⏳ Waiting for conditions:", {
        hasLocation: !!location,
        loading,
        locationLoading,
        venuesCount: venues.length,
      });
    }
  }, [location, locationLoading, venues.length]);

  // Render venues list
  const renderVenuesList = () => (
    <View style={styles.venuesContainer}>
      {loading || locationLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#dc2626" />
          <DSText style={styles.loadingText}>
            {locationLoading
              ? "Getting your location..."
              : "Finding perfect spots nearby..."}
          </DSText>
        </View>
      ) : error || locationError ? (
        <View style={styles.errorContainer}>
          <Ionicons
            name="alert-circle-outline"
            size={48}
            color={Colors.semantic.error}
            style={styles.errorIcon}
          />
          <DSText style={styles.errorText}>{locationError || error}</DSText>
          <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
            <DSText style={styles.retryButtonText}>Try Again</DSText>
          </TouchableOpacity>
        </View>
      ) : filteredVenues.length > 0 ? (
        <FlatList
          data={filteredVenues}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <YelpVenueCard
              venue={{
                ...item,
                distance: item.coordinates
                  ? calculateDistance(
                      item.coordinates.lat,
                      item.coordinates.lng,
                    )
                  : "Unknown distance",
              }}
              onPress={handleVenuePress}
            />
          )}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.venuesList}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[Colors.primary.red]}
              tintColor={Colors.primary.red}
            />
          }
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Ionicons
            name="location-outline"
            size={48}
            color={Colors.neutral.gray400}
            style={styles.emptyIcon}
          />
          <DSText style={styles.emptyText}>No venues found nearby</DSText>
          <DSText style={styles.emptySubtext}>
            Try expanding your search area or check back later
          </DSText>
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
          placeholder={
            location
              ? `Find things to do in ${location.city || "your area"}`
              : "Find things to do nearby"
          }
          value={searchQuery}
          navigateToSearch={true}
          onFocus={handleSearchFocus}
          showFilterButton={true}
          onFilterPress={handleFilterPress}
        />
        {location && (
          <DSText style={styles.locationText}>
            📍 {location.city || "Current location"}
          </DSText>
        )}
        {/* Debug button - remove after testing */}
        <TouchableOpacity
          style={styles.debugButton}
          onPress={async () => {
            console.log(
              "🧪 Debug button pressed - testing with SF coordinates",
            );
            // Manually trigger venue fetching with SF coordinates
            setLoading(true);
            setError(null);
            try {
              const foursquareVenues =
                await foursquareService.searchNearbyVenues(
                  37.7749, // SF latitude
                  -122.4194, // SF longitude
                  1600,
                  20,
                );
              console.log(`🧪 Debug: Found ${foursquareVenues.length} venues`);
              setVenues(foursquareVenues);
            } catch (err) {
              console.error(
                "🧪 Debug: Foursquare failed, using mock data:",
                err,
              );
              setVenues(mockVenues);
            } finally {
              setLoading(false);
            }
          }}
        >
          <DSText style={styles.debugButtonText}>
            🧪 Test with SF (Debug)
          </DSText>
        </TouchableOpacity>

        {/* Quick mock data button */}
        <TouchableOpacity
          style={[
            styles.debugButton,
            { backgroundColor: Colors.neutral.gray600 },
          ]}
          onPress={() => {
            console.log("📝 Loading mock data immediately");
            const venuesWithCoords = mockVenues.map((venue) => ({
              ...venue,
              coordinates: venue.coordinates || {
                lat: 37.7749,
                lng: -122.4194,
              },
            }));
            setVenues(venuesWithCoords);
            setLoading(false);
            setError(null);
          }}
        >
          <DSText style={styles.debugButtonText}>📝 Show Mock Data</DSText>
        </TouchableOpacity>
      </View>

      {/* Mood Selector */}
      <MoodSelector
        onMoodSelect={handleMoodSelect}
        selectedMood={selectedMood}
      />

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
    color: Colors.neutral.gray400,
  },
  errorIcon: {
    marginBottom: Spacing.lg,
  },
  retryButton: {
    backgroundColor: Colors.primary.red,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: 8,
    marginTop: Spacing.lg,
  },
  retryButtonText: {
    color: Colors.neutral.white,
    fontWeight: "600",
    textAlign: "center",
  },
  locationText: {
    textAlign: "center",
    marginTop: Spacing.sm,
    color: Colors.neutral.gray500,
    fontSize: 14,
  },
  debugButton: {
    backgroundColor: Colors.primary.red,
    marginTop: Spacing.sm,
    marginHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: 8,
  },
  debugButtonText: {
    color: Colors.neutral.white,
    textAlign: "center",
    fontSize: 12,
    fontWeight: "600",
  },
  venuesList: {
    paddingBottom: Spacing["3xl"],
    backgroundColor: Colors.neutral.gray100,
  },
});

export default DiscoverScreen;
