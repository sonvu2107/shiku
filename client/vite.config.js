import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import viteCompression from "vite-plugin-compression";

/**
 * Vite configuration cho React client
 * - Code splitting tối ưu để giảm unused JavaScript
 * - Lazy load các vendor chunks lớn
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
      // Compression plugin cho production
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

          // Code splitting toi uu - tach vendor thanh nhieu chunks nho
          manualChunks: (id) => {
            if (id.includes('node_modules')) {
              // React core - giu trong main bundle
              if (id.includes('react/jsx-runtime') ||
                id.includes('react/jsx-dev-runtime') ||
                id.includes('node_modules/react/') ||
                id.includes('node_modules/react-dom/')) {
                return undefined;
              }

              // React Router - can ngay cho navigation
              if (id.includes('react-router')) {
                return undefined;
              }

              // TanStack Query - can cho data fetching
              if (id.includes('@tanstack/react-query')) {
                return undefined;
              }

              // Framer Motion - heavy, tach rieng de lazy load
              if (id.includes('framer-motion')) {
                return 'framer-motion';
              }

              // Markdown libs - chi can khi view/edit posts
              if (id.includes('react-markdown') ||
                id.includes('remark') ||
                id.includes('rehype') ||
                id.includes('unified') ||
                id.includes('micromark') ||
                id.includes('mdast') ||
                id.includes('hast')) {
                return 'markdown-vendor';
              }

              // Lucide icons - tach rieng
              if (id.includes('lucide-react')) {
                return 'icons';
              }

              // Date utilities
              if (id.includes('date-fns') || id.includes('dayjs') || id.includes('moment')) {
                return 'date-vendor';
              }

              // Charts/visualization
              if (id.includes('chart') || id.includes('recharts') || id.includes('d3')) {
                return 'charts-vendor';
              }

              // Socket.io
              if (id.includes('socket.io-client')) {
                return 'socket-vendor';
              }

              // Con lai - tach vao vendor chung
              return 'vendor';
            }

            // Source files - tach theo feature
            if (id.includes('/src/contexts/') || id.includes('/src/hooks/')) {
              return undefined;
            }

            if (id.includes('/src/components/Toast')) {
              return undefined;
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

            // Chat components
            if (id.includes('/src/components/chat/') || id.includes('/src/pages/Chat')) {
              return 'chat';
            }

            // Story components
            if (id.includes('Story')) {
              return 'stories';
            }

            // Media components
            if (id.includes('MediaViewer') || id.includes('ImageViewer')) {
              return 'media';
            }

            // Heavy components - lazy load
            if (id.includes('/src/components/')) {
              if (id.includes('CommentSection') || id.includes('MarkdownEditor')) {
                return 'heavy-components';
              }
            }

            // Cultivation system
            if (id.includes('Cultivation') || id.includes('cultivation')) {
              return 'cultivation';
            }
          }
        }
      },
      chunkSizeWarningLimit: 1000,

      // Production optimizations
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