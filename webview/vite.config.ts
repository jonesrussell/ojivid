import { defineConfig } from 'vite'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  root: 'src',
  base: './',  // Use relative paths for assets
  resolve: {
    alias: {
      '@': resolve(__dirname, './src')
    }
  },
  build: {
    outDir: '../static/dist',
    emptyOutDir: true,
    sourcemap: true,
    assetsDir: 'assets',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'src/index.html'),
        edit: resolve(__dirname, 'src/edit.html'),
        view: resolve(__dirname, 'src/view.html')
      }
    }
  },
  server: {
    port: 3000,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true
      }
    },
    open: true
  }
}) 