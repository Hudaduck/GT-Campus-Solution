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
        // Fixed brand palette
        brand: {
          gold: '#B39051',
          darkGold: '#8F713D',
          navy: '#051E39',
          white: '#FFFFFF',
        },
        // Theme-aware tokens (see src/index.css): bg-tp-surface, text-tp-ink, border-tp-line/50 ...
        tp: {
          canvas: 'rgb(var(--tp-canvas) / <alpha-value>)',
          surface: 'rgb(var(--tp-surface) / <alpha-value>)',
          elevated: 'rgb(var(--tp-elevated) / <alpha-value>)',
          ink: 'rgb(var(--tp-ink) / <alpha-value>)',
          muted: 'rgb(var(--tp-muted) / <alpha-value>)',
          subtle: 'rgb(var(--tp-subtle) / <alpha-value>)',
          accent: 'rgb(var(--tp-accent) / <alpha-value>)',
          line: 'rgb(var(--tp-line) / <alpha-value>)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
