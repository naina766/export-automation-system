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
          secondary: '#080D1D',
          card: '#0F172A',
          elevated: '#141D33',
          border: 'rgba(148, 163, 184, 0.12)',
          text: '#F8FAFC',
          muted: '#94A3B8',
          blue: '#3B82F6',
          blueHover: '#60A5FA',
          cyan: '#06B6D4',
          purple: '#8B5CF6',
          green: '#10B981',
          amber: '#F59E0B',
        },
        background: {
          dark: '#050816',
          card: '#0F172A',
          cardSubtle: '#141D33',
          cardHover: '#18243E',
          sidebar: '#080D1D',
        },
        border: {
          subtle: 'rgba(148, 163, 184, 0.12)',
          muted: 'rgba(148, 163, 184, 0.20)',
        },
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
