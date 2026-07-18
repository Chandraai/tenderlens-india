import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#111827",
        cloud: "#f7f8fb",
        brand: {
          50: "#eef7ff",
          500: "#1976d2",
          700: "#0b4a8b"
        },
        mint: "#1c9a7d",
        amber: "#d99018",
        rose: "#d94b5f"
      },
      boxShadow: {
        panel: "0 18px 60px rgba(15, 23, 42, 0.08)"
      },
      spacing: {
        68: "17rem"
      }
    }
  },
  plugins: []
};

export default config;
