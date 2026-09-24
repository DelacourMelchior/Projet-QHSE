/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        delacour: {
          primary: '#1B4D3E', dark: '#11352A', light: '#286854',
          gold: '#C5A065', goldlight: '#DFBF87', golddark: '#9E7A3E', cream: '#FDFBF7',
        },
      },
      fontFamily: {
        sans: ['system-ui', '-apple-system', '"Segoe UI"', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      },
    },
  },
};
