import type {
  Venue,
  RawVenueData,
  DataSource,
  VenueDataSource,
} from "../types";

interface ValidationRule {
  field: keyof Venue;
  required: boolean;
  validator: (value: any) => ValidationResult;
  weight: number; // 0-1, contribution to overall quality score
}

interface ValidationResult {
  isValid: boolean;
  score: number; // 0-1
  message?: string;
  severity: "info" | "warning" | "error";
}

interface QualityReport {
  overallScore: number;
  fieldScores: Record<string, ValidationResult>;
  issues: QualityIssue[];
  recommendations: string[];
  confidence: number;
  completeness: number;
  consistency: number;
  accuracy: number;
}

interface QualityIssue {
  field: string;
  severity: "info" | "warning" | "error";
  message: string;
  suggestedFix?: string;
}

interface ConsistencyCheck {
  field: keyof Venue;
  sources: DataSource[];
  values: any[];
  isConsistent: boolean;
  confidence: number;
  recommendedValue?: any;
}

export class DataQualityValidator {
  private validationRules: ValidationRule[];
  private static instance: DataQualityValidator;

  private constructor() {
    this.validationRules = this.createValidationRules();
  }

  static getInstance(): DataQualityValidator {
    if (!DataQualityValidator.instance) {
      DataQualityValidator.instance = new DataQualityValidator();
    }
    return DataQualityValidator.instance;
  }

  // Main validation method
  validateVenue(venue: Venue): QualityReport {
    const fieldScores: Record<string, ValidationResult> = {};
    const issues: QualityIssue[] = [];
    const recommendations: string[] = [];

    let totalScore = 0;
    let totalWeight = 0;

    // Apply validation rules
    for (const rule of this.validationRules) {
      const value = venue[rule.field];
      const result = rule.validator(value);

      fieldScores[rule.field] = result;
      totalScore += result.score * rule.weight;
      totalWeight += rule.weight;

      // Collect issues
      if (!result.isValid) {
        issues.push({
          field: rule.field,
          severity: result.severity,
          message: result.message || `Invalid ${rule.field}`,
          suggestedFix: this.generateSuggestedFix(rule.field, value, result),
        });
      }

      // Generate recommendations
      if (result.score < 0.8) {
        recommendations.push(this.generateRecommendation(rule.field, result));
      }
    }

    const overallScore = totalWeight > 0 ? totalScore / totalWeight : 0;

    // Calculate sub-metrics
    const completeness = this.calculateCompleteness(venue);
    const consistency = this.calculateConsistency(venue);
    const accuracy = this.calculateAccuracy(venue);
    const confidence = this.calculateConfidence(venue);

    return {
      overallScore,
      fieldScores,
      issues,
      recommendations,
      confidence,
      completeness,
      consistency,
      accuracy,
    };
  }

  // Validate raw venue data before normalization
  validateRawVenueData(rawData: RawVenueData[]): {
    isValid: boolean;
    quality: number;
    issues: string[];
    recommendations: string[];
  } {
    const issues: string[] = [];
    const recommendations: string[] = [];
    let qualityScore = 0;

    if (rawData.length === 0) {
      return {
        isValid: false,
        quality: 0,
        issues: ["No data provided"],
        recommendations: [
          "Ensure data sources are available and returning results",
        ],
      };
    }

    // Check data freshness
    const now = new Date();
    const staleDataThreshold = 24 * 60 * 60 * 1000; // 24 hours

    for (const data of rawData) {
      const age = now.getTime() - data.fetchedAt.getTime();

      if (age > staleDataThreshold) {
        issues.push(
          `Stale data from ${data.source}: ${Math.round(age / (60 * 60 * 1000))} hours old`,
        );
      }

      // Check required fields
      if (!data.name) {
        issues.push(`Missing name in ${data.source} data`);
      }

      if (!data.coordinates) {
        issues.push(`Missing coordinates in ${data.source} data`);
      }

      // Calculate source-specific quality
      qualityScore += this.calculateRawDataQuality(data);
    }

    qualityScore = qualityScore / rawData.length;

    // Check for consistency across sources
    const consistencyIssues = this.checkCrossSourceConsistency(rawData);
    issues.push(...consistencyIssues);

    // Generate recommendations
    if (qualityScore < 0.7) {
      recommendations.push(
        "Consider updating data sources or improving data collection",
      );
    }

    if (rawData.length < 2) {
      recommendations.push(
        "Add more data sources for better validation and confidence",
      );
    }

    return {
      isValid: issues.length === 0,
      quality: qualityScore,
      issues,
      recommendations,
    };
  }

  // Cross-source consistency validation
  validateConsistency(venue: Venue): ConsistencyCheck[] {
    const checks: ConsistencyCheck[] = [];

    if (!venue.data_sources) {
      return checks;
    }

    const sources = venue.data_sources.sources;
    const sourceData =
      venue.source_specific_data ||
      ({} as Record<DataSource, Record<string, any>>);

    // Check name consistency
    const names = sources
      .map((s) =>
        this.extractFieldFromSource(sourceData[s.source] || {}, "name"),
      )
      .filter(Boolean);
    if (names.length > 1) {
      checks.push(
        this.createConsistencyCheck(
          "name",
          sources.map((s) => s.source),
          names,
        ),
      );
    }

    // Check location consistency
    const locations = sources
      .map((s) =>
        this.extractFieldFromSource(sourceData[s.source] || {}, "coordinates"),
      )
      .filter(Boolean);
    if (locations.length > 1) {
      checks.push(
        this.createLocationConsistencyCheck(
          "coordinates",
          sources.map((s) => s.source),
          locations,
        ),
      );
    }

    // Check rating consistency
    const ratings = sources
      .map((s) =>
        this.extractFieldFromSource(sourceData[s.source] || {}, "rating"),
      )
      .filter(Boolean);
    if (ratings.length > 1) {
      checks.push(
        this.createRatingConsistencyCheck(
          "rating",
          sources.map((s) => s.source),
          ratings,
        ),
      );
    }

    return checks;
  }

  // Data completeness analysis
  analyzeCompleteness(venue: Venue): {
    score: number;
    missingFields: string[];
    optionalFields: string[];
    criticalFields: string[];
  } {
    const criticalFields = ["name", "address", "coordinates", "category"];
    const optionalFields = [
      "phone",
      "website",
      "description",
      "image_url",
      "features",
    ];

    const missingFields: string[] = [];
    let presentFields = 0;
    let totalFields = criticalFields.length + optionalFields.length;

    // Check critical fields
    for (const field of criticalFields) {
      const value = venue[field as keyof Venue];
      if (!value || (typeof value === "string" && value.trim() === "")) {
        missingFields.push(field);
      } else {
        presentFields++;
      }
    }

    // Check optional fields
    for (const field of optionalFields) {
      const value = venue[field as keyof Venue];
      if (value && (typeof value !== "string" || value.trim() !== "")) {
        presentFields++;
      }
    }

    const score = presentFields / totalFields;

    return {
      score,
      missingFields,
      optionalFields: optionalFields.filter((f) => !venue[f as keyof Venue]),
      criticalFields: criticalFields.filter((f) => !venue[f as keyof Venue]),
    };
  }

  // Accuracy validation using external sources
  validateAccuracy(venue: Venue): Promise<{
    score: number;
    checks: Array<{
      field: string;
      confidence: number;
      verified: boolean;
      source?: string;
    }>;
  }> {
    // This would integrate with external validation services
    // For now, return a mock implementation
    return Promise.resolve({
      score: 0.8,
      checks: [
        {
          field: "coordinates",
          confidence: 0.9,
          verified: true,
          source: "geocoding_service",
        },
        {
          field: "phone",
          confidence: 0.7,
          verified: false,
          source: "phone_validation_service",
        },
      ],
    });
  }

  // Private methods for validation rules
  private createValidationRules(): ValidationRule[] {
    return [
      {
        field: "name",
        required: true,
        weight: 0.2,
        validator: (value: string) => this.validateName(value),
      },
      {
        field: "address",
        required: true,
        weight: 0.15,
        validator: (value: string) => this.validateAddress(value),
      },
      {
        field: "coordinates",
        required: true,
        weight: 0.2,
        validator: (value: any) => this.validateCoordinates(value),
      },
      {
        field: "category",
        required: true,
        weight: 0.1,
        validator: (value: string) => this.validateCategory(value),
      },
      {
        field: "rating",
        required: false,
        weight: 0.1,
        validator: (value: number) => this.validateRating(value),
      },
      {
        field: "review_count",
        required: false,
        weight: 0.05,
        validator: (value: number) => this.validateReviewCount(value),
      },
      {
        field: "price_range",
        required: false,
        weight: 0.05,
        validator: (value: number) => this.validatePriceRange(value),
      },
      {
        field: "phone",
        required: false,
        weight: 0.05,
        validator: (value: string) => this.validatePhone(value),
      },
      {
        field: "website",
        required: false,
        weight: 0.05,
        validator: (value: string) => this.validateWebsite(value),
      },
      {
        field: "description",
        required: false,
        weight: 0.05,
        validator: (value: string) => this.validateDescription(value),
      },
    ];
  }

  // Individual field validators
  private validateName(name: string): ValidationResult {
    if (!name || typeof name !== "string") {
      return {
        isValid: false,
        score: 0,
        message: "Name is required",
        severity: "error",
      };
    }

    const trimmed = name.trim();
    if (trimmed.length === 0) {
      return {
        isValid: false,
        score: 0,
        message: "Name cannot be empty",
        severity: "error",
      };
    }

    if (trimmed.length < 2) {
      return {
        isValid: false,
        score: 0.3,
        message: "Name is too short",
        severity: "warning",
      };
    }

    if (trimmed.length > 100) {
      return {
        isValid: true,
        score: 0.8,
        message: "Name is very long",
        severity: "warning",
      };
    }

    // Check for suspicious patterns
    if (/^[A-Z\s]+$/.test(trimmed)) {
      return {
        isValid: true,
        score: 0.7,
        message: "Name appears to be all caps",
        severity: "info",
      };
    }

    return {
      isValid: true,
      score: 1,
      severity: "info",
    };
  }

  private validateAddress(address: string): ValidationResult {
    if (!address || typeof address !== "string") {
      return {
        isValid: false,
        score: 0,
        message: "Address is required",
        severity: "error",
      };
    }

    const trimmed = address.trim();
    if (trimmed.length === 0) {
      return {
        isValid: false,
        score: 0,
        message: "Address cannot be empty",
        severity: "error",
      };
    }

    if (trimmed.length < 10) {
      return {
        isValid: false,
        score: 0.4,
        message: "Address appears incomplete",
        severity: "warning",
      };
    }

    // Check for common address components
    const hasNumber = /\d/.test(trimmed);
    const hasStreet =
      /street|st|avenue|ave|road|rd|blvd|boulevard|lane|ln|drive|dr/i.test(
        trimmed,
      );

    let score = 0.5;
    if (hasNumber) score += 0.25;
    if (hasStreet) score += 0.25;

    return {
      isValid: true,
      score,
      severity: "info",
    };
  }

  private validateCoordinates(coordinates: any): ValidationResult {
    if (!coordinates || typeof coordinates !== "object") {
      return {
        isValid: false,
        score: 0,
        message: "Coordinates are required",
        severity: "error",
      };
    }

    const { lat, lng } = coordinates;

    if (typeof lat !== "number" || typeof lng !== "number") {
      return {
        isValid: false,
        score: 0,
        message: "Invalid coordinate format",
        severity: "error",
      };
    }

    if (lat < -90 || lat > 90) {
      return {
        isValid: false,
        score: 0,
        message: "Invalid latitude value",
        severity: "error",
      };
    }

    if (lng < -180 || lng > 180) {
      return {
        isValid: false,
        score: 0,
        message: "Invalid longitude value",
        severity: "error",
      };
    }

    // Check if coordinates are too precise (might be fake)
    const latPrecision = lat.toString().split(".")[1]?.length || 0;
    const lngPrecision = lng.toString().split(".")[1]?.length || 0;

    if (latPrecision > 10 || lngPrecision > 10) {
      return {
        isValid: true,
        score: 0.8,
        message: "Coordinates have unusually high precision",
        severity: "warning",
      };
    }

    return {
      isValid: true,
      score: 1,
      severity: "info",
    };
  }

  private validateCategory(category: string): ValidationResult {
    if (!category || typeof category !== "string") {
      return {
        isValid: false,
        score: 0,
        message: "Category is required",
        severity: "error",
      };
    }

    const validCategories = [
      "Restaurant",
      "Bar",
      "Entertainment",
      "Activity",
      "Shopping",
      "Service",
    ];

    if (!validCategories.includes(category)) {
      return {
        isValid: true,
        score: 0.6,
        message: "Category not in standard list",
        severity: "warning",
      };
    }

    return {
      isValid: true,
      score: 1,
      severity: "info",
    };
  }

  private validateRating(rating: number): ValidationResult {
    if (rating === undefined || rating === null) {
      return {
        isValid: true,
        score: 0.5,
        message: "No rating provided",
        severity: "info",
      };
    }

    if (typeof rating !== "number") {
      return {
        isValid: false,
        score: 0,
        message: "Rating must be a number",
        severity: "error",
      };
    }

    if (rating < 0 || rating > 5) {
      return {
        isValid: false,
        score: 0,
        message: "Rating must be between 0 and 5",
        severity: "error",
      };
    }

    return {
      isValid: true,
      score: 1,
      severity: "info",
    };
  }

  private validateReviewCount(count: number): ValidationResult {
    if (count === undefined || count === null) {
      return {
        isValid: true,
        score: 0.5,
        message: "No review count provided",
        severity: "info",
      };
    }

    if (typeof count !== "number" || count < 0) {
      return {
        isValid: false,
        score: 0,
        message: "Review count must be a non-negative number",
        severity: "error",
      };
    }

    return {
      isValid: true,
      score: 1,
      severity: "info",
    };
  }

  private validatePriceRange(priceRange: number): ValidationResult {
    if (priceRange === undefined || priceRange === null) {
      return {
        isValid: true,
        score: 0.5,
        message: "No price range provided",
        severity: "info",
      };
    }

    if (typeof priceRange !== "number" || priceRange < 1 || priceRange > 4) {
      return {
        isValid: false,
        score: 0,
        message: "Price range must be between 1 and 4",
        severity: "error",
      };
    }

    return {
      isValid: true,
      score: 1,
      severity: "info",
    };
  }

  private validatePhone(phone: string): ValidationResult {
    if (!phone) {
      return {
        isValid: true,
        score: 0.5,
        message: "No phone number provided",
        severity: "info",
      };
    }

    // Basic phone validation
    const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/;
    if (!phoneRegex.test(phone)) {
      return {
        isValid: false,
        score: 0.3,
        message: "Invalid phone number format",
        severity: "warning",
      };
    }

    return {
      isValid: true,
      score: 1,
      severity: "info",
    };
  }

  private validateWebsite(website: string): ValidationResult {
    if (!website) {
      return {
        isValid: true,
        score: 0.5,
        message: "No website provided",
        severity: "info",
      };
    }

    try {
      new URL(website);
      return {
        isValid: true,
        score: 1,
        severity: "info",
      };
    } catch {
      return {
        isValid: false,
        score: 0.3,
        message: "Invalid website URL",
        severity: "warning",
      };
    }
  }

  private validateDescription(description: string): ValidationResult {
    if (!description) {
      return {
        isValid: true,
        score: 0.5,
        message: "No description provided",
        severity: "info",
      };
    }

    if (description.length < 10) {
      return {
        isValid: true,
        score: 0.6,
        message: "Description is very short",
        severity: "info",
      };
    }

    if (description.length > 1000) {
      return {
        isValid: true,
        score: 0.8,
        message: "Description is very long",
        severity: "info",
      };
    }

    return {
      isValid: true,
      score: 1,
      severity: "info",
    };
  }

  // Helper methods
  private calculateCompleteness(venue: Venue): number {
    const analysis = this.analyzeCompleteness(venue);
    return analysis.score;
  }

  private calculateConsistency(venue: Venue): number {
    const checks = this.validateConsistency(venue);
    if (checks.length === 0) return 1; // No inconsistencies to check

    const consistentChecks = checks.filter(
      (check) => check.isConsistent,
    ).length;
    return consistentChecks / checks.length;
  }

  private calculateAccuracy(venue: Venue): number {
    // Simplified accuracy calculation
    // In a real implementation, this would use external validation
    let score = 0.8; // Base score

    if (venue.coordinates) {
      // Check if coordinates are reasonable
      const { lat, lng } = venue.coordinates;
      if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        score += 0.1;
      }
    }

    if (venue.phone && /^\+?[\d\s\-\(\)]{10,}$/.test(venue.phone)) {
      score += 0.1;
    }

    return Math.min(1, score);
  }

  private calculateConfidence(venue: Venue): number {
    const sourceCount = venue.data_sources?.sources.length || 1;
    const avgConfidence =
      venue.data_sources?.sources.reduce((sum, s) => sum + s.confidence, 0) ||
      0.5;
    const normalizedAvg = sourceCount > 0 ? avgConfidence / sourceCount : 0.5;

    // Boost confidence with more sources
    const sourceBonus = Math.min(0.2, (sourceCount - 1) * 0.05);

    return Math.min(1, normalizedAvg + sourceBonus);
  }

  private calculateRawDataQuality(data: RawVenueData): number {
    let score = 0.5; // Base score

    if (data.name) score += 0.1;
    if (data.address) score += 0.1;
    if (data.coordinates) score += 0.1;
    if (data.rating && data.rating > 0) score += 0.1;
    if (data.reviewCount && data.reviewCount > 0) score += 0.1;

    return Math.min(1, score);
  }

  private checkCrossSourceConsistency(rawData: RawVenueData[]): string[] {
    const issues: string[] = [];

    if (rawData.length < 2) return issues;

    // Check name consistency
    const names = rawData.map((d) => d.name).filter(Boolean);
    const uniqueNames = new Set(names.map((n) => n.toLowerCase().trim()));

    if (uniqueNames.size > 1 && names.length > 1) {
      issues.push("Inconsistent venue names across sources");
    }

    // Check location consistency
    const locations = rawData.map((d) => d.coordinates).filter(Boolean);
    if (locations.length > 1) {
      const distances = [];
      for (let i = 0; i < locations.length - 1; i++) {
        for (let j = i + 1; j < locations.length; j++) {
          const loc1 = locations[i];
          const loc2 = locations[j];
          if (loc1 && loc2) {
            const distance = this.calculateDistance(
              loc1.lat,
              loc1.lng,
              loc2.lat,
              loc2.lng,
            );
            distances.push(distance);
          }
        }
      }

      const maxDistance = Math.max(...distances);
      if (maxDistance > 1000) {
        // 1km threshold
        issues.push("Inconsistent venue locations across sources");
      }
    }

    return issues;
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

  private createConsistencyCheck(
    field: keyof Venue,
    sources: DataSource[],
    values: any[],
  ): ConsistencyCheck {
    const uniqueValues = [...new Set(values)];
    const isConsistent = uniqueValues.length === 1;

    return {
      field,
      sources,
      values,
      isConsistent,
      confidence: isConsistent ? 1 : 0.5,
      recommendedValue: isConsistent ? values[0] : undefined,
    };
  }

  private createLocationConsistencyCheck(
    field: keyof Venue,
    sources: DataSource[],
    locations: any[],
  ): ConsistencyCheck {
    if (locations.length < 2) {
      return {
        field,
        sources,
        values: locations,
        isConsistent: true,
        confidence: 1,
      };
    }

    // Calculate distances between all location pairs
    const distances = [];
    for (let i = 0; i < locations.length - 1; i++) {
      for (let j = i + 1; j < locations.length; j++) {
        const distance = this.calculateDistance(
          locations[i].lat,
          locations[i].lng,
          locations[j].lat,
          locations[j].lng,
        );
        distances.push(distance);
      }
    }

    const maxDistance = Math.max(...distances);
    const isConsistent = maxDistance < 100; // 100m threshold

    return {
      field,
      sources,
      values: locations,
      isConsistent,
      confidence: isConsistent ? 1 : Math.max(0.1, 1 - maxDistance / 1000),
      recommendedValue: isConsistent ? locations[0] : undefined,
    };
  }

  private createRatingConsistencyCheck(
    field: keyof Venue,
    sources: DataSource[],
    ratings: number[],
  ): ConsistencyCheck {
    if (ratings.length < 2) {
      return {
        field,
        sources,
        values: ratings,
        isConsistent: true,
        confidence: 1,
      };
    }

    const variance = this.calculateVariance(ratings);
    const isConsistent = variance < 0.5; // Rating variance threshold
    const avgRating = ratings.reduce((sum, r) => sum + r, 0) / ratings.length;

    return {
      field,
      sources,
      values: ratings,
      isConsistent,
      confidence: isConsistent ? 1 : Math.max(0.1, 1 - variance),
      recommendedValue: Math.round(avgRating * 10) / 10, // Round to 1 decimal
    };
  }

  private calculateVariance(numbers: number[]): number {
    const mean = numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
    const squaredDiffs = numbers.map((n) => Math.pow(n - mean, 2));
    return squaredDiffs.reduce((sum, diff) => sum + diff, 0) / numbers.length;
  }

  private extractFieldFromSource(sourceData: any, field: string): any {
    if (!sourceData) return null;
    return sourceData[field];
  }

  private generateSuggestedFix(
    field: keyof Venue,
    value: any,
    result: ValidationResult,
  ): string {
    switch (field) {
      case "name":
        if (!value) return "Add a venue name";
        if (typeof value === "string" && value.length < 2)
          return "Use a longer, more descriptive name";
        return "Review and correct the venue name";

      case "address":
        if (!value) return "Add a complete address";
        return "Verify address includes street number, street name, and city";

      case "coordinates":
        return "Verify latitude and longitude values are correct";

      case "rating":
        return "Ensure rating is between 0 and 5";

      default:
        return `Review and correct the ${field} field`;
    }
  }

  private generateRecommendation(
    field: keyof Venue,
    result: ValidationResult,
  ): string {
    if (result.score < 0.3) {
      return `Critical issue with ${field}: ${result.message}`;
    } else if (result.score < 0.6) {
      return `Improve ${field} data quality: ${result.message}`;
    } else {
      return `Consider enhancing ${field}: ${result.message}`;
    }
  }
}
