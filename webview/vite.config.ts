import { defineConfig, loadEnv } from 'vite';
import type { UserConfig } from 'vite';
import { resolve } from 'path';

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
  // Load env file based on `mode` in the current working directory
  const env = loadEnv(mode, process.cwd(), '');

  const commonConfig: UserConfig = {
    root: '.',
    base: '/', // Use absolute paths for assets

    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
      },
    },

    optimizeDeps: {
      exclude: ['@eslint', 'eslint'],
      force: true
    },

    build: {
      outDir: 'dist',
      emptyOutDir: true,
      sourcemap: true,
      assetsDir: 'assets',
      rollupOptions: {
        input: {
          splash: resolve(__dirname, 'src/splash.html'),
          main: resolve(__dirname, 'src/main.ts')
        },
        output: {
          entryFileNames: 'assets/[name]-[hash].js',
          chunkFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash].[ext]'
        }
      },
      copyPublicDir: true, // Ensure public directory is copied
    },

    // Move static assets to public directory
    publicDir: 'public',
  };

  // Development specific config
  if (command === 'serve') {
    return {
      ...commonConfig,
      server: {
        port: 3000,
        strictPort: false, // Allow port adjustment if 3000 is in use
        watch: {
          usePolling: true,
          interval: 1000,
          ignored: [
            '**/node_modules/**',
            '**/dist/**',
            '**/.git/**',
            '**/coverage/**',
            '**/.vscode/**',
            '**/.idea/**',
            '**/bin/**',
            '**/*.log',
            'dist/**',
            'dist/assets/**',
            'dist/src/**'
          ]
        },
        fs: {
          strict: false, // Allow serving files from outside the root
          allow: ['public'] // Only allow access to public directory
        },
        cors: true, // Enable CORS
        host: '0.0.0.0', // Listen on all interfaces
        hmr: {
          host: 'localhost',
          port: 3000,
          protocol: 'ws'
        },
        proxy: {
          '/api': {
            target: env.VITE_API_URL || 'http://localhost:8080',
            changeOrigin: true,
            secure: false,
            ws: true // Enable WebSocket support for API
          },
        },
      },
      define: {
        __DEV__: true,
        __APP_ENV__: JSON.stringify(env.APP_ENV || 'development'),
      },
    };
  }

  // Production specific config
  return {
    ...commonConfig,
    build: {
      ...commonConfig.build,
      minify: 'esbuild',
      target: 'es2020',
    },
    define: {
      __DEV__: false,
      __APP_ENV__: JSON.stringify(env.APP_ENV || 'production'),
    },
  };
});
