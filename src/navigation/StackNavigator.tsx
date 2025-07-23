import React from "react";
import { createStackNavigator } from "@react-navigation/stack";
import TabNavigator from "./TabNavigator";
import SearchScreen from "../screens/SearchScreen";
import LandingScreen from "../screens/LandingScreen";
import { RootStackParamList } from "../types";
import { useAnimationTrigger } from "@/hooks/useAnimationTrigger";

const Stack = createStackNavigator<RootStackParamList>();

export default function StackNavigator() {
  const { animationMode, isLoading } = useAnimationTrigger();

  if (isLoading) {
    return null;
  }

  const shouldShowLanding = animationMode !== "skip";

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
      initialRouteName={shouldShowLanding ? "Landing" : "Main"}
    >
      {shouldShowLanding && (
        <Stack.Screen
          name="Landing"
          component={LandingScreen}
          initialParams={{ animationMode }}
        />
      )}
      <Stack.Screen name="Main" component={TabNavigator} />
      <Stack.Screen
        name="Search"
        component={SearchScreen}
        options={{
          presentation: "modal",
          animationTypeForReplace: "push",
          cardStyleInterpolator: ({ current, layouts }) => {
            return {
              cardStyle: {
                transform: [
                  {
                    translateY: current.progress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [layouts.screen.height, 0],
                    }),
                  },
                ],
              },
            };
          },
        }}
      />
    </Stack.Navigator>
  );
}
