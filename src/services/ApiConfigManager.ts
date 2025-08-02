import type { ApiConfig, DataSource, CacheConfig } from "../types";

export class ApiConfigManager {
  private configs: Map<DataSource, ApiConfig> = new Map();
  private cacheConfig: CacheConfig;
  private static instance: ApiConfigManager;

  private constructor() {
    this.cacheConfig = {
      apiResponseTTL: 30, // 30 minutes
      processedDataTTL: 60, // 1 hour
      queryResultTTL: 15, // 15 minutes
      maxCacheSize: 100, // 100 MB
      enableBackgroundRefresh: true,
    };

    this.loadConfigs();
  }

  static getInstance(): ApiConfigManager {
    if (!ApiConfigManager.instance) {
      ApiConfigManager.instance = new ApiConfigManager();
    }
    return ApiConfigManager.instance;
  }

  private loadConfigs(): void {
    // Yelp API Configuration
    this.configs.set("yelp", {
      source: "yelp",
      apiKey: process.env.EXPO_PUBLIC_YELP_API_KEY || "",
      baseUrl: "https://api.yelp.com/v3",
      rateLimit: {
        requestsPerMinute: 60,
        requestsPerHour: 5000,
        requestsPerDay: 25000,
      },
      timeout: 10000,
      retryConfig: {
        maxRetries: 3,
        backoffMultiplier: 2,
        maxBackoffTime: 30000,
      },
      isEnabled: Boolean(process.env.EXPO_PUBLIC_YELP_API_KEY),
      priority: 8,
    });

    // Google Places API Configuration
    this.configs.set("google_places", {
      source: "google_places",
      apiKey: process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY || "",
      baseUrl: "https://maps.googleapis.com/maps/api/place",
      rateLimit: {
        requestsPerMinute: 60,
        requestsPerHour: 3000,
        requestsPerDay: 100000,
      },
      timeout: 8000,
      retryConfig: {
        maxRetries: 3,
        backoffMultiplier: 2,
        maxBackoffTime: 30000,
      },
      isEnabled: false, // Disabled - no API key provided
      priority: 9,
    });

    // OpenStreetMap (Nominatim) Configuration - DISABLED (no adapter)
    this.configs.set("openstreetmap", {
      source: "openstreetmap",
      apiKey: "", // No API key needed for Nominatim
      baseUrl: "https://nominatim.openstreetmap.org",
      rateLimit: {
        requestsPerMinute: 60,
        requestsPerHour: 1000,
        requestsPerDay: 10000,
      },
      timeout: 10000,
      retryConfig: {
        maxRetries: 2,
        backoffMultiplier: 2,
        maxBackoffTime: 20000,
      },
      isEnabled: false, // Disabled until adapter is implemented
      priority: 5,
    });

    // Internal/Supabase Configuration
    this.configs.set("internal", {
      source: "internal",
      apiKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "",
      baseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL || "",
      rateLimit: {
        requestsPerMinute: 1000,
        requestsPerHour: 50000,
        requestsPerDay: 1000000,
      },
      timeout: 5000,
      retryConfig: {
        maxRetries: 2,
        backoffMultiplier: 1.5,
        maxBackoffTime: 10000,
      },
      isEnabled: false, // Disabled until adapter is implemented
      priority: 10,
    });
  }

  getConfig(source: DataSource): ApiConfig | undefined {
    return this.configs.get(source);
  }

  getAllConfigs(): ApiConfig[] {
    return Array.from(this.configs.values());
  }

  getEnabledConfigs(): ApiConfig[] {
    return this.getAllConfigs().filter((config) => config.isEnabled);
  }

  getConfigsByPriority(): ApiConfig[] {
    return this.getEnabledConfigs().sort((a, b) => b.priority - a.priority);
  }

  getCacheConfig(): CacheConfig {
    return { ...this.cacheConfig };
  }

  updateConfig(source: DataSource, updates: Partial<ApiConfig>): void {
    const existingConfig = this.configs.get(source);
    if (existingConfig) {
      this.configs.set(source, { ...existingConfig, ...updates });
    }
  }

  updateCacheConfig(updates: Partial<CacheConfig>): void {
    this.cacheConfig = { ...this.cacheConfig, ...updates };
  }

  isConfigValid(source: DataSource): boolean {
    const config = this.getConfig(source);
    if (!config) return false;

    // Check if required fields are present
    if (!config.baseUrl) return false;

    // Check if API key is required and present
    const sourcesNeedingApiKey: DataSource[] = [
      "yelp",
      "google_places",
      "internal",
    ];

    if (sourcesNeedingApiKey.includes(source) && !config.apiKey) {
      return false;
    }

    return true;
  }

  getValidConfigs(): ApiConfig[] {
    return this.getAllConfigs().filter((config) =>
      this.isConfigValid(config.source),
    );
  }

  // Environment validation
  validateEnvironment(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    const requiredEnvVars = [
      "EXPO_PUBLIC_SUPABASE_URL",
      "EXPO_PUBLIC_SUPABASE_ANON_KEY",
    ];

    for (const envVar of requiredEnvVars) {
      if (!process.env[envVar]) {
        errors.push(`Missing required environment variable: ${envVar}`);
      }
    }

    const optionalEnvVars = [
      "EXPO_PUBLIC_YELP_API_KEY",
      "EXPO_PUBLIC_GOOGLE_PLACES_API_KEY",
    ];

    const missingOptional = optionalEnvVars.filter(
      (envVar) => !process.env[envVar],
    );
    if (missingOptional.length > 0) {
      console.warn("Missing optional API keys:", missingOptional);
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  // Get configuration summary for debugging
  getConfigSummary(): Record<string, any> {
    const summary: Record<string, any> = {};

    for (const [source, config] of this.configs.entries()) {
      summary[source] = {
        isEnabled: config.isEnabled,
        isValid: this.isConfigValid(source),
        hasApiKey: Boolean(config.apiKey),
        priority: config.priority,
        rateLimit: config.rateLimit,
      };
    }

    return summary;
  }
}
