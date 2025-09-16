// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  // База для GitHub Pages
  base: '/raspisanie/',
  // Настройки для PWA
  build: {
    assets: 'assets'
  },
  // Включаем поддержку Service Worker
  vite: {
    build: {
      rollupOptions: {
        output: {
          assetFileNames: 'assets/[name].[hash][extname]',
          chunkFileNames: 'assets/[name].[hash].js',
          entryFileNames: 'assets/[name].[hash].js'
        }
      }
    },
    server: {
      hmr: {
        port: 4321,
        host: 'localhost'
      }
    }
  }
});
