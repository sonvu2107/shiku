import { useState, useEffect } from "react";
import { CheckCircle, XCircle, AlertCircle, Info, X } from "lucide-react";

/**
 * Toast - Component that displays a toast notification
 * Supports types: 'success', 'error', 'warning', 'info'
 */
export default function Toast({ 
  type = "info", 
  message, 
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
        return <CheckCircle size={20} className="text-green-600" />;
      case "error":
        return <XCircle size={20} className="text-red-600" />;
      case "warning":
        return <AlertCircle size={20} className="text-yellow-600" />;
      default:
        return <Info size={20} className="text-blue-600" />;
    }
  };

  const getStyles = () => {
    switch (type) {
      case "success":
        return "bg-green-50 border-green-200 text-green-800";
      case "error":
        return "bg-red-50 border-red-200 text-red-800";
      case "warning":
        return "bg-yellow-50 border-yellow-200 text-yellow-800";
      default:
        return "bg-blue-50 border-blue-200 text-blue-800";
    }
  };

  if (!visible) return null;

  return (
    <div
      className={`w-full max-w-sm bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg shadow-2xl transform transition-all duration-300 ${
        visible ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"
      }`}
    >
      <div className={`p-4 border-l-4 ${getStyles()}`}>
        <div className="flex items-start">
          <div className="flex-shrink-0">
            {getIcon()}
          </div>
          <div className="ml-3 flex-1 min-w-0">
            <p className="text-sm font-medium break-words dark:text-neutral-200">{message}</p>
          </div>
          <div className="ml-4 flex-shrink-0">
            <button
              onClick={handleClose}
              className="inline-flex text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 focus:outline-none touch-manipulation min-w-[32px] min-h-[32px] items-center justify-center"
            >
              <X size={16} />
            </button>
          </div>
        </div>
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
    <div className="fixed top-4 right-4 z-[9999] space-y-2 pointer-events-none max-w-sm w-[calc(100vw-2rem)] sm:w-full">
      {toasts.map((toast, index) => (
        <div key={toast.id} className="pointer-events-auto" style={{ marginTop: index > 0 ? '0.5rem' : '0' }}>
          <Toast
            type={toast.type}
            message={toast.message}
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
