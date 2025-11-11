import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import viteCompression from "vite-plugin-compression";

/**
 * Vite configuration cho React client
 * - Sử dụng React plugin
 * - Cấu hình dev server chạy trên port 5173
 * - Host 0.0.0.0 để có thể truy cập từ network
 * - Manual chunks cho code splitting tối ưu
 * - Environment-aware configuration
 * - Compression và optimization plugins
 */
export default defineConfig(({ command, mode }) => {
  // Load environment variables
  const env = loadEnv(mode, process.cwd(), '');
  const isProduction = mode === 'production';
  
  return {
    plugins: [
      react(), // Plugin hỗ trợ React
      // Compression plugin cho production
      ...(isProduction ? [
        viteCompression({
          algorithm: 'gzip',
          exclude: [/\.(br)$/, /\.(gz)$/],
          threshold: 1024, // Chỉ compress file > 1KB
        }),
        viteCompression({
          algorithm: 'brotliCompress',
          exclude: [/\.(br)$/, /\.(gz)$/],
          threshold: 1024,
          ext: '.br',
        }),
      ] : []),
    ],
    
    // Environment variables
    define: {
      __APP_ENV__: JSON.stringify(mode),
      __API_URL__: JSON.stringify(env.VITE_API_URL || (isProduction ? 'https://api.shiku.click' : 'http://localhost:4000'))
    },
    
    server: {
      port: 5173, // Port cho dev server
      host: '0.0.0.0', // Cho phép truy cập từ mạng ngoài
      strictPort: true, // Fail nếu port đã được sử dụng
      proxy: {
        '/api': {
          target: env.VITE_API_URL || "http://localhost:4000",
          changeOrigin: true,
          secure: false,
          ws: true, // Support WebSocket for socket.io
        }
      },
      // Cấu hình MIME types cho dev server
      middlewareMode: false,
      configure: (app) => {
        // Đảm bảo .jsx files được serve với MIME type chính xác
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
      // Đảm bảo các file được build với extension chính xác
      rollupOptions: {
        output: {
          // Cấu hình tên file output với extension chính xác
          entryFileNames: 'assets/[name]-[hash].js',
          chunkFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash].[ext]',
          manualChunks: (id) => {
            // Node modules - tách riêng các vendor lớn
            if (id.includes('node_modules')) {
              // React core
              if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
                return 'react-vendor';
              }
              // React Query
              if (id.includes('@tanstack/react-query')) {
                return 'react-query-vendor';
              }
              // Socket.io - tách riêng vì lớn
              if (id.includes('socket.io-client')) {
                return 'socket-vendor';
              }
              // UI libraries
              if (id.includes('lucide-react')) {
                return 'ui-vendor';
              }
              // Virtual scrolling
              if (id.includes('react-window') || id.includes('react-virtual')) {
                return 'virtual-vendor';
              }
              // Markdown
              if (id.includes('react-markdown')) {
                return 'markdown-vendor';
              }
              // Các vendor khác
              return 'vendor';
            }
            
            // Source files - tách theo feature
            if (id.includes('/src/pages/')) {
              if (id.includes('Admin')) return 'admin';
              if (id.includes('Event')) return 'events';
              if (id.includes('Group')) return 'groups';
            }
            
            if (id.includes('/src/components/')) {
              if (id.includes('chat/')) return 'chat';
              if (id.includes('Story')) return 'stories';
              if (id.includes('Media') || id.includes('Image')) return 'media';
              if (id.includes('Navbar') || id.includes('CommentSection') || id.includes('PostCreator')) {
                return 'heavy-components';
              }
            }
          }
        }
      },
      chunkSizeWarningLimit: 1000, // Tăng limit để giảm warning
      
      // Production optimizations
      ...(isProduction ? {
        minify: 'terser',
        terserOptions: {
          compress: {
            drop_console: true,
            drop_debugger: true,
            pure_funcs: ['console.log', 'console.info', 'console.debug'],
            passes: 2, // Nhiều lần optimize hơn
          },
          mangle: {
            safari10: true,
          },
        },
        // Tối ưu CSS
        cssCodeSplit: true,
        cssMinify: true,
        // Source maps chỉ cho production (nhỏ hơn)
        sourcemap: false,
        // Tối ưu treeshaking
        treeshake: {
          moduleSideEffects: false,
          propertyReadSideEffects: false,
          tryCatchDeoptimization: false,
        },
      } : {
        sourcemap: true, // Source maps cho dev
      })
    }
  };
});