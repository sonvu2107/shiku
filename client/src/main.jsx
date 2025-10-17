// Import React và các dependencies cần thiết
import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

// Import component chính và styles
import App from "./App.jsx";
import "./styles.css";
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
      gcTime: 10 * 60 * 1000, // 10 phút (cacheTime đổi tên thành gcTime trong v5)
      refetchOnWindowFocus: false,
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
      <BrowserRouter>
        <App />
      </BrowserRouter>
      {/* DevTools chỉ hiển thị trong development mode */}
      {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
});
