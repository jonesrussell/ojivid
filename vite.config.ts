import { defineConfig } from 'vite'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  root: 'webview',
  resolve: {
    alias: {
      '@': resolve(__dirname, './webview/src')
    }
  },
  build: {
    outDir: '../static/dist',
    emptyOutDir: true,
    sourcemap: true
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true
      }
    }
  }
}) 