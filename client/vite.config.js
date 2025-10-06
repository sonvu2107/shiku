import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/**
 * Vite configuration cho React client
 * - Sử dụng React plugin
 * - Cấu hình dev server chạy trên port 5173
 * - Host 0.0.0.0 để có thể truy cập từ network
 */
export default defineConfig({
  plugins: [react()], // Plugin hỗ trợ React
  server: {
    port: 5173, // Port cho dev server
    host: '0.0.0.0', // Cho phép truy cập từ mạng ngoài
    strictPort: true, // Fail nếu port đã được sử dụng
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
        secure: false
      }
    }
  }
});
