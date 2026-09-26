/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#10b981', // emerald-500
          dark: '#059669', // emerald-600
        },
        background: {
          DEFAULT: '#f9fafb', // gray-50
          dark: '#111827', // gray-900
        },
        surface: {
          DEFAULT: '#ffffff',
          dark: '#1f2937', // gray-800
        }
      }
    },
  },
  plugins: [],
}
