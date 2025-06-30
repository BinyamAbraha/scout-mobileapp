import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';

// Import screens
import HomeScreen from '../screens/HomeScreen';
import ExploreScreen from '../screens/ExploreScreen';
import PlansScreen from '../screens/PlansScreen';
import SavedScreen from '../screens/SavedScreen';
import ProfileScreen from '../screens/ProfileScreen';

// Import types
import { RootTabParamList } from '../types';

const Tab = createBottomTabNavigator<RootTabParamList>();

export default function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: string;

          switch (route.name) {
            case 'Home':
              iconName = '🏠';
              break;
            case 'Explore':
              iconName = '🗺️';
              break;
            case 'Plans':
              iconName = '📅';
              break;
            case 'Saved':
              iconName = '❤️';
              break;
            case 'Profile':
              iconName = '👤';
              break;
            default:
              iconName = '❓';
          }

          return (
            <Text style={{ 
              fontSize: focused ? 28 : 24, 
              opacity: focused ? 1 : 0.6 
            }}>
              {iconName}
            </Text>
          );
        },
        tabBarActiveTintColor: '#667eea',
        tabBarInactiveTintColor: '#6b7280',
        tabBarStyle: {
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          borderTopWidth: 0,
          borderRadius: 25,
          marginHorizontal: 16,
          marginBottom: 16,
          paddingTop: 8,
          paddingBottom: 24,
          height: 80,
          shadowColor: '#000',
          shadowOffset: {
            width: 0,
            height: -4,
          },
          shadowOpacity: 0.1,
          shadowRadius: 20,
          elevation: 10,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '500',
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