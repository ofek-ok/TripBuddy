/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx,js,jsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: '#172B3A',
          light: '#243F54',
          dark: '#0F1D28',
        },
        ivory: {
          DEFAULT: '#F5F2EB',
          dark: '#EAE5D9',
          light: '#FAF8F5',
        },
        sage: {
          DEFAULT: '#A8B5A0',
          light: '#C2CCBC',
          dark: '#7F9175',
        },
        sand: {
          DEFAULT: '#C49B70',
          light: '#D8B998',
          dark: '#A67C52',
        },
        surface: '#FFFFFF',
      },
      fontFamily: {
        sans: ['Heebo', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      borderRadius: {
        xl: '1rem',
        '2xl': '1.25rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        soft: '0 4px 20px -2px rgba(23, 43, 58, 0.06)',
        card: '0 2px 12px -1px rgba(23, 43, 58, 0.05)',
      },
    },
  },
  plugins: [],
};
