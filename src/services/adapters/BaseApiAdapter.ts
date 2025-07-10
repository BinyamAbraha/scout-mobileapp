import type {
  ApiAdapter,
  DataSource,
  SearchQuery,
  RawVenueData,
  ApiRateLimit,
  ApiHealthStatus,
  ApiConfig,
  ApiError,
  CircuitBreakerState,
} from "../../types";

export abstract class BaseApiAdapter implements ApiAdapter {
  public readonly source: DataSource;
  protected config: ApiConfig;
  protected healthStatus: ApiHealthStatus;
  protected rateLimit: ApiRateLimit;
  protected circuitBreaker: CircuitBreakerState;

  constructor(source: DataSource, config: ApiConfig) {
    this.source = source;
    this.config = config;
    this.healthStatus = {
      isHealthy: true,
      errorRate: 0,
      avgResponseTime: 0,
      consecutiveFailures: 0,
    };
    this.rateLimit = {
      requestsPerMinute: config.rateLimit.requestsPerMinute,
      requestsPerHour: config.rateLimit.requestsPerHour,
      requestsPerDay: config.rateLimit.requestsPerDay,
      currentUsage: {
        minute: 0,
        hour: 0,
        day: 0,
      },
      resetTime: new Date(Date.now() + 60000), // 1 minute from now
    };
    this.circuitBreaker = {
      source: this.source,
      state: "closed",
      failureCount: 0,
    };
  }

  // Abstract methods that must be implemented by concrete adapters
  abstract searchVenues(query: SearchQuery): Promise<RawVenueData[]>;
  abstract getVenueDetails(externalId: string): Promise<RawVenueData | null>;
  abstract getVenuesByLocation(
    lat: number,
    lng: number,
    radius: number,
  ): Promise<RawVenueData[]>;

  // Concrete implementations
  async isAvailable(): Promise<boolean> {
    if (!this.config.isEnabled) {
      return false;
    }

    if (this.circuitBreaker.state === "open") {
      const now = new Date();
      if (
        this.circuitBreaker.nextRetryTime &&
        now < this.circuitBreaker.nextRetryTime
      ) {
        return false;
      }
      // Move to half-open state
      this.circuitBreaker.state = "half-open";
    }

    return true;
  }

  getRateLimit(): ApiRateLimit {
    return { ...this.rateLimit };
  }

  getHealthStatus(): ApiHealthStatus {
    return { ...this.healthStatus };
  }

  getCircuitBreakerState(): CircuitBreakerState {
    return { ...this.circuitBreaker };
  }

  // Protected helper methods for concrete implementations
  protected async makeRequest<T>(
    url: string,
    options: RequestInit = {},
  ): Promise<T> {
    if (!(await this.isAvailable())) {
      throw new Error(`API ${this.source} is not available`);
    }

    if (!this.checkRateLimit()) {
      throw new Error(`Rate limit exceeded for ${this.source}`);
    }

    const startTime = Date.now();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        this.config.timeout,
      );

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          ...options.headers,
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      // Update health status on success
      this.updateHealthStatus(true, Date.now() - startTime);
      this.updateRateLimit();

      return data;
    } catch (error) {
      // Update health status on failure
      this.updateHealthStatus(false, Date.now() - startTime);
      this.handleError(error as Error);
      throw error;
    }
  }

  protected checkRateLimit(): boolean {
    const now = new Date();

    // Reset counters if needed
    if (now >= this.rateLimit.resetTime) {
      this.resetRateLimit();
    }

    // Check limits
    return (
      this.rateLimit.currentUsage.minute < this.rateLimit.requestsPerMinute &&
      this.rateLimit.currentUsage.hour < this.rateLimit.requestsPerHour &&
      this.rateLimit.currentUsage.day < this.rateLimit.requestsPerDay
    );
  }

  protected updateRateLimit(): void {
    this.rateLimit.currentUsage.minute++;
    this.rateLimit.currentUsage.hour++;
    this.rateLimit.currentUsage.day++;
  }

  protected resetRateLimit(): void {
    const now = new Date();
    this.rateLimit.currentUsage = {
      minute: 0,
      hour: 0,
      day: 0,
    };
    this.rateLimit.resetTime = new Date(now.getTime() + 60000); // Next minute
  }

  protected updateHealthStatus(success: boolean, responseTime: number): void {
    const now = new Date();

    if (success) {
      this.healthStatus.lastSuccessfulCall = now;
      this.healthStatus.consecutiveFailures = 0;

      // Reset circuit breaker on success
      if (this.circuitBreaker.state === "half-open") {
        this.circuitBreaker.state = "closed";
        this.circuitBreaker.failureCount = 0;
      }
    } else {
      this.healthStatus.lastFailedCall = now;
      this.healthStatus.consecutiveFailures++;

      // Update circuit breaker on failure
      this.circuitBreaker.failureCount++;
      this.circuitBreaker.lastFailureTime = now;

      // Open circuit breaker if threshold reached
      if (this.circuitBreaker.failureCount >= 5) {
        this.circuitBreaker.state = "open";
        this.circuitBreaker.nextRetryTime = new Date(now.getTime() + 60000); // Retry in 1 minute
      }
    }

    // Update average response time
    this.healthStatus.avgResponseTime =
      (this.healthStatus.avgResponseTime + responseTime) / 2;

    // Update error rate (simple moving average)
    const errorRate =
      this.healthStatus.consecutiveFailures /
      Math.max(1, this.healthStatus.consecutiveFailures + 1);
    this.healthStatus.errorRate = errorRate;

    // Update overall health
    this.healthStatus.isHealthy =
      this.healthStatus.consecutiveFailures < 3 &&
      this.healthStatus.errorRate < 0.5;
  }

  protected handleError(error: Error): void {
    const apiError: ApiError = {
      source: this.source,
      message: error.message,
      timestamp: new Date(),
      retryable: this.isRetryableError(error),
    };

    console.error(`API Error [${this.source}]:`, apiError);
  }

  protected isRetryableError(error: Error): boolean {
    const retryableErrors = [
      "network error",
      "timeout",
      "rate limit",
      "service unavailable",
    ];

    return retryableErrors.some((retryableError) =>
      error.message.toLowerCase().includes(retryableError),
    );
  }

  protected normalizeVenueData(rawData: any): RawVenueData {
    // Base implementation - concrete adapters should override this
    return {
      externalId: rawData.id || "",
      source: this.source,
      name: rawData.name || "",
      address: rawData.address || "",
      coordinates: rawData.coordinates || undefined,
      category: rawData.category || "",
      rating: rawData.rating || 0,
      reviewCount: rawData.reviewCount || 0,
      priceLevel: rawData.priceLevel || 1,
      phone: rawData.phone || "",
      website: rawData.website || "",
      description: rawData.description || "",
      imageUrls: rawData.imageUrls || [],
      hours: rawData.hours || [],
      features: rawData.features || [],
      rawData: rawData,
      fetchedAt: new Date(),
    };
  }

  // Utility methods for concrete implementations
  protected buildUrl(
    baseUrl: string,
    endpoint: string,
    params: Record<string, any> = {},
  ): string {
    const url = new URL(endpoint, baseUrl);

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, String(value));
      }
    });

    return url.toString();
  }

  protected getAuthHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.config.apiKey}`,
    };
  }
}
