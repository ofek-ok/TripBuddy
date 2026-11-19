/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx,js,jsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: '#3B1028',
          light: '#5E1D42',
          dark: '#240818',
        },
        ivory: {
          DEFAULT: '#FFF7FA',
          dark: '#FDEAF1',
          light: '#FFFBFC',
        },
        sage: {
          DEFAULT: '#F2A2B8',
          light: '#FBD4E0',
          dark: '#9D2859',
        },
        sand: {
          DEFAULT: '#E84C88',
          light: '#F78CB4',
          dark: '#C22B67',
        },
        surface: '#FFFFFF',
      },
      fontFamily: {
        sans: ['Rubik', 'Plus Jakarta Sans', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Fredoka', 'Rubik', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        xl: '1rem',
        '2xl': '1.35rem',
        '3xl': '1.75rem',
      },
      boxShadow: {
        soft: '0 6px 24px -4px rgba(194, 43, 103, 0.10)',
        card: '0 3px 14px -2px rgba(59, 16, 40, 0.06)',
      },
    },
  },
  plugins: [],
};
