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
      // LISTE COMPLÈTE DES ESPACEMENTS FIBONACCI
      spacing: {
        'fib-8': '8px',
        'fib-13': '13px',
        'fib-21': '21px',
        'fib-34': '34px',
        'fib-55': '55px',
        'fib-89': '89px',
        'fib-144': '144px',
        'fib-233': '233px',
      },
      // On les ajoute aussi pour les tailles de texte au cas où
      fontSize: {
        'fib-21': '21px',
        'fib-34': '34px',
        'fib-55': '55px',
        'fib-89': '89px',
      }
    },
  },
  plugins: [],
}
