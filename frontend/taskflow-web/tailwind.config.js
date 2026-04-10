const path = require('path');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    path.join(__dirname, 'src/**/*.{html,ts}'),
  ],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#3f51b5',
          50: '#eef1ff',
          100: '#e0e5ff',
          200: '#c2caff',
          300: '#9aa6ff',
          400: '#6f7dff',
          500: '#3f51b5',
          600: '#2f3f8e',
          700: '#243173',
          800: '#1e295e',
          900: '#1b254f'
        },
        accent: {
          DEFAULT: '#ec4899'
        }
      },
      boxShadow: {
        card: '0 1px 2px rgba(0,0,0,.06), 0 6px 12px rgba(0,0,0,.06)'
      }
    }
  },
  plugins: []
}
