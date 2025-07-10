import type {
  DataSource,
  SearchQuery,
  RawVenueData,
  Venue,
  SyncOperation,
  DataPipelineConfig,
  VenueMatchResult,
} from "../types";
import { ApiRegistry } from "./ApiRegistry";
import { DataNormalizationEngine } from "./DataNormalizationEngine";
import { supabase } from "../utils/supabase";

interface PipelineResult {
  venues: Venue[];
  duplicatesFound: number;
  errors: string[];
  syncOperations: SyncOperation[];
}

interface DeduplicationResult {
  uniqueVenues: Map<string, RawVenueData[]>;
  duplicateGroups: RawVenueData[][];
}

export class DataPipeline {
  private apiRegistry: ApiRegistry;
  private normalizationEngine: DataNormalizationEngine;
  private config: DataPipelineConfig;
  private static instance: DataPipeline;

  private constructor() {
    this.apiRegistry = ApiRegistry.getInstance();
    this.normalizationEngine = DataNormalizationEngine.getInstance();
    this.config = {
      sources: ["yelp", "google_places", "foursquare", "openstreetmap"],
      syncInterval: 60, // 1 hour
      batchSize: 50,
      conflictResolution: "highest_confidence",
      qualityThreshold: 0.6,
      enableDeduplication: true,
    };
  }

  static getInstance(): DataPipeline {
    if (!DataPipeline.instance) {
      DataPipeline.instance = new DataPipeline();
    }
    return DataPipeline.instance;
  }

  // Main pipeline method for venue search and aggregation
  async searchAndAggregateVenues(
    query: SearchQuery,
    sources?: DataSource[],
  ): Promise<PipelineResult> {
    const errors: string[] = [];
    const syncOperations: SyncOperation[] = [];

    try {
      // Step 1: Fetch data from multiple sources
      console.log("🔍 Fetching venue data from multiple sources...");
      const rawDataMap = await this.apiRegistry.searchVenuesMultiSource(
        query,
        sources || this.config.sources,
      );

      // Step 2: Flatten and prepare raw data
      const allRawData: RawVenueData[] = [];
      for (const [source, venues] of rawDataMap.entries()) {
        allRawData.push(...venues);

        // Create sync operation record
        syncOperations.push({
          id: `search-${source}-${Date.now()}`,
          source,
          type: "incremental",
          status: "completed",
          startedAt: new Date(),
          completedAt: new Date(),
          recordsProcessed: venues.length,
          recordsSuccess: venues.length,
          recordsError: 0,
          errors: [],
        });
      }

      // Step 3: Store raw data
      await this.storeRawVenueData(allRawData);

      // Step 4: Deduplication
      console.log("🔄 Performing deduplication...");
      const deduplicationResult = this.config.enableDeduplication
        ? await this.deduplicateVenues(allRawData)
        : {
            uniqueVenues: this.groupByExternalId(allRawData),
            duplicateGroups: [],
          };

      // Step 5: Normalization and aggregation
      console.log("⚙️ Normalizing and aggregating venue data...");
      const venues = await this.normalizeAndAggregateVenues(
        deduplicationResult.uniqueVenues,
      );

      // Step 6: Quality filtering
      const qualityVenues = venues.filter(
        (venue) =>
          (venue.data_quality_score || 0) >= this.config.qualityThreshold,
      );

      console.log(
        `✅ Pipeline completed: ${qualityVenues.length} venues processed`,
      );

      return {
        venues: qualityVenues,
        duplicatesFound: deduplicationResult.duplicateGroups.length,
        errors,
        syncOperations,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown pipeline error";
      errors.push(errorMessage);
      console.error("❌ Pipeline error:", error);

      return {
        venues: [],
        duplicatesFound: 0,
        errors,
        syncOperations,
      };
    }
  }

  // Full sync operation for a specific source
  async performFullSync(source: DataSource): Promise<SyncOperation> {
    const operation: SyncOperation = {
      id: `full-sync-${source}-${Date.now()}`,
      source,
      type: "full",
      status: "running",
      startedAt: new Date(),
      recordsProcessed: 0,
      recordsSuccess: 0,
      recordsError: 0,
      errors: [],
    };

    try {
      // Record operation start
      await this.recordSyncOperation(operation);

      const adapter = this.apiRegistry.getAdapter(source);
      if (!adapter) {
        throw new Error(`No adapter found for source: ${source}`);
      }

      // Get all venues from the source (location-based)
      const majorCities = [
        { lat: 40.7128, lng: -74.006, name: "NYC" },
        { lat: 37.7749, lng: -122.4194, name: "SF" },
        { lat: 34.0522, lng: -118.2437, name: "LA" },
      ];

      const allRawData: RawVenueData[] = [];

      for (const city of majorCities) {
        const venues = await adapter.getVenuesByLocation(
          city.lat,
          city.lng,
          50,
        ); // 50km radius
        allRawData.push(...venues);
        operation.recordsProcessed += venues.length;
      }

      // Store raw data
      await this.storeRawVenueData(allRawData);

      // Process in batches
      const batchSize = this.config.batchSize;
      for (let i = 0; i < allRawData.length; i += batchSize) {
        const batch = allRawData.slice(i, i + batchSize);

        try {
          const deduplicationResult = await this.deduplicateVenues(batch);
          const venues = await this.normalizeAndAggregateVenues(
            deduplicationResult.uniqueVenues,
          );

          // Store normalized venues
          await this.storeNormalizedVenues(venues);

          operation.recordsSuccess += venues.length;
        } catch (batchError) {
          const errorMessage =
            batchError instanceof Error
              ? batchError.message
              : "Batch processing error";
          operation.errors.push(`Batch ${i}-${i + batchSize}: ${errorMessage}`);
          operation.recordsError += batch.length;
        }
      }

      operation.status = "completed";
      operation.completedAt = new Date();
    } catch (error) {
      operation.status = "failed";
      operation.completedAt = new Date();
      operation.errors.push(
        error instanceof Error ? error.message : "Unknown error",
      );
    }

    // Update operation record
    await this.recordSyncOperation(operation);

    return operation;
  }

  // Deduplication logic
  private async deduplicateVenues(
    rawData: RawVenueData[],
  ): Promise<DeduplicationResult> {
    const uniqueVenues = new Map<string, RawVenueData[]>();
    const duplicateGroups: RawVenueData[][] = [];
    const processed = new Set<string>();

    for (const venue of rawData) {
      if (processed.has(venue.externalId)) {
        continue;
      }

      // Find potential duplicates
      const duplicates = await this.findDuplicates(venue, rawData);

      if (duplicates.length > 1) {
        // Group duplicates
        const groupKey = this.generateGroupKey(duplicates[0]);
        uniqueVenues.set(groupKey, duplicates);
        duplicateGroups.push(duplicates);

        // Mark all as processed
        duplicates.forEach((d) => processed.add(d.externalId));
      } else {
        // Single unique venue
        const groupKey = this.generateGroupKey(venue);
        uniqueVenues.set(groupKey, [venue]);
        processed.add(venue.externalId);
      }
    }

    return { uniqueVenues, duplicateGroups };
  }

  // Find duplicate venues using multiple criteria
  private async findDuplicates(
    target: RawVenueData,
    allVenues: RawVenueData[],
  ): Promise<RawVenueData[]> {
    const potentialDuplicates: RawVenueData[] = [target];

    for (const venue of allVenues) {
      if (
        venue.externalId === target.externalId ||
        venue.source === target.source
      ) {
        continue;
      }

      const matchResult = await this.calculateVenueMatch(target, venue);

      if (matchResult.confidence > 0.8) {
        potentialDuplicates.push(venue);
      }
    }

    return potentialDuplicates;
  }

  // Calculate match confidence between two venues
  private async calculateVenueMatch(
    venue1: RawVenueData,
    venue2: RawVenueData,
  ): Promise<VenueMatchResult> {
    const matchingFields: string[] = [];
    const conflictingFields: string[] = [];
    let confidence = 0;

    // Name similarity
    const nameSimilarity = this.calculateStringSimilarity(
      venue1.name,
      venue2.name,
    );
    if (nameSimilarity > 0.8) {
      matchingFields.push("name");
      confidence += 0.4 * nameSimilarity;
    } else if (nameSimilarity < 0.3) {
      conflictingFields.push("name");
    }

    // Location proximity
    if (venue1.coordinates && venue2.coordinates) {
      const distance = this.calculateDistance(
        venue1.coordinates.lat,
        venue1.coordinates.lng,
        venue2.coordinates.lat,
        venue2.coordinates.lng,
      );

      if (distance < 100) {
        // 100 meters
        matchingFields.push("location");
        confidence += 0.3 * (1 - distance / 100);
      } else if (distance > 1000) {
        conflictingFields.push("location");
      }
    }

    // Address similarity
    if (venue1.address && venue2.address) {
      const addressSimilarity = this.calculateStringSimilarity(
        venue1.address,
        venue2.address,
      );
      if (addressSimilarity > 0.7) {
        matchingFields.push("address");
        confidence += 0.2 * addressSimilarity;
      }
    }

    // Phone number match
    if (venue1.phone && venue2.phone) {
      const phone1 = this.normalizePhone(venue1.phone);
      const phone2 = this.normalizePhone(venue2.phone);
      if (phone1 === phone2) {
        matchingFields.push("phone");
        confidence += 0.1;
      }
    }

    return {
      confidence,
      matchingFields,
      conflictingFields,
      suggestedMerge:
        confidence > 0.7 ? this.suggestMerge(venue1, venue2) : undefined,
    };
  }

  // Normalize and aggregate venues from grouped raw data
  private async normalizeAndAggregateVenues(
    groupedData: Map<string, RawVenueData[]>,
  ): Promise<Venue[]> {
    const venues: Venue[] = [];

    for (const [groupKey, rawDataList] of groupedData.entries()) {
      try {
        const normalizedVenue =
          this.normalizationEngine.normalizeVenueData(rawDataList);

        if (normalizedVenue) {
          venues.push(normalizedVenue);
        }
      } catch (error) {
        console.error(`Error normalizing venue group ${groupKey}:`, error);
      }
    }

    return venues;
  }

  // Utility methods
  private groupByExternalId(
    rawData: RawVenueData[],
  ): Map<string, RawVenueData[]> {
    const groups = new Map<string, RawVenueData[]>();

    for (const venue of rawData) {
      const key = `${venue.source}-${venue.externalId}`;
      groups.set(key, [venue]);
    }

    return groups;
  }

  private generateGroupKey(venue: RawVenueData): string {
    const name = venue.name.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
    const lat = venue.coordinates?.lat?.toString().substring(0, 6) || "0";
    const lng = venue.coordinates?.lng?.toString().substring(0, 6) || "0";

    return `${name}-${lat}-${lng}`;
  }

  private calculateStringSimilarity(str1: string, str2: string): number {
    if (!str1 || !str2) return 0;

    const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
    const normalized1 = normalize(str1);
    const normalized2 = normalize(str2);

    if (normalized1 === normalized2) return 1;

    // Simple Levenshtein distance-based similarity
    const maxLength = Math.max(normalized1.length, normalized2.length);
    if (maxLength === 0) return 1;

    const distance = this.levenshteinDistance(normalized1, normalized2);
    return 1 - distance / maxLength;
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1)
      .fill(null)
      .map(() => Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator,
        );
      }
    }

    return matrix[str2.length][str1.length];
  }

  private calculateDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number,
  ): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lng2 - lng1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  private normalizePhone(phone: string): string {
    return phone.replace(/[^\d]/g, "");
  }

  private suggestMerge(
    venue1: RawVenueData,
    venue2: RawVenueData,
  ): Partial<Venue> {
    // Simple merge suggestion - prefer more complete data
    const hasMoreData = (v: RawVenueData) => {
      let score = 0;
      if (v.rating) score++;
      if (v.reviewCount && v.reviewCount > 0) score++;
      if (v.phone) score++;
      if (v.website) score++;
      if (v.imageUrls && v.imageUrls.length > 0) score++;
      return score;
    };

    const primary =
      hasMoreData(venue1) >= hasMoreData(venue2) ? venue1 : venue2;
    const secondary = primary === venue1 ? venue2 : venue1;

    return {
      name: primary.name,
      address: primary.address || secondary.address,
      coordinates: primary.coordinates || secondary.coordinates,
      rating: primary.rating || secondary.rating,
      review_count: Math.max(
        primary.reviewCount || 0,
        secondary.reviewCount || 0,
      ),
      phone: primary.phone || secondary.phone,
      website: primary.website || secondary.website,
    };
  }

  // Database operations
  private async storeRawVenueData(rawData: RawVenueData[]): Promise<void> {
    if (rawData.length === 0) return;

    const records = rawData.map((data) => ({
      external_id: data.externalId,
      source: data.source,
      raw_data: data.rawData,
      processed_data: data,
      fetched_at: data.fetchedAt.toISOString(),
      is_processed: false,
    }));

    const { error } = await supabase.from("raw_venue_data").upsert(records, {
      onConflict: "external_id,source",
      ignoreDuplicates: false,
    });

    if (error) {
      console.error("Error storing raw venue data:", error);
      throw error;
    }
  }

  private async storeNormalizedVenues(venues: Venue[]): Promise<void> {
    if (venues.length === 0) return;

    const { error } = await supabase.from("venues").upsert(venues, {
      onConflict: "id",
      ignoreDuplicates: false,
    });

    if (error) {
      console.error("Error storing normalized venues:", error);
      throw error;
    }
  }

  private async recordSyncOperation(operation: SyncOperation): Promise<void> {
    const { error } = await supabase.from("api_sync_operations").upsert({
      id: operation.id,
      source: operation.source,
      operation_type: operation.type,
      status: operation.status,
      started_at: operation.startedAt.toISOString(),
      completed_at: operation.completedAt?.toISOString(),
      records_processed: operation.recordsProcessed,
      records_success: operation.recordsSuccess,
      records_error: operation.recordsError,
      errors: operation.errors,
      metadata: {},
    });

    if (error) {
      console.error("Error recording sync operation:", error);
    }
  }

  // Configuration methods
  updateConfig(config: Partial<DataPipelineConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getConfig(): DataPipelineConfig {
    return { ...this.config };
  }
}
