// src/services/venueService.ts
import { supabase } from '../utils/supabase';

export interface Venue {
  id: string;
  name: string;
  address: string;
  city: string;
  category: string;
  subcategory?: string;
  mood_tags: string[];
  description?: string;
  phone?: string;
  website?: string;
  price_range?: number;
  rating: number;
  review_count: number;
  coordinates?: { x: number; y: number };
  image_url?: string;
  social_media_links?: Record<string, any>;
  features: string[];
  hours?: Record<string, any>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type MoodType = 'cozy' | 'energetic' | 'special' | 'surprise';

export class VenueService {
  /**
   * Get venues by mood type
   */
  static async getVenuesByMood(
    mood: MoodType, 
    city: string = 'NYC', 
    limit: number = 20
  ): Promise<{ data: Venue[] | null; error: string | null }> {
    try {
      let query = supabase
        .from('venues')
        .select('*')
        .eq('city', city)
        .eq('is_active', true)
        .limit(limit);

      // Handle different mood types
      if (mood === 'surprise') {
        // For surprise, get random venues across all moods
        query = query.order('rating', { ascending: false });
      } else {
        // For specific moods, filter by mood_tags
        query = query.contains('mood_tags', [mood]);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching venues by mood:', error);
        return { data: null, error: error.message };
      }

      // For surprise mode, shuffle the results
      if (mood === 'surprise' && data) {
        const shuffled = [...data].sort(() => Math.random() - 0.5);
        return { data: shuffled, error: null };
      }

      return { data: data || [], error: null };
    } catch (err) {
      console.error('Unexpected error in getVenuesByMood:', err);
      return { data: null, error: 'Failed to load venues' };
    }
  }

  /**
   * Search venues by text query
   */
  static async searchVenues(
    query: string,
    city: string = 'NYC',
    filters?: {
      category?: string;
      priceRange?: number[];
      rating?: number;
      mood?: MoodType;
    }
  ): Promise<{ data: Venue[] | null; error: string | null }> {
    try {
      let supabaseQuery = supabase
        .from('venues')
        .select('*')
        .eq('city', city)
        .eq('is_active', true);

      // Text search across name, description, and category
      if (query.trim()) {
        supabaseQuery = supabaseQuery.or(
          `name.ilike.%${query}%,description.ilike.%${query}%,category.ilike.%${query}%`
        );
      }

      // Apply filters
      if (filters?.category) {
        supabaseQuery = supabaseQuery.eq('category', filters.category);
      }

      if (filters?.priceRange && filters.priceRange.length === 2) {
        supabaseQuery = supabaseQuery
          .gte('price_range', filters.priceRange[0])
          .lte('price_range', filters.priceRange[1]);
      }

      if (filters?.rating) {
        supabaseQuery = supabaseQuery.gte('rating', filters.rating);
      }

      if (filters?.mood) {
        supabaseQuery = supabaseQuery.contains('mood_tags', [filters.mood]);
      }

      const { data, error } = await supabaseQuery
        .order('rating', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error searching venues:', error);
        return { data: null, error: error.message };
      }

      return { data: data || [], error: null };
    } catch (err) {
      console.error('Unexpected error in searchVenues:', err);
      return { data: null, error: 'Search failed' };
    }
  }

  /**
   * Get venue by ID
   */
  static async getVenueById(id: string): Promise<{ data: Venue | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('venues')
        .select('*')
        .eq('id', id)
        .eq('is_active', true)
        .single();

      if (error) {
        console.error('Error fetching venue by ID:', error);
        return { data: null, error: error.message };
      }

      return { data, error: null };
    } catch (err) {
      console.error('Unexpected error in getVenueById:', err);
      return { data: null, error: 'Failed to load venue' };
    }
  }

  /**
   * Get nearby venues (requires coordinates)
   */
  static async getNearbyVenues(
    latitude: number,
    longitude: number,
    radiusKm: number = 5,
    city: string = 'NYC',
    limit: number = 20
  ): Promise<{ data: Venue[] | null; error: string | null }> {
    try {
      // Using PostGIS distance calculation
      const { data, error } = await supabase.rpc('get_nearby_venues', {
        lat: latitude,
        lng: longitude,
        radius_km: radiusKm,
        target_city: city,
        result_limit: limit
      });

      if (error) {
        console.error('Error fetching nearby venues:', error);
        // Fallback to regular city-based query if PostGIS function fails
        return this.getVenuesByMood('surprise', city, limit);
      }

      return { data: data || [], error: null };
    } catch (err) {
      console.error('Unexpected error in getNearbyVenues:', err);
      // Fallback to regular query
      return this.getVenuesByMood('surprise', city, limit);
    }
  }

  /**
   * Get top-rated venues
   */
  static async getTopRatedVenues(
    city: string = 'NYC',
    limit: number = 10
  ): Promise<{ data: Venue[] | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('venues')
        .select('*')
        .eq('city', city)
        .eq('is_active', true)
        .gte('rating', 4.0)
        .order('rating', { ascending: false })
        .order('review_count', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching top-rated venues:', error);
        return { data: null, error: error.message };
      }

      return { data: data || [], error: null };
    } catch (err) {
      console.error('Unexpected error in getTopRatedVenues:', err);
      return { data: null, error: 'Failed to load top venues' };
    }
  }

  /**
   * Get venues by category
   */
  static async getVenuesByCategory(
    category: string,
    city: string = 'NYC',
    limit: number = 20
  ): Promise<{ data: Venue[] | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('venues')
        .select('*')
        .eq('category', category)
        .eq('city', city)
        .eq('is_active', true)
        .order('rating', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching venues by category:', error);
        return { data: null, error: error.message };
      }

      return { data: data || [], error: null };
    } catch (err) {
      console.error('Unexpected error in getVenuesByCategory:', err);
      return { data: null, error: 'Failed to load venues' };
    }
  }
}