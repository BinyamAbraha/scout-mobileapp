import type {
  RawVenueData,
  Venue,
  DataSource,
  VenueDataSource,
  DataSourceInfo,
  MoodType,
} from "../types";

interface NormalizationRule {
  field: keyof Venue;
  sources: DataSource[];
  priority: number;
  transform?: (value: any, source: DataSource) => any;
  validate?: (value: any) => boolean;
}

interface CategoryMapping {
  [key: string]: {
    category: string;
    subcategory?: string;
    mood_tags: MoodType[];
  };
}

export class DataNormalizationEngine {
  private normalizationRules: NormalizationRule[];
  private categoryMappings: CategoryMapping;
  private static instance: DataNormalizationEngine;

  private constructor() {
    this.normalizationRules = this.createNormalizationRules();
    this.categoryMappings = this.createCategoryMappings();
  }

  static getInstance(): DataNormalizationEngine {
    if (!DataNormalizationEngine.instance) {
      DataNormalizationEngine.instance = new DataNormalizationEngine();
    }
    return DataNormalizationEngine.instance;
  }

  // Main normalization method
  normalizeVenueData(rawDataList: RawVenueData[]): Venue | null {
    if (rawDataList.length === 0) {
      return null;
    }

    // Sort by source priority and data quality
    const sortedData = this.sortByPriority(rawDataList);
    const primaryData = sortedData[0];

    // Start with base venue from highest priority source
    const normalizedVenue: Partial<Venue> = {
      id: this.generateVenueId(primaryData),
      external_ids: undefined,
      data_sources: this.createDataSourceInfo(rawDataList),
      data_quality_score: this.calculateDataQualityScore(rawDataList),
      last_verified: new Date(),
      source_specific_data: undefined,
    };

    // Store external IDs and source-specific data
    for (const rawData of rawDataList) {
      if (!normalizedVenue.external_ids) {
        normalizedVenue.external_ids = {} as Record<DataSource, string>;
      }
      if (!normalizedVenue.source_specific_data) {
        normalizedVenue.source_specific_data = {} as Record<
          DataSource,
          Record<string, any>
        >;
      }
      normalizedVenue.external_ids[rawData.source] = rawData.externalId;
      normalizedVenue.source_specific_data[rawData.source] = rawData.rawData;
    }

    // Apply normalization rules
    for (const rule of this.normalizationRules) {
      const value = this.applyNormalizationRule(rule, rawDataList);
      if (value !== undefined) {
        (normalizedVenue as any)[rule.field] = value;
      }
    }

    // Validate required fields
    if (!this.validateRequiredFields(normalizedVenue)) {
      console.warn("Venue failed validation:", normalizedVenue);
      return null;
    }

    return normalizedVenue as Venue;
  }

  // Create normalization rules with priority and transforms
  private createNormalizationRules(): NormalizationRule[] {
    return [
      {
        field: "name",
        sources: ["yelp", "google_places", "openstreetmap"],
        priority: 10,
        validate: (value: string) => Boolean(value && value.length > 0),
      },
      {
        field: "address",
        sources: ["google_places", "yelp", "openstreetmap"],
        priority: 9,
        transform: (value: string) => this.normalizeAddress(value),
        validate: (value: string) => Boolean(value && value.length > 0),
      },
      {
        field: "coordinates",
        sources: ["google_places", "yelp", "openstreetmap"],
        priority: 10,
        validate: (value: any) => Boolean(value && value.lat && value.lng),
      },
      {
        field: "category",
        sources: ["yelp", "google_places"],
        priority: 8,
        transform: (value: string, source: DataSource) =>
          this.normalizeCategory(value, source),
        validate: (value: string) => Boolean(value),
      },
      {
        field: "subcategory",
        sources: ["yelp", "google_places"],
        priority: 6,
        transform: (value: string, source: DataSource) =>
          this.normalizeSubcategory(value, source),
      },
      {
        field: "rating",
        sources: ["yelp", "google_places"],
        priority: 9,
        transform: (value: number, source: DataSource) =>
          this.normalizeRating(value, source),
        validate: (value: number) => value >= 0 && value <= 5,
      },
      {
        field: "review_count",
        sources: ["yelp", "google_places"],
        priority: 8,
        validate: (value: number) => value >= 0,
      },
      {
        field: "price_range",
        sources: ["yelp", "google_places"],
        priority: 7,
        transform: (value: any, source: DataSource) =>
          this.normalizePriceRange(value, source),
        validate: (value: number) => value >= 1 && value <= 4,
      },
      {
        field: "phone",
        sources: ["yelp", "google_places"],
        priority: 6,
        transform: (value: string) => this.normalizePhoneNumber(value),
      },
      {
        field: "website",
        sources: ["yelp", "google_places"],
        priority: 6,
        validate: (value: string) => this.isValidUrl(value),
      },
      {
        field: "description",
        sources: ["yelp", "google_places"],
        priority: 5,
        transform: (value: string) => this.normalizeDescription(value),
      },
      {
        field: "image_url",
        sources: ["yelp", "google_places"],
        priority: 7,
        transform: (value: string | string[]) => this.normalizeImageUrl(value),
      },
      {
        field: "features",
        sources: ["yelp", "google_places"],
        priority: 6,
        transform: (value: string[], source: DataSource) =>
          this.normalizeFeatures(value, source),
      },
      {
        field: "mood_tags",
        sources: ["yelp", "google_places"],
        priority: 8,
        transform: (value: any, source: DataSource) =>
          this.deriveMoodTags(value, source),
      },
    ];
  }

  // Apply a normalization rule across all raw data sources
  private applyNormalizationRule(
    rule: NormalizationRule,
    rawDataList: RawVenueData[],
  ): any {
    // Find data from sources that support this field, ordered by priority
    const applicableData = rawDataList
      .filter((data) => rule.sources.includes(data.source))
      .sort((a, b) => {
        const aPriority = this.getSourcePriority(a.source);
        const bPriority = this.getSourcePriority(b.source);
        return bPriority - aPriority;
      });

    for (const data of applicableData) {
      let value = this.extractFieldValue(data, rule.field);

      if (value === undefined || value === null) {
        continue;
      }

      // Apply transform if provided
      if (rule.transform) {
        value = rule.transform(value, data.source);
      }

      // Validate if provided
      if (rule.validate && !rule.validate(value)) {
        continue;
      }

      return value;
    }

    return undefined;
  }

  // Extract field value from raw data based on source
  private extractFieldValue(rawData: RawVenueData, field: keyof Venue): any {
    switch (field) {
      case "name":
        return rawData.name;
      case "address":
        return rawData.address;
      case "coordinates":
        return rawData.coordinates;
      case "category":
        return rawData.category;
      case "rating":
        return rawData.rating;
      case "review_count":
        return rawData.reviewCount;
      case "price_range":
        return rawData.priceLevel;
      case "phone":
        return rawData.phone;
      case "website":
        return rawData.website;
      case "description":
        return rawData.description;
      case "image_url":
        return rawData.imageUrls;
      case "features":
        return rawData.features;
      default:
        return undefined;
    }
  }

  // Transformation methods
  private normalizeAddress(address: string): string {
    if (!address) return "";

    // Clean up address formatting
    return address.replace(/\s+/g, " ").replace(/,\s*,/g, ",").trim();
  }

  private normalizeCategory(category: string, source: DataSource): string {
    if (!category) return "Restaurant";

    const mapping = this.categoryMappings[category.toLowerCase()];
    if (mapping) {
      return mapping.category;
    }

    // Source-specific category normalization
    switch (source) {
      case "yelp":
        return this.normalizeYelpCategory(category);
      case "google_places":
        return this.normalizeGooglePlacesCategory(category);
      default:
        return category;
    }
  }

  private normalizeSubcategory(
    subcategory: string,
    source: DataSource,
  ): string | undefined {
    if (!subcategory) return undefined;

    const mapping = this.categoryMappings[subcategory.toLowerCase()];
    return mapping?.subcategory || subcategory;
  }

  private normalizeRating(rating: number, source: DataSource): number {
    if (!rating) return 0;

    // Convert different rating scales to 0-5 scale
    // All remaining sources (Yelp, Google Places) use 0-5 scale
    return Math.min(5, Math.max(0, rating));
  }

  private normalizePriceRange(priceLevel: any, source: DataSource): number {
    if (!priceLevel) return 1;

    if (typeof priceLevel === "string") {
      // Convert string price indicators (like $$$$) to numbers
      return Math.min(4, Math.max(1, priceLevel.length));
    }

    if (typeof priceLevel === "number") {
      return Math.min(4, Math.max(1, priceLevel));
    }

    return 1;
  }

  private normalizePhoneNumber(phone: string): string {
    if (!phone) return "";

    // Remove all non-digit characters except +
    const cleaned = phone.replace(/[^\d+]/g, "");

    // Format US phone numbers
    if (cleaned.length === 10) {
      return `+1${cleaned}`;
    }

    return cleaned;
  }

  private normalizeDescription(description: string): string {
    if (!description) return "";

    // Clean up description
    return description
      .replace(/\s+/g, " ")
      .replace(/\n+/g, " ")
      .trim()
      .substring(0, 500); // Limit length
  }

  private normalizeImageUrl(imageUrls: string | string[]): string | undefined {
    if (!imageUrls) return undefined;

    if (typeof imageUrls === "string") {
      return this.isValidUrl(imageUrls) ? imageUrls : undefined;
    }

    if (Array.isArray(imageUrls) && imageUrls.length > 0) {
      const validUrl = imageUrls.find((url) => this.isValidUrl(url));
      return validUrl;
    }

    return undefined;
  }

  private normalizeFeatures(features: string[], source: DataSource): string[] {
    if (!Array.isArray(features)) return [];

    // Normalize feature names
    const normalizedFeatures = features.map((feature) => {
      const normalized = feature.toLowerCase().replace(/[^a-z0-9]/g, "_");
      return this.mapFeatureName(normalized, source);
    });

    return [...new Set(normalizedFeatures)].filter(Boolean);
  }

  private deriveMoodTags(value: any, source: DataSource): MoodType[] {
    // Derive mood tags from category, features, or other data
    const category = typeof value === "string" ? value : "";
    const mapping = this.categoryMappings[category.toLowerCase()];

    if (mapping?.mood_tags) {
      return mapping.mood_tags;
    }

    // Default mood tags based on category
    const categoryLower = category.toLowerCase();
    if (categoryLower.includes("coffee") || categoryLower.includes("cafe")) {
      return ["cozy"];
    }
    if (categoryLower.includes("bar") || categoryLower.includes("club")) {
      return ["energetic"];
    }
    if (
      categoryLower.includes("fine dining") ||
      categoryLower.includes("upscale")
    ) {
      return ["special"];
    }

    return ["cozy"]; // Default
  }

  // Helper methods
  private sortByPriority(rawDataList: RawVenueData[]): RawVenueData[] {
    return rawDataList.sort((a, b) => {
      const aPriority = this.getSourcePriority(a.source);
      const bPriority = this.getSourcePriority(b.source);
      return bPriority - aPriority;
    });
  }

  private getSourcePriority(source: DataSource): number {
    const priorities: Record<DataSource, number> = {
      google_places: 10,
      yelp: 9,
      internal: 7,
      openstreetmap: 5,
    };
    return priorities[source] || 1;
  }

  private generateVenueId(primaryData: RawVenueData): string {
    // Generate a deterministic ID based on name and location
    const name = primaryData.name.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
    const lat = primaryData.coordinates?.lat?.toString().substring(0, 8) || "0";
    const lng = primaryData.coordinates?.lng?.toString().substring(0, 8) || "0";

    return `${primaryData.source}-${name}-${lat}-${lng}`;
  }

  private createDataSourceInfo(rawDataList: RawVenueData[]): VenueDataSource {
    const sources: DataSourceInfo[] = rawDataList.map((data) => ({
      source: data.source,
      confidence: this.calculateSourceConfidence(data),
      lastUpdated: data.fetchedAt,
      isActive: true,
    }));

    return {
      venueId: this.generateVenueId(rawDataList[0]),
      sources,
      primarySource: rawDataList[0].source,
      mergedAt: new Date(),
    };
  }

  private calculateSourceConfidence(data: RawVenueData): number {
    let confidence = 0.5; // Base confidence

    // Increase confidence based on data completeness
    if (data.name) confidence += 0.1;
    if (data.address) confidence += 0.1;
    if (data.coordinates) confidence += 0.1;
    if (data.rating && data.rating > 0) confidence += 0.1;
    if (data.reviewCount && data.reviewCount > 0) confidence += 0.1;

    return Math.min(1, confidence);
  }

  private calculateDataQualityScore(rawDataList: RawVenueData[]): number {
    const avgConfidence =
      rawDataList.reduce(
        (sum, data) => sum + this.calculateSourceConfidence(data),
        0,
      ) / rawDataList.length;

    const sourceBonus = Math.min(0.2, (rawDataList.length - 1) * 0.05);

    return Math.min(1, avgConfidence + sourceBonus);
  }

  private validateRequiredFields(venue: Partial<Venue>): boolean {
    return Boolean(
      venue.name && venue.address && venue.coordinates && venue.category,
    );
  }

  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  // Source-specific category normalization
  private normalizeYelpCategory(category: string): string {
    const yelpMapping: Record<string, string> = {
      restaurants: "Restaurant",
      food: "Restaurant",
      bars: "Bar",
      nightlife: "Entertainment",
      shopping: "Shopping",
      arts: "Entertainment",
      active: "Activity",
    };

    const normalized = category.toLowerCase();
    return yelpMapping[normalized] || category;
  }

  private normalizeGooglePlacesCategory(category: string): string {
    const googleMapping: Record<string, string> = {
      restaurant: "Restaurant",
      bar: "Bar",
      night_club: "Entertainment",
      store: "Shopping",
      tourist_attraction: "Activity",
    };

    const normalized = category.toLowerCase();
    return googleMapping[normalized] || category;
  }

  private mapFeatureName(feature: string, source: DataSource): string {
    const featureMapping: Record<string, string> = {
      wifi: "wifi",
      parking: "parking",
      outdoor_seating: "outdoor_seating",
      wheelchair_accessible: "wheelchair_accessible",
      takes_reservations: "reservations",
      delivery: "delivery",
      takeout: "takeout",
    };

    return featureMapping[feature] || feature;
  }

  // Category mappings with mood tags
  private createCategoryMappings(): CategoryMapping {
    return {
      "coffee shop": {
        category: "Restaurant",
        subcategory: "Coffee Shop",
        mood_tags: ["cozy"],
      },
      "fine dining": {
        category: "Restaurant",
        subcategory: "Fine Dining",
        mood_tags: ["special"],
      },
      "casual dining": {
        category: "Restaurant",
        subcategory: "Casual Dining",
        mood_tags: ["cozy"],
      },
      "fast food": {
        category: "Restaurant",
        subcategory: "Fast Food",
        mood_tags: ["energetic"],
      },
      bar: {
        category: "Bar",
        mood_tags: ["energetic"],
      },
      "cocktail bar": {
        category: "Bar",
        subcategory: "Cocktail Bar",
        mood_tags: ["special", "energetic"],
      },
      "sports bar": {
        category: "Bar",
        subcategory: "Sports Bar",
        mood_tags: ["energetic"],
      },
      nightclub: {
        category: "Entertainment",
        subcategory: "Nightclub",
        mood_tags: ["energetic"],
      },
      museum: {
        category: "Activity",
        subcategory: "Museum",
        mood_tags: ["cozy", "special"],
      },
      park: {
        category: "Activity",
        subcategory: "Park",
        mood_tags: ["cozy"],
      },
    };
  }
}
