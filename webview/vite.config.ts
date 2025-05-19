import { defineConfig, loadEnv } from 'vite';
import type { UserConfig } from 'vite';
import { resolve } from 'path';

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
  // Load env file based on `mode` in the current working directory
  const env = loadEnv(mode, process.cwd(), '');

  const commonConfig = {
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
        input: resolve(__dirname, 'src/splash.html')
      },
      copyPublicDir: true, // Ensure public directory is copied
    },

    publicDir: 'src/assets', // Serve static assets from src/assets
  } satisfies UserConfig;

  // Development specific config
  if (command === 'serve') {
    return {
      ...commonConfig,
      server: {
        port: 3000,
        strictPort: true,
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
          strict: true,
          allow: ['src']
        },
        host: true,
        open: true,
        proxy: {
          '/api': {
            target: env.VITE_API_URL || 'http://localhost:8080',
            changeOrigin: true,
          },
        },
      },
      define: {
        __DEV__: true,
        __APP_ENV__: JSON.stringify(env.APP_ENV || 'development'),
      },
    } satisfies UserConfig;
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
  } satisfies UserConfig;
});
