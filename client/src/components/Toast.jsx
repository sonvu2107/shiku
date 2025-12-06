import React, { useState, useEffect } from "react";
import { CheckCircle, XCircle, AlertCircle, Info, X } from "lucide-react";

/**
 * Toast - Component that displays a toast notification
 * Supports types: 'success', 'error', 'warning', 'info'
 */
export default function Toast({ 
  type = "info", 
  message, 
  description,
  duration = 5000, 
  onClose 
}) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        setVisible(false);
        setTimeout(() => onClose?.(), 300); // Wait for animation
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const handleClose = () => {
    setVisible(false);
    setTimeout(() => onClose?.(), 300);
  };

  const getIcon = () => {
    switch (type) {
      case "success":
        return (
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-full h-full">
            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
          </svg>
        );
      case "error":
        return (
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-full h-full">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        );
      case "warning":
        return (
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-full h-full">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
        );
      default:
        return (
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-full h-full">
            <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
          </svg>
        );
    }
  };

  const getIconColor = () => {
    switch (type) {
      case "success":
        return "text-[#2b9875]";
      case "error":
        return "text-[#e74c3c]";
      case "warning":
        return "text-[#f39c12]";
      default:
        return "text-[#3498db]";
    }
  };

  const getTitle = () => {
    switch (type) {
      case "success":
        return "done successfully :)";
      case "error":
        return "error occurred";
      case "warning":
        return "warning";
      default:
        return "information";
    }
  };

  if (!visible) return null;

  return (
    <div className="flex flex-col gap-2 w-full max-w-[calc(100vw-2rem)] sm:w-72 text-[11px] sm:text-xs z-50">
      <div className={`cursor-default flex items-center justify-between w-full min-h-[48px] sm:min-h-[56px] rounded-lg sm:rounded-xl bg-[#232531] px-3 sm:px-[10px] py-2.5 sm:py-0 transform transition-all duration-300 ease-out ${
        visible ? "translate-x-0 opacity-100 scale-100" : "translate-x-full opacity-0 scale-95"
      }`}>
        <div className="flex gap-2 sm:gap-2 flex-1 min-w-0">
          <div className={`${getIconColor()} bg-white/5 backdrop-blur-xl p-1.5 sm:p-1 rounded-lg flex-shrink-0 flex items-center justify-center`}>
            <div className="w-4 h-4 sm:w-6 sm:h-6 flex items-center justify-center">
              {getIcon()}
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-medium text-xs sm:text-sm leading-tight truncate sm:whitespace-normal">{message || getTitle()}</p>
            {description && (
              <p className="text-gray-500 text-[10px] sm:text-xs mt-0.5 line-clamp-1 sm:line-clamp-none">{description}</p>
            )}
          </div>
        </div>
        <button 
          onClick={handleClose}
          className="text-gray-600 hover:bg-white/5 p-1.5 sm:p-1 rounded-md transition-colors ease-linear flex-shrink-0 ml-2"
          aria-label="Đóng"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4 sm:w-6 sm:h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}

/**
 * ToastContainer - Container that manages multiple toast notifications
 */
export function ToastContainer({ toasts, onRemove }) {
  if (!toasts || toasts.length === 0) return null;
  
  return (
    <div className="fixed bottom-4 left-4 right-4 sm:bottom-auto sm:top-4 sm:left-auto sm:right-4 z-[9999] space-y-2 pointer-events-none max-w-sm sm:max-w-sm w-auto sm:w-auto pb-safe sm:pb-0">
      {toasts.map((toast, index) => (
        <div key={toast.id} className="pointer-events-auto" style={{ marginTop: index > 0 ? '0.5rem' : '0' }}>
          <Toast
            type={toast.type}
            message={toast.message}
            description={toast.description}
            duration={toast.duration}
            onClose={() => onRemove(toast.id)}
          />
        </div>
      ))}
    </div>
  );
}

/**
 * useToast - Hook to manage toast notifications (add/remove helpers)
 */
export function useToast() {
  const [toasts, setToasts] = useState([]);

  const addToast = (toast) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { ...toast, id }]);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const showSuccess = (message, duration = 5000) => {
    addToast({ type: "success", message, duration });
  };

  const showError = (message, duration = 7000) => {
    addToast({ type: "error", message, duration });
  };

  const showWarning = (message, duration = 6000) => {
    addToast({ type: "warning", message, duration });
  };

  const showInfo = (message, duration = 5000) => {
    addToast({ type: "info", message, duration });
  };

  return {
    toasts,
    addToast,
    removeToast,
    showSuccess,
    showError,
    showWarning,
    showInfo
  };
}
