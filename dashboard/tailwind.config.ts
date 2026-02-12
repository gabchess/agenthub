import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        page: "#0a0a0a",
        surface: "#111111",
        raised: "#1a1a1a",
        border: "#333333",
        "accent-green": "#00ff88",
        "accent-cyan": "#00e5ff",
        "accent-amber": "#ffb300",
        "accent-red": "#ff3d3d",
        "accent-purple": "#a78bfa",
      },
      fontFamily: {
        mono: [
          "JetBrains Mono",
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Monaco",
          "Consolas",
          "monospace",
        ],
      },
      boxShadow: {
        glow: "0 0 15px rgba(0, 255, 136, 0.15)",
        "glow-lg": "0 0 30px rgba(0, 255, 136, 0.2)",
      },
    },
  },
  plugins: [],
};

export default config;
