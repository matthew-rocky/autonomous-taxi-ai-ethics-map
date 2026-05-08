/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#02040a",
        panel: "rgba(9, 14, 28, 0.72)",
        line: "rgba(255, 255, 255, 0.12)",
      },
      boxShadow: {
        glow: "0 24px 80px rgba(43, 91, 255, 0.18)",
        glass: "0 18px 60px rgba(0, 0, 0, 0.32)",
      },
      keyframes: {
        shimmer: {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(100%)" },
        },
      },
      animation: {
        shimmer: "shimmer 1.8s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
