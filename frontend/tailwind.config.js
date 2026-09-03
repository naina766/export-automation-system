/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: {
          dark: '#0b0f19',
          card: '#131b2e',
          cardSubtle: '#19233c',
          cardHover: '#1f2b48',
          sidebar: '#080c14'
        },
        border: {
          subtle: '#222f4c',
          muted: '#2d3e64'
        },
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8'
        }
      }
    },
  },
  plugins: [],
}
