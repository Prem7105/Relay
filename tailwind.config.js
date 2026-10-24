/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ivory: "#F7F8F2",
        forest: { DEFAULT: "#163C34", 700: "#1d4a40", 50: "#E9F0EC" },
        ink: { DEFAULT: "#172720", soft: "#5B6B63" },
        lime: { DEFAULT: "#D8EF88", 700: "#B9D463" },
        line: "#E3E7DC",
      },
      borderRadius: { card: "20px", ctl: "14px" },
      boxShadow: { card: "0 1px 2px rgba(23,39,32,.04), 0 6px 20px -8px rgba(23,39,32,.10)" },
    },
  },
  plugins: [],
};
