// Import React và các dependencies cần thiết
import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

// Import component chính và styles
import App from "./App.jsx";
import "./styles.css";
import { bootstrapAuth } from "./bootstrapAuth.js";

/**
 * Entry point của ứng dụng React
 * Khởi tạo React app với React Router
 */
bootstrapAuth().finally(() => {
  createRoot(document.getElementById("root")).render(
    <BrowserRouter>
      <App />
    </BrowserRouter>
  );
});
