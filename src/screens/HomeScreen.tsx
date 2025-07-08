// src/screens/HomeScreen.tsx
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  FlatList,
  TouchableOpacity,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import SearchBar from "../components/search/SearchBar";
import CategoryPills from "../components/search/CategoryPills";
import YelpVenueCard from "../components/venue/YelpVenueCard";
import {
  venueService,
  type Venue,
  type MoodType,
} from "../services/venueService";
import { VenueAggregationService } from "../services/VenueAggregationService";
import { weatherService } from "../services/weatherService";
import type { Weather } from "../types";
import { mockVenues, categories } from "../data/mockData";

const HomeScreen = () => {
  const [selectedMood, setSelectedMood] = useState<MoodType | null>(null);
  const [venues, setVenues] = useState<Venue[]>(mockVenues);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [showMoodFilter, setShowMoodFilter] = useState(false);

  const aggregationService = VenueAggregationService.getInstance();

  // Filter venues based on search and category
  const filteredVenues = venues.filter((venue) => {
    const matchesSearch =
      !searchQuery ||
      venue.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      venue.category.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      !selectedCategory ||
      venue.category.toLowerCase() === selectedCategory.toLowerCase();

    return matchesSearch && matchesCategory;
  });

  // Handle search
  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  // Handle category selection
  const handleCategoryPress = (categoryId: string) => {
    setSelectedCategory(selectedCategory === categoryId ? "" : categoryId);
  };

  // Handle mood filter
  const handleMoodFilter = (mood: MoodType) => {
    setSelectedMood(selectedMood === mood ? null : mood);
    setShowMoodFilter(false);
  };

  // Handle venue press
  const handleVenuePress = (venue: Venue) => {
    Alert.alert(
      venue.name,
      `${venue.description || "No description available"}\n\n📍 ${venue.address}\n⭐ ${venue.rating}/5 (${venue.review_count} reviews)`,
      [{ text: "OK" }],
    );
  };

  // Render mood filter section
  const renderMoodFilter = () => (
    <View style={styles.moodFilterSection}>
      <TouchableOpacity
        style={styles.moodFilterButton}
        onPress={() => setShowMoodFilter(!showMoodFilter)}
      >
        <Ionicons name="happy-outline" size={16} color="#666" />
        <Text style={styles.moodFilterText}>
          {selectedMood ? `${selectedMood} vibes` : "Filter by vibe"}
        </Text>
        <Ionicons name="chevron-down" size={16} color="#666" />
      </TouchableOpacity>

      {showMoodFilter && (
        <View style={styles.moodOptions}>
          {["cozy", "energetic", "special", "surprise"].map((mood) => (
            <TouchableOpacity
              key={mood}
              style={[
                styles.moodOption,
                selectedMood === mood && styles.moodOptionSelected,
              ]}
              onPress={() => handleMoodFilter(mood as MoodType)}
            >
              <Text
                style={[
                  styles.moodOptionText,
                  selectedMood === mood && styles.moodOptionTextSelected,
                ]}
              >
                {mood}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );

  // Render venues list
  const renderVenuesList = () => (
    <View style={styles.venuesContainer}>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#dc2626" />
          <Text style={styles.loadingText}>Finding perfect spots...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
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
          <Text style={styles.emptyText}>No venues found.</Text>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      <View style={styles.header}>
        <SearchBar
          placeholder="Search for restaurants, cafes, etc."
          value={searchQuery}
          onChangeText={handleSearch}
          onSubmit={handleSearch}
          navigateToSearch={true}
        />

        <CategoryPills
          categories={categories}
          selectedCategory={selectedCategory}
          onCategoryPress={handleCategoryPress}
        />

        {renderMoodFilter()}
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {renderVenuesList()}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e5e5",
    paddingBottom: 8,
  },
  content: {
    flex: 1,
    backgroundColor: "#f9f9f9",
  },
  scrollContent: {
    paddingBottom: 32,
  },
  moodFilterSection: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  moodFilterButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#e5e5e5",
    alignSelf: "flex-start",
    gap: 6,
  },
  moodFilterText: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  moodOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 8,
    gap: 8,
  },
  moodOption: {
    backgroundColor: "#f5f5f5",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "#e5e5e5",
  },
  moodOptionSelected: {
    backgroundColor: "#dc2626",
    borderColor: "#dc2626",
  },
  moodOptionText: {
    fontSize: 12,
    color: "#666",
    fontWeight: "500",
    textTransform: "capitalize",
  },
  moodOptionTextSelected: {
    color: "#fff",
    fontWeight: "600",
  },
  venuesContainer: {
    flex: 1,
  },
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 16,
    color: "#64748b",
    marginTop: 16,
  },
  errorContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  errorText: {
    fontSize: 16,
    color: "#ef4444",
    textAlign: "center",
    marginBottom: 20,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  emptyText: {
    fontSize: 16,
    color: "#64748b",
    textAlign: "center",
    marginBottom: 20,
  },
  venuesList: {
    paddingBottom: 20,
  },
});

export default HomeScreen;
