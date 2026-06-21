/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: '#f8fafc',      // slate-50 — fundo principal
          surface: '#ffffff',       // cards, sidebar, topbar
          elevated: '#f1f5f9',      // slate-100 — hover states
        },
        accent: {
          DEFAULT: '#4f46e5',       // indigo-600
          hover: '#4338ca',         // indigo-700
          soft: '#eef2ff',          // indigo-50 — fundo dos items ativos
        },
      },
      boxShadow: {
        soft: '0 1px 3px 0 rgb(0 0 0 / 0.04), 0 1px 2px -1px rgb(0 0 0 / 0.04)',
      },
    },
  },
  plugins: [],
}
