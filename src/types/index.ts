// types/index.ts

// Navigation Types (keeping your existing)
export type RootTabParamList = {
  Discover: undefined;
  Lists: undefined;
  Saved: undefined;
  Profile: undefined;
};

export type RootStackParamList = {
  Landing: {
    animationMode: AnimationMode;
  };
  Main: undefined;
  Search: {
    initialQuery?: string;
  };
};

// Animation Types
export type AnimationMode = "full" | "brief" | "skip";

export type AnimationTrigger =
  | "first_launch"
  | "major_update"
  | "special_occasion"
  | "reinstall"
  | "first_daily"
  | "long_absence"
  | "force_quit"
  | "location_change"
  | "background_return"
  | "quick_switch"
  | "active_session";

export interface AppSession {
  lastAppOpen: number;
  lastAppClose: number;
  sessionDuration: number;
  backgroundTime: number;
  isFromBackground: boolean;
  forceQuitDetected: boolean;
  lastLocation?: {
    lat: number;
    lng: number;
    timestamp: number;
  };
}

export interface UserPreferences {
  quickStart: boolean;
  animationPreference: "always" | "reduced" | "minimal";
  birthday?: string;
  specialDates?: string[];
}

// Mood Types (keeping your existing)
export type MoodType = "cozy" | "energetic" | "special" | "surprise";

// Venue Types (enhanced version of your existing)
export interface Venue {
  // Your existing fields
  id: string;
  name: string;
  address: string;
  category: string;
  subcategory?: string;
  mood_tags: MoodType[];
  rating: number;
  review_count: number;
  price_range: 1 | 2 | 3 | 4;
  description?: string;
  image_url?: string;
  phone?: string;
  website?: string;
  features?: string[];
  coordinates: {
    lat: number;
    lng: number;
  };
  city?: string;

  // New premium fields
  social_media_links?: {
    instagram?: string;
    tiktok?: string;
  };
  accessibility?: {
    wheelchairAccess: boolean;
    audioDescriptions?: boolean;
    brailleMenu?: boolean;
    staffASL?: boolean;
  };
  cultural_tags?: string[];
  allergy_info?: {
    nutFree: boolean;
    glutenFreeOptions: boolean;
    veganOptions: boolean;
    customAlerts?: string[];
  };
  weather_suitability?: {
    outdoor: boolean;
    covered: boolean;
    heating: boolean;
    airConditioning: boolean;
  };

  // Multi-source data tracking
  data_sources?: VenueDataSource;
  data_quality_score?: number; // 0-1 score
  last_verified?: Date;
  external_ids?: Record<DataSource, string>;
  source_specific_data?: Record<DataSource, Record<string, any>>;
}

// User Types (enhanced version of your existing)
export interface User {
  // Your existing fields
  id: string;
  email: string;
  username?: string;
  preferences: {
    cuisines: string[];
    budget_range: [number, number];
    dietary_restrictions: string[];
    // New preference fields
    allergies?: string[];
    accessibilityNeeds?: string[];
    preferredMoods?: MoodType[];
    activityInterests?: string[];
  };
  // New fields
  avatar?: string;
  favoriteVenues?: string[]; // venue IDs
  createdAt?: Date;
  updatedAt?: Date;
}

// Plan Types (keeping your existing, renamed to Itinerary for consistency)
export interface Plan {
  id: string;
  title: string;
  user_id: string;
  venues: Venue[];
  created_at: string;
  is_shared: boolean;
}

// Weather Types (new)
export interface Weather {
  temp: number;
  condition: string;
  description: string;
  icon: string;
  isRaining: boolean;
  isSunny: boolean;
  windSpeed: number;
  humidity?: number;
}

// Theme Types (new)
export interface Theme {
  isDark: boolean;
  colors: {
    primary: string;
    secondary: string;
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    border: string;
    error: string;
    success: string;
    warning: string;
  };
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
  textStyles: {
    heading: {
      fontSize: number;
      fontWeight:
        | "normal"
        | "bold"
        | "100"
        | "200"
        | "300"
        | "400"
        | "500"
        | "600"
        | "700"
        | "800"
        | "900";
      color?: string;
    };
    subheading: {
      fontSize: number;
      fontWeight:
        | "normal"
        | "bold"
        | "100"
        | "200"
        | "300"
        | "400"
        | "500"
        | "600"
        | "700"
        | "800"
        | "900";
      color?: string;
    };
    body: {
      fontSize: number;
      fontWeight:
        | "normal"
        | "bold"
        | "100"
        | "200"
        | "300"
        | "400"
        | "500"
        | "600"
        | "700"
        | "800"
        | "900";
      color?: string;
    };
    caption: {
      fontSize: number;
      fontWeight:
        | "normal"
        | "bold"
        | "100"
        | "200"
        | "300"
        | "400"
        | "500"
        | "600"
        | "700"
        | "800"
        | "900";
      color?: string;
    };
  };
}

// Context Types (new)
export interface TimeContext {
  period: "morning" | "afternoon" | "evening" | "night";
  meal: "breakfast" | "lunch" | "dinner" | "late-night";
  energy: string;
  greeting: string;
}

export interface UserActivity {
  favoriteMood: string;
  lastVisit: string | null;
  visitFrequency: "daily" | "weekly" | "occasional";
  preferredTimes: number[];
}

export interface Greeting {
  main: string;
  sub: string;
  weatherNote?: string;
  suggestions: string[];
}

// Review Types (new)
export interface Review {
  id: string;
  venueId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  rating: number;
  title?: string;
  content: string;
  images?: string[];
  visitDate: Date;
  helpfulCount: number;
  createdAt: Date;
  verified?: boolean;
}

// API Response Types (enhanced)
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  status: "success" | "error";
  source?: DataSource;
  timestamp?: number;
  cached?: boolean;
}

// Search Types (enhanced)
export interface SearchFilters {
  moods?: MoodType[];
  priceRange?: {
    min: number;
    max: number;
  };
  categories?: string[];
  features?: string[];
  accessibility?: string[];
  distance?: number; // in miles
  isOpen?: boolean;
  weatherAppropriate?: boolean;
  dataSources?: DataSource[];
  minDataQuality?: number; // 0-1 minimum quality score
  excludeSources?: DataSource[];
}

// Data Source Types (new)
export type DataSource =
  | "yelp"
  | "openstreetmap"
  | "google_places"
  | "internal";

export interface DataSourceInfo {
  source: DataSource;
  confidence: number; // 0-1 score
  lastUpdated: Date;
  version?: string;
  isActive: boolean;
}

export interface VenueDataSource {
  venueId: string;
  sources: DataSourceInfo[];
  primarySource: DataSource;
  mergedAt: Date;
}

// API Adapter Types (new)
export interface ApiAdapter {
  source: DataSource;
  isAvailable(): Promise<boolean>;
  searchVenues(query: SearchQuery): Promise<RawVenueData[]>;
  getVenueDetails(externalId: string): Promise<RawVenueData | null>;
  getVenuesByLocation(
    lat: number,
    lng: number,
    radius: number,
  ): Promise<RawVenueData[]>;
  getRateLimit(): ApiRateLimit;
  getHealthStatus(): ApiHealthStatus;
}

export interface SearchQuery {
  term?: string;
  location?: {
    lat: number;
    lng: number;
  };
  radius?: number; // in meters
  categories?: string[];
  limit?: number;
  offset?: number;
  sortBy?: "rating" | "distance" | "price" | "reviews";
}

export interface RawVenueData {
  externalId: string;
  source: DataSource;
  name: string;
  address?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  category?: string;
  rating?: number;
  reviewCount?: number;
  priceLevel?: number;
  phone?: string;
  website?: string;
  description?: string;
  imageUrls?: string[];
  hours?: OpeningHours[];
  features?: string[];
  rawData: Record<string, any>; // Store original API response
  fetchedAt: Date;
}

export interface OpeningHours {
  dayOfWeek: number; // 0-6 (Sunday-Saturday)
  open: string; // HH:MM format
  close: string; // HH:MM format
  isOpen24Hours?: boolean;
}

export interface ApiRateLimit {
  requestsPerMinute: number;
  requestsPerHour: number;
  requestsPerDay: number;
  currentUsage: {
    minute: number;
    hour: number;
    day: number;
  };
  resetTime: Date;
}

export interface ApiHealthStatus {
  isHealthy: boolean;
  lastSuccessfulCall?: Date;
  lastFailedCall?: Date;
  errorRate: number; // 0-1
  avgResponseTime: number; // in ms
  consecutiveFailures: number;
}

// Data Pipeline Types (new)
export interface DataPipelineConfig {
  sources: DataSource[];
  syncInterval: number; // in minutes
  batchSize: number;
  conflictResolution: "newest" | "highest_confidence" | "manual";
  qualityThreshold: number; // 0-1
  enableDeduplication: boolean;
}

export interface SyncOperation {
  id: string;
  source: DataSource;
  type: "full" | "incremental" | "venue_details";
  status: "pending" | "running" | "completed" | "failed";
  startedAt: Date;
  completedAt?: Date;
  recordsProcessed: number;
  recordsSuccess: number;
  recordsError: number;
  errors: string[];
}

export interface VenueMatchResult {
  confidence: number; // 0-1
  matchingFields: string[];
  conflictingFields: string[];
  suggestedMerge?: Partial<Venue>;
}

// Configuration Types (new)
export interface ApiConfig {
  source: DataSource;
  apiKey: string;
  baseUrl: string;
  rateLimit: {
    requestsPerMinute: number;
    requestsPerHour: number;
    requestsPerDay: number;
  };
  timeout: number; // in ms
  retryConfig: {
    maxRetries: number;
    backoffMultiplier: number;
    maxBackoffTime: number;
  };
  isEnabled: boolean;
  priority: number; // Higher number = higher priority
}

export interface CacheConfig {
  apiResponseTTL: number; // in minutes
  processedDataTTL: number; // in minutes
  queryResultTTL: number; // in minutes
  maxCacheSize: number; // in MB
  enableBackgroundRefresh: boolean;
}

// Error Types (new)
export interface ApiError {
  source: DataSource;
  message: string;
  code?: string;
  statusCode?: number;
  timestamp: Date;
  retryable: boolean;
}

export interface CircuitBreakerState {
  source: DataSource;
  state: "closed" | "open" | "half-open";
  failureCount: number;
  lastFailureTime?: Date;
  nextRetryTime?: Date;
}
