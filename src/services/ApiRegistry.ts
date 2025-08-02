import type {
  ApiAdapter,
  DataSource,
  SearchQuery,
  RawVenueData,
  ApiHealthStatus,
  CircuitBreakerState,
} from "../types";
import { ApiConfigManager } from "./ApiConfigManager";
import { YelpApiAdapter } from "./adapters/YelpApiAdapter";
// TODO: Import other adapters as they are created
// import { GooglePlacesApiAdapter } from './adapters/GooglePlacesApiAdapter';
// import { OpenStreetMapApiAdapter } from './adapters/OpenStreetMapApiAdapter';

export class ApiRegistry {
  private adapters: Map<DataSource, ApiAdapter> = new Map();
  private configManager: ApiConfigManager;
  private static instance: ApiRegistry;

  private constructor() {
    this.configManager = ApiConfigManager.getInstance();
    this.initializeAdapters();
  }

  static getInstance(): ApiRegistry {
    if (!ApiRegistry.instance) {
      ApiRegistry.instance = new ApiRegistry();
    }
    return ApiRegistry.instance;
  }

  private initializeAdapters(): void {
    const configs = this.configManager.getValidConfigs();

    for (const config of configs) {
      try {
        let adapter: ApiAdapter | null = null;

        switch (config.source) {
          case "yelp":
            adapter = new YelpApiAdapter(config);
            break;
          // TODO: Add other adapters
          // case 'google_places':
          //   adapter = new GooglePlacesApiAdapter(config);
          //   break;
          // case 'openstreetmap':
          //   adapter = new OpenStreetMapApiAdapter(config);
          //   break;
          default:
            console.warn(`No adapter available for source: ${config.source}`);
            continue;
        }

        if (adapter) {
          this.adapters.set(config.source, adapter);
          console.log(`✅ Initialized adapter for ${config.source}`);
        }
      } catch (error) {
        console.error(
          `❌ Failed to initialize adapter for ${config.source}:`,
          error,
        );
      }
    }
  }

  // Get a specific adapter
  getAdapter(source: DataSource): ApiAdapter | undefined {
    return this.adapters.get(source);
  }

  // Get all available adapters
  getAllAdapters(): ApiAdapter[] {
    return Array.from(this.adapters.values());
  }

  // Get adapters by priority (highest first)
  getAdaptersByPriority(): ApiAdapter[] {
    const configs = this.configManager.getConfigsByPriority();
    const adapters: ApiAdapter[] = [];

    for (const config of configs) {
      const adapter = this.adapters.get(config.source);
      if (adapter) {
        adapters.push(adapter);
      }
    }

    return adapters;
  }

  // Get healthy adapters only
  async getHealthyAdapters(): Promise<ApiAdapter[]> {
    const adapters = this.getAllAdapters();
    const healthyAdapters: ApiAdapter[] = [];

    for (const adapter of adapters) {
      if (await adapter.isAvailable()) {
        const health = adapter.getHealthStatus();
        if (health.isHealthy) {
          healthyAdapters.push(adapter);
        }
      }
    }

    return healthyAdapters;
  }

  // Search across multiple APIs
  async searchVenuesMultiSource(
    query: SearchQuery,
    sources?: DataSource[],
  ): Promise<Map<DataSource, RawVenueData[]>> {
    const results = new Map<DataSource, RawVenueData[]>();
    const adaptersToUse = sources
      ? (sources.map((s) => this.getAdapter(s)).filter(Boolean) as ApiAdapter[])
      : await this.getHealthyAdapters();

    // Execute searches in parallel
    const searchPromises = adaptersToUse.map(async (adapter) => {
      try {
        const venues = await adapter.searchVenues(query);
        results.set(adapter.source, venues);
        console.log(`✅ ${adapter.source}: Found ${venues.length} venues`);
      } catch (error) {
        console.error(`❌ ${adapter.source} search failed:`, error);
        results.set(adapter.source, []);
      }
    });

    await Promise.allSettled(searchPromises);
    return results;
  }

  // Get venue details from a specific source
  async getVenueDetails(
    source: DataSource,
    externalId: string,
  ): Promise<RawVenueData | null> {
    const adapter = this.getAdapter(source);
    if (!adapter) {
      console.error(`No adapter found for source: ${source}`);
      return null;
    }

    try {
      return await adapter.getVenueDetails(externalId);
    } catch (error) {
      console.error(`Failed to get venue details from ${source}:`, error);
      return null;
    }
  }

  // Get venues by location from multiple sources
  async getVenuesByLocationMultiSource(
    lat: number,
    lng: number,
    radius: number,
    sources?: DataSource[],
  ): Promise<Map<DataSource, RawVenueData[]>> {
    const results = new Map<DataSource, RawVenueData[]>();
    const adaptersToUse = sources
      ? (sources.map((s) => this.getAdapter(s)).filter(Boolean) as ApiAdapter[])
      : await this.getHealthyAdapters();

    const searchPromises = adaptersToUse.map(async (adapter) => {
      try {
        const venues = await adapter.getVenuesByLocation(lat, lng, radius);
        results.set(adapter.source, venues);
      } catch (error) {
        console.error(`❌ ${adapter.source} location search failed:`, error);
        results.set(adapter.source, []);
      }
    });

    await Promise.allSettled(searchPromises);
    return results;
  }

  // Health monitoring
  getHealthStatus(): Record<DataSource, ApiHealthStatus> {
    const healthStatus: Record<DataSource, ApiHealthStatus> = {} as any;

    for (const [source, adapter] of this.adapters.entries()) {
      healthStatus[source] = adapter.getHealthStatus();
    }

    return healthStatus;
  }

  // Circuit breaker status
  getCircuitBreakerStatus(): Record<DataSource, CircuitBreakerState> {
    const circuitBreakerStatus: Record<DataSource, CircuitBreakerState> =
      {} as any;

    for (const [source, adapter] of this.adapters.entries()) {
      if ("getCircuitBreakerState" in adapter) {
        circuitBreakerStatus[source] = (
          adapter as any
        ).getCircuitBreakerState();
      }
    }

    return circuitBreakerStatus;
  }

  // Performance monitoring
  async performHealthCheck(): Promise<{
    totalAdapters: number;
    healthyAdapters: number;
    unhealthyAdapters: string[];
    circuitBreakerOpen: string[];
  }> {
    const totalAdapters = this.adapters.size;
    const healthyAdapters = (await this.getHealthyAdapters()).length;
    const unhealthyAdapters: string[] = [];
    const circuitBreakerOpen: string[] = [];

    for (const [source, adapter] of this.adapters.entries()) {
      const health = adapter.getHealthStatus();
      if (!health.isHealthy) {
        unhealthyAdapters.push(source);
      }

      if ("getCircuitBreakerState" in adapter) {
        const cbState = (adapter as any).getCircuitBreakerState();
        if (cbState.state === "open") {
          circuitBreakerOpen.push(source);
        }
      }
    }

    return {
      totalAdapters,
      healthyAdapters,
      unhealthyAdapters,
      circuitBreakerOpen,
    };
  }

  // Configuration management
  reloadAdapters(): void {
    console.log("🔄 Reloading API adapters...");
    this.adapters.clear();
    this.initializeAdapters();
  }

  // Adapter availability check
  async checkAdapterAvailability(): Promise<Record<DataSource, boolean>> {
    const availability: Record<DataSource, boolean> = {} as any;

    const availabilityChecks = Array.from(this.adapters.entries()).map(
      async ([source, adapter]) => {
        try {
          const isAvailable = await adapter.isAvailable();
          availability[source] = isAvailable;
        } catch (error) {
          console.error(`Error checking availability for ${source}:`, error);
          availability[source] = false;
        }
      },
    );

    await Promise.allSettled(availabilityChecks);
    return availability;
  }

  // Get adapter statistics
  getAdapterStats(): Record<DataSource, any> {
    const stats: Record<DataSource, any> = {} as any;

    for (const [source, adapter] of this.adapters.entries()) {
      const health = adapter.getHealthStatus();
      const rateLimit = adapter.getRateLimit();

      stats[source] = {
        health: {
          isHealthy: health.isHealthy,
          consecutiveFailures: health.consecutiveFailures,
          errorRate: health.errorRate,
          avgResponseTime: health.avgResponseTime,
        },
        rateLimit: {
          usage: rateLimit.currentUsage,
          limits: {
            minute: rateLimit.requestsPerMinute,
            hour: rateLimit.requestsPerHour,
            day: rateLimit.requestsPerDay,
          },
        },
      };
    }

    return stats;
  }
}
