/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Deep classic navy — logo, buttons, filled tags, headings
        navy: {
          DEFAULT: "#13335E",
          dark: "#0E2748",
          soft: "#2C4E7E",
        },
        // "surfwind data" re-skin (Sprint: Landing redesign). Warm orange wordmark +
        // teal accents. Hexes eyeballed from the design frames — set as tokens so
        // they're trivial to nudge to exact brand values.
        "brand-orange": {
          DEFAULT: "#E0823C", // wordmark + round search button
          dark: "#CF7433",    // button hover/active
        },
        "brand-teal": {
          DEFAULT: "#1E6E7E", // "data" subscript, field labels, header pill
          dark: "#17586A",
        },
        // Warm off-white for panels/cards in the new design
        cream: "#FBF6EF",
        // Beginner tag + status dot
        // Darkened so white tag text clears WCAG AA (~4.5:1)
        "brand-green": "#4A8159",
        dot: "#3DA24A",
        // Secondary text / captions — darkened to ~4.5:1 on white (was #8A97A9, 2.97:1)
        muted: "#6B7787",
        // Hairline borders
        line: "#E4E9F0",
      },
      fontFamily: {
        sans: ["Poppins", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
        // Display face used only for the "surfwind" wordmark (local .otf).
        display: ["MADE Mountain", "Poppins", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 10px 30px -12px rgba(19, 51, 94, 0.25)",
        bar: "0 8px 24px -10px rgba(19, 51, 94, 0.22)",
        pill: "0 4px 14px -6px rgba(19, 51, 94, 0.25)",
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.5rem",
      },
    },
  },
  plugins: [],
};
