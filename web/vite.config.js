import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': { target: 'http://nova-api:3000', changeOrigin: true, rewrite: (p) => p.replace(/^\/api/, '') },
      '/auth': { target: 'http://nova-api:3000', changeOrigin: true },
      '/admin': { target: 'http://nova-api:3000', changeOrigin: true },
    }
  }
})
