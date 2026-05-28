/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        jarvis: {
          bg: "#030712",
          surface: "rgba(255,255,255,0.03)",
          border: "rgba(34,211,238,0.15)",
          cyan: "#22d3ee",
          "cyan-dim": "#06b6d4",
        },
      },
      boxShadow: {
        "cyan-sm": "0 0 10px rgba(34,211,238,0.3)",
        "cyan-md": "0 0 20px rgba(34,211,238,0.4)",
        "cyan-lg": "0 0 40px rgba(34,211,238,0.6)",
        "glass": "inset 0 1px 0 0 rgba(255,255,255,0.05)",
      },
      backgroundImage: {
        "grid-cyan":
          "linear-gradient(rgba(34,211,238,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,0.03) 1px, transparent 1px)",
      },
      backgroundSize: {
        grid: "60px 60px",
      },
      animation: {
        "spin-slow": "spin 8s linear infinite",
        "pulse-ring": "pulse-ring 3s ease-in-out infinite",
        "glow-pulse": "glow-pulse 2s ease-in-out infinite",
        "slide-up": "slide-up 0.4s ease-out",
        "fade-in": "fade-in 0.3s ease-out",
        "stream-dot": "stream-dot 1.2s ease-in-out infinite",
      },
      keyframes: {
        "pulse-ring": {
          "0%, 100%": { opacity: "0.15", transform: "scale(1)" },
          "50%": { opacity: "0.4", transform: "scale(1.03)" },
        },
        "glow-pulse": {
          "0%, 100%": { boxShadow: "0 0 10px rgba(34,211,238,0.3)" },
          "50%": { boxShadow: "0 0 30px rgba(34,211,238,0.7)" },
        },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(12px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "stream-dot": {
          "0%, 80%, 100%": { transform: "scale(0)", opacity: "0" },
          "40%": { transform: "scale(1)", opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};
