import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';
import type { Plugin } from 'vite';

// Production only: nothing may leave the page (scripts/styles are inlined, network requests are blocked).
// Not applied in dev, where Vite serves modules and hot reload over the network.
const CSP = "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; " +
  "font-src data:; connect-src 'none'; frame-src 'none'; form-action 'none'; base-uri 'none'";
const cspPlugin = (): Plugin => ({
  name: 'delacour-csp',
  apply: 'build',
  transformIndexHtml: html => html.replace('<head>', `<head>\n  <meta http-equiv="Content-Security-Policy" content="${CSP}">`),
});

// One self-contained HTML file: all JS and CSS inlined, no external request.
export default defineConfig({
  plugins: [react(), viteSingleFile(), cspPlugin()],
  base: './',
  build: { outDir: 'dist', assetsInlineLimit: 100000000, cssCodeSplit: false },
  test: { environment: 'node' },
});
