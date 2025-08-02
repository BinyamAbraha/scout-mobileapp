import { supabase } from "../utils/supabase";
import type { Venue, MoodType } from "../types";

// Database venue schema (what we actually get from Supabase)
interface DatabaseVenue {
  id: string;
  external_id?: string;
  name: string;
  address: string;
  city?: string;
  state?: string;
  zip_code?: string;
  latitude?: number;
  longitude?: number;
  price_level?: number;
  rating: number;
  review_count: number;
  categories?: string[] | string;
  phone?: string;
  image_url?: string;
  source?: string;
  created_at?: string;
  updated_at?: string;
}

export class DatabaseAdapter {
  // Transform database venue to app venue format
  static transformVenue(dbVenue: DatabaseVenue): Venue {
    // Parse categories - handle both array and string formats
    let categoriesArray: string[] = [];
    if (dbVenue.categories) {
      if (Array.isArray(dbVenue.categories)) {
        categoriesArray = dbVenue.categories;
      } else if (typeof dbVenue.categories === 'string') {
        // If it's a string, try to parse it as JSON first, then split by comma
        try {
          categoriesArray = JSON.parse(dbVenue.categories);
        } catch {
          // If not JSON, split by comma and trim whitespace
          categoriesArray = dbVenue.categories.split(',').map((cat: string) => cat.trim());
        }
      }
    }
    
    const primaryCategory = categoriesArray.length > 0 ? categoriesArray[0] : 'Other';

    // Default mood tags based on category
    const getMoodTags = (category: string): MoodType[] => {
      const categoryLower = category.toLowerCase();
      if (categoryLower.includes('restaurant') || categoryLower.includes('food')) {
        return ['energetic'];
      } else if (categoryLower.includes('coffee') || categoryLower.includes('cafe')) {
        return ['cozy'];
      } else if (categoryLower.includes('bar') || categoryLower.includes('club')) {
        return ['energetic'];
      }
      return ['cozy'];
    };

    return {
      id: dbVenue.id,
      name: dbVenue.name,
      address: dbVenue.address,
      category: primaryCategory,
      subcategory: categoriesArray.length > 1 
        ? categoriesArray[1] 
        : undefined,
      mood_tags: getMoodTags(primaryCategory),
      rating: dbVenue.rating,
      review_count: dbVenue.review_count,
      price_range: (dbVenue.price_level || 2) as 1 | 2 | 3 | 4,
      description: `${primaryCategory} in ${dbVenue.city || 'the area'}`,
      image_url: dbVenue.image_url,
      phone: dbVenue.phone,
      coordinates: {
        lat: dbVenue.latitude || 0,
        lng: dbVenue.longitude || 0,
      },
      city: dbVenue.city,
      features: categoriesArray,
      data_sources: {
        venueId: dbVenue.id,
        sources: [],
        primarySource: 'supabase' as any,
        mergedAt: new Date(),
      },
    };
  }

  // Get all venues with transformation
  static async getAllVenues(city?: string): Promise<{ data?: Venue[]; error?: string }> {
    try {
      let query = supabase.from("venues").select("*");
      
      if (city) {
        query = query.eq("city", city);
      }
      
      const { data, error } = await query.order("rating", { ascending: false });

      if (error) {
        return { error: error.message };
      }

      const transformedVenues = (data || []).map(this.transformVenue);
      return { data: transformedVenues };
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Unknown error' };
    }
  }

  // Search venues with transformation
  static async searchVenues(searchQuery: string, city?: string, limit = 20): Promise<Venue[]> {
    try {
      const searchTerm = `%${searchQuery}%`;
      
      let query = supabase.from("venues").select("*");
      
      if (city) {
        query = query.eq("city", city);
      }

      query = query.or(
        `name.ilike.${searchTerm},categories.cs.{${searchQuery}}`
      ).order("rating", { ascending: false }).limit(limit);

      const { data, error } = await query;

      if (error) {
        console.error("Search error:", error);
        return [];
      }

      return (data || []).map(this.transformVenue);
    } catch (err) {
      console.error("Search error:", err);
      return [];
    }
  }

  // Get venues by category
  static async getVenuesByCategory(category: string, city?: string): Promise<Venue[]> {
    try {
      let query = supabase.from("venues").select("*");
      
      if (city) {
        query = query.eq("city", city);
      }

      query = query.contains("categories", [category])
        .order("rating", { ascending: false });

      const { data, error } = await query;

      if (error) {
        console.error("Category filter error:", error);
        return [];
      }

      return (data || []).map(this.transformVenue);
    } catch (err) {
      console.error("Category filter error:", err);
      return [];
    }
  }

  // Get venue by ID
  static async getVenueById(id: string): Promise<Venue | null> {
    try {
      const { data, error } = await supabase
        .from("venues")
        .select("*")
        .eq("id", id)
        .single();

      if (error || !data) {
        return null;
      }

      return this.transformVenue(data);
    } catch (err) {
      console.error("Get venue by ID error:", err);
      return null;
    }
  }
}