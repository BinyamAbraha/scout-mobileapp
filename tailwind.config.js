/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#667eea",
        primaryDark: "#764ba2",
        accent: "#ff6b6b",
        cozy: "#ffb347",
        energetic: "#00d4ff",
        special: "#e8b4b8",
        surprise: "#667eea",
      },
    },
  },
  plugins: [],
};
