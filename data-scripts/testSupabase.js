require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");

console.log("Testing Supabase connection...");
console.log("URL:", process.env.SUPABASE_URL);
console.log("Key length:", process.env.SUPABASE_ANON_KEY?.length || 0);

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY,
);

async function test() {
  const { data, error } = await supabase
    .from("venues")
    .select("count")
    .limit(1);

  if (error) {
    console.log("❌ Supabase Error:", error);
  } else {
    console.log("✅ Supabase connected successfully!");
  }
}

test();
