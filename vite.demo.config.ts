import { defineConfig } from 'vite';

// Demo/site build (app mode). Emits to site/ with relative paths for GitHub Pages.
export default defineConfig({
  base: './',
  build: {
    outDir: 'site',
    emptyOutDir: true,
    sourcemap: true,
    rollupOptions: {
      input: 'index.html',
    },
  },
});

