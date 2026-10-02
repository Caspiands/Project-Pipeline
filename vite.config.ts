import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// 5917 is deliberately uncommon so the dev server does not clash with other local tools.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: {
    port: 5917,
    strictPort: true,
    host: '127.0.0.1',
    // Cloud desktop browsers often reach only the Vite port; Kong stays on 54321 locally.
    proxy: {
      '/auth': { target: 'http://127.0.0.1:54321', changeOrigin: true },
      '/rest': { target: 'http://127.0.0.1:54321', changeOrigin: true },
      '/realtime': { target: 'http://127.0.0.1:54321', changeOrigin: true, ws: true },
      '/functions': { target: 'http://127.0.0.1:54321', changeOrigin: true },
    },
  },
  preview: { port: 5917, strictPort: true, host: '127.0.0.1' },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
})
