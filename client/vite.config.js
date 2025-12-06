import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import viteCompression from "vite-plugin-compression";

/**
 * Vite configuration cho React client
 * - Code splitting an toan - dam bao React load truoc
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

          // Code splitting AN TOAN - giu React va cac thu vien React trong main bundle
          manualChunks: (id) => {
            if (id.includes('node_modules')) {
              // React core + TAT CA thu vien dung React - GIU trong main bundle
              // De tranh loi "Cannot access React before initialization"
              if (id.includes('react') ||
                id.includes('framer-motion') ||
                id.includes('lucide-react') ||
                id.includes('@tanstack')) {
                return undefined; // Giu trong entry chunk
              }

              // Markdown libs - khong dung React truc tiep, co the tach
              if (id.includes('remark') ||
                id.includes('rehype') ||
                id.includes('unified') ||
                id.includes('micromark') ||
                id.includes('mdast') ||
                id.includes('hast') ||
                id.includes('unist')) {
                return 'markdown-vendor';
              }

              // Date utilities - khong dung React
              if (id.includes('date-fns') || id.includes('dayjs') || id.includes('moment')) {
                return 'date-vendor';
              }

              // Socket.io - khong dung React
              if (id.includes('socket.io-client') || id.includes('engine.io')) {
                return 'socket-vendor';
              }

              // Utilities khong lien quan React
              if (id.includes('lodash') || id.includes('axios')) {
                return 'utils-vendor';
              }

              // Con lai - giu trong vendor chung
              return 'vendor';
            }

            // Source files - tach theo feature (chi tach pages, KHONG tach components)
            if (id.includes('/src/contexts/') || id.includes('/src/hooks/')) {
              return undefined;
            }

            if (id.includes('/src/components/')) {
              return undefined; // Giu components trong main bundle
            }

            // Admin pages - lazy load
            if (id.includes('/src/pages/Admin') || id.includes('/src/pages/admin/')) {
              return 'admin';
            }

            // Events pages
            if (id.includes('/src/pages/') && id.includes('Event')) {
              return 'events';
            }

            // Groups pages
            if (id.includes('/src/pages/') && id.includes('Group')) {
              return 'groups';
            }

            // Cultivation system
            if (id.includes('Cultivation')) {
              return 'cultivation';
            }
          }
        }
      },
      chunkSizeWarningLimit: 1000,

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
        treeshake: false,
      } : {
        sourcemap: true,
      })
    }
  };
});