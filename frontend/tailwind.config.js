/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        dark: {
          950: '#070a12',
          900: '#0c1220',
          850: '#11192e',
          800: '#17223b',
          700: '#233252',
          600: '#33476e',
        },
        risk: {
          low: '#10b981',      // Emerald
          medium: '#f59e0b',   // Amber
          high: '#ef4444',     // Red
          critical: '#dc2626', // Crimson
        },
        brand: {
          cyan: '#06b6d4',
          blue: '#3b82f6',
          indigo: '#6366f1',
        }
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
}
