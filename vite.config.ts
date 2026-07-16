import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

// base './' + HashRouter: the build runs from any static host or subpath
// (GitHub Pages, local file preview) without server-side rewrite rules.
export default defineConfig({
  plugins: [react()],
  base: './',
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
});
