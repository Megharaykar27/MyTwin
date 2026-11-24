/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: "#16141F", soft: "#5B5870", mute: "#8D8AA0" },
        line: "#ECEAF3",
        canvas: "#FAFAFD",
        lav: { 50: "#F5F3FF", 100: "#EDE9FE", 200: "#DDD6FE", 300: "#C4B5FD", 400: "#A78BFA", 500: "#8B5CF6", 600: "#7C3AED", 700: "#6D28D9" },
        sky2: "#7DD3FC",
        mint2: "#6EE7B7",
        blush: "#F9A8D4",
      },
      fontFamily: {
        sans: ["Inter Variable", "system-ui", "sans-serif"],
        serif: ["Instrument Serif", "Georgia", "serif"],
      },
      boxShadow: { soft: "0 1px 2px rgba(22,20,31,.04), 0 8px 24px -12px rgba(22,20,31,.12)" },
    },
  },
  plugins: [],
};
