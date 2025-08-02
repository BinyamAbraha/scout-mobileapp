require("dotenv").config();
const axios = require("axios");
const { createClient } = require("@supabase/supabase-js");

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY,
);

// Configuration
const CITIES = [
  { name: "San Francisco", state: "CA", lat: 37.7749, lng: -122.4194 },
  { name: "Los Angeles", state: "CA", lat: 34.0522, lng: -118.2437 },
  { name: "New York", state: "NY", lat: 40.7128, lng: -74.006 },
];

const CATEGORIES = [
  "restaurants",
  "bars",
  "coffee",
  "breakfast_brunch",
  "pizza",
  "burgers",
  "sushi",
  "mexican",
  "italian",
  "chinese",
  "thai",
  "vietnamese",
  "indian",
  "korean",
  "japanese",
];

// Fetch venues from Yelp
async function fetchYelpVenues(city, category, limit = 50) {
  try {
    const response = await axios.get(
      "https://api.yelp.com/v3/businesses/search",
      {
        headers: {
          Authorization: `Bearer ${process.env.YELP_API_KEY}`,
        },
        params: {
          location: `${city.name}, ${city.state}`,
          categories: category,
          limit: limit,
          sort_by: "rating",
        },
      },
    );

    return response.data.businesses.map((business) => ({
      external_id: `yelp_${business.id}`,
      name: business.name,
      address: business.location.address1,
      city: city.name,
      state: city.state,
      zip_code: business.location.zip_code,
      latitude: business.coordinates.latitude,
      longitude: business.coordinates.longitude,
      price_level: business.price ? business.price.length : null,
      rating: business.rating,
      review_count: business.review_count,
      categories: business.categories.map((cat) => cat.title).join(", "),
      phone: business.phone,
      image_url: business.image_url,
      source: "yelp",
    }));
  } catch (error) {
    console.error(`Error fetching Yelp data for ${category}:`, error.message);
    return [];
  }
}

// Save venues to Supabase
async function saveVenuesToSupabase(venues) {
  // Remove duplicates based on name and address
  const uniqueVenues = venues.reduce((acc, venue) => {
    const key = `${venue.name.toLowerCase()}_${venue.city.toLowerCase()}`;
    if (!acc.has(key)) {
      acc.set(key, venue);
    }
    return acc;
  }, new Map());

  const venuesArray = Array.from(uniqueVenues.values());

  // Insert in batches of 100
  const batchSize = 100;
  for (let i = 0; i < venuesArray.length; i += batchSize) {
    const batch = venuesArray.slice(i, i + batchSize);

    const { error } = await supabase.from("venues").upsert(batch, {
      onConflict: "external_id",
      ignoreDuplicates: true,
    });

    if (error) {
      console.error("Error saving venues:", error);
    }
  }

  return venuesArray.length;
}

// Main import function
async function importVenues() {
  console.log("🚀 Starting venue data import...\n");

  const isTestMode = process.argv.includes("--test");

  for (const city of CITIES) {
    console.log(`📍 Fetching venues for ${city.name}, ${city.state}`);

    let allVenues = [];
    const categoriesToFetch = isTestMode ? ["restaurants"] : CATEGORIES;
    const limitPerCategory = isTestMode ? 10 : 50;

    // Fetch from Yelp
    console.log("  Fetching from Yelp... (this may take a moment)");
    for (const category of categoriesToFetch) {
      const venues = await fetchYelpVenues(city, category, limitPerCategory);
      allVenues = allVenues.concat(venues);
      // Small delay to respect rate limits
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    console.log(`  ✓ Fetched ${allVenues.length} venues from Yelp`);

    console.log(`  ✓ Fetched ${allVenues.length} venues from Yelp`);

    // Save to Supabase
    console.log("  🔄 Processing and removing duplicates...");
    const savedCount = await saveVenuesToSupabase(allVenues);
    console.log(`  💾 Saved ${savedCount} unique venues to database\n`);

    if (isTestMode) {
      console.log("✅ Test import complete!");
      break;
    }
  }

  if (!isTestMode) {
    console.log(
      "✅ Full import complete! Your database is now populated with venues.",
    );
  }
}

// Run the import
importVenues().catch(console.error);
