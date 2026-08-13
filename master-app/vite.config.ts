import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE_PATH ?? '/',
  resolve: {
    // ВАЖНО: .ts/.tsx до .js/.jsx, чтобы при импорте без расширения (`from
    // '@client/pages/MasterCardPage'`) выбиралась TypeScript-версия. В рабочей
    // копии лежат не-tracked legacy-`.js`-файлы (артефакты JS→TS миграции);
    // иначе они резолвятся первыми и ломают локальный build (на Pages их нет).
    extensions: ['.mts', '.ts', '.tsx', '.mjs', '.js', '.jsx', '.json'],
    alias: {
      '@': resolve(__dirname, 'src'),
      '@client': resolve(__dirname, 'src/client'),
      '@vkontakte/vk-bridge': resolve(__dirname, 'src/lib/bridge.ts'),
    },
  },
  server: {
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        telegram: resolve(__dirname, 'telegram.html'),
      },
    },
  },
})
