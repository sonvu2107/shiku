import React from "react";
import { Loader2 } from "lucide-react";
import Loader from "./Loader.jsx";

/**
 * PageLoader - Component show loading state when lazy load pages
 * Used for React.Suspense fallback
 */
export function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-neutral-950">
      <div className="text-center">
        <Loader />
        <p className="text-gray-600 dark:text-gray-400 mt-4">Đang tải trang...</p>
      </div>
    </div>
  );
}

/**
 * ComponentLoader - Smaller loading component for lazy loaded components
 */
export function ComponentLoader({ className = "" }) {
  return (
    <div className={`flex items-center justify-center p-4 ${className}`}>
      <Loader2 className="w-6 h-6 animate-spin text-black dark:text-white" />
    </div>
  );
}

/**
 * LazyErrorBoundary - Error boundary cho lazy loaded components
 */
export class LazyErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Lazy loading error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-neutral-950">
          <div className="text-center max-w-md mx-auto p-6">
            <div className="text-red-500 text-6xl mb-4">⚠️</div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Không thể tải trang
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Đã xảy ra lỗi khi tải nội dung. Vui lòng thử lại.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-black dark:bg-white text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Tải lại trang
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default PageLoader;