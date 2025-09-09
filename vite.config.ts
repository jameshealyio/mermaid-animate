import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

export default defineConfig({
  plugins: [dts({ insertTypesEntry: true, outDir: 'dist' })],
  build: {
    lib: {
      entry: 'src/lib/index.ts',
      name: 'mermaid-animate',
      fileName: () => 'mermaid-animate.es.js',
      formats: ['es'],
    },
    rollupOptions: {
      external: ['mermaid', 'gsap', 'gsap/all'],
    },
    sourcemap: true,
    target: 'es2020',
    outDir: 'dist',
    emptyOutDir: true,
  },
});

