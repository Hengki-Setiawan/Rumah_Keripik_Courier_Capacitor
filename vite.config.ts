import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';
import fs from 'node:fs';

function copyMaplibreWorker(): Plugin {
  return {
    name: 'copy-maplibre-worker',
    closeBundle() {
      const srcDir = path.resolve(__dirname, 'node_modules/maplibre-gl/dist');
      const outDir = path.resolve(__dirname, 'dist/assets');
      for (const file of ['maplibre-gl-worker.mjs', 'maplibre-gl-shared.mjs']) {
        fs.copyFileSync(path.join(srcDir, file), path.join(outDir, file));
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), copyMaplibreWorker()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'firebase/messaging': path.resolve(__dirname, './src/lib/firebase-messaging-stub.ts'),
    },
  },
  server: {
    host: true,
    port: 5173,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
