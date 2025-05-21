import { defineConfig, loadEnv } from 'vite';
import type { UserConfig, ViteDevServer } from 'vite';
import { resolve } from 'path';
import type { IncomingMessage, ServerResponse } from 'http';
import type { NextHandleFunction } from 'connect';

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
  // Load environment variables based on mode
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
      force: true,
    },

    build: {
      outDir: 'dist',
      emptyOutDir: true,
      sourcemap: true,
      assetsDir: 'assets',
      rollupOptions: {
        input: {
          splash: resolve(__dirname, 'src/splash.html'),
          main: resolve(__dirname, 'src/main.ts'),
        },
        output: {
          entryFileNames: 'assets/[name]-[hash].js',
          chunkFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash].[ext]',
          preserveModules: false,
          preserveModulesRoot: 'src',
        },
      },
      copyPublicDir: true,
    },

    // Static assets should reside in 'public' directory
    publicDir: 'public',
  };

  // Development-specific configuration
  if (command === 'serve') {
    return {
      ...commonConfig,
      server: {
        port: 3000,
        strictPort: false,
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
            'dist/src/**',
          ],
        },
        fs: {
          strict: false,
          allow: ['..'], // Allow serving files from parent directory
        },
        cors: true,
        host: '0.0.0.0',
        hmr: {
          host: 'localhost',
          port: 3000,
          protocol: 'ws',
        },
        proxy: {
          '/api': {
            target: env.VITE_API_URL || 'http://localhost:8080',
            changeOrigin: true,
            secure: false,
            ws: true,
          },
        },
        // Add middleware to log requests
        middlewareMode: false,
        configureServer: (server: ViteDevServer) => {
          server.middlewares.use((req: IncomingMessage, res: ServerResponse, next: NextHandleFunction) => {
            console.log(`[Vite] ${req.method} ${req.url}`);
            next();
          });
        },
      },
      define: {
        __DEV__: true,
        __APP_ENV__: JSON.stringify(env.APP_ENV || 'development'),
      },
    };
  }

  // Production-specific configuration
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
