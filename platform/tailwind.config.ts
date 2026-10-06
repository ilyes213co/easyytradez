import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#06060f",
        accent: "#2540ea",
        sky: "#60a5fa",
        "sky-light": "#93c5fd",
        brand: {
          DEFAULT: "#2540EA",
          royal:   "#2540EA",
          azure:   "#60A5FA",
          sky:     "#93C5FD",
          white:   "#FFFFFF",
          dark:    "#06060F",
          black:   "#000000",
        },
        primary: {
          50:  "#EFF6FF",
          100: "#DBEAFE",
          200: "#BFDBFE",
          300: "#93C5FD",
          400: "#60A5FA",
          500: "#3B82F6",
          600: "#2540EA",
          700: "#1D35C4",
          800: "#1A2CA3",
          900: "#0F1A60",
          950: "#06060F",
        },
        indigo: {
          50:  "#EFF6FF",
          100: "#DBEAFE",
          200: "#BFDBFE",
          300: "#93C5FD",
          400: "#60A5FA",
          500: "#2540EA",
          600: "#1D35C4",
          700: "#1A2CA3",
          800: "#13217A",
          900: "#0F1A60",
          950: "#06060F",
        },
        space: {
          950: "#06060F",
          900: "#0A0B18",
          850: "#0F1126",
          800: "#141733",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      borderRadius: {
        "4xl": "2rem",
      },
      animation: {
        "fade-in": "fadeIn 0.3s ease-in-out",
        "slide-up": "slideUp 0.4s ease-out",
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
