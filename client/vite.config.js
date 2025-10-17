import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

/**
 * Vite configuration cho React client
 * - Sử dụng React plugin
 * - Cấu hình dev server chạy trên port 5173
 * - Host 0.0.0.0 để có thể truy cập từ network
 * - Manual chunks cho code splitting tối ưu
 * - Environment-aware configuration
 */
export default defineConfig(({ command, mode }) => {
  // Load environment variables
  const env = loadEnv(mode, process.cwd(), '');
  const isProduction = mode === 'production';
  
  return {
    plugins: [react()], // Plugin hỗ trợ React
    
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
          },
        },
      } : {})
    }
  };
});