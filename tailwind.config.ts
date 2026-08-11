import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: 'class',
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        'washi': '#FDFBF7', 
        'ink': '#4A4238', 
        'sakura': '#E8C5C8', 
        'macha': '#C5D4B6', 
        'fuji': '#B6C4D4', 
        'wood': '#D1C6B4',
        'danger': '#E08A8A', 
        'neutral': '#E5E5E5'
      },
      fontFamily: {
        sans: ['"Noto Sans TC"', 'sans-serif'],
        serif: ['"Noto Serif TC"', '"PMingLiU"', 'serif'],
      },
      animation: { 
        'fade-in': 'fadeIn 0.3s ease-out', 
        'slide-up': 'slideUp 0.3s ease-out' 
      },
      keyframes: {
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp: { '0%': { opacity: '0', transform: 'translateY(10px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } }
      }
    },
  },
  plugins: [],
};
export default config;