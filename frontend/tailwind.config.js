/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          bg: '#050816',
          surface: '#0B1220',
          card: '#111827',
          elevated: '#1E293B',
          border: '#1E293B',
          text: '#F8FAFC',
          muted: '#94A3B8',
          purple: '#7C3AED',
          cyan: '#06B6D4',
          green: '#10B981',
          amber: '#F59E0B',
          rose: '#EF4444'
        },
        background: {
          dark: '#050816',
          surface: '#0B1220',
          card: '#111827',
          cardSubtle: '#1E293B',
          cardHover: '#1F2937',
          sidebar: '#0B1220',
        },
        border: {
          subtle: '#1E293B',
          muted: '#334155',
        },
        primary: {
          50: '#f5f3ff',
          100: '#ede9fe',
          200: '#ddd6fe',
          400: '#a78bfa',
          500: '#8b5cf6',
          600: '#7c3aed',
          700: '#6d28d9',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
