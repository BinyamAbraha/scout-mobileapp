import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import StackNavigator from './src/navigation/StackNavigator';
import { testConnection } from './src/utils/supabase';
import { ThemeProvider } from './src/hooks/useTheme';

export default function App() {
  useEffect(() => {
    // Test database connection on app start
    testConnection();
  }, []);

  return (
    <NavigationContainer>
      <ThemeProvider>
        <StatusBar style="auto" />
        <StackNavigator />
      </ThemeProvider>
    </NavigationContainer>
  );
}