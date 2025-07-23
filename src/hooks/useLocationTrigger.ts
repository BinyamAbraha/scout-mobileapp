import { useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const LOCATION_STORAGE_KEY = "@scout_last_location";
const SIGNIFICANT_DISTANCE_THRESHOLD = 50000; // 50km in meters

interface LocationData {
  lat: number;
  lng: number;
  timestamp: number;
  city?: string;
}

export const useLocationTrigger = () => {
  const [hasSignificantLocationChange, setHasSignificantLocationChange] =
    useState(false);

  const calculateDistance = (
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number,
  ): number => {
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
  };

  const checkLocationChange = async (
    currentLocation?: LocationData,
  ): Promise<boolean> => {
    if (!currentLocation) {
      return false;
    }

    try {
      const lastLocationData = await AsyncStorage.getItem(LOCATION_STORAGE_KEY);

      if (!lastLocationData) {
        // First time storing location
        await AsyncStorage.setItem(
          LOCATION_STORAGE_KEY,
          JSON.stringify(currentLocation),
        );
        return false;
      }

      const lastLocation: LocationData = JSON.parse(lastLocationData);
      const distance = calculateDistance(
        lastLocation.lat,
        lastLocation.lng,
        currentLocation.lat,
        currentLocation.lng,
      );

      const isSignificant = distance > SIGNIFICANT_DISTANCE_THRESHOLD;

      if (isSignificant) {
        // Update stored location
        await AsyncStorage.setItem(
          LOCATION_STORAGE_KEY,
          JSON.stringify(currentLocation),
        );
      }

      return isSignificant;
    } catch (error) {
      console.error("Error checking location change:", error);
      return false;
    }
  };

  const updateLocation = async (location: LocationData) => {
    const isSignificant = await checkLocationChange(location);
    setHasSignificantLocationChange(isSignificant);
    return isSignificant;
  };

  const getLastKnownLocation = async (): Promise<LocationData | null> => {
    try {
      const data = await AsyncStorage.getItem(LOCATION_STORAGE_KEY);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  };

  // Mock location detection based on common city coordinates
  // In a real app, this would use expo-location
  const detectCityChange = async (): Promise<boolean> => {
    const commonCities = [
      { name: "New York", lat: 40.7128, lng: -74.006 },
      { name: "San Francisco", lat: 37.7749, lng: -122.4194 },
      { name: "Los Angeles", lat: 34.0522, lng: -118.2437 },
      { name: "Chicago", lat: 41.8781, lng: -87.6298 },
      { name: "Miami", lat: 25.7617, lng: -80.1918 },
    ];

    // For demo purposes, randomly select a city change
    // In production, this would use actual device location
    const randomCity =
      commonCities[Math.floor(Math.random() * commonCities.length)];

    return updateLocation({
      lat: randomCity.lat,
      lng: randomCity.lng,
      timestamp: Date.now(),
      city: randomCity.name,
    });
  };

  return {
    hasSignificantLocationChange,
    updateLocation,
    checkLocationChange,
    getLastKnownLocation,
    detectCityChange,
  };
};
