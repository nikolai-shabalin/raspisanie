// @ts-check
import { defineConfig } from 'astro/config';

// Определяем окружение
const isDev = process.env.NODE_ENV === 'development';

// https://astro.build/config
export default defineConfig({
  // Настройки для GitHub Pages
  site: 'https://nikolai-shabalin.github.io',
  // В dev режиме используем корневой путь, в production - /raspisanie
  base: isDev ? '/' : '/raspisanie',
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
