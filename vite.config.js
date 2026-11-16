import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  css: {
    preprocessorOptions: {
      scss: {
        // Bootstrap 5.3 still uses Sass imports and deprecated dependency APIs.
        quietDeps: true,
        silenceDeprecations: ['import'],
      },
    },
  },
  // Relative assets work both locally and under /<repository>/ on GitHub Pages.
  base: './',
});
