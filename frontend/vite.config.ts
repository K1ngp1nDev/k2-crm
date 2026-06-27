import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// Dev server proxies /api to Flask; production build is served by Flask itself.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:5000',
    },
  },
  build: {
    outDir: 'dist',
  },
  test: {
    environment: 'jsdom',
    globals: true,
  },
})
