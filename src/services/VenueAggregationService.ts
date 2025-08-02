import type { SearchQuery, Venue, DataSource, SearchFilters } from "../types";
import { ApiRegistry } from "./ApiRegistry";
import { DataPipeline } from "./DataPipeline";
import { CacheManager } from "./CacheManager";
import { ErrorHandler } from "./ErrorHandler";
import { DataQualityValidator } from "./DataQualityValidator";
import { ApiConfigManager } from "./ApiConfigManager";

interface AggregationOptions {
  enableCaching?: boolean;
  qualityThreshold?: number;
  maxSources?: number;
  prioritySources?: DataSource[];
  fallbackToCache?: boolean;
}

interface AggregationResult {
  venues: Venue[];
  metadata: {
    totalSources: number;
    successfulSources: DataSource[];
    failedSources: DataSource[];
    cached: boolean;
    quality: {
      averageScore: number;
      lowQualityCount: number;
      validationIssues: number;
    };
    performance: {
      totalTime: number;
      cacheHitRate: number;
      apiCallCount: number;
    };
  };
}

/**
 * Central service that orchestrates venue data aggregation from multiple APIs
 * Handles caching, error handling, data quality validation, and performance optimization
 */
export class VenueAggregationService {
  private apiRegistry: ApiRegistry;
  private dataPipeline: DataPipeline;
  private cacheManager: CacheManager;
  private errorHandler: ErrorHandler;
  private qualityValidator: DataQualityValidator;
  private configManager: ApiConfigManager;
  private static instance: VenueAggregationService;

  private constructor() {
    this.apiRegistry = ApiRegistry.getInstance();
    this.dataPipeline = DataPipeline.getInstance();
    this.errorHandler = ErrorHandler.getInstance();
    this.qualityValidator = DataQualityValidator.getInstance();
    this.configManager = ApiConfigManager.getInstance();

    // Initialize cache manager with config
    const cacheConfig = this.configManager.getCacheConfig();
    this.cacheManager = CacheManager.getInstance(cacheConfig);
  }

  static getInstance(): VenueAggregationService {
    if (!VenueAggregationService.instance) {
      VenueAggregationService.instance = new VenueAggregationService();
    }
    return VenueAggregationService.instance;
  }

  /**
   * Search for venues using multiple data sources with intelligent aggregation
   */
  async searchVenues(
    query: SearchQuery,
    options: AggregationOptions = {},
  ): Promise<AggregationResult> {
    const startTime = Date.now();
    const context = {
      operation: "searchVenues",
      timestamp: new Date(),
      additionalData: { query, options },
    };

    try {
      // Step 1: Check cache first if enabled
      if (options.enableCaching !== false) {
        const cachedResult = await this.getCachedResults(query);
        if (cachedResult) {
          return this.createSuccessResult(cachedResult, {
            cached: true,
            startTime,
            sources: [],
          });
        }
      }

      // Step 2: Determine which sources to use
      const sources = await this.selectOptimalSources(query, options);

      if (sources.length === 0) {
        throw new Error("No available data sources for the query");
      }

      // Step 3: Execute the data pipeline
      const pipelineResult = await this.errorHandler.retryOperation(
        () => this.dataPipeline.searchAndAggregateVenues(query, sources),
        context,
      );

      // Step 4: Validate data quality
      const qualityResults = await this.validateVenueQuality(
        pipelineResult.venues,
        options.qualityThreshold || 0.6,
      );

      // Step 5: Cache results if enabled
      if (options.enableCaching !== false && qualityResults.venues.length > 0) {
        await this.cacheResults(query, qualityResults.venues);
      }

      // Step 6: Return aggregated results
      return this.createSuccessResult(qualityResults.venues, {
        cached: false,
        startTime,
        sources,
        pipelineResult,
        qualityResults,
      });
    } catch (error) {
      await this.errorHandler.handleError(error as Error, context);

      // Fallback to cache if enabled
      if (options.fallbackToCache) {
        const cachedResult = await this.getCachedResults(query);
        if (cachedResult) {
          return this.createSuccessResult(cachedResult, {
            cached: true,
            startTime,
            sources: [],
            fallback: true,
          });
        }
      }

      // Return empty result with error metadata
      return this.createErrorResult(error as Error, startTime);
    }
  }

  /**
   * Get venues by location with radius-based search
   */
  async getVenuesByLocation(
    lat: number,
    lng: number,
    radius: number,
    options: AggregationOptions = {},
  ): Promise<AggregationResult> {
    const query: SearchQuery = {
      location: { lat, lng },
      radius: radius * 1000, // Convert km to meters
      limit: 50,
    };

    return this.searchVenues(query, options);
  }

  /**
   * Get venues by filters with advanced search capabilities
   */
  async getVenuesByFilters(
    filters: SearchFilters,
    options: AggregationOptions = {},
  ): Promise<AggregationResult> {
    const query: SearchQuery = {
      term: filters.categories?.join(" "),
      categories: filters.categories,
      limit: 50,
    };

    // Apply data source filters
    if (filters.dataSources) {
      options.prioritySources = filters.dataSources;
    }

    if (filters.minDataQuality) {
      options.qualityThreshold = filters.minDataQuality;
    }

    return this.searchVenues(query, options);
  }

  /**
   * Get venue details from multiple sources and merge
   */
  async getVenueDetails(
    venueId: string,
    sources?: DataSource[],
  ): Promise<Venue | null> {
    const context = {
      operation: "getVenueDetails",
      timestamp: new Date(),
      additionalData: { venueId, sources },
    };

    try {
      // Check cache first
      const cacheKey = `venue_details_${venueId}`;
      const cached = await this.cacheManager.get<Venue>(cacheKey);
      if (cached) {
        return cached;
      }

      const selectedSources = sources || (await this.getActiveSources());
      const rawDataPromises = selectedSources.map(async (source) => {
        try {
          return await this.apiRegistry.getVenueDetails(source, venueId);
        } catch (error) {
          console.warn(`Failed to get venue details from ${source}:`, error);
          return null;
        }
      });

      const rawDataResults = await Promise.allSettled(rawDataPromises);
      const rawData = rawDataResults
        .filter(
          (result): result is PromiseFulfilledResult<any> =>
            result.status === "fulfilled" && result.value !== null,
        )
        .map((result) => result.value);

      if (rawData.length === 0) {
        return null;
      }

      // Normalize and merge data
      const venue =
        this.dataPipeline["normalizationEngine"].normalizeVenueData(rawData);

      if (venue) {
        // Cache the result
        await this.cacheManager.set(cacheKey, venue, {
          ttl: 60 * 60 * 1000, // 1 hour
          tags: ["venue_details"],
          priority: "high",
        });
      }

      return venue;
    } catch (error) {
      await this.errorHandler.handleError(error as Error, context);
      return null;
    }
  }

  /**
   * Refresh venue data from all sources
   */
  async refreshVenueData(venueId: string): Promise<boolean> {
    try {
      // Invalidate cache
      await this.cacheManager.delete(`venue_details_${venueId}`);

      // Get fresh data
      const venue = await this.getVenueDetails(venueId);

      return venue !== null;
    } catch (error) {
      console.error("Error refreshing venue data:", error);
      return false;
    }
  }

  /**
   * Bulk venue operations
   */
  async searchMultipleLocations(
    locations: Array<{ lat: number; lng: number; radius: number }>,
    options: AggregationOptions = {},
  ): Promise<AggregationResult[]> {
    const promises = locations.map((location) =>
      this.getVenuesByLocation(
        location.lat,
        location.lng,
        location.radius,
        options,
      ),
    );

    return Promise.all(promises);
  }

  /**
   * Performance and health monitoring
   */
  async getSystemHealth(): Promise<{
    status: "healthy" | "degraded" | "unhealthy";
    apis: any;
    cache: any;
    errors: any;
    recommendations: string[];
  }> {
    const [apiHealth, cacheHealth, errorHealth] = await Promise.all([
      this.apiRegistry.performHealthCheck(),
      this.cacheManager.getCacheHealth(),
      this.errorHandler.performHealthCheck(),
    ]);

    const recommendations: string[] = [];
    let overallStatus: "healthy" | "degraded" | "unhealthy" = "healthy";

    // Determine overall status
    if (
      apiHealth.unhealthyAdapters.length > 0 ||
      errorHealth.overall === "unhealthy" ||
      cacheHealth.status === "critical"
    ) {
      overallStatus = "unhealthy";
    } else if (
      apiHealth.healthyAdapters < apiHealth.totalAdapters * 0.8 ||
      errorHealth.overall === "degraded" ||
      cacheHealth.status === "warning"
    ) {
      overallStatus = "degraded";
    }

    // Aggregate recommendations
    recommendations.push(...cacheHealth.recommendations);
    recommendations.push(...errorHealth.recommendations);

    return {
      status: overallStatus,
      apis: apiHealth,
      cache: cacheHealth,
      errors: errorHealth,
      recommendations,
    };
  }

  /**
   * Performance analytics
   */
  getPerformanceMetrics(): {
    cache: any;
    errors: any;
    apis: any;
  } {
    return {
      cache: this.cacheManager.getStats(),
      errors: this.errorHandler.getErrorMetrics(),
      apis: this.apiRegistry.getAdapterStats(),
    };
  }

  // Private helper methods
  private async selectOptimalSources(
    _query: SearchQuery,
    options: AggregationOptions,
  ): Promise<DataSource[]> {
    // Get healthy adapters
    const healthyAdapters = await this.apiRegistry.getHealthyAdapters();
    const availableSources = healthyAdapters.map((adapter) => adapter.source);

    // Apply priority sources if specified
    let selectedSources = options.prioritySources
      ? options.prioritySources.filter((source) =>
          availableSources.includes(source),
        )
      : availableSources;

    // Limit number of sources if specified
    if (options.maxSources) {
      selectedSources = selectedSources.slice(0, options.maxSources);
    }

    // Ensure we have at least one source
    if (selectedSources.length === 0 && availableSources.length > 0) {
      selectedSources = [availableSources[0]];
    }

    return selectedSources;
  }

  private async getCachedResults(query: SearchQuery): Promise<Venue[] | null> {
    return this.cacheManager.getCachedProcessedVenues(query);
  }

  private async cacheResults(
    query: SearchQuery,
    venues: Venue[],
  ): Promise<void> {
    await this.cacheManager.cacheProcessedVenues(query, venues);
  }

  private async validateVenueQuality(
    venues: Venue[],
    threshold: number,
  ): Promise<{ venues: Venue[]; validationResults: any[] }> {
    const validationResults = [];
    const qualityVenues = [];

    for (const venue of venues) {
      const report = this.qualityValidator.validateVenue(venue);
      validationResults.push(report);

      if (report.overallScore >= threshold) {
        qualityVenues.push(venue);
      }
    }

    return {
      venues: qualityVenues,
      validationResults,
    };
  }

  private async getActiveSources(): Promise<DataSource[]> {
    const adapters = await this.apiRegistry.getHealthyAdapters();
    return adapters.map((adapter) => adapter.source);
  }

  private createSuccessResult(
    venues: Venue[],
    metadata: {
      cached: boolean;
      startTime: number;
      sources: DataSource[];
      pipelineResult?: any;
      qualityResults?: any;
      fallback?: boolean;
    },
  ): AggregationResult {
    const totalTime = Date.now() - metadata.startTime;
    const cacheStats = this.cacheManager.getStats();

    return {
      venues,
      metadata: {
        totalSources: metadata.sources.length,
        successfulSources: metadata.sources,
        failedSources: [],
        cached: metadata.cached,
        quality: {
          averageScore:
            metadata.qualityResults?.validationResults?.reduce(
              (sum: number, result: any) => sum + result.overallScore,
              0,
            ) / (metadata.qualityResults?.validationResults?.length || 1) ||
            0.8,
          lowQualityCount:
            metadata.qualityResults?.validationResults?.filter(
              (result: any) => result.overallScore < 0.6,
            ).length || 0,
          validationIssues:
            metadata.qualityResults?.validationResults?.reduce(
              (sum: number, result: any) => sum + result.issues.length,
              0,
            ) || 0,
        },
        performance: {
          totalTime,
          cacheHitRate: cacheStats.hitRate,
          apiCallCount: metadata.cached ? 0 : metadata.sources.length,
        },
      },
    };
  }

  private createErrorResult(
    _error: Error,
    startTime: number,
  ): AggregationResult {
    const totalTime = Date.now() - startTime;

    return {
      venues: [],
      metadata: {
        totalSources: 0,
        successfulSources: [],
        failedSources: [],
        cached: false,
        quality: {
          averageScore: 0,
          lowQualityCount: 0,
          validationIssues: 1,
        },
        performance: {
          totalTime,
          cacheHitRate: 0,
          apiCallCount: 0,
        },
      },
    };
  }
}
