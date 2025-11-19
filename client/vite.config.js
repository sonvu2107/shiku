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
      react({
        // Đảm bảo React được transform đúng cách với JSX automatic
        jsxRuntime: 'automatic',
        jsxImportSource: 'react',
      }), // Plugin hỗ trợ React
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
    
    // Đảm bảo React được resolve đúng cách
    resolve: {
      dedupe: ['react', 'react-dom', 'react/jsx-runtime'],
      alias: {
        'react': 'react',
        'react-dom': 'react-dom'
      }
    },
    
    // Optimize dependencies
    optimizeDeps: {
      include: ['react', 'react-dom', 'react/jsx-runtime'],
      esbuildOptions: {
        // Đảm bảo React được bundle đúng cách
        target: 'es2020',
      },
    },
    
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
      // CommonJS options - đảm bảo React được bundle đúng
      commonjsOptions: {
        include: [/react/, /react-dom/, /node_modules/],
        transformMixedEsModules: true,
      },
      // Đảm bảo các file được build với extension chính xác
        rollupOptions: {
        output: {
          // Cấu hình tên file output với extension chính xác
          entryFileNames: 'assets/[name]-[hash].js',
          chunkFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash].[ext]',
          // Đảm bảo React được externalize đúng cách
          format: 'es',
          // Đảm bảo React vendor chunk được preload và load trước
          manualChunks: (id, { getModuleInfo }) => {
            // Node modules - tách riêng các vendor lớn
            if (id.includes('node_modules')) {
              // React core - GIỮ TRONG ENTRY CHUNK để tránh lỗi thứ tự load
              // KHÔNG tách React ra chunk riêng vì có thể gây lỗi createContext
              const isReactCore = 
                id.includes('react/jsx-runtime') || 
                id.includes('react/jsx-dev-runtime') ||
                id.includes('node_modules/react/') || 
                id.includes('node_modules/react-dom/');
              
              // KHÔNG tách React - return undefined để giữ trong main bundle
              if (isReactCore) {
                return undefined; // Giữ React trong entry chunk
              }
              
              // React Router - GIỮ cùng với React trong main bundle
              if (id.includes('react-router')) {
                return undefined; // Giữ trong entry chunk với React
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
            // QUAN TRỌNG: Không tách contexts vào chunk riêng - phải ở cùng với main app
            // Và đảm bảo contexts không phụ thuộc vào React từ chunk khác
            if (id.includes('/src/contexts/')) {
              // Kiểm tra xem context có import React không
              const info = getModuleInfo(id);
              if (info && info.importers) {
                // Nếu context được import bởi entry, giữ nó trong main bundle
                const isImportedByEntry = info.importers.some(importer => 
                  importer.includes('main.jsx') || importer.includes('App.jsx')
                );
                if (isImportedByEntry) {
                  return; // Giữ trong main bundle
                }
              }
              return; // Giữ contexts trong main bundle để đảm bảo React có sẵn
            }
            
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
            passes: 2,
          },
          mangle: {
            safari10: true,
            // Không mangle các tên biến React để tránh lỗi
            reserved: ['React', 'ReactDOM', 'createContext', 'useState', 'useEffect', 'useRef'],
          },
        },
        // Tối ưu CSS
        cssCodeSplit: true,
        cssMinify: true,
        // Source maps chỉ cho production (nhỏ hơn)
        sourcemap: false,
        // TẮT treeshaking cho an toàn với React 19
        // Treeshaking quá aggressive có thể làm mất React.createContext
        treeshake: false,
      } : {
        sourcemap: true, // Source maps cho dev
      })
    }
  };
});