import AsyncStorage from "@react-native-async-storage/async-storage";
import { Weather } from "../types";

const WEATHER_API_KEY = process.env.EXPO_PUBLIC_WEATHER_API_KEY || "demo_key";
const WEATHER_CACHE_KEY = "weather_data";
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

interface WeatherApiResponse {
  main: {
    temp: number;
    humidity: number;
  };
  weather: Array<{
    main: string;
    description: string;
    icon: string;
  }>;
  wind: {
    speed: number;
  };
}

interface CachedWeatherData {
  weather: Weather;
  timestamp: number;
}

class WeatherService {
  private apiBaseUrl = "https://api.openweathermap.org/data/2.5";

  // Get weather for a specific location
  async getWeather(lat?: number, lon?: number): Promise<Weather> {
    // Default to NYC coordinates if none provided
    const latitude = lat || 40.7128;
    const longitude = lon || -74.006;

    // Check cache first
    const cachedData = await this.getCachedWeather();
    if (cachedData) {
      return cachedData;
    }

    try {
      // Use demo data if no API key is configured
      if (WEATHER_API_KEY === "demo_key") {
        const demoWeather = this.getDemoWeather();
        await this.cacheWeather(demoWeather);
        return demoWeather;
      }

      const response = await fetch(
        `${this.apiBaseUrl}/weather?lat=${latitude}&lon=${longitude}&appid=${WEATHER_API_KEY}&units=imperial`,
      );

      if (!response.ok) {
        throw new Error("Weather API request failed");
      }

      const data: WeatherApiResponse = await response.json();
      const weather = this.mapApiResponseToWeather(data);

      // Cache the result
      await this.cacheWeather(weather);

      return weather;
    } catch (error) {
      console.warn("Weather API failed, using demo data:", error);
      const demoWeather = this.getDemoWeather();
      await this.cacheWeather(demoWeather);
      return demoWeather;
    }
  }

  // Get current weather for NYC (default)
  async getCurrentWeather(): Promise<Weather> {
    return this.getWeather();
  }

  // Map API response to our Weather interface
  private mapApiResponseToWeather(data: WeatherApiResponse): Weather {
    const condition = data.weather[0]?.main || "Clear";
    const description = data.weather[0]?.description || "Clear sky";
    const iconCode = data.weather[0]?.icon || "01d";

    return {
      temp: Math.round(data.main.temp),
      condition,
      description: this.capitalizeWords(description),
      icon: this.getWeatherEmoji(condition, iconCode),
      isRaining: this.isRainingCondition(condition),
      isSunny: this.isSunnyCondition(condition, iconCode),
      windSpeed: Math.round(data.wind.speed),
      humidity: data.main.humidity,
    };
  }

  // Get weather emoji based on condition
  private getWeatherEmoji(condition: string, iconCode: string): string {
    const conditionLower = condition.toLowerCase();

    if (conditionLower.includes("rain") || conditionLower.includes("drizzle")) {
      return "🌧️";
    }
    if (conditionLower.includes("snow")) {
      return "❄️";
    }
    if (conditionLower.includes("cloud")) {
      return iconCode.includes("n") ? "☁️" : "⛅";
    }
    if (conditionLower.includes("thunderstorm")) {
      return "⛈️";
    }
    if (conditionLower.includes("mist") || conditionLower.includes("fog")) {
      return "🌫️";
    }

    // Clear conditions
    return iconCode.includes("n") ? "🌙" : "☀️";
  }

  // Check if condition indicates rain
  private isRainingCondition(condition: string): boolean {
    const conditionLower = condition.toLowerCase();
    return (
      conditionLower.includes("rain") ||
      conditionLower.includes("drizzle") ||
      conditionLower.includes("thunderstorm")
    );
  }

  // Check if condition indicates sunny weather
  private isSunnyCondition(condition: string, iconCode: string): boolean {
    const conditionLower = condition.toLowerCase();
    return conditionLower.includes("clear") && iconCode.includes("d");
  }

  // Capitalize words in description
  private capitalizeWords(str: string): string {
    return str.replace(
      /\w\S*/g,
      (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase(),
    );
  }

  // Demo weather data for development/fallback
  private getDemoWeather(): Weather {
    const hour = new Date().getHours();
    const isDay = hour >= 6 && hour < 19;

    // Vary demo data based on time of day
    const demoConditions = [
      {
        temp: 72,
        condition: "Clear",
        description: "Clear Sky",
        icon: isDay ? "☀️" : "🌙",
        isRaining: false,
        isSunny: isDay,
        windSpeed: 5,
        humidity: 65,
      },
      {
        temp: 68,
        condition: "Clouds",
        description: "Partly Cloudy",
        icon: "⛅",
        isRaining: false,
        isSunny: false,
        windSpeed: 8,
        humidity: 70,
      },
      {
        temp: 60,
        condition: "Rain",
        description: "Light Rain",
        icon: "🌧️",
        isRaining: true,
        isSunny: false,
        windSpeed: 12,
        humidity: 85,
      },
    ];

    // Rotate through demo conditions based on hour
    return demoConditions[hour % demoConditions.length];
  }

  // Cache weather data
  private async cacheWeather(weather: Weather): Promise<void> {
    try {
      const cacheData: CachedWeatherData = {
        weather,
        timestamp: Date.now(),
      };
      await AsyncStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify(cacheData));
    } catch (error) {
      console.warn("Failed to cache weather data:", error);
    }
  }

  // Get cached weather data if still valid
  private async getCachedWeather(): Promise<Weather | null> {
    try {
      const cached = await AsyncStorage.getItem(WEATHER_CACHE_KEY);
      if (!cached) return null;

      const cacheData: CachedWeatherData = JSON.parse(cached);
      const isExpired = Date.now() - cacheData.timestamp > CACHE_DURATION;

      if (isExpired) {
        await AsyncStorage.removeItem(WEATHER_CACHE_KEY);
        return null;
      }

      return cacheData.weather;
    } catch (error) {
      console.warn("Failed to get cached weather data:", error);
      return null;
    }
  }

  // Clear weather cache
  async clearCache(): Promise<void> {
    try {
      await AsyncStorage.removeItem(WEATHER_CACHE_KEY);
    } catch (error) {
      console.warn("Failed to clear weather cache:", error);
    }
  }

  // Get weather recommendations for venue selection
  getWeatherRecommendations(weather: Weather): {
    message: string;
    venueTypes: string[];
    filters: Record<string, any>;
  } {
    if (weather.isRaining) {
      return {
        message: "It's raining! Perfect for cozy indoor spots.",
        venueTypes: ["restaurant", "bar", "entertainment"],
        filters: {
          weatherSuitability: {
            covered: true,
            indoor: true,
          },
        },
      };
    }

    if (weather.isSunny && weather.temp > 70) {
      return {
        message: "Beautiful sunny day! Great for outdoor activities.",
        venueTypes: ["activity", "restaurant"],
        filters: {
          weatherSuitability: {
            outdoor: true,
          },
        },
      };
    }

    if (weather.temp < 50) {
      return {
        message: "Bundle up! Perfect weather for warm, cozy places.",
        venueTypes: ["restaurant", "bar"],
        filters: {
          weatherSuitability: {
            heating: true,
            indoor: true,
          },
        },
      };
    }

    if (weather.temp > 80) {
      return {
        message: "It's hot out there! Time for cool, air-conditioned spots.",
        venueTypes: ["restaurant", "bar", "entertainment"],
        filters: {
          weatherSuitability: {
            airConditioning: true,
          },
        },
      };
    }

    return {
      message: "Perfect weather for exploring!",
      venueTypes: ["restaurant", "bar", "activity"],
      filters: {},
    };
  }
}

export const weatherService = new WeatherService();
export type { Weather };
