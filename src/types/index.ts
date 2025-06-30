// Navigation Types
export type RootTabParamList = {
  Home: undefined;
  Explore: undefined;
  Plans: undefined;
  Saved: undefined;
  Profile: undefined;
};

// Mood Types
export type MoodType = 'cozy' | 'energetic' | 'special' | 'surprise';

// Venue Types
export interface Venue {
  id: string;
  name: string;
  address: string;
  category: string;
  mood_tags: MoodType[];
  rating: number;
  price_range: 1 | 2 | 3 | 4;
  description?: string;
  image_url?: string;
  phone?: string;
  website?: string;
  coordinates: {
    lat: number;
    lng: number;
  };
}

// User Types
export interface User {
  id: string;
  email: string;
  username?: string;
  preferences: {
    cuisines: string[];
    budget_range: [number, number];
    dietary_restrictions: string[];
  };
}

// Plan Types
export interface Plan {
  id: string;
  title: string;
  user_id: string;
  venues: Venue[];
  created_at: string;
  is_shared: boolean;
}