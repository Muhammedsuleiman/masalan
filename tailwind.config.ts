import type { Config } from 'tailwindcss'

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#faf5f0',
          100: '#f3e6d8',
          200: '#e6cbb0',
          300: '#d6ab83',
          400: '#c5885a',
          500: '#b06f3f',
          600: '#96592f',
          700: '#7a4627',
          800: '#5c3a24',
          900: '#4a3020',
          950: '#271812',
        },
        gold: {
          50: '#fbf8eb',
          100: '#f5eec7',
          200: '#ecdd92',
          300: '#e0c55c',
          400: '#d4af37',
          500: '#c39b2b',
          600: '#a87d21',
          700: '#855e1d',
          800: '#6f4c1e',
          900: '#5e3f1d',
        },
        cream: {
          50: '#fdfcf9',
          100: '#faf7f0',
          200: '#f3ede0',
          300: '#e9dfc9',
          400: '#dccdac',
        },
        ink: {
          DEFAULT: '#3d2c22',
          soft: '#6b584b',
          faint: '#95806f',
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'ui-sans-serif', 'system-ui', 'Segoe UI', 'Roboto', 'Arial', 'sans-serif'],
        display: ['"Fraunces"', 'Georgia', 'serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(61,44,34,0.04), 0 8px 24px rgba(61,44,34,0.06)',
        lift: '0 4px 12px rgba(61,44,34,0.12), 0 12px 32px rgba(61,44,34,0.12)',
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
      animation: {
        fadeUp: 'fadeUp 0.25s ease-out both',
        fadeIn: 'fadeIn 0.2s ease-out both',
      },
    },
  },
  plugins: [],
} satisfies Config
