// Tailwind config for the self-contained Delacour tools app.
// Superset of the inline configs that index.html and tool_page.html give the Tailwind CDN.
module.exports = {
  content: ['../app/*.html'],
  theme: {
    extend: {
      colors: {
        delacour: {
          primary: '#1B4D3E',   // Vert Empire
          dark: '#11352A',      // Vert Foncé
          light: '#286854',     // Vert Sage
          gold: '#C5A065',      // Or Métallique
          goldlight: '#DFBF87', // Or Clair
          golddark: '#9E7A3E',  // Or Foncé
          cream: '#FDFBF7',     // Fond Crème
          slate: '#0F172A',
        },
      },
      // System fonts only: no call to Google Fonts (sovereignty, works offline)
      fontFamily: {
        sans: ['system-ui', '-apple-system', '"Segoe UI"', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      },
    },
  },
};
