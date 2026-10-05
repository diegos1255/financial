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
      keyframes: {
        'slide-down': {
          from: { opacity: '0', transform: 'translateY(-6px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        // Pulo curto e depois parada: com atrasos escalonados vira a "cobrinha" de pontos.
        'dot-hop': {
          '0%, 45%, 100%': { transform: 'translateY(0)' },
          '15%': { transform: 'translateY(-7px)' },
          '30%': { transform: 'translateY(0)' },
        },
      },
      animation: {
        'slide-down': 'slide-down 180ms ease-out',
        // `both`: o card fica invisivel durante o atraso da cascata (WORK-34).
        'fade-up': 'fade-up 600ms ease-out both',
        'dot-hop': 'dot-hop 1.2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
