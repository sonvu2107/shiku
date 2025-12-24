// Import React và các dependencies cần thiết
import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
// Lazy load ReactQueryDevtools - chỉ load trong dev mode
let ReactQueryDevtools = null;
if (import.meta.env.DEV) {
  ReactQueryDevtools = React.lazy(() =>
    import("@tanstack/react-query-devtools").then(module => ({
      default: module.ReactQueryDevtools
    }))
  );
}

/**
 * Register Service Worker for caching
 * Only in production mode
 */
function registerServiceWorker() {
  if ('serviceWorker' in navigator && import.meta.env.PROD) {
    window.addEventListener('load', async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
        });

        console.log('[App] Service Worker registered:', registration.scope);

        // Handle updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New version available
                console.log('[App] New Service Worker available');
                // Optionally notify user about update
              }
            });
          }
        });
      } catch (error) {
        console.error('[App] Service Worker registration failed:', error);
      }
    });
  }
}

// Register Service Worker
registerServiceWorker();

// Import component chính và styles
import App from "./App.jsx";
import "./styles.css";
import "./mobile-performance.css";
import { bootstrapAuth } from "./bootstrapAuth.js";

/**
 * Cấu hình React Query Client
 * - staleTime: 5 phút - data được coi là fresh trong 5 phút
 * - cacheTime: 10 phút - data được giữ trong cache 10 phút
 * - refetchOnWindowFocus: false - không refetch khi focus lại window
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 phút
      gcTime: 15 * 60 * 1000, // 15 phút (tăng từ 10 phút để giữ cache lâu hơn)
      refetchOnWindowFocus: false,
      refetchOnReconnect: false, // Không refetch khi reconnect - tránh API calls không cần thiết
      retry: 1,
    },
  },
});

/**
 * Entry point của ứng dụng React
 * Khởi tạo React app với React Router và React Query
 */
bootstrapAuth().finally(() => {
  createRoot(document.getElementById("root")).render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true
        }}
      >
        <App />
      </BrowserRouter>
      {/* DevTools chỉ hiển thị trong development mode - lazy loaded */}
      {import.meta.env.DEV && ReactQueryDevtools && (
        <React.Suspense fallback={null}>
          <ReactQueryDevtools initialIsOpen={false} />
        </React.Suspense>
      )}
    </QueryClientProvider>
  );
});
