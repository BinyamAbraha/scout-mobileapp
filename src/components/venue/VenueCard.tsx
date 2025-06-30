// src/components/venue/VenueCard.tsx
import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { Venue } from '../../services/venueService';

interface VenueCardProps {
  venue: Venue;
  onPress?: (venue: Venue) => void;
  style?: any;
}

const VenueCard: React.FC<VenueCardProps> = ({ venue, onPress, style }) => {
  const getPriceRangeText = (priceRange?: number): string => {
    if (!priceRange) return '';
    return '$'.repeat(priceRange);
  };

  const getMoodColor = (moodTags: string[]): [string, string] => {
    if (moodTags.includes('cozy')) return ['#ffb347', '#ff8c42'];
    if (moodTags.includes('energetic')) return ['#00d4ff', '#ff6b6b'];
    if (moodTags.includes('special')) return ['#e8b4b8', '#c2185b'];
    return ['#667eea', '#764ba2']; // default
  };

  const formatRating = (rating: number): string => {
    return rating > 0 ? rating.toFixed(1) : 'New';
  };

  const truncateText = (text: string, maxLength: number): string => {
    return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
  };

  return (
    <TouchableOpacity
      style={[styles.container, style]}
      onPress={() => onPress?.(venue)}
      activeOpacity={0.9}
    >
      <View style={styles.imageContainer}>
        {venue.image_url ? (
          <Image source={{ uri: venue.image_url }} style={styles.image} />
        ) : (
          <LinearGradient
            colors={getMoodColor(venue.mood_tags)}
            style={styles.placeholderImage}
          >
            <Text style={styles.placeholderText}>
              {venue.name.substring(0, 2).toUpperCase()}
            </Text>
          </LinearGradient>
        )}
        
        {/* Mood badge */}
        {venue.mood_tags.length > 0 && (
          <View style={styles.moodBadge}>
            <Text style={styles.moodText}>
              {venue.mood_tags[0]}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.name} numberOfLines={1}>
            {venue.name}
          </Text>
          <View style={styles.ratingContainer}>
            <Text style={styles.rating}>★ {formatRating(venue.rating)}</Text>
            {venue.review_count > 0 && (
              <Text style={styles.reviewCount}>({venue.review_count})</Text>
            )}
          </View>
        </View>

        <Text style={styles.category} numberOfLines={1}>
          {venue.category} {venue.subcategory && `• ${venue.subcategory}`}
        </Text>

        {venue.description && (
          <Text style={styles.description} numberOfLines={2}>
            {truncateText(venue.description, 80)}
          </Text>
        )}

        <View style={styles.footer}>
          <View style={styles.priceAndLocation}>
            {venue.price_range && (
              <Text style={styles.priceRange}>
                {getPriceRangeText(venue.price_range)}
              </Text>
            )}
            <Text style={styles.address} numberOfLines={1}>
              {venue.address.split(',')[0]} {/* Show just street address */}
            </Text>
          </View>
          
          {venue.features.length > 0 && (
            <View style={styles.features}>
              <Text style={styles.feature} numberOfLines={1}>
                {venue.features.slice(0, 2).join(' • ')}
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 16,
    marginVertical: 8,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    overflow: 'hidden',
  },
  imageContainer: {
    position: 'relative',
    height: 160,
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
  },
  moodBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  moodText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  content: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  name: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    flex: 1,
    marginRight: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rating: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffa500',
  },
  reviewCount: {
    fontSize: 12,
    color: '#666',
    marginLeft: 2,
  },
  category: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    fontWeight: '500',
  },
  description: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
    marginBottom: 12,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  priceAndLocation: {
    flex: 1,
  },
  priceRange: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#667eea',
    marginBottom: 2,
  },
  address: {
    fontSize: 12,
    color: '#888',
  },
  features: {
    maxWidth: '40%',
  },
  feature: {
    fontSize: 11,
    color: '#ff6b6b',
    fontWeight: '500',
    textAlign: 'right',
  },
});

export default VenueCard;