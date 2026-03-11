/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      colors: {
        primary: {
          50: '#fdf2f8',
          100: '#fce7f3',
          200: '#fbcfe8',
          300: '#f9a8d4',
          400: '#f472b6',
          500: '#ec4899', // Core Lector Magenta/Pink
          600: '#db2777',
          700: '#be185d',
          800: '#9d174d',
          900: '#831843',
        },
        slate: {
          50: '#f4f7fc', // Lector specific soft background
          100: '#f1f5f9',
          200: '#e2e8f0',
          800: '#2b303b', // Lector dark navy for tables
          900: '#1a1d24',
        },
        lector: {
          pink: '#f15bb5',
          purple: '#9b5de5',
          blue: '#00bbf9',
          orange: '#fb5607',
          green: '#00f5d4',
        }
      },
      boxShadow: {
        'soft': '0 10px 40px -10px rgba(0,0,0,0.08)',
        'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.07)',
        'card': '0 4px 20px 0px rgba(0, 0, 0, 0.05)',
      }
    },
  },
  plugins: [],
};
