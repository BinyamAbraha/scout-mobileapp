import { BaseApiAdapter } from "./BaseApiAdapter";
import type {
  SearchQuery,
  RawVenueData,
  ApiConfig,
  DataSource,
  OpeningHours,
} from "@/types";

interface CityVenueData {
  // Common fields across city APIs
  id?: string;
  name?: string;
  business_name?: string;
  dba?: string;
  address?: string;
  street_address?: string;
  city?: string;
  state?: string;
  zip?: string;
  zipcode?: string;
  phone?: string;
  license_number?: string;
  license_type?: string;
  category?: string;
  business_type?: string;
  latitude?: string | number;
  longitude?: string | number;
  location?: {
    latitude?: string | number;
    longitude?: string | number;
  };
  // NYC specific fields
  camis?: string;
  // SF specific fields
  location_id?: string;
  // LA specific fields
  location_account?: string;
}

interface CityApiEndpoint {
  name: string;
  url: string;
  city: string;
  state: string;
}

export class CityApiAdapter extends BaseApiAdapter {
  private readonly endpoints: CityApiEndpoint[] = [
    {
      name: "NYC Open Data",
      url: "https://data.cityofnewyork.us/resource/w7w3-xahh.json",
      city: "New York",
      state: "NY",
    },
    {
      name: "SF Open Data",
      url: "https://data.sfgov.org/resource/kvj8-g7jh.json",
      city: "San Francisco",
      state: "CA",
    },
    {
      name: "LA Open Data",
      url: "https://data.lacity.org/resource/6rrh-rzua.json",
      city: "Los Angeles",
      state: "CA",
    },
  ];

  constructor(config: ApiConfig) {
    super("city_apis", config);
  }

  async searchVenues(query: SearchQuery): Promise<RawVenueData[]> {
    const allVenues: RawVenueData[] = [];
    const limit = Math.min(query.limit || 20, 100);
    const perEndpointLimit = Math.ceil(limit / this.endpoints.length);

    for (const endpoint of this.endpoints) {
      try {
        const venues = await this.searchVenuesFromEndpoint(
          endpoint,
          query,
          perEndpointLimit,
        );
        allVenues.push(...venues);
      } catch (error) {
        console.error(`Error fetching from ${endpoint.name}:`, error);
        // Continue with other endpoints even if one fails
      }
    }

    return allVenues.slice(0, limit);
  }

  async getVenueDetails(externalId: string): Promise<RawVenueData | null> {
    // Extract endpoint info from external ID format: "city_endpoint_actualId"
    const [, endpointIndex, actualId] = externalId.split("_");
    const endpoint = this.endpoints[parseInt(endpointIndex)];

    if (!endpoint) {
      return null;
    }

    try {
      const url = this.buildUrl(endpoint.url, "", {
        $where: this.buildIdFilter(actualId, endpoint),
        $limit: 1,
      });

      const response = await this.makeRequest<CityVenueData[]>(url);

      if (response.length > 0) {
        return this.normalizeCityVenueData(response[0], endpoint);
      }
    } catch (error) {
      console.error(
        `Error fetching venue details from ${endpoint.name}:`,
        error,
      );
    }

    return null;
  }

  async getVenuesByLocation(
    lat: number,
    lng: number,
    radius: number,
  ): Promise<RawVenueData[]> {
    const allVenues: RawVenueData[] = [];
    const radiusInDegrees = radius / 111; // Rough conversion km to degrees

    for (const endpoint of this.endpoints) {
      try {
        const venues = await this.searchVenuesFromEndpoint(
          endpoint,
          {
            location: { lat, lng },
            radius: radius * 1000, // Convert to meters
            limit: 50,
          },
          50,
        );
        allVenues.push(...venues);
      } catch (error) {
        console.error(
          `Error fetching by location from ${endpoint.name}:`,
          error,
        );
      }
    }

    return allVenues;
  }

  protected getAuthHeaders(): Record<string, string> {
    // City APIs are public, no authentication needed
    return {
      "Content-Type": "application/json",
    };
  }

  private async searchVenuesFromEndpoint(
    endpoint: CityApiEndpoint,
    query: SearchQuery,
    limit: number,
  ): Promise<RawVenueData[]> {
    const params: Record<string, any> = {
      $limit: limit,
    };

    // Add search term if provided
    if (query.term) {
      params.$q = query.term;
    }

    // Add location filter if provided
    if (query.location) {
      const radiusInDegrees = (query.radius || 5000) / 111000; // Convert meters to degrees
      params.$where = this.buildLocationFilter(
        query.location.lat,
        query.location.lng,
        radiusInDegrees,
      );
    }

    const url = this.buildUrl(endpoint.url, "", params);
    const response = await this.makeRequest<CityVenueData[]>(url);

    return response.map((venue) =>
      this.normalizeCityVenueData(venue, endpoint),
    );
  }

  private buildLocationFilter(
    lat: number,
    lng: number,
    radiusDegrees: number,
  ): string {
    return `within_circle(location, ${lat}, ${lng}, ${radiusDegrees})`;
  }

  private buildIdFilter(id: string, endpoint: CityApiEndpoint): string {
    // Different endpoints use different ID fields
    switch (endpoint.name) {
      case "NYC Open Data":
        return `camis='${id}'`;
      case "SF Open Data":
        return `location_id='${id}'`;
      case "LA Open Data":
        return `location_account='${id}'`;
      default:
        return `id='${id}'`;
    }
  }

  private normalizeCityVenueData(
    venue: CityVenueData,
    endpoint: CityApiEndpoint,
  ): RawVenueData {
    const endpointIndex = this.endpoints.findIndex(
      (e) => e.name === endpoint.name,
    );
    const externalId = `city_${endpointIndex}_${this.getVenueId(venue, endpoint)}`;

    return {
      externalId,
      source: "city_apis" as DataSource,
      name: this.getVenueName(venue),
      address: this.getVenueAddress(venue, endpoint),
      coordinates: this.getVenueCoordinates(venue),
      category: this.getVenueCategory(venue),
      rating: 0, // City APIs don't provide ratings
      reviewCount: 0,
      priceLevel: 1,
      phone: this.getVenuePhone(venue),
      website: "",
      description: this.getVenueDescription(venue, endpoint),
      imageUrls: [],
      hours: this.getVenueHours(venue),
      features: this.getVenueFeatures(venue),
      rawData: venue,
      fetchedAt: new Date(),
    };
  }

  private getVenueId(venue: CityVenueData, endpoint: CityApiEndpoint): string {
    switch (endpoint.name) {
      case "NYC Open Data":
        return venue.camis || venue.id || "";
      case "SF Open Data":
        return venue.location_id || venue.id || "";
      case "LA Open Data":
        return venue.location_account || venue.id || "";
      default:
        return venue.id || "";
    }
  }

  private getVenueName(venue: CityVenueData): string {
    return venue.name || venue.business_name || venue.dba || "Unknown Business";
  }

  private getVenueAddress(
    venue: CityVenueData,
    endpoint: CityApiEndpoint,
  ): string {
    const address = venue.address || venue.street_address || "";
    const city = venue.city || endpoint.city;
    const state = venue.state || endpoint.state;
    const zip = venue.zip || venue.zipcode || "";

    return [address, city, state, zip].filter(Boolean).join(", ");
  }

  private getVenueCoordinates(
    venue: CityVenueData,
  ): { lat: number; lng: number } | undefined {
    let lat: number | undefined;
    let lng: number | undefined;

    // Try different coordinate field formats
    if (venue.latitude && venue.longitude) {
      lat =
        typeof venue.latitude === "string"
          ? parseFloat(venue.latitude)
          : venue.latitude;
      lng =
        typeof venue.longitude === "string"
          ? parseFloat(venue.longitude)
          : venue.longitude;
    } else if (venue.location?.latitude && venue.location?.longitude) {
      lat =
        typeof venue.location.latitude === "string"
          ? parseFloat(venue.location.latitude)
          : venue.location.latitude;
      lng =
        typeof venue.location.longitude === "string"
          ? parseFloat(venue.location.longitude)
          : venue.location.longitude;
    }

    if (lat && lng && !isNaN(lat) && !isNaN(lng)) {
      return { lat, lng };
    }

    return undefined;
  }

  private getVenueCategory(venue: CityVenueData): string {
    return (
      venue.category || venue.business_type || venue.license_type || "Business"
    );
  }

  private getVenuePhone(venue: CityVenueData): string {
    return venue.phone || "";
  }

  private getVenueDescription(
    venue: CityVenueData,
    endpoint: CityApiEndpoint,
  ): string {
    const name = this.getVenueName(venue);
    const category = this.getVenueCategory(venue);
    const source = `${endpoint.city} Open Data`;

    return `${name} - ${category} (${source})`;
  }

  private getVenueHours(venue: CityVenueData): OpeningHours[] {
    // City APIs typically don't provide hours information
    return [];
  }

  private getVenueFeatures(venue: CityVenueData): string[] {
    const features: string[] = [];

    // Add features based on license type or category
    if (venue.license_type) {
      features.push("licensed");
    }

    // Add government-verified feature
    features.push("government-verified");

    return features;
  }
}
