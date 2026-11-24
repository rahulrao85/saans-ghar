import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/** Relative base so the app works at a sub-path (e.g. example.com/app/) or a domain root. */
export default defineConfig({
  base: './',
  plugins: [react()],
  build: { target: 'es2022', outDir: 'dist/public', emptyOutDir: true, sourcemap: false },
  server: { proxy: { '/api': 'http://localhost:8787' } },
});
