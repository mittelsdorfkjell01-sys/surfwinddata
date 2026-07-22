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
        float: "0 32px 64px -32px rgba(19, 51, 94, 0.28)", // overlapping conditions card
        lift: "0 12px 32px -16px rgba(19, 51, 94, 0.20)", // sticky subnav
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.5rem",
      },
      // Semantic type scale — the app's recurring UI text steps as tokens
      // (single source of truth). Font-size only, so values match the previously
      // hard-coded `text-[Npx]` exactly; adopting them is visually a no-op while
      // making sizes semantic and consistent. `text-[Npx]` is not allowed in new
      // code — extend this scale instead.
      fontSize: {
        caption: "0.75rem", // 12px — captions, meta, legends
        label: "0.8125rem", // 13px — control labels, chips, buttons (sm)
        ui: "0.875rem", // 14px — default control/body-UI text
        body: "0.9375rem", // 15px — reading copy
        lede: ["clamp(1.1875rem, 1.4vw, 1.375rem)", { lineHeight: "1.65" }], // 19–22px — editorial lede copy
        title: ["1.375rem", { lineHeight: "1.25", letterSpacing: "-0.01em" }], // 22px — module/panel titles
        stat: ["clamp(3rem, 5vw, 4.25rem)", { lineHeight: "0.85", letterSpacing: "-0.03em" }], // big live numbers
        // Editorial display scale — fluid hero/section titles (travel-journal).
        "display-1": ["clamp(2.5rem, 6vw, 5rem)", { lineHeight: "1.02", letterSpacing: "-0.03em" }],
        "display-2": ["clamp(1.75rem, 3.5vw, 2.75rem)", { lineHeight: "1.08", letterSpacing: "-0.02em" }],
      },
    },
  },
  plugins: [],
};
