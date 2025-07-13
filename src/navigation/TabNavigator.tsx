import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Home, Compass, Calendar, Heart, User } from "lucide-react-native";

// Import screens
import HomeScreen from "../screens/HomeScreen";
import ExploreScreen from "../screens/ExploreScreen";
import PlansScreen from "../screens/PlansScreen";
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
            case "Home":
              return (
                <Home
                  color={iconColor}
                  size={iconSize}
                  strokeWidth={strokeWidth}
                />
              );
            case "Explore":
              return (
                <Compass
                  color={iconColor}
                  size={iconSize}
                  strokeWidth={strokeWidth}
                />
              );
            case "Plans":
              return (
                <Calendar
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
                <Home
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
          backgroundColor: "rgba(255, 255, 255, 0.95)",
          borderTopWidth: 0,
          borderRadius: 25,
          marginHorizontal: 16,
          marginBottom: 16,
          paddingTop: 8,
          paddingBottom: 24,
          height: 80,
          shadowColor: "#000",
          shadowOffset: {
            width: 0,
            height: -4,
          },
          shadowOpacity: 0.1,
          shadowRadius: 20,
          elevation: 10,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "500",
          marginTop: 4,
        },
        headerShown: false,
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Explore" component={ExploreScreen} />
      <Tab.Screen name="Plans" component={PlansScreen} />
      <Tab.Screen name="Saved" component={SavedScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
