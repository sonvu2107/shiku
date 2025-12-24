import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import viteCompression from "vite-plugin-compression";

/**
 * Vite configuration
 */
export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const isProduction = mode === 'production';

  return {
    plugins: [
      react({
        jsxRuntime: 'automatic',
        jsxImportSource: 'react',
      }),
      ...(isProduction ? [
        viteCompression({
          algorithm: 'gzip',
          exclude: [/\.(br)$/, /\.(gz)$/],
          threshold: 1024,
        }),
        viteCompression({
          algorithm: 'brotliCompress',
          exclude: [/\.(br)$/, /\.(gz)$/],
          threshold: 1024,
          ext: '.br',
        }),
      ] : []),
    ],

    resolve: {
      dedupe: ['react', 'react-dom', 'react/jsx-runtime'],
      alias: {
        'react': 'react',
        'react-dom': 'react-dom'
      }
    },

    optimizeDeps: {
      include: ['react', 'react-dom', 'react/jsx-runtime'],
      esbuildOptions: {
        target: 'es2020',
      },
    },

    define: {
      __APP_ENV__: JSON.stringify(mode),
      __API_URL__: JSON.stringify(env.VITE_API_URL || (isProduction ? 'https://api.shiku.click' : 'http://localhost:4000'))
    },

    server: {
      port: 5173,
      host: '0.0.0.0',
      strictPort: true,
      proxy: {
        '/api': {
          target: env.VITE_API_URL || "http://localhost:4000",
          changeOrigin: true,
          secure: false,
          ws: true,
        }
      },
      middlewareMode: false,
      configure: (app) => {
        app.use((req, res, next) => {
          if (req.path.endsWith('.jsx') || req.path.endsWith('.js')) {
            res.setHeader('Content-Type', 'application/javascript');
          }
          next();
        });
      }
    },

    build: {
      assetsDir: 'assets',
      commonjsOptions: {
        include: [/react/, /react-dom/, /node_modules/],
        transformMixedEsModules: true,
      },
      rollupOptions: {
        output: {
          entryFileNames: 'assets/[name]-[hash].js',
          chunkFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash].[ext]',
          format: 'es',

          // Let Vite handle chunking automatically to ensure proper dependency order
          // Manual chunking was causing React to not be available when other chunks load
          // manualChunks: disabled
        }
      },
      chunkSizeWarningLimit: 1500,

      ...(isProduction ? {
        minify: 'terser',
        terserOptions: {
          compress: {
            drop_console: true,
            drop_debugger: true,
            pure_funcs: ['console.log', 'console.info', 'console.debug'],
            passes: 2,
          },
          mangle: {
            safari10: true,
            reserved: ['React', 'ReactDOM', 'createContext', 'useState', 'useEffect', 'useRef'],
          },
        },
        cssCodeSplit: true,
        cssMinify: true,
        sourcemap: false,
        treeshake: true, // Enabled for dead code elimination
      } : {
        sourcemap: true,
      })
    }
  };
});