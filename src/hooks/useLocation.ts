import { useState, useEffect } from "react";
import * as Location from "expo-location";

interface LocationData {
  latitude: number;
  longitude: number;
  city?: string;
  address?: string;
}

interface UseLocationReturn {
  location: LocationData | null;
  loading: boolean;
  error: string | null;
  requestLocation: () => Promise<void>;
  hasPermission: boolean;
}

const DEFAULT_LOCATION: LocationData = {
  latitude: 37.7749,
  longitude: -122.4194,
  city: "San Francisco",
  address: "San Francisco, CA",
};

export const useLocation = (): UseLocationReturn => {
  const [location, setLocation] = useState<LocationData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState(false);

  const requestPermission = async (): Promise<boolean> => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      const granted = status === "granted";
      setHasPermission(granted);
      return granted;
    } catch (err) {
      console.error("Error requesting location permission:", err);
      setError("Failed to request location permission");
      return false;
    }
  };

  const getCurrentLocation = async (): Promise<LocationData | null> => {
    try {
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 10000,
        distanceInterval: 100,
      });

      const { latitude, longitude } = position.coords;

      // Get address information
      try {
        const reverseGeocode = await Location.reverseGeocodeAsync({
          latitude,
          longitude,
        });

        const address = reverseGeocode[0];
        const city = address?.city || address?.district || "Unknown City";
        const fullAddress =
          `${address?.name || ""} ${address?.street || ""}, ${city}, ${address?.region || ""}`.trim();

        return {
          latitude,
          longitude,
          city,
          address: fullAddress,
        };
      } catch (geocodeError) {
        console.warn("Reverse geocoding failed:", geocodeError);
        return {
          latitude,
          longitude,
        };
      }
    } catch (err) {
      console.error("Error getting current location:", err);
      throw err;
    }
  };

  const requestLocation = async (): Promise<void> => {
    console.log("📍 Starting location request...");
    setLoading(true);
    setError(null);

    try {
      const permission = await requestPermission();
      console.log("🔐 Location permission result:", permission);

      if (!permission) {
        console.log("❌ Permission denied, using default SF location");
        setError("Location permission denied. Using default location.");
        setLocation(DEFAULT_LOCATION);
        return;
      }

      console.log("📡 Getting current location...");
      const currentLocation = await getCurrentLocation();
      console.log("✅ Location obtained:", currentLocation);
      setLocation(currentLocation);
    } catch (err) {
      console.error("❌ Error in requestLocation:", err);
      setError("Failed to get location. Using default location.");
      console.log("🏙️ Falling back to default SF location");
      setLocation(DEFAULT_LOCATION);
    } finally {
      setLoading(false);
      console.log("📍 Location request complete");
    }
  };

  // Auto-request location on mount
  useEffect(() => {
    requestLocation();
  }, []);

  return {
    location,
    loading,
    error,
    requestLocation,
    hasPermission,
  };
};
