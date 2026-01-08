/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'sb-green-dark': '#152822',
        'sb-green-light': '#4A6C5C',
        'sb-beige': '#F0EAD6',
        'sb-cream': '#F9F9F7',
        'sb-black': '#0A1210',
        'sb-accent': '#E2DCCC'
      },
      fontFamily: {
        sans: ['Montserrat', 'sans-serif'],
        serif: ['Playfair Display', 'serif'],
      },
      spacing: {
        'fib-89': '89px',
        'fib-144': '144px',
      },
      fontSize: {
        'meta': '14px',
        'xs': '14px',
        'sm': '16px',
        'base': '18px',
        'body': '21px',
        'h3-card': '24px',
        'subtitle': '34px',
        'title': '55px',
        'hero-mobile': '55px',
        'hero': '89px',
      },
      lineHeight: {
        'phi': '1.618',
        'loose': '1.75',
        'tight-math': '1.1',
      }
    },
  },
  plugins: [],
}
