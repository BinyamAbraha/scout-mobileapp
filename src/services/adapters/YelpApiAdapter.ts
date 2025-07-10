import { BaseApiAdapter } from "./BaseApiAdapter";
import type {
  SearchQuery,
  RawVenueData,
  ApiConfig,
  DataSource,
  OpeningHours,
} from "../../types";

interface YelpBusiness {
  id: string;
  name: string;
  image_url: string;
  is_closed: boolean;
  url: string;
  review_count: number;
  categories: Array<{
    alias: string;
    title: string;
  }>;
  rating: number;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  transactions: string[];
  price?: string;
  location: {
    address1: string;
    address2?: string;
    address3?: string;
    city: string;
    zip_code: string;
    country: string;
    state: string;
    display_address: string[];
  };
  phone: string;
  display_phone: string;
  distance: number;
}

interface YelpSearchResponse {
  businesses: YelpBusiness[];
  total: number;
  region: {
    center: {
      longitude: number;
      latitude: number;
    };
  };
}

interface YelpBusinessDetails extends YelpBusiness {
  hours?: Array<{
    open: Array<{
      is_overnight: boolean;
      start: string;
      end: string;
      day: number;
    }>;
    hours_type: string;
    is_open_now: boolean;
  }>;
  photos: string[];
  special_hours?: any[];
  messaging?: {
    url: string;
    use_case_text: string;
  };
}

export class YelpApiAdapter extends BaseApiAdapter {
  private readonly baseUrl = "https://api.yelp.com/v3";

  constructor(config: ApiConfig) {
    super("yelp", config);
  }

  async searchVenues(query: SearchQuery): Promise<RawVenueData[]> {
    const params: Record<string, any> = {
      term: query.term || "restaurants",
      limit: Math.min(query.limit || 20, 50), // Yelp max is 50
      offset: query.offset || 0,
    };

    if (query.location) {
      params.latitude = query.location.lat;
      params.longitude = query.location.lng;
      params.radius = Math.min(query.radius || 5000, 40000); // Yelp max is 40km
    }

    if (query.categories?.length) {
      params.categories = query.categories.join(",");
    }

    if (query.sortBy) {
      params.sort_by = this.mapSortBy(query.sortBy);
    }

    const url = this.buildUrl(this.baseUrl, "/businesses/search", params);
    const headers = this.getAuthHeaders();

    try {
      const response = await this.makeRequest<YelpSearchResponse>(url, {
        headers,
      });

      return response.businesses.map((business) =>
        this.normalizeYelpBusiness(business),
      );
    } catch (error) {
      console.error("Yelp search error:", error);
      return [];
    }
  }

  async getVenueDetails(externalId: string): Promise<RawVenueData | null> {
    const url = this.buildUrl(this.baseUrl, `/businesses/${externalId}`);
    const headers = this.getAuthHeaders();

    try {
      const business = await this.makeRequest<YelpBusinessDetails>(url, {
        headers,
      });

      return this.normalizeYelpBusinessDetails(business);
    } catch (error) {
      console.error("Yelp venue details error:", error);
      return null;
    }
  }

  async getVenuesByLocation(
    lat: number,
    lng: number,
    radius: number,
  ): Promise<RawVenueData[]> {
    return this.searchVenues({
      location: { lat, lng },
      radius: radius * 1000, // Convert km to meters
      limit: 50,
    });
  }

  protected getAuthHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.config.apiKey}`,
      "Content-Type": "application/json",
    };
  }

  private mapSortBy(sortBy: string): string {
    const mapping: Record<string, string> = {
      rating: "rating",
      distance: "distance",
      price: "price",
      reviews: "review_count",
    };
    return mapping[sortBy] || "best_match";
  }

  private normalizeYelpBusiness(business: YelpBusiness): RawVenueData {
    return {
      externalId: business.id,
      source: "yelp" as DataSource,
      name: business.name,
      address: business.location.display_address.join(", "),
      coordinates: {
        lat: business.coordinates.latitude,
        lng: business.coordinates.longitude,
      },
      category: business.categories[0]?.title || "Restaurant",
      rating: business.rating,
      reviewCount: business.review_count,
      priceLevel: this.mapPriceLevel(business.price),
      phone: business.display_phone,
      website: business.url,
      description: `${business.name} - ${business.categories.map((c) => c.title).join(", ")}`,
      imageUrls: business.image_url ? [business.image_url] : [],
      hours: [],
      features: this.extractFeatures(business),
      rawData: business,
      fetchedAt: new Date(),
    };
  }

  private normalizeYelpBusinessDetails(
    business: YelpBusinessDetails,
  ): RawVenueData {
    const baseData = this.normalizeYelpBusiness(business);

    return {
      ...baseData,
      imageUrls: business.photos || [],
      hours: this.normalizeHours(business.hours),
      features: this.extractFeaturesFromDetails(business),
    };
  }

  private mapPriceLevel(price?: string): number {
    if (!price) return 1;
    return Math.min(price.length, 4);
  }

  private extractFeatures(business: YelpBusiness): string[] {
    const features: string[] = [];

    if (business.transactions?.includes("delivery")) {
      features.push("delivery");
    }

    if (business.transactions?.includes("pickup")) {
      features.push("pickup");
    }

    if (business.transactions?.includes("restaurant_reservation")) {
      features.push("reservations");
    }

    return features;
  }

  private extractFeaturesFromDetails(business: YelpBusinessDetails): string[] {
    const features = this.extractFeatures(business);

    if (business.messaging) {
      features.push("messaging");
    }

    return features;
  }

  private normalizeHours(
    yelpHours?: YelpBusinessDetails["hours"],
  ): OpeningHours[] {
    if (!yelpHours || !yelpHours.length) {
      return [];
    }

    const hours: OpeningHours[] = [];
    const primaryHours = yelpHours[0];

    if (primaryHours?.open) {
      for (const dayHours of primaryHours.open) {
        hours.push({
          dayOfWeek: dayHours.day,
          open: this.formatTime(dayHours.start),
          close: this.formatTime(dayHours.end),
          isOpen24Hours: dayHours.start === "0000" && dayHours.end === "0000",
        });
      }
    }

    return hours;
  }

  private formatTime(time: string): string {
    // Convert HHMM to HH:MM
    if (time.length === 4) {
      return `${time.slice(0, 2)}:${time.slice(2)}`;
    }
    return time;
  }
}
