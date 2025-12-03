import React, { createContext, useContext, useState, useCallback } from "react";

/**
 * ToastContext - Context for managing toast notifications globally
 */
const ToastContext = createContext(null);

/**
 * ToastProvider - Provider component that wraps the app and manages toast state
 */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((toast) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { ...toast, id }]);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const showSuccess = useCallback((message, duration = 5000) => {
    addToast({ type: "success", message, duration });
  }, [addToast]);

  const showError = useCallback((message, duration = 7000) => {
    addToast({ type: "error", message, duration });
  }, [addToast]);

  const showWarning = useCallback((message, duration = 6000) => {
    addToast({ type: "warning", message, duration });
  }, [addToast]);

  const showInfo = useCallback((message, duration = 5000) => {
    addToast({ type: "info", message, duration });
  }, [addToast]);

  const value = {
    toasts,
    addToast,
    removeToast,
    showSuccess,
    showError,
    showWarning,
    showInfo
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
    </ToastContext.Provider>
  );
}

/**
 * useToast - Hook to access toast context
 * This replaces the old useToast hook from Toast.jsx
 */
export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
}

