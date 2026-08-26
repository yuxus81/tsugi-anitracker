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
  build: {
    rollupOptions: {
      output: {
        // Bibliotheken, die sich praktisch nie ändern, in eigene Dateien —
        // so muss ein App-Update nicht den kompletten Brocken neu ausliefern,
        // und der Browser behält React/Supabase über Deploys hinweg im Cache.
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          data: ['@tanstack/react-query', '@supabase/supabase-js'],
        },
      },
    },
  },
});
