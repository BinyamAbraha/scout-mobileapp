import { BaseApiAdapter } from "./BaseApiAdapter";
import type {
  SearchQuery,
  RawVenueData,
  ApiConfig,
  DataSource,
  OpeningHours,
} from "../../types";

interface FoursquareVenue {
  fsq_id: string;
  categories: Array<{
    id: number;
    name: string;
    icon: {
      prefix: string;
      suffix: string;
    };
  }>;
  chains: Array<{
    id: string;
    name: string;
  }>;
  distance: number;
  geocodes: {
    main: {
      latitude: number;
      longitude: number;
    };
    roof?: {
      latitude: number;
      longitude: number;
    };
  };
  link: string;
  location: {
    address?: string;
    census_block?: string;
    country: string;
    cross_street?: string;
    dma?: string;
    formatted_address: string;
    locality: string;
    neighborhood?: string[];
    po_box?: string;
    post_town?: string;
    postcode?: string;
    region: string;
  };
  name: string;
  related_places?: {
    parent?: {
      fsq_id: string;
      name: string;
    };
  };
  timezone: string;
}

interface FoursquareSearchResponse {
  results: FoursquareVenue[];
  context: {
    geo_bounds: {
      circle: {
        center: {
          latitude: number;
          longitude: number;
        };
        radius: number;
      };
    };
  };
}

interface FoursquareVenueDetails extends FoursquareVenue {
  description?: string;
  email?: string;
  fax?: string;
  features?: {
    payment?: {
      credit_cards?: {
        accepts_credit_cards?: boolean;
        amex?: boolean;
        discover?: boolean;
        visa?: boolean;
        diners_club?: boolean;
        master_card?: boolean;
        union_pay?: boolean;
      };
      digital_wallet?: {
        accepts_nfc?: boolean;
      };
    };
    food_and_drink?: {
      alcohol?: {
        bar_service?: boolean;
        beer?: boolean;
        byo?: boolean;
        cocktails?: boolean;
        full_bar?: boolean;
        wine?: boolean;
      };
      meals?: {
        bar_snacks?: boolean;
        breakfast?: boolean;
        brunch?: boolean;
        lunch?: boolean;
        dinner?: boolean;
      };
    };
    services?: {
      delivery?: boolean;
      takeout?: boolean;
      drive_through?: boolean;
      dine_in?: {
        reservations?: boolean;
      };
    };
    amenities?: {
      restroom?: boolean;
      smoking?: boolean;
      jukebox?: boolean;
      music?: boolean;
      live_music?: boolean;
      private_room?: boolean;
      outdoor_seating?: boolean;
      wifi?: string;
      wheelchair_accessible?: boolean;
    };
  };
  hours?: {
    display?: string;
    is_local_holiday?: boolean;
    open_now?: boolean;
    regular?: Array<{
      close: string;
      day: number;
      open: string;
    }>;
  };
  photos?: Array<{
    id: string;
    created_at: string;
    prefix: string;
    suffix: string;
    width: number;
    height: number;
    classifications: string[];
  }>;
  popularity?: number;
  price?: number;
  rating?: number;
  stats?: {
    total_photos: number;
    total_ratings: number;
    total_tips: number;
  };
  tel?: string;
  website?: string;
  social_media?: {
    facebook_id?: string;
    instagram?: string;
    twitter?: string;
  };
}

export class FoursquareApiAdapter extends BaseApiAdapter {
  private readonly baseUrl = "https://api.foursquare.com/v3";

  constructor(config: ApiConfig) {
    super("foursquare", config);
  }

  async searchVenues(query: SearchQuery): Promise<RawVenueData[]> {
    const params: Record<string, any> = {
      limit: Math.min(query.limit || 20, 50), // Foursquare max is 50
    };

    if (query.location) {
      params.ll = `${query.location.lat},${query.location.lng}`;
      params.radius = Math.min(query.radius || 5000, 100000); // Foursquare max is 100km
    }

    if (query.term) {
      params.query = query.term;
    }

    if (query.categories?.length) {
      params.categories = query.categories.join(",");
    }

    if (query.sortBy) {
      params.sort = this.mapSortBy(query.sortBy);
    }

    const url = this.buildUrl(this.baseUrl, "/places/search", params);
    const headers = this.getAuthHeaders();

    try {
      const response = await this.makeRequest<FoursquareSearchResponse>(url, {
        headers,
      });

      return response.results.map((venue) =>
        this.normalizeFoursquareVenue(venue),
      );
    } catch (error) {
      console.error("Foursquare search error:", error);
      return [];
    }
  }

  async getVenueDetails(externalId: string): Promise<RawVenueData | null> {
    const url = this.buildUrl(this.baseUrl, `/places/${externalId}`, {
      fields:
        "fsq_id,name,geocodes,location,categories,website,tel,email,description,features,hours,photos,price,rating,stats,social_media,popularity",
    });
    const headers = this.getAuthHeaders();

    try {
      const venue = await this.makeRequest<FoursquareVenueDetails>(url, {
        headers,
      });

      return this.normalizeFoursquareVenueDetails(venue);
    } catch (error) {
      console.error("Foursquare venue details error:", error);
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
      Authorization: this.config.apiKey,
      "Content-Type": "application/json",
    };
  }

  private mapSortBy(sortBy: string): string {
    const mapping: Record<string, string> = {
      rating: "RATING",
      distance: "DISTANCE",
      popularity: "POPULARITY",
      reviews: "RATING",
    };
    return mapping[sortBy] || "RELEVANCE";
  }

  private normalizeFoursquareVenue(venue: FoursquareVenue): RawVenueData {
    return {
      externalId: venue.fsq_id,
      source: "foursquare" as DataSource,
      name: venue.name,
      address: venue.location.formatted_address,
      coordinates: {
        lat: venue.geocodes.main.latitude,
        lng: venue.geocodes.main.longitude,
      },
      category: venue.categories[0]?.name || "Place",
      rating: 0, // Base venue data doesn't include rating
      reviewCount: 0, // Base venue data doesn't include review count
      priceLevel: 1, // Base venue data doesn't include price
      phone: "",
      website: venue.link,
      description: `${venue.name} - ${venue.categories.map((c) => c.name).join(", ")}`,
      imageUrls: [],
      hours: [],
      features: this.extractFeatures(venue),
      rawData: venue,
      fetchedAt: new Date(),
    };
  }

  private normalizeFoursquareVenueDetails(
    venue: FoursquareVenueDetails,
  ): RawVenueData {
    const baseData = this.normalizeFoursquareVenue(venue);

    return {
      ...baseData,
      rating: venue.rating || 0,
      reviewCount: venue.stats?.total_ratings || 0,
      priceLevel: venue.price || 1,
      phone: venue.tel || "",
      website: venue.website || venue.link,
      description: venue.description || baseData.description,
      imageUrls: this.extractImageUrls(venue.photos),
      hours: this.normalizeHours(venue.hours),
      features: this.extractFeaturesFromDetails(venue),
    };
  }

  private extractFeatures(venue: FoursquareVenue): string[] {
    const features: string[] = [];

    if (venue.chains?.length) {
      features.push("chain");
    }

    return features;
  }

  private extractFeaturesFromDetails(venue: FoursquareVenueDetails): string[] {
    const features = this.extractFeatures(venue);

    if (venue.features?.services?.delivery) {
      features.push("delivery");
    }

    if (venue.features?.services?.takeout) {
      features.push("takeout");
    }

    if (venue.features?.services?.dine_in?.reservations) {
      features.push("reservations");
    }

    if (venue.features?.services?.drive_through) {
      features.push("drive_through");
    }

    if (venue.features?.amenities?.outdoor_seating) {
      features.push("outdoor_seating");
    }

    if (venue.features?.amenities?.wifi === "free") {
      features.push("free_wifi");
    }

    if (venue.features?.amenities?.wheelchair_accessible) {
      features.push("wheelchair_accessible");
    }

    if (venue.features?.food_and_drink?.alcohol?.full_bar) {
      features.push("full_bar");
    }

    if (venue.features?.amenities?.live_music) {
      features.push("live_music");
    }

    if (venue.features?.payment?.credit_cards?.accepts_credit_cards) {
      features.push("credit_cards");
    }

    return features;
  }

  private extractImageUrls(
    photos?: FoursquareVenueDetails["photos"],
  ): string[] {
    if (!photos || !photos.length) {
      return [];
    }

    return photos
      .map((photo) => {
        // Use a reasonable size for the images (e.g., 300x300)
        const size = "300x300";
        return `${photo.prefix}${size}${photo.suffix}`;
      })
      .slice(0, 10); // Limit to 10 images
  }

  private normalizeHours(
    foursquareHours?: FoursquareVenueDetails["hours"],
  ): OpeningHours[] {
    if (!foursquareHours?.regular || !foursquareHours.regular.length) {
      return [];
    }

    const hours: OpeningHours[] = [];

    for (const dayHours of foursquareHours.regular) {
      hours.push({
        dayOfWeek: dayHours.day,
        open: this.formatTime(dayHours.open),
        close: this.formatTime(dayHours.close),
        isOpen24Hours: dayHours.open === "0000" && dayHours.close === "2400",
      });
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
