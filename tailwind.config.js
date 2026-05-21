/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./*.html",
    "./templates/**/*.html",
    "./product/**/*.html",
    "./category/**/*.html"
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f4f8f5',
          100: '#e5eedf',
          200: '#cadfbd',
          300: '#a3ca93',
          400: '#75ab63',
          500: '#2c5e3b', // Deep brand forest green
          600: '#224d2e', // Darker forest green
          700: '#1a3c24',
          800: '#142c1b',
          900: '#0e1f13',
          950: '#060f09',
        },
        accent: {
          orange: '#e07a5f', // Terracotta orange
          yellow: '#f4a261', // Warm yellow/orange
          sand: '#FAF8F5',   // Off-white/cream
          dark: '#1e293b',   // Slate dark
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        serif: ['Outfit', 'serif'],
      }
    },
  },
  plugins: [],
}
