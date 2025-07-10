import AsyncStorage from "@react-native-async-storage/async-storage";
import type {
  CacheConfig,
  DataSource,
  SearchQuery,
  RawVenueData,
  Venue,
  ApiResponse,
} from "../types";

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  source?: DataSource;
  version: number;
  tags: string[];
  accessCount: number;
  lastAccessed: number;
}

interface CacheStats {
  totalSize: number;
  entryCount: number;
  hitRate: number;
  missRate: number;
  evictionCount: number;
  oldestEntry: number;
  newestEntry: number;
}

interface CacheIndex {
  key: string;
  size: number;
  timestamp: number;
  lastAccessed: number;
  accessCount: number;
  tags: string[];
}

export class CacheManager {
  private config: CacheConfig;
  private memoryCache: Map<string, CacheEntry<any>> = new Map();
  private cacheIndex: Map<string, CacheIndex> = new Map();
  private hitCount = 0;
  private missCount = 0;
  private evictionCount = 0;
  private maxMemorySize: number; // in bytes
  private currentMemorySize = 0;
  private backgroundRefreshEnabled = true;
  private static instance: CacheManager;

  private constructor(config: CacheConfig) {
    this.config = config;
    this.maxMemorySize = config.maxCacheSize * 1024 * 1024; // Convert MB to bytes
    this.backgroundRefreshEnabled = config.enableBackgroundRefresh;
    this.initializeCache();
  }

  static getInstance(config?: CacheConfig): CacheManager {
    if (!CacheManager.instance && config) {
      CacheManager.instance = new CacheManager(config);
    }
    return CacheManager.instance;
  }

  private async initializeCache(): Promise<void> {
    try {
      // Load cache index from persistent storage
      const indexData = await AsyncStorage.getItem("cache_index");
      if (indexData) {
        const parsedIndex = JSON.parse(indexData);
        this.cacheIndex = new Map(Object.entries(parsedIndex));
      }

      // Load critical cache entries into memory
      await this.loadCriticalEntries();

      console.log("✅ Cache manager initialized");
    } catch (error) {
      console.error("❌ Cache initialization failed:", error);
    }
  }

  // Multi-level cache operations
  async get<T>(key: string, tags?: string[]): Promise<T | null> {
    // Level 1: Memory cache
    const memoryEntry = this.memoryCache.get(key);
    if (memoryEntry && this.isEntryValid(memoryEntry)) {
      this.updateAccessStats(key, memoryEntry);
      this.hitCount++;
      return memoryEntry.data;
    }

    // Level 2: Persistent storage
    try {
      const persistentData = await AsyncStorage.getItem(`cache_${key}`);
      if (persistentData) {
        const entry: CacheEntry<T> = JSON.parse(persistentData);

        if (this.isEntryValid(entry)) {
          // Promote to memory cache if frequently accessed
          if (entry.accessCount > 5) {
            this.setMemoryCache(key, entry);
          }

          this.updateAccessStats(key, entry);
          this.hitCount++;
          return entry.data;
        } else {
          // Remove expired entry
          await this.delete(key);
        }
      }
    } catch (error) {
      console.error("Error reading from persistent cache:", error);
    }

    this.missCount++;
    return null;
  }

  async set<T>(
    key: string,
    data: T,
    options: {
      ttl?: number;
      source?: DataSource;
      tags?: string[];
      priority?: "low" | "medium" | "high";
    } = {},
  ): Promise<void> {
    const now = Date.now();
    const ttl = options.ttl || this.getDefaultTTL(options.source);
    const tags = options.tags || [];
    const priority = options.priority || "medium";

    const entry: CacheEntry<T> = {
      data,
      timestamp: now,
      ttl,
      source: options.source,
      version: 1,
      tags,
      accessCount: 0,
      lastAccessed: now,
    };

    const entrySize = this.calculateEntrySize(entry);

    // Update index
    this.cacheIndex.set(key, {
      key,
      size: entrySize,
      timestamp: now,
      lastAccessed: now,
      accessCount: 0,
      tags,
    });

    // Memory cache strategy based on priority and size
    if (priority === "high" || entrySize < 10000) {
      // 10KB threshold
      this.setMemoryCache(key, entry);
    }

    // Persistent storage
    try {
      await AsyncStorage.setItem(`cache_${key}`, JSON.stringify(entry));
      await this.updateCacheIndex();
    } catch (error) {
      console.error("Error writing to persistent cache:", error);
    }
  }

  async delete(key: string): Promise<void> {
    // Remove from memory
    this.memoryCache.delete(key);

    // Remove from persistent storage
    try {
      await AsyncStorage.removeItem(`cache_${key}`);
    } catch (error) {
      console.error("Error deleting from persistent cache:", error);
    }

    // Update index
    const indexEntry = this.cacheIndex.get(key);
    if (indexEntry) {
      this.currentMemorySize -= indexEntry.size;
      this.cacheIndex.delete(key);
      await this.updateCacheIndex();
    }
  }

  // Specialized caching methods for different data types
  async cacheApiResponse<T>(
    source: DataSource,
    endpoint: string,
    params: Record<string, any>,
    response: ApiResponse<T>,
  ): Promise<void> {
    const key = this.generateApiCacheKey(source, endpoint, params);
    const ttl = this.config.apiResponseTTL * 60 * 1000; // Convert minutes to ms

    await this.set(key, response, {
      ttl,
      source,
      tags: ["api_response", source, endpoint],
      priority: "medium",
    });
  }

  async getCachedApiResponse<T>(
    source: DataSource,
    endpoint: string,
    params: Record<string, any>,
  ): Promise<ApiResponse<T> | null> {
    const key = this.generateApiCacheKey(source, endpoint, params);
    return this.get<ApiResponse<T>>(key);
  }

  async cacheProcessedVenues(
    query: SearchQuery,
    venues: Venue[],
  ): Promise<void> {
    const key = this.generateVenueQueryKey(query);
    const ttl = this.config.processedDataTTL * 60 * 1000;

    await this.set(key, venues, {
      ttl,
      tags: ["processed_venues", "search_results"],
      priority: "high",
    });
  }

  async getCachedProcessedVenues(query: SearchQuery): Promise<Venue[] | null> {
    const key = this.generateVenueQueryKey(query);
    return this.get<Venue[]>(key);
  }

  async cacheRawVenueData(
    source: DataSource,
    rawData: RawVenueData[],
  ): Promise<void> {
    const key = `raw_venues_${source}_${Date.now()}`;
    const ttl = this.config.apiResponseTTL * 60 * 1000;

    await this.set(key, rawData, {
      ttl,
      source,
      tags: ["raw_venues", source],
      priority: "low",
    });
  }

  // Geographic caching
  async cacheVenuesByLocation(
    lat: number,
    lng: number,
    radius: number,
    venues: Venue[],
  ): Promise<void> {
    const key = this.generateLocationKey(lat, lng, radius);
    const ttl = this.config.queryResultTTL * 60 * 1000;

    await this.set(key, venues, {
      ttl,
      tags: ["location_venues", "geographic"],
      priority: "high",
    });
  }

  async getCachedVenuesByLocation(
    lat: number,
    lng: number,
    radius: number,
  ): Promise<Venue[] | null> {
    const key = this.generateLocationKey(lat, lng, radius);
    return this.get<Venue[]>(key);
  }

  // Cache management operations
  async invalidateByTag(tag: string): Promise<void> {
    const keysToInvalidate: string[] = [];

    for (const [key, indexEntry] of this.cacheIndex.entries()) {
      if (indexEntry.tags.includes(tag)) {
        keysToInvalidate.push(key);
      }
    }

    for (const key of keysToInvalidate) {
      await this.delete(key);
    }

    console.log(
      `🗑️ Invalidated ${keysToInvalidate.length} entries with tag: ${tag}`,
    );
  }

  async invalidateBySource(source: DataSource): Promise<void> {
    await this.invalidateByTag(source);
  }

  async clear(): Promise<void> {
    // Clear memory cache
    this.memoryCache.clear();

    // Clear persistent cache
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter((key) => key.startsWith("cache_"));
      await AsyncStorage.multiRemove(cacheKeys);
    } catch (error) {
      console.error("Error clearing persistent cache:", error);
    }

    // Clear index
    this.cacheIndex.clear();
    this.currentMemorySize = 0;

    console.log("🧹 Cache cleared");
  }

  // Background refresh mechanism
  async enableBackgroundRefresh(): Promise<void> {
    this.backgroundRefreshEnabled = true;

    // Schedule periodic cache refresh for high-priority entries
    setInterval(
      async () => {
        if (this.backgroundRefreshEnabled) {
          await this.refreshStaleEntries();
        }
      },
      5 * 60 * 1000,
    ); // Every 5 minutes
  }

  private async refreshStaleEntries(): Promise<void> {
    const now = Date.now();
    const staleThreshold = 0.8; // Refresh when 80% of TTL has passed

    for (const [key, indexEntry] of this.cacheIndex.entries()) {
      const age = now - indexEntry.timestamp;
      const entry = this.memoryCache.get(key);

      if (entry && indexEntry.tags.includes("high_priority")) {
        const staleTime = entry.ttl * staleThreshold;

        if (age > staleTime) {
          // Trigger background refresh (implement based on data type)
          console.log(`🔄 Background refresh triggered for: ${key}`);
        }
      }
    }
  }

  // Cache analytics and monitoring
  getStats(): CacheStats {
    const totalRequests = this.hitCount + this.missCount;
    const entries = Array.from(this.cacheIndex.values());

    return {
      totalSize: this.currentMemorySize,
      entryCount: this.cacheIndex.size,
      hitRate: totalRequests > 0 ? this.hitCount / totalRequests : 0,
      missRate: totalRequests > 0 ? this.missCount / totalRequests : 0,
      evictionCount: this.evictionCount,
      oldestEntry:
        entries.length > 0 ? Math.min(...entries.map((e) => e.timestamp)) : 0,
      newestEntry:
        entries.length > 0 ? Math.max(...entries.map((e) => e.timestamp)) : 0,
    };
  }

  async getCacheHealth(): Promise<{
    status: "healthy" | "warning" | "critical";
    issues: string[];
    recommendations: string[];
  }> {
    const stats = this.getStats();
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Check hit rate
    if (stats.hitRate < 0.3) {
      issues.push("Low cache hit rate");
      recommendations.push("Consider increasing TTL values or cache size");
    }

    // Check memory usage
    const memoryUsagePercent = this.currentMemorySize / this.maxMemorySize;
    if (memoryUsagePercent > 0.9) {
      issues.push("High memory usage");
      recommendations.push(
        "Increase cache size or implement more aggressive eviction",
      );
    }

    // Check entry age
    const now = Date.now();
    const oldEntries = Array.from(this.cacheIndex.values()).filter(
      (entry) => now - entry.timestamp > 24 * 60 * 60 * 1000,
    ); // 24 hours

    if (oldEntries.length > stats.entryCount * 0.5) {
      issues.push("Many stale entries");
      recommendations.push(
        "Consider reducing TTL values or implementing periodic cleanup",
      );
    }

    const status =
      issues.length === 0
        ? "healthy"
        : issues.length < 3
          ? "warning"
          : "critical";

    return { status, issues, recommendations };
  }

  // Private utility methods
  private isEntryValid<T>(entry: CacheEntry<T>): boolean {
    const now = Date.now();
    return now - entry.timestamp < entry.ttl;
  }

  private setMemoryCache<T>(key: string, entry: CacheEntry<T>): void {
    const entrySize = this.calculateEntrySize(entry);

    // Check if we need to evict entries
    if (this.currentMemorySize + entrySize > this.maxMemorySize) {
      this.evictLeastRecentlyUsed(entrySize);
    }

    this.memoryCache.set(key, entry);
    this.currentMemorySize += entrySize;
  }

  private evictLeastRecentlyUsed(spaceNeeded: number): void {
    const entries = Array.from(this.memoryCache.entries())
      .map(([key, entry]) => ({
        key,
        entry,
        lastAccessed: entry.lastAccessed,
        size: this.calculateEntrySize(entry),
      }))
      .sort((a, b) => a.lastAccessed - b.lastAccessed);

    let freedSpace = 0;
    for (const { key, size } of entries) {
      this.memoryCache.delete(key);
      this.currentMemorySize -= size;
      freedSpace += size;
      this.evictionCount++;

      if (freedSpace >= spaceNeeded) {
        break;
      }
    }
  }

  private calculateEntrySize<T>(entry: CacheEntry<T>): number {
    // Rough estimate of entry size in bytes
    return JSON.stringify(entry).length * 2; // 2 bytes per character for UTF-16
  }

  private updateAccessStats<T>(key: string, entry: CacheEntry<T>): void {
    const now = Date.now();
    entry.accessCount++;
    entry.lastAccessed = now;

    const indexEntry = this.cacheIndex.get(key);
    if (indexEntry) {
      indexEntry.accessCount++;
      indexEntry.lastAccessed = now;
    }
  }

  private getDefaultTTL(source?: DataSource): number {
    // Default TTLs in milliseconds
    const defaults = {
      yelp: this.config.apiResponseTTL * 60 * 1000,
      google_places: this.config.apiResponseTTL * 60 * 1000,
      foursquare: this.config.apiResponseTTL * 60 * 1000,
      openstreetmap: this.config.apiResponseTTL * 2 * 60 * 1000, // OSM data changes less frequently
      internal: this.config.processedDataTTL * 60 * 1000,
    };

    return source
      ? defaults[source as keyof typeof defaults] || defaults.internal
      : defaults.internal;
  }

  private generateApiCacheKey(
    source: DataSource,
    endpoint: string,
    params: Record<string, any>,
  ): string {
    const sortedParams = Object.keys(params)
      .sort()
      .reduce(
        (result, key) => {
          result[key] = params[key];
          return result;
        },
        {} as Record<string, any>,
      );

    const paramString = JSON.stringify(sortedParams);
    return `api_${source}_${endpoint}_${this.hashString(paramString)}`;
  }

  private generateVenueQueryKey(query: SearchQuery): string {
    const queryString = JSON.stringify(query, Object.keys(query).sort());
    return `venues_query_${this.hashString(queryString)}`;
  }

  private generateLocationKey(
    lat: number,
    lng: number,
    radius: number,
  ): string {
    // Round coordinates to reduce cache fragmentation
    const roundedLat = Math.round(lat * 1000) / 1000;
    const roundedLng = Math.round(lng * 1000) / 1000;
    const roundedRadius = Math.round(radius);

    return `location_${roundedLat}_${roundedLng}_${roundedRadius}`;
  }

  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }

  private async loadCriticalEntries(): Promise<void> {
    // Load most frequently accessed entries into memory
    const criticalTags = ["high_priority", "processed_venues"];

    for (const [key, indexEntry] of this.cacheIndex.entries()) {
      if (
        indexEntry.accessCount > 10 &&
        criticalTags.some((tag) => indexEntry.tags.includes(tag))
      ) {
        try {
          const data = await AsyncStorage.getItem(`cache_${key}`);
          if (data) {
            const entry = JSON.parse(data);
            if (this.isEntryValid(entry)) {
              this.memoryCache.set(key, entry);
            }
          }
        } catch (error) {
          console.error(`Error loading critical cache entry ${key}:`, error);
        }
      }
    }
  }

  private async updateCacheIndex(): Promise<void> {
    try {
      const indexObj = Object.fromEntries(this.cacheIndex.entries());
      await AsyncStorage.setItem("cache_index", JSON.stringify(indexObj));
    } catch (error) {
      console.error("Error updating cache index:", error);
    }
  }
}
