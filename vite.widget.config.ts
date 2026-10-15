import { defineConfig } from 'vite';

/**
 * Builds the embeddable widget as a single self-contained IIFE script.
 * Output goes to public/widget/stopbill.js (served at /widget/stopbill.js in dev,
 * and copied into dist/ by the main build). In production, upload the same file to the CDN.
 */
export default defineConfig({
  publicDir: false,
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
  build: {
    target: 'es2020',
    outDir: 'public/widget',
    emptyOutDir: true,
    sourcemap: true,
    lib: {
      entry: 'src/widget/entry.tsx',
      name: 'Stopbill',
      formats: ['iife'],
      fileName: () => 'stopbill.js',
    },
  },
});
