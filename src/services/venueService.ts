import { supabase } from "../utils/supabase";
import { Venue, MoodType, Weather, SearchFilters } from "../types";

// Enhanced filter interface for advanced queries
interface VenueFilters extends SearchFilters {
  searchQuery?: string;
  limit?: number;
  offset?: number;
}

// Service response interface for consistent error handling
interface ServiceResponse<T> {
  data?: T;
  error?: string;
  loading: boolean;
}

// Weather suitability filter
interface WeatherFilter {
  temperature: number;
  isRaining: boolean;
  windSpeed: number;
  requiresCovered?: boolean;
  requiresHeating?: boolean;
  requiresAC?: boolean;
}

// Sort options
export type SortOption =
  | "rating"
  | "price_asc"
  | "price_desc"
  | "name"
  | "review_count";

class VenueService {
  // Enhanced cache management with better typing
  private cache = new Map<string, { data: any; timestamp: number }>();
  private cacheTimeout = 5 * 60 * 1000; // 5 minutes
  private loadingStates = new Map<string, boolean>();

  // Get loading state for a specific operation
  isLoading(operation: string): boolean {
    return this.loadingStates.get(operation) || false;
  }

  // Set loading state
  private setLoading(operation: string, loading: boolean): void {
    this.loadingStates.set(operation, loading);
  }

  // Enhanced error handling wrapper
  private async handleServiceCall<T>(
    operation: string,
    serviceCall: () => Promise<T>,
  ): Promise<ServiceResponse<T>> {
    this.setLoading(operation, true);
    try {
      const data = await serviceCall();
      this.setLoading(operation, false);
      return { data, loading: false };
    } catch (error) {
      this.setLoading(operation, false);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      console.error(`Error in ${operation}:`, error);
      return { error: errorMessage, loading: false };
    }
  }

  // Batch operations for performance
  async getVenuesBatch(venueIds: string[]): Promise<ServiceResponse<Venue[]>> {
    return this.handleServiceCall("getVenuesBatch", async () => {
      const { data, error } = await supabase
        .from("venues")
        .select("*")
        .in("id", venueIds);

      if (error) throw error;
      return data || [];
    });
  }

  // Enhanced batch operation with error handling
  async getVenuesBatchOriginal(venueIds: string[]): Promise<Venue[]> {
    try {
      const { data, error } = await supabase
        .from("venues")
        .select("*")
        .in("id", venueIds);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error("Error fetching venues batch:", error);
      throw error;
    }
  }

  // Get trending venues (based on recent activity - placeholder for future implementation)
  async getTrendingVenues(
    city: string = "New York",
    limit: number = 10,
  ): Promise<Venue[]> {
    try {
      // For now, return highly rated venues with many reviews
      // In the future, this could use real-time data like recent check-ins, social media mentions, etc.
      const { data, error } = await supabase
        .from("venues")
        .select("*")
        .eq("city", city)
        .gte("rating", 4.3)
        .gte("review_count", 50)
        .order("review_count", { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error("Error fetching trending venues:", error);
      throw error;
    }
  }

  // Enhanced cache management helpers
  private getCachedData(key: string): any | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    this.cache.delete(key);
    return null;
  }

  private setCachedData(key: string, data: any): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  // Clear cache with optional pattern matching
  clearCache(pattern?: string): void {
    if (pattern) {
      const keysToDelete = Array.from(this.cache.keys()).filter((key) =>
        key.includes(pattern),
      );
      keysToDelete.forEach((key) => this.cache.delete(key));
    } else {
      this.cache.clear();
    }
  }

  // Get cache stats for debugging
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }

  // Get all venues with enhanced caching and error handling
  async getAllVenues(
    city: string = "New York",
  ): Promise<ServiceResponse<Venue[]>> {
    const cacheKey = `venues_${city}`;
    const cachedData = this.getCachedData(cacheKey);

    if (cachedData) {
      return { data: cachedData, loading: false };
    }

    return this.handleServiceCall("getAllVenues", async () => {
      const { data, error } = await supabase
        .from("venues")
        .select("*")
        .eq("city", city)
        .order("rating", { ascending: false });

      if (error) throw error;
      const venues = data || [];
      this.setCachedData(cacheKey, venues);
      return venues;
    });
  }

  // Get venues filtered by weather conditions
  async getVenuesByWeather(
    weather: Weather,
    city: string = "New York",
  ): Promise<ServiceResponse<Venue[]>> {
    const cacheKey = `weather_venues_${city}_${weather.temp}_${weather.isRaining}`;
    const cachedData = this.getCachedData(cacheKey);

    if (cachedData) {
      return { data: cachedData, loading: false };
    }

    return this.handleServiceCall("getVenuesByWeather", async () => {
      let query = supabase.from("venues").select("*").eq("city", city);

      // Filter based on weather conditions
      if (weather.isRaining) {
        query = query.or(
          "weather_suitability->>covered.eq.true,weather_suitability->>outdoor.eq.false",
        );
      }

      if (weather.temp < 50) {
        query = query.eq("weather_suitability->>heating", true);
      }

      if (weather.temp > 80) {
        query = query.eq("weather_suitability->>airConditioning", true);
      }

      if (weather.isSunny && !weather.isRaining) {
        query = query.eq("weather_suitability->>outdoor", true);
      }

      query = query.order("rating", { ascending: false }).limit(20);

      const { data, error } = await query;
      if (error) throw error;

      const venues = data || [];
      this.setCachedData(cacheKey, venues);
      return venues;
    });
  }

  // Get venues by accessibility features
  async getVenuesByAccessibility(
    accessibilityNeeds: string[],
    city: string = "New York",
  ): Promise<ServiceResponse<Venue[]>> {
    const cacheKey = `accessibility_venues_${city}_${accessibilityNeeds.join("_")}`;
    const cachedData = this.getCachedData(cacheKey);

    if (cachedData) {
      return { data: cachedData, loading: false };
    }

    return this.handleServiceCall("getVenuesByAccessibility", async () => {
      let query = supabase.from("venues").select("*").eq("city", city);

      // Apply accessibility filters
      if (accessibilityNeeds.includes("wheelchairAccess")) {
        query = query.eq("accessibility->>wheelchairAccess", true);
      }

      if (accessibilityNeeds.includes("audioDescriptions")) {
        query = query.eq("accessibility->>audioDescriptions", true);
      }

      if (accessibilityNeeds.includes("brailleMenu")) {
        query = query.eq("accessibility->>brailleMenu", true);
      }

      if (accessibilityNeeds.includes("staffASL")) {
        query = query.eq("accessibility->>staffASL", true);
      }

      query = query.order("rating", { ascending: false });

      const { data, error } = await query;
      if (error) throw error;

      const venues = data || [];
      this.setCachedData(cacheKey, venues);
      return venues;
    });
  }

  // Enhanced venues by mood with caching and error handling
  async getVenuesByMood(
    mood: string,
    city: string = "New York",
  ): Promise<ServiceResponse<Venue[]>> {
    const cacheKey = `mood_venues_${city}_${mood}`;
    const cachedData = this.getCachedData(cacheKey);

    if (cachedData) {
      return { data: cachedData, loading: false };
    }

    return this.handleServiceCall("getVenuesByMood", async () => {
      const { data, error } = await supabase
        .from("venues")
        .select("*")
        .eq("city", city)
        .contains("mood_tags", [mood])
        .order("rating", { ascending: false })
        .limit(10);

      if (error) throw error;
      const venues = data || [];
      this.setCachedData(cacheKey, venues);
      return venues;
    });
  }

  // Get venues by multiple moods with enhanced filtering
  async getVenuesByMoods(
    moods: MoodType[],
    city: string = "New York",
  ): Promise<ServiceResponse<Venue[]>> {
    const cacheKey = `moods_venues_${city}_${moods.join("_")}`;
    const cachedData = this.getCachedData(cacheKey);

    if (cachedData) {
      return { data: cachedData, loading: false };
    }

    return this.handleServiceCall("getVenuesByMoods", async () => {
      const { data, error } = await supabase
        .from("venues")
        .select("*")
        .eq("city", city)
        .or(moods.map((mood) => `mood_tags.cs.{${mood}}`).join(","))
        .order("rating", { ascending: false })
        .limit(20);

      if (error) throw error;
      const venues = data || [];
      this.setCachedData(cacheKey, venues);
      return venues;
    });
  }

  // Enhanced filtering with multiple criteria and caching
  async getFilteredVenues(
    filters: VenueFilters,
    city: string = "New York",
  ): Promise<ServiceResponse<Venue[]>> {
    const cacheKey = `filtered_venues_${city}_${JSON.stringify(filters)}`;
    const cachedData = this.getCachedData(cacheKey);

    if (cachedData) {
      return { data: cachedData, loading: false };
    }

    return this.handleServiceCall("getFilteredVenues", async () => {
      let query = supabase.from("venues").select("*").eq("city", city);

      // Category filter
      if (filters.categories && filters.categories.length > 0) {
        query = query.in("category", filters.categories);
      }

      // Price range filter
      if (filters.priceRange) {
        query = query
          .gte("price_range", filters.priceRange.min)
          .lte("price_range", filters.priceRange.max);
      }

      // Rating filter - using SearchFilters interface
      if (filters.moods && filters.moods.length > 0) {
        query = query.or(
          filters.moods.map((mood) => `mood_tags.cs.{${mood}}`).join(","),
        );
      }

      // Features filter
      if (filters.features && filters.features.length > 0) {
        query = query.contains("features", filters.features);
      }

      // Accessibility filter
      if (filters.accessibility && filters.accessibility.length > 0) {
        const accessibilityConditions = filters.accessibility
          .map((need) => {
            switch (need) {
              case "wheelchairAccess":
                return "accessibility->>wheelchairAccess.eq.true";
              case "audioDescriptions":
                return "accessibility->>audioDescriptions.eq.true";
              case "brailleMenu":
                return "accessibility->>brailleMenu.eq.true";
              case "staffASL":
                return "accessibility->>staffASL.eq.true";
              default:
                return null;
            }
          })
          .filter(Boolean);

        if (accessibilityConditions.length > 0) {
          query = query.or(accessibilityConditions.join(","));
        }
      }

      // Weather appropriate filter
      if (filters.weatherAppropriate) {
        query = query.or(
          "weather_suitability->>covered.eq.true,weather_suitability->>outdoor.eq.true",
        );
      }

      // Text search
      if (filters.searchQuery) {
        const searchTerm = `%${filters.searchQuery}%`;
        query = query.or(
          `name.ilike.${searchTerm},description.ilike.${searchTerm},address.ilike.${searchTerm}`,
        );
      }

      // Pagination
      if (filters.offset) {
        query = query.range(
          filters.offset,
          filters.offset + (filters.limit || 20) - 1,
        );
      } else if (filters.limit) {
        query = query.limit(filters.limit);
      }

      // Default ordering
      query = query.order("rating", { ascending: false });

      const { data, error } = await query;
      if (error) throw error;

      const venues = data || [];
      this.setCachedData(cacheKey, venues);
      return venues;
    });
  }

  // Get venues by dietary restrictions and allergy information
  async getVenuesByDietaryNeeds(
    dietaryNeeds: string[],
    city: string = "New York",
  ): Promise<ServiceResponse<Venue[]>> {
    const cacheKey = `dietary_venues_${city}_${dietaryNeeds.join("_")}`;
    const cachedData = this.getCachedData(cacheKey);

    if (cachedData) {
      return { data: cachedData, loading: false };
    }

    return this.handleServiceCall("getVenuesByDietaryNeeds", async () => {
      let query = supabase.from("venues").select("*").eq("city", city);

      // Apply dietary filters
      if (dietaryNeeds.includes("nutFree")) {
        query = query.eq("allergy_info->>nutFree", true);
      }

      if (dietaryNeeds.includes("glutenFree")) {
        query = query.eq("allergy_info->>glutenFreeOptions", true);
      }

      if (dietaryNeeds.includes("vegan")) {
        query = query.eq("allergy_info->>veganOptions", true);
      }

      query = query.order("rating", { ascending: false });

      const { data, error } = await query;
      if (error) throw error;

      const venues = data || [];
      this.setCachedData(cacheKey, venues);
      return venues;
    });
  }

  // Get venues by cultural tags
  async getVenuesByCulturalTags(
    culturalTags: string[],
    city: string = "New York",
  ): Promise<ServiceResponse<Venue[]>> {
    const cacheKey = `cultural_venues_${city}_${culturalTags.join("_")}`;
    const cachedData = this.getCachedData(cacheKey);

    if (cachedData) {
      return { data: cachedData, loading: false };
    }

    return this.handleServiceCall("getVenuesByCulturalTags", async () => {
      const { data, error } = await supabase
        .from("venues")
        .select("*")
        .eq("city", city)
        .contains("cultural_tags", culturalTags)
        .order("rating", { ascending: false });

      if (error) throw error;

      const venues = data || [];
      this.setCachedData(cacheKey, venues);
      return venues;
    });
  }

  // Get venue by ID
  async getVenueById(id: string): Promise<Venue | null> {
    try {
      const { data, error } = await supabase
        .from("venues")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error fetching venue by ID:", error);
      throw error;
    }
  }

  // Get venues by category
  async getVenuesByCategory(
    category: string,
    city: string = "New York",
  ): Promise<Venue[]> {
    try {
      const { data, error } = await supabase
        .from("venues")
        .select("*")
        .eq("city", city)
        .eq("category", category)
        .order("rating", { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error("Error fetching venues by category:", error);
      throw error;
    }
  }

  // Get featured venues (high rating, many reviews)
  async getFeaturedVenues(
    city: string = "New York",
    limit: number = 10,
  ): Promise<Venue[]> {
    try {
      const { data, error } = await supabase
        .from("venues")
        .select("*")
        .eq("city", city)
        .gte("rating", 4.5)
        .gte("review_count", 100)
        .order("rating", { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error("Error fetching featured venues:", error);
      throw error;
    }
  }

  // Get nearby venues (within radius)
  async getNearbyVenues(
    latitude: number,
    longitude: number,
    radiusKm: number = 5,
  ): Promise<Venue[]> {
    try {
      // Note: This is a simplified version. For production, you'd want to use
      // PostGIS extensions for accurate distance calculations
      const { data, error } = await supabase.rpc("nearby_venues", {
        lat: latitude,
        long: longitude,
        radius_km: radiusKm,
      });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error("Error fetching nearby venues:", error);
      // Fallback to getting all venues if the RPC doesn't exist
      const fallbackResult = await this.getAllVenues();
      return fallbackResult.data || [];
    }
  }

  // Search venues with autocomplete
  async searchVenues(
    searchQuery: string,
    city: string = "New York",
    limit: number = 10,
  ): Promise<Venue[]> {
    try {
      const searchTerm = `%${searchQuery}%`;

      const { data, error } = await supabase
        .from("venues")
        .select("*")
        .eq("city", city)
        .or(
          `name.ilike.${searchTerm},description.ilike.${searchTerm},category.ilike.${searchTerm},subcategory.ilike.${searchTerm}`,
        )
        .order("rating", { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error("Error searching venues:", error);
      throw error;
    }
  }

  // Get venues with specific features
  async getVenuesByFeatures(
    features: string[],
    city: string = "New York",
  ): Promise<Venue[]> {
    try {
      const { data, error } = await supabase
        .from("venues")
        .select("*")
        .eq("city", city)
        .contains("features", features)
        .order("rating", { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error("Error fetching venues by features:", error);
      throw error;
    }
  }

  // Get random venue (for "Surprise Me" feature)
  async getRandomVenue(
    mood?: string,
    city: string = "New York",
  ): Promise<Venue | null> {
    try {
      let query = supabase
        .from("venues")
        .select("*")
        .eq("city", city)
        .gte("rating", 4.0);

      if (mood) {
        query = query.contains("mood_tags", [mood]);
      }

      const { data: allVenues, error } = await query;

      if (error) throw error;
      if (!allVenues || allVenues.length === 0) return null;

      // Select random venue
      const randomIndex = Math.floor(Math.random() * allVenues.length);
      return allVenues[randomIndex];
    } catch (error) {
      console.error("Error fetching random venue:", error);
      throw error;
    }
  }

  // Sort venues
  async getSortedVenues(
    venues: Venue[],
    sortBy: SortOption = "rating",
  ): Promise<Venue[]> {
    const sortedVenues = [...venues];

    switch (sortBy) {
      case "rating":
        return sortedVenues.sort((a, b) => b.rating - a.rating);
      case "price_asc":
        return sortedVenues.sort((a, b) => a.price_range - b.price_range);
      case "price_desc":
        return sortedVenues.sort((a, b) => b.price_range - a.price_range);
      case "name":
        return sortedVenues.sort((a, b) => a.name.localeCompare(b.name));
      case "review_count":
        return sortedVenues.sort((a, b) => b.review_count - a.review_count);
      default:
        return sortedVenues;
    }
  }

  // Get venue statistics for a city
  async getCityStats(city: string = "New York"): Promise<{
    totalVenues: number;
    avgRating: number;
    categoryCounts: Record<string, number>;
  }> {
    try {
      const { data, error } = await supabase
        .from("venues")
        .select("category, rating")
        .eq("city", city);

      if (error) throw error;
      if (!data || data.length === 0) {
        return { totalVenues: 0, avgRating: 0, categoryCounts: {} };
      }

      const totalVenues = data.length;
      const avgRating =
        data.reduce((sum, v) => sum + v.rating, 0) / totalVenues;
      const categoryCounts = data.reduce(
        (acc, v) => {
          acc[v.category] = (acc[v.category] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      );

      return { totalVenues, avgRating, categoryCounts };
    } catch (error) {
      console.error("Error fetching city stats:", error);
      throw error;
    }
  }
}

// Export the venue service instance
export const venueService = new VenueService();

// Export types for use in components
export type { VenueFilters, ServiceResponse, WeatherFilter };
export { Venue, MoodType, Weather, SearchFilters } from "../types";
