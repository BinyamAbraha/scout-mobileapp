import type { ApiError, DataSource, CircuitBreakerState } from "../types";
import { supabase } from "../utils/supabase";

interface ErrorContext {
  source?: DataSource;
  operation?: string;
  requestId?: string;
  userId?: string;
  timestamp: Date;
  additionalData?: Record<string, any>;
}

interface RetryConfig {
  maxRetries: number;
  backoffMultiplier: number;
  maxBackoffTime: number;
  retryableErrors: string[];
}

interface ErrorMetrics {
  errorCount: number;
  errorRate: number;
  meanTimeBetweenErrors: number;
  lastError: Date | null;
  topErrors: Array<{ message: string; count: number }>;
}

export class ErrorHandler {
  private errorCounts: Map<string, number> = new Map();
  private errorHistory: Array<{ timestamp: Date; error: ApiError }> = [];
  private circuitBreakers: Map<DataSource, CircuitBreakerState> = new Map();
  private maxHistorySize = 1000;
  private static instance: ErrorHandler;

  private constructor() {
    this.initializeCircuitBreakers();
    this.startErrorCleanup();
  }

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  // Main error handling method
  async handleError(
    error: Error | ApiError,
    context: ErrorContext,
  ): Promise<void> {
    const apiError = this.normalizeError(error, context);

    // Log error
    await this.logError(apiError, context);

    // Update metrics
    this.updateErrorMetrics(apiError);

    // Update circuit breaker
    if (context.source) {
      this.updateCircuitBreaker(context.source, apiError);
    }

    // Check if we should alert
    await this.checkAlertConditions(apiError, context);

    // Store in history (with size limit)
    this.addToHistory(apiError);
  }

  // Retry mechanism with exponential backoff
  async retryOperation<T>(
    operation: () => Promise<T>,
    context: ErrorContext,
    retryConfig?: Partial<RetryConfig>,
  ): Promise<T> {
    const config: RetryConfig = {
      maxRetries: 3,
      backoffMultiplier: 2,
      maxBackoffTime: 30000,
      retryableErrors: [
        "network error",
        "timeout",
        "rate limit",
        "service unavailable",
        "internal server error",
      ],
      ...retryConfig,
    };

    let lastError: Error;
    let backoffTime = 1000; // Start with 1 second

    for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
      try {
        // Check circuit breaker before retry
        if (context.source && this.isCircuitBreakerOpen(context.source)) {
          throw new Error(`Circuit breaker is open for ${context.source}`);
        }

        return await operation();
      } catch (error) {
        lastError = error as Error;

        // Don't retry if this is the last attempt
        if (attempt === config.maxRetries) {
          break;
        }

        // Check if error is retryable
        if (!this.isRetryableError(lastError, config.retryableErrors)) {
          break;
        }

        // Log retry attempt
        console.warn(
          `🔄 Retry attempt ${attempt + 1}/${config.maxRetries} for ${context.operation}`,
        );

        // Wait before retrying
        await this.delay(Math.min(backoffTime, config.maxBackoffTime));
        backoffTime *= config.backoffMultiplier;
      }
    }

    // All retries failed, handle the final error
    await this.handleError(lastError!, context);
    throw lastError!;
  }

  // Circuit breaker operations
  isCircuitBreakerOpen(source: DataSource): boolean {
    const breaker = this.circuitBreakers.get(source);
    if (!breaker) return false;

    if (breaker.state === "open") {
      // Check if we should move to half-open
      const now = new Date();
      if (breaker.nextRetryTime && now >= breaker.nextRetryTime) {
        breaker.state = "half-open";
        console.log(`🔧 Circuit breaker for ${source} moved to half-open`);
      }
    }

    return breaker.state === "open";
  }

  recordCircuitBreakerSuccess(source: DataSource): void {
    const breaker = this.circuitBreakers.get(source);
    if (breaker) {
      breaker.failureCount = 0;
      breaker.state = "closed";
      breaker.lastFailureTime = undefined;
      breaker.nextRetryTime = undefined;
      console.log(`✅ Circuit breaker for ${source} reset to closed`);
    }
  }

  // Error analysis and metrics
  getErrorMetrics(source?: DataSource, timeWindow?: number): ErrorMetrics {
    const now = Date.now();
    const windowMs = timeWindow || 24 * 60 * 60 * 1000; // 24 hours default

    const relevantErrors = this.errorHistory.filter((entry) => {
      const isInTimeWindow = now - entry.timestamp.getTime() <= windowMs;
      const matchesSource = !source || entry.error.source === source;
      return isInTimeWindow && matchesSource;
    });

    const errorCount = relevantErrors.length;
    const timeSpanHours = windowMs / (60 * 60 * 1000);
    const errorRate = errorCount / timeSpanHours;

    // Calculate mean time between errors
    let meanTimeBetweenErrors = 0;
    if (relevantErrors.length > 1) {
      const intervals = [];
      for (let i = 1; i < relevantErrors.length; i++) {
        const interval =
          relevantErrors[i].timestamp.getTime() -
          relevantErrors[i - 1].timestamp.getTime();
        intervals.push(interval);
      }
      meanTimeBetweenErrors =
        intervals.reduce((sum, interval) => sum + interval, 0) /
        intervals.length;
    }

    // Get top error messages
    const errorMessageCounts = new Map<string, number>();
    relevantErrors.forEach((entry) => {
      const message = entry.error.message;
      errorMessageCounts.set(
        message,
        (errorMessageCounts.get(message) || 0) + 1,
      );
    });

    const topErrors = Array.from(errorMessageCounts.entries())
      .map(([message, count]) => ({ message, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      errorCount,
      errorRate,
      meanTimeBetweenErrors,
      lastError:
        relevantErrors.length > 0
          ? relevantErrors[relevantErrors.length - 1].timestamp
          : null,
      topErrors,
    };
  }

  getCircuitBreakerStatus(): Record<DataSource, CircuitBreakerState> {
    const status: Record<DataSource, CircuitBreakerState> = {} as any;

    for (const [source, breaker] of this.circuitBreakers.entries()) {
      status[source] = { ...breaker };
    }

    return status;
  }

  // Error categorization and classification
  categorizeError(error: ApiError): {
    category:
      | "network"
      | "authentication"
      | "rate_limit"
      | "server"
      | "client"
      | "data"
      | "unknown";
    severity: "low" | "medium" | "high" | "critical";
    isTransient: boolean;
  } {
    const message = error.message.toLowerCase();
    const statusCode = error.statusCode;

    // Categorize error
    let category:
      | "network"
      | "authentication"
      | "rate_limit"
      | "server"
      | "client"
      | "data"
      | "unknown" = "unknown";

    if (
      message.includes("network") ||
      message.includes("timeout") ||
      message.includes("connection")
    ) {
      category = "network";
    } else if (
      statusCode === 401 ||
      statusCode === 403 ||
      message.includes("auth")
    ) {
      category = "authentication";
    } else if (statusCode === 429 || message.includes("rate limit")) {
      category = "rate_limit";
    } else if (statusCode && statusCode >= 500) {
      category = "server";
    } else if (statusCode && statusCode >= 400 && statusCode < 500) {
      category = "client";
    } else if (
      message.includes("data") ||
      message.includes("parse") ||
      message.includes("format")
    ) {
      category = "data";
    }

    // Determine severity
    let severity: "low" | "medium" | "high" | "critical" = "medium";

    if (category === "authentication" || category === "server") {
      severity = "high";
    } else if (category === "network" || category === "rate_limit") {
      severity = "medium";
    } else if (category === "client" || category === "data") {
      severity = "low";
    }

    // Check if error is transient
    const isTransient = ["network", "rate_limit", "server"].includes(category);

    return { category, severity, isTransient };
  }

  // Health check and monitoring
  async performHealthCheck(): Promise<{
    overall: "healthy" | "degraded" | "unhealthy";
    sources: Record<
      DataSource,
      {
        status: "healthy" | "degraded" | "unhealthy";
        errorRate: number;
        circuitBreakerState: string;
        lastError?: Date;
      }
    >;
    recommendations: string[];
  }> {
    const recommendations: string[] = [];
    const sourceStatuses: Record<DataSource, any> = {} as any;

    const sources: DataSource[] = [
      "yelp",
      "google_places",
      "foursquare",
      "openstreetmap",
      "nyc_api",
      "sf_api",
      "la_api",
      "internal",
    ];

    for (const source of sources) {
      const metrics = this.getErrorMetrics(source, 60 * 60 * 1000); // 1 hour window
      const breaker = this.circuitBreakers.get(source);

      let status: "healthy" | "degraded" | "unhealthy" = "healthy";

      if (breaker?.state === "open") {
        status = "unhealthy";
        recommendations.push(
          `Circuit breaker for ${source} is open - investigate and resolve issues`,
        );
      } else if (metrics.errorRate > 10) {
        // More than 10 errors per hour
        status = "unhealthy";
        recommendations.push(
          `High error rate for ${source}: ${metrics.errorRate.toFixed(2)} errors/hour`,
        );
      } else if (metrics.errorRate > 5) {
        status = "degraded";
        recommendations.push(
          `Elevated error rate for ${source}: ${metrics.errorRate.toFixed(2)} errors/hour`,
        );
      }

      sourceStatuses[source] = {
        status,
        errorRate: metrics.errorRate,
        circuitBreakerState: breaker?.state || "closed",
        lastError: metrics.lastError,
      };
    }

    // Determine overall health
    const statuses = Object.values(sourceStatuses).map((s) => s.status);
    const unhealthyCount = statuses.filter((s) => s === "unhealthy").length;
    const degradedCount = statuses.filter((s) => s === "degraded").length;

    let overall: "healthy" | "degraded" | "unhealthy" = "healthy";

    if (unhealthyCount > 0) {
      overall = "unhealthy";
    } else if (degradedCount > 0) {
      overall = "degraded";
    }

    return {
      overall,
      sources: sourceStatuses,
      recommendations,
    };
  }

  // Private helper methods
  private normalizeError(
    error: Error | ApiError,
    context: ErrorContext,
  ): ApiError {
    if ("source" in error) {
      return error;
    }

    return {
      source: context.source || "internal",
      message: error.message,
      timestamp: context.timestamp,
      retryable: this.isRetryableError(error),
    };
  }

  private async logError(
    error: ApiError,
    context: ErrorContext,
  ): Promise<void> {
    // Log to console with structured format
    const logLevel =
      this.categorizeError(error).severity === "critical" ? "error" : "warn";
    console[logLevel]("🚨 API Error:", {
      source: error.source,
      message: error.message,
      code: error.code,
      statusCode: error.statusCode,
      operation: context.operation,
      requestId: context.requestId,
      timestamp: error.timestamp.toISOString(),
    });

    // Store in database for analytics
    try {
      await supabase.from("api_error_logs").insert({
        source: error.source,
        message: error.message,
        code: error.code,
        status_code: error.statusCode,
        operation: context.operation,
        request_id: context.requestId,
        user_id: context.userId,
        additional_data: context.additionalData,
        timestamp: error.timestamp.toISOString(),
      });
    } catch (dbError) {
      console.error("Failed to log error to database:", dbError);
    }
  }

  private updateErrorMetrics(error: ApiError): void {
    const key = `${error.source}_${error.message}`;
    this.errorCounts.set(key, (this.errorCounts.get(key) || 0) + 1);
  }

  private updateCircuitBreaker(source: DataSource, error: ApiError): void {
    let breaker = this.circuitBreakers.get(source);

    if (!breaker) {
      breaker = {
        source,
        state: "closed",
        failureCount: 0,
      };
      this.circuitBreakers.set(source, breaker);
    }

    breaker.failureCount++;
    breaker.lastFailureTime = new Date();

    // Open circuit breaker after 5 consecutive failures
    if (breaker.failureCount >= 5 && breaker.state === "closed") {
      breaker.state = "open";
      breaker.nextRetryTime = new Date(Date.now() + 60000); // Retry in 1 minute
      console.error(
        `🔴 Circuit breaker opened for ${source} after ${breaker.failureCount} failures`,
      );
    }
  }

  private async checkAlertConditions(
    error: ApiError,
    context: ErrorContext,
  ): Promise<void> {
    const { severity } = this.categorizeError(error);

    // Alert on critical errors immediately
    if (severity === "critical") {
      await this.sendAlert("critical", error, context);
    }

    // Alert on high error rates
    const metrics = this.getErrorMetrics(error.source, 60 * 60 * 1000); // 1 hour
    if (metrics.errorRate > 20) {
      // More than 20 errors per hour
      await this.sendAlert("high_error_rate", error, context);
    }
  }

  private async sendAlert(
    type: "critical" | "high_error_rate",
    error: ApiError,
    context: ErrorContext,
  ): Promise<void> {
    // In a real implementation, this would send notifications
    // via email, Slack, PagerDuty, etc.
    console.error(`🚨 ALERT [${type}]:`, {
      error: error.message,
      source: error.source,
      operation: context.operation,
      timestamp: error.timestamp.toISOString(),
    });
  }

  private addToHistory(error: ApiError): void {
    this.errorHistory.push({ timestamp: new Date(), error });

    // Maintain history size limit
    if (this.errorHistory.length > this.maxHistorySize) {
      this.errorHistory.shift();
    }
  }

  private isRetryableError(error: Error, retryableErrors?: string[]): boolean {
    const defaultRetryableErrors = [
      "network error",
      "timeout",
      "rate limit",
      "service unavailable",
      "internal server error",
      "bad gateway",
      "gateway timeout",
    ];

    const errors = retryableErrors || defaultRetryableErrors;
    const message = error.message.toLowerCase();

    return errors.some((retryableError) => message.includes(retryableError));
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private initializeCircuitBreakers(): void {
    const sources: DataSource[] = [
      "yelp",
      "google_places",
      "foursquare",
      "openstreetmap",
      "nyc_api",
      "sf_api",
      "la_api",
      "internal",
    ];

    for (const source of sources) {
      this.circuitBreakers.set(source, {
        source,
        state: "closed",
        failureCount: 0,
      });
    }
  }

  private startErrorCleanup(): void {
    // Clean up old errors every hour
    setInterval(
      () => {
        const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        this.errorHistory = this.errorHistory.filter(
          (entry) => entry.timestamp.getTime() > oneWeekAgo,
        );
      },
      60 * 60 * 1000,
    ); // Every hour
  }
}
