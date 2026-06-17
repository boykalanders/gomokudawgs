import type { Config } from "tailwindcss";

/**
 * Deputy Dawgs / Gomoku Dawgs premium theme — classic warm-wood surfaces (dark
 * stained walnut cabinet around a honey-oak playing board), metallic gold trim,
 * cream type. The "emerald"/"mahogany"/"gunmetal" token names are kept (now
 * mapped to wood shades) so the whole app reskins from one place.
 */
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      screens: {
        /** Touch-first devices (phones/tablets) — pointer is coarse. */
        touch: { raw: "(pointer: coarse)" },
        /** Mouse-driven devices (PCs) — pointer is fine. */
        desktop: { raw: "(pointer: fine)" },
      },
      colors: {
        // Surface ramp (deep → light) — stained walnut.
        mahogany: {
          DEFAULT: "#3a2613",
          dark: "#2a1c0e",
          deep: "#170e05",
        },
        // "emerald" names kept for the reskin; now warm-wood values.
        emerald: {
          felt: "#6b4a26", // mid table wood
          deep: "#170e05", // espresso (page / box background)
          panel: "#2a1b0d", // dark walnut panel
          rail: "#7a5230", // lighter rail / frame wood
        },
        walnut: "#241708",
        gold: {
          DEFAULT: "#c9a227",
          bright: "#e8c547",
          dim: "#8a7a3d",
        },
        cream: {
          DEFAULT: "#f5ecd6",
          dim: "#d8cba8",
        },
        cloth: {
          emerald: "#5a3d1f", // honey board wood
          midnight: "#2a2018",
          crimson: "#4a1a12",
        },
        // Panels — walnut gunmetal.
        gunmetal: {
          DEFAULT: "#33240f",
          dark: "#241708",
        },
        burn: "#ff6b35",
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "Times New Roman", "serif"],
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      boxShadow: {
        "gold-glow": "0 0 12px rgba(201, 162, 39, 0.45)",
        "pocket-glow": "0 0 18px rgba(232, 197, 71, 0.6)",
        "burn-glow": "0 0 14px rgba(255, 107, 53, 0.55)",
        "felt-inset": "inset 0 1px 0 rgba(232,197,71,0.1), inset 0 0 44px rgba(0,0,0,0.5)",
      },
      backgroundImage: {
        "wood-grain":
          "linear-gradient(160deg, #6e4a28 0%, #3a2613 45%, #170e05 100%)",
        "gold-sheen":
          "linear-gradient(110deg, #8a6d1d 0%, #e8c547 50%, #8a6d1d 100%)",
        "felt-radial":
          "radial-gradient(ellipse at 50% 35%, #7a5230 0%, #4a3018 45%, #1c1207 100%)",
      },
    },
  },
  plugins: [],
};

export default config;
