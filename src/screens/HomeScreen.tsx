// src/screens/HomeScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import Button from '../components/ui/Button';
import MoodCard from '../components/mood/MoodCard';
import VenueCard from '../components/venue/VenueCard';
import { VenueService, type Venue, type MoodType } from '../services/venueService';

const HomeScreen = () => {
  const [selectedMood, setSelectedMood] = useState<MoodType | null>(null);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get time-based greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  // Handle mood card press
  const handleMoodPress = async (mood: MoodType) => {
    setSelectedMood(mood);
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await VenueService.getVenuesByMood(mood, 'NYC', 10);
      
      if (error) {
        setError(error);
        Alert.alert('Error', error);
      } else {
        setVenues(data || []);
      }
    } catch (err) {
      const errorMessage = 'Failed to load venues. Please try again.';
      setError(errorMessage);
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Handle venue press
  const handleVenuePress = (venue: Venue) => {
    Alert.alert(
      venue.name,
      `${venue.description || 'No description available'}\n\n📍 ${venue.address}\n⭐ ${venue.rating}/5 (${venue.review_count} reviews)`,
      [{ text: 'OK' }]
    );
  };

  // Handle surprise me button
  const handleSurpriseMe = () => {
    handleMoodPress('surprise');
  };

  // Clear selection
  const handleClearSelection = () => {
    setSelectedMood(null);
    setVenues([]);
    setError(null);
  };

  // Render mood selection view
  const renderMoodSelection = () => (
    <>
      <Text style={styles.subtitle}>How are you feeling today?</Text>
      
      <View style={styles.moodGrid}>
        <MoodCard
          mood="cozy"
          title="Cozy"
          subtitle="Intimate & warm"
          icon="🕯️"
          onPress={() => handleMoodPress('cozy')}
        />
        <MoodCard
          mood="energetic"
          title="Energetic"
          subtitle="High energy vibes"
          icon="⚡"
          onPress={() => handleMoodPress('energetic')}
        />
        <MoodCard
          mood="special"
          title="Special"
          subtitle="Romantic & sophisticated"
          icon="🌹"
          onPress={() => handleMoodPress('special')}
        />
        <MoodCard
          mood="surprise"
          title="Surprise Me"
          subtitle="AI-powered discovery"
          icon="✨"
          onPress={() => handleMoodPress('surprise')}
        />
      </View>

      <View style={styles.quickActions}>
        <Button
          title="Surprise Me Now"
          variant="accent"
          onPress={handleSurpriseMe}
          style={styles.actionButton}
        />
        <Button
          title="Near Me"
          variant="secondary"
          onPress={() => Alert.alert('Coming Soon', 'Location-based search coming in the next update!')}
          style={styles.actionButton}
        />
      </View>

      <View style={styles.happeningNow}>
        <Text style={styles.sectionTitle}>Happening Now</Text>
        <View style={styles.statusIndicators}>
          <View style={styles.statusItem}>
            <View style={[styles.statusDot, { backgroundColor: '#4ade80' }]} />
            <Text style={styles.statusText}>Most venues open</Text>
          </View>
          <View style={styles.statusItem}>
            <View style={[styles.statusDot, { backgroundColor: '#f59e0b' }]} />
            <Text style={styles.statusText}>Peak dinner time</Text>
          </View>
        </View>
      </View>
    </>
  );

  // Render venues list
  const renderVenuesList = () => (
    <View style={styles.venuesContainer}>
      <View style={styles.resultsHeader}>
        <Text style={styles.resultsTitle}>
          {selectedMood === 'surprise' ? 'Surprise Picks' : `${selectedMood} vibes`}
        </Text>
        <Button
          title="Back"
          variant="secondary"
          onPress={handleClearSelection}
          style={styles.backButton}
        />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#667eea" />
          <Text style={styles.loadingText}>Finding perfect spots...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <Button
            title="Try Again"
            variant="primary"
            onPress={() => selectedMood && handleMoodPress(selectedMood)}
            style={styles.retryButton}
          />
        </View>
      ) : venues.length > 0 ? (
        <FlatList
          data={venues}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <VenueCard
              venue={item}
              onPress={handleVenuePress}
            />
          )}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.venuesList}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No venues found for this mood.</Text>
          <Button
            title="Try Another Mood"
            variant="primary"
            onPress={handleClearSelection}
            style={styles.retryButton}
          />
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.header}
      >
        <Text style={styles.greeting}>{getGreeting()}!</Text>
        <Text style={styles.title}>
          {selectedMood ? 'Your Venues' : 'Discover NYC'}
        </Text>
      </LinearGradient>

      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {selectedMood ? renderVenuesList() : renderMoodSelection()}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 32,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  greeting: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginTop: 4,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    textAlign: 'center',
    marginTop: 24,
    marginBottom: 20,
    paddingHorizontal: 24,
  },
  moodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    gap: 16,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    marginTop: 32,
    gap: 16,
  },
  actionButton: {
    flex: 1,
  },
  happeningNow: {
    paddingHorizontal: 24,
    marginTop: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 16,
  },
  statusIndicators: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 12,
  },
  statusText: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  venuesContainer: {
    flex: 1,
    paddingTop: 24,
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  resultsTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    textTransform: 'capitalize',
  },
  backButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 16,
    color: '#64748b',
    marginTop: 16,
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  errorText: {
    fontSize: 16,
    color: '#ef4444',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    paddingHorizontal: 24,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  emptyText: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 20,
  },
  venuesList: {
    paddingBottom: 20,
  },
});

export default HomeScreen;