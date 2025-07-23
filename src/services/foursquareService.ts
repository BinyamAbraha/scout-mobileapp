import type { Venue, MoodType } from "../types";

interface FoursquareVenue {
  fsq_id: string;
  name: string;
  location: {
    address?: string;
    locality?: string;
    region?: string;
    country?: string;
    formatted_address?: string;
  };
  geocodes: {
    main: {
      latitude: number;
      longitude: number;
    };
  };
  categories: Array<{
    id: number;
    name: string;
    icon: {
      prefix: string;
      suffix: string;
    };
  }>;
  rating?: number;
  stats?: {
    total_ratings?: number;
  };
  price?: number;
  photos?: Array<{
    prefix: string;
    suffix: string;
    width?: number;
    height?: number;
  }>;
  tel?: string;
  website?: string;
  description?: string;
}

interface FoursquareResponse {
  results: FoursquareVenue[];
}

class FoursquareService {
  private apiKey: string;
  private baseUrl = "https://api.foursquare.com/v3";

  constructor() {
    this.apiKey = process.env.EXPO_PUBLIC_FOURSQUARE_API_KEY || "";
    if (!this.apiKey) {
      console.warn("Foursquare API key not found");
    }
  }

  async searchNearbyVenues(
    latitude: number,
    longitude: number,
    radiusMeters: number = 1600, // ~1 mile
    limit: number = 20,
  ): Promise<Venue[]> {
    if (!this.apiKey) {
      throw new Error("Foursquare API key not configured");
    }

    console.log(
      `🔍 Searching Foursquare venues near ${latitude}, ${longitude}`,
    );
    console.log(`🔑 Using API key: ${this.apiKey.substring(0, 10)}...`);

    try {
      const url = `${this.baseUrl}/places/search`;
      const params = new URLSearchParams({
        ll: `${latitude},${longitude}`,
        radius: radiusMeters.toString(),
        limit: limit.toString(),
        fields:
          "fsq_id,name,location,geocodes,categories,rating,stats,price,photos,tel,website,description",
      });

      console.log(`🌐 Request URL: ${url}?${params}`);
      console.log(`📋 Request headers:`, {
        Authorization: `${this.apiKey.substring(0, 10)}...`,
        Accept: "application/json",
      });

      const response = await fetch(`${url}?${params}`, {
        headers: {
          Authorization: this.apiKey,
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(
          `Foursquare API error: ${response.status} ${response.statusText}`,
        );
      }

      const data: FoursquareResponse = await response.json();
      console.log(`✅ Found ${data.results.length} venues from Foursquare`);

      return data.results.map(this.transformVenue);
    } catch (error) {
      console.error("❌ Foursquare API error:", error);
      throw error;
    }
  }

  private transformVenue = (fsVenue: FoursquareVenue): Venue => {
    const category = fsVenue.categories[0]?.name || "Restaurant";
    const address =
      fsVenue.location.formatted_address ||
      fsVenue.location.address ||
      `${fsVenue.location.locality}, ${fsVenue.location.region}` ||
      "Address not available";

    // Create image URL from Foursquare photo
    let imageUrl: string | undefined;
    if (fsVenue.photos && fsVenue.photos.length > 0) {
      const photo = fsVenue.photos[0];
      imageUrl = `${photo.prefix}300x200${photo.suffix}`;
    }

    // Map Foursquare categories to mood tags
    const getMoodTags = (categoryName: string): MoodType[] => {
      const category = categoryName.toLowerCase();
      if (
        category.includes("coffee") ||
        category.includes("bakery") ||
        category.includes("bookstore")
      ) {
        return ["cozy"];
      } else if (
        category.includes("bar") ||
        category.includes("nightlife") ||
        category.includes("music")
      ) {
        return ["energetic"];
      } else if (
        category.includes("fine dining") ||
        category.includes("wine") ||
        category.includes("cocktail")
      ) {
        return ["special"];
      } else {
        return ["surprise"];
      }
    };

    return {
      id: fsVenue.fsq_id,
      name: fsVenue.name,
      address,
      category,
      subcategory: fsVenue.categories[0]?.name,
      mood_tags: getMoodTags(category),
      rating: fsVenue.rating || 4.0,
      review_count: fsVenue.stats?.total_ratings || 0,
      price_range: (fsVenue.price || 2) as 1 | 2 | 3 | 4,
      description: fsVenue.description,
      image_url: imageUrl,
      phone: fsVenue.tel,
      website: fsVenue.website,
      features: [],
      coordinates: {
        lat: fsVenue.geocodes.main.latitude,
        lng: fsVenue.geocodes.main.longitude,
      },
      city: fsVenue.location.locality,
      // Add data source tracking
      data_sources: {
        venueId: fsVenue.fsq_id,
        sources: [
          {
            source: "foursquare",
            confidence: 0.9,
            lastUpdated: new Date(),
            isActive: true,
          },
        ],
        primarySource: "foursquare",
        mergedAt: new Date(),
      },
      data_quality_score: 0.85,
      last_verified: new Date(),
      external_ids: {
        foursquare: fsVenue.fsq_id,
      } as Record<string, string>,
    };
  };
}

export const foursquareService = new FoursquareService();
