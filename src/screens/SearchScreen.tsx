import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  Keyboard,
  Animated,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

interface SearchScreenProps {
  route?: {
    params?: {
      initialQuery?: string;
    };
  };
}

const SearchScreen: React.FC<SearchScreenProps> = ({ route }) => {
  const navigation = useNavigation();
  const [searchQuery, setSearchQuery] = useState(route?.params?.initialQuery || '');
  const [recentSearches, setRecentSearches] = useState([
    'Sushi',
    'Best Restaurants',
  ]);
  const searchInputRef = useRef<TextInput>(null);
  const slideAnim = useRef(new Animated.Value(0)).current;

  const quickFilters = [
    { id: 'restaurants', name: 'Restaurants', icon: 'restaurant' },
    { id: 'food-trucks', name: 'Food Trucks', icon: 'car' },
    { id: 'grocery', name: 'Grocery', icon: 'storefront' },
    { id: 'laundromat', name: 'Laundromat', icon: 'shirt' },
    { id: 'slushie', name: 'Slushie', icon: 'snow' },
  ];

  useEffect(() => {
    // Focus input and show keyboard
    const focusInput = () => {
      searchInputRef.current?.focus();
    };

    // Slide in animation
    Animated.spring(slideAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 100,
      friction: 8,
    }).start();

    // Small delay to ensure component is mounted
    const timer = setTimeout(focusInput, 100);
    return () => clearTimeout(timer);
  }, [slideAnim]);

  const handleSearch = () => {
    if (searchQuery.trim()) {
      // Add to recent searches if not already there
      if (!recentSearches.includes(searchQuery.trim())) {
        setRecentSearches(prev => [searchQuery.trim(), ...prev.slice(0, 4)]);
      }
      
      Keyboard.dismiss();
      // Navigate back to home with search results
      navigation.goBack();
    }
  };

  const handleRecentSearch = (query: string) => {
    setSearchQuery(query);
    handleSearch();
  };

  const handleQuickFilter = (filterId: string) => {
    const filter = quickFilters.find(f => f.id === filterId);
    if (filter) {
      setSearchQuery(filter.name);
    }
  };

  const handleBack = () => {
    Keyboard.dismiss();
    navigation.goBack();
  };

  const animatedStyle = {
    transform: [
      {
        translateY: slideAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [50, 0],
        }),
      },
    ],
    opacity: slideAnim,
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      
      <Animated.View style={[styles.content, animatedStyle]}>
        {/* Header with search input */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={handleBack}
          >
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          
          <View style={styles.searchContainer}>
            <TextInput
              ref={searchInputRef}
              style={styles.searchInput}
              placeholder="cleaners, movers, sushi, delivery, etc."
              placeholderTextColor="#999"
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleSearch}
              returnKeyType="search"
              selectionColor="#007AFF"
            />
          </View>
          
          <TouchableOpacity 
            style={styles.searchButton}
            onPress={handleSearch}
          >
            <Text style={styles.searchButtonText}>search</Text>
          </TouchableOpacity>
        </View>

        <ScrollView 
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Current Location */}
          <View style={styles.locationSection}>
            <TouchableOpacity style={styles.locationButton}>
              <Ionicons name="location" size={20} color="#007AFF" />
              <Text style={styles.locationText}>Current Location</Text>
            </TouchableOpacity>
          </View>

          {/* Quick Filters */}
          <View style={styles.quickFiltersSection}>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.quickFiltersScroll}
            >
              {quickFilters.map((filter) => (
                <TouchableOpacity
                  key={filter.id}
                  style={styles.quickFilter}
                  onPress={() => handleQuickFilter(filter.id)}
                >
                  <Ionicons name={filter.icon as any} size={16} color="#666" />
                  <Text style={styles.quickFilterText}>{filter.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Recently searched */}
          {recentSearches.length > 0 && (
            <View style={styles.recentSection}>
              <Text style={styles.sectionTitle}>Recently searched</Text>
              {recentSearches.map((query, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.recentItem}
                  onPress={() => handleRecentSearch(query)}
                >
                  <Ionicons name="time-outline" size={20} color="#999" />
                  <Text style={styles.recentText}>{query}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>
      </Animated.View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
    backgroundColor: '#fff',
  },
  backButton: {
    marginRight: 12,
    padding: 4,
  },
  searchContainer: {
    flex: 1,
    marginRight: 12,
  },
  searchInput: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
    borderWidth: 1,
    borderColor: '#e5e5e5',
  },
  searchButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  locationSection: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  locationText: {
    fontSize: 16,
    color: '#007AFF',
    marginLeft: 12,
    fontWeight: '500',
  },
  quickFiltersSection: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  quickFiltersScroll: {
    paddingHorizontal: 16,
    gap: 12,
  },
  quickFilter: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    gap: 8,
  },
  quickFilterText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  recentSection: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  recentText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
  },
});

export default SearchScreen;