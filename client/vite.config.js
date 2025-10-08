import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from 'vite-plugin-pwa';
import viteImagemin from 'vite-plugin-imagemin';
import viteCompression from 'vite-plugin-compression';

/**
 * Vite configuration cho React client
 * - Sử dụng React plugin
 * - Cấu hình dev server chạy trên port 5173
 * - Host 0.0.0.0 để có thể truy cập từ network
 * - Manual chunks cho code splitting tối ưu
 * - Image optimization với WebP/AVIF
 * - PWA support với Service Worker
 * - Gzip/Brotli compression
 */
export default defineConfig({
  plugins: [
    react(), // Plugin hỗ trợ React
    
    // 🖼️ IMAGE OPTIMIZATION - Tạm thời tắt để debug
    // viteImagemin({
    //   // PNG optimization
    //   optipng: { optimizationLevel: 7 },
    //   
    //   // JPEG optimization  
    //   mozjpeg: { quality: 85 },
    //   
    //   // SVG optimization
    //   svgo: {
    //     plugins: [
    //       { name: 'removeViewBox', active: false },
    //       { name: 'removeEmptyAttrs', active: false }
    //     ]
    //   },
    //   
    //   // WebP conversion - modern format
    //   webp: { quality: 85 },
    //   
    //   // AVIF conversion - cutting-edge format
    //   avif: { quality: 75 }
    // }),
    
    // 🗜️ COMPRESSION - Gzip và Brotli
    viteCompression({
      algorithm: 'gzip',
      ext: '.gz',
      threshold: 1024 // Chỉ compress files > 1KB
    }),
    viteCompression({
      algorithm: 'brotliCompress', 
      ext: '.br',
      threshold: 1024
    }),
    
    // 📱 PWA - Progressive Web App (TẠM THỜI TẮT ĐỂ DEBUG)
    // VitePWA({
    //   registerType: 'autoUpdate',
    //   workbox: {
    //     // Cache strategies
    //     runtimeCaching: [
    //       {
    //         urlPattern: /^https:\/\/api\./i,
    //         handler: 'NetworkFirst',
    //         options: {
    //           cacheName: 'api-cache',
    //           expiration: {
    //             maxEntries: 100,
    //             maxAgeSeconds: 60 * 60 * 24 // 24 hours
    //           }
    //         }
    //       },
    //       {
    //         urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|avif)$/i,
    //         handler: 'CacheFirst',
    //         options: {
    //           cacheName: 'images-cache',
    //           expiration: {
    //             maxEntries: 200,
    //             maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
    //           }
    //         }
    //       },
    //       {
    //         urlPattern: /\.(?:css|js)$/i,
    //         handler: 'StaleWhileRevalidate',
    //         options: {
    //           cacheName: 'static-resources'
    //         }
    //       }
    //     ]
    //   },
    //   manifest: {
    //     name: 'MyBlog - Social Network',
    //     short_name: 'MyBlog',
    //     description: 'A modern social networking platform',
    //     theme_color: '#3B82F6',
    //     background_color: '#FFFFFF',
    //     display: 'standalone',
    //     icons: [
    //       {
    //         src: '/favicon-192x192.png',
    //         sizes: '192x192',
    //         type: 'image/png'
    //       },
    //       {
    //         src: '/favicon-512x512.png', 
    //         sizes: '512x512',
    //         type: 'image/png'
    //       }
    //     ]
    //   }
    // })
  ],
  server: {
    port: 5173, // Port cho dev server
    host: '0.0.0.0', // Cho phép truy cập từ mạng ngoài
    strictPort: true, // Fail nếu port đã được sử dụng
    proxy: {
      '/api': {
        target: "http://192.168.1.18:4000",  // IP hiện tại của máy tính
        changeOrigin: true,
        secure: false
      }
    }
  },
  build: {
    // 🚀 BUILD OPTIMIZATION
    target: 'esnext', // Modern JS cho performance tốt hơn
    minify: 'terser', // Minification mạnh mẽ
    sourcemap: false, // Tắt sourcemap trong production
    
    // Asset handling - Sửa để xử lý ảnh đúng cách
    assetsDir: 'assets',
    assetsInlineLimit: 1024, // Giảm limit để tránh inline ảnh lớn
    copyPublicDir: true, // Đảm bảo copy public assets
    
    rollupOptions: {
      output: {
        manualChunks: {
          // React core và routing
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          
          // UI libraries
          'ui-vendor': ['lucide-react'],
          
          // Admin pages (ít sử dụng)
          'admin': [
            './src/pages/AdminDashboard.jsx',
            './src/pages/AdminFeedback.jsx', 
            './src/pages/ApiTester.jsx'
          ],
          
          // Event pages
          'events': [
            './src/pages/Events.jsx',
            './src/pages/CreateEvent.jsx',
            './src/pages/EventDetail.jsx',
            './src/pages/EditEvent.jsx'
          ],
          
          // Group pages  
          'groups': [
            './src/pages/Groups.jsx',
            './src/pages/GroupDetail.jsx',
            './src/pages/CreateGroup.jsx'
          ],
          
          // Core utilities
          'utils': [
            './src/utils/tokenManager.js',
            './src/socket.js',
            './src/api.js'
          ],
          
          // Heavy components (>15KB)
          'heavy-components': [
            './src/components/Navbar.jsx',
            './src/components/CommentSection.jsx',
            './src/components/PostCreator.jsx',
            './src/components/ProfileCustomization.jsx',
            './src/components/GroupCreator.jsx',
            './src/components/APIMonitoring.jsx',
            './src/components/CallModal.jsx'
          ],
          
          // Chat components
          'chat': [
            './src/components/ChatPopup.jsx',
            './src/components/chat/ChatHeader.jsx',
            './src/components/chat/MessageList.jsx',
            './src/components/chat/MessageInput.jsx',
            './src/components/chat/ConversationList.jsx',
            './src/components/chat/NewConversationModal.jsx',
            './src/components/chat/GroupSettingsModal.jsx'
          ],
          
          // Media components
          'media': [
            './src/components/MediaViewer.jsx',
            './src/components/MediaUpload.jsx',
            './src/components/ImageUpload.jsx',
            './src/components/LazyImage.jsx'
          ],
          
          // Story components
          'stories': [
            './src/components/Stories.jsx',
            './src/components/StoryViewer.jsx',
            './src/components/StoryCreator.jsx',
            './src/components/StoryAnalytics.jsx'
          ]
        },
        
        // 📦 ASSET NAMING - Consistent naming cho cache busting
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split('.');
          const ext = info[info.length - 1];
          
          // Giữ nguyên tên file cho static assets từ public folder
          if (assetInfo.name.includes('assets/')) {
            return `assets/[name][extname]`;
          }
          
          if (/png|jpe?g|svg|gif|tiff|bmp|ico|webp|avif/i.test(ext)) {
            return `assets/images/[name]-[hash][extname]`;
          }
          if (/woff2?|eot|ttf|otf/i.test(ext)) {
            return `assets/fonts/[name]-[hash][extname]`;
          }
          return `assets/[name]-[hash][extname]`;
        },
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js'
      }
    },
    chunkSizeWarningLimit: 1000 // Tăng limit để giảm warning
  }
});
