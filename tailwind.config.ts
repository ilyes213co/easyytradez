import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["DM Sans", "Inter", "system-ui", "sans-serif"],
      },
      colors: {
        background: "#0a0a0f",
      },
      animation: {
        "in": "fade-in 0.3s ease-out",
      },
    },
  },
  plugins: [],
};

export default config;
