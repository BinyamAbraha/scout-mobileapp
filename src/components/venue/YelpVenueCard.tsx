import React from "react";
import { View, Text, Image, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { Venue } from "../../types";

interface YelpVenueCardProps {
  venue: Venue;
  onPress?: (venue: Venue) => void;
  style?: any;
}

const YelpVenueCard: React.FC<YelpVenueCardProps> = ({
  venue,
  onPress,
  style,
}) => {
  const getStars = (rating: number) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Ionicons
          key={i}
          name={i <= rating ? "star" : "star-outline"}
          size={16}
          color="#dc2626"
        />,
      );
    }
    return stars;
  };

  const formatDistance = (distance?: number) => {
    if (!distance) return "";
    return `${distance} min walk`;
  };

  return (
    <TouchableOpacity
      style={[styles.container, style]}
      onPress={() => onPress?.(venue)}
      activeOpacity={0.8}
    >
      {/* Featured review with image */}
      <View style={styles.featuredReview}>
        <View style={styles.reviewHeader}>
          <View style={styles.userInfo}>
            <Image
              source={{
                uri: "https://s3-media0.fl.yelpcdn.com/photo/WG8sKl6ZvYU8lAEz7-OPNw/30s.jpg",
              }}
              style={styles.userAvatar}
            />
            <View>
              <View style={styles.userNameContainer}>
                <Text style={styles.userName}>Erin P.</Text>
                <View style={styles.eliteBadge}>
                  <Text style={styles.eliteText}>Elite '25</Text>
                </View>
              </View>
              <Text style={styles.reviewMeta}>
                Posted a review & 2 photos • 21 hours ago
              </Text>
            </View>
          </View>
        </View>

        {venue.image_url && (
          <Image source={{ uri: venue.image_url }} style={styles.venueImage} />
        )}

        <View style={styles.reviewContent}>
          <View style={styles.starRating}>
            {getStars(Math.floor(venue.rating))}
          </View>
          <Text style={styles.reviewText} numberOfLines={2}>
            The taste The chicken empanadas were soooo filling and hella bomb! I
            came here t...
          </Text>
        </View>
      </View>

      {/* Venue info */}
      <View style={styles.venueInfo}>
        <View style={styles.venueHeader}>
          <Text style={styles.venueName}>{venue.name}</Text>
          <TouchableOpacity style={styles.bookmarkButton}>
            <Ionicons name="bookmark-outline" size={20} color="#999" />
            <Text style={styles.bookmarkText}>Want to go</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.venueDetails}>
          <View style={styles.ratingContainer}>
            <View style={styles.starRating}>
              {getStars(Math.floor(venue.rating))}
            </View>
            <Text style={styles.ratingText}>
              {venue.rating} ({venue.review_count} reviews)
            </Text>
          </View>

          <Text style={styles.distanceText}>{formatDistance(15)}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "white",
    marginVertical: 4,
    marginHorizontal: 0,
    borderRadius: 0,
    overflow: "hidden",
    borderWidth: 0,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  featuredReview: {
    padding: 16,
    borderBottomWidth: 0,
  },
  reviewHeader: {
    marginBottom: 12,
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  userNameContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 2,
  },
  userName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginRight: 8,
  },
  eliteBadge: {
    backgroundColor: "#ff6600",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  eliteText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
  },
  reviewMeta: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },
  venueImage: {
    width: "100%",
    height: 160,
    borderRadius: 8,
    marginBottom: 12,
  },
  reviewContent: {
    gap: 8,
  },
  starRating: {
    flexDirection: "row",
    gap: 1,
  },
  reviewText: {
    fontSize: 14,
    color: "#333",
    lineHeight: 20,
  },
  venueInfo: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  venueHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  venueName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    flex: 1,
    marginRight: 12,
  },
  bookmarkButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#e5e5e5",
  },
  bookmarkText: {
    fontSize: 12,
    color: "#666",
    marginLeft: 4,
    fontWeight: "500",
  },
  venueDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  ratingText: {
    fontSize: 14,
    color: "#666",
  },
  distanceText: {
    fontSize: 14,
    color: "#666",
  },
});

export default YelpVenueCard;
