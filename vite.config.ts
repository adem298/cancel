import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    // Allow the sandbox live-preview host (*.e2b.app) in addition to localhost.
    allowedHosts: ['localhost', '.localhost', '.e2b.app'],
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
    strictPort: true,
    allowedHosts: ['localhost', '.localhost', '.e2b.app'],
  },
  build: {
    target: 'es2022',
    sourcemap: true,
    cssCodeSplit: false,
    reportCompressedSize: true,
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.{ts,mjs}'],
  },
});
