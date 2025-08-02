import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Compass, Layers, Heart, User } from "lucide-react-native";

// Import screens
import DiscoverScreen from "../screens/DiscoverScreen";
import ListsScreen from "../screens/ListsScreen";
import SavedScreen from "../screens/SavedScreen";
import ProfileScreen from "../screens/ProfileScreen";

// Import types
import type { RootTabParamList } from "../types";

const Tab = createBottomTabNavigator<RootTabParamList>();

export default function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused }) => {
          const iconColor = focused ? "#FF6B35" : "#6B7280";
          const iconSize = 24;
          const strokeWidth = 2;

          switch (route.name) {
            case "Discover":
              return (
                <Compass
                  color={iconColor}
                  size={iconSize}
                  strokeWidth={strokeWidth}
                />
              );
            case "Lists":
              return (
                <Layers
                  color={iconColor}
                  size={iconSize}
                  strokeWidth={strokeWidth}
                />
              );
            case "Saved":
              return (
                <Heart
                  color={iconColor}
                  size={iconSize}
                  strokeWidth={strokeWidth}
                />
              );
            case "Profile":
              return (
                <User
                  color={iconColor}
                  size={iconSize}
                  strokeWidth={strokeWidth}
                />
              );
            default:
              return (
                <Compass
                  color={iconColor}
                  size={iconSize}
                  strokeWidth={strokeWidth}
                />
              );
          }
        },
        tabBarActiveTintColor: "#FF6B35",
        tabBarInactiveTintColor: "#6B7280",
        tabBarStyle: {
          backgroundColor: "#FFFFFF",
          borderTopWidth: 1,
          borderTopColor: "#E5E7EB",
          borderRadius: 0,
          marginHorizontal: 0,
          marginBottom: 0,
          paddingTop: 8,
          paddingBottom: 34,
          height: 90,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "500",
          marginTop: 4,
        },
        headerShown: false,
      })}
    >
      <Tab.Screen name="Discover" component={DiscoverScreen} />
      <Tab.Screen name="Lists" component={ListsScreen} />
      <Tab.Screen name="Saved" component={SavedScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
