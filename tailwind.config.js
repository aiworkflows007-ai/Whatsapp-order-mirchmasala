/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#0d0f12", // Deep charcoal black
        surface: "#16191f",    // Slate dark grey for panels
        border: "#262b35",     // Modern borders
        primary: {
          DEFAULT: "#ea580c",  // Saffron orange
          hover: "#dd6b20",
          light: "#ffedd5",
        },
        secondary: {
          DEFAULT: "#b91c1c",  // Masala Red
          hover: "#991b1b",
        },
        accent: {
          DEFAULT: "#10b981",  // Emerald green (vegetarian)
          nonveg: "#ef4444",   // Red badge (non-vegetarian)
        },
        muted: "#9ca3af",
      },
      fontFamily: {
        sans: ["var(--font-outfit)", "Inter", "sans-serif"],
      },
    },
  },
  plugins: [],
};
