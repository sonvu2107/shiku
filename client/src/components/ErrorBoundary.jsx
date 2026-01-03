import React from 'react';

/**
 * Error Boundary Component
 * Catch and handle JavaScript errors in React component tree
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error) {
    // Update state to render fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log error details
    this.setState({
      error: error,
      errorInfo: errorInfo
    });

    // Silent error handling - errors are shown in UI
    // You can send error to logging service here
    // logErrorToService(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      // In dev mode, show full error details
      if (import.meta.env.DEV) {
        return (
          <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-neutral-900 p-4">
            <div className="max-w-2xl w-full bg-white dark:bg-neutral-800 rounded-lg shadow-lg p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                  <span className="text-red-600 dark:text-red-400 text-xl">⚠️</span>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Có lỗi xảy ra (React)</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Thông tin lỗi chi tiết bên dưới</p>
                </div>
              </div>

              {/* Error message */}
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                <p className="font-mono text-sm text-red-700 dark:text-red-300 break-words">
                  {this.state.error?.toString()}
                </p>
              </div>

              {/* Stack trace */}
              {this.state.errorInfo?.componentStack && (
                <div className="mb-4">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Component Stack:</p>
                  <pre className="p-3 bg-gray-100 dark:bg-neutral-900 rounded-lg text-xs text-gray-600 dark:text-gray-400 overflow-auto max-h-48 whitespace-pre-wrap">
                    {this.state.errorInfo.componentStack}
                  </pre>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => window.location.reload()}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                >
                  Tải lại trang
                </button>
                <button
                  onClick={() => this.setState({ hasError: false, error: null, errorInfo: null })}
                  className="flex-1 px-4 py-2 bg-gray-200 dark:bg-neutral-700 hover:bg-gray-300 dark:hover:bg-neutral-600 text-gray-800 dark:text-white rounded-lg font-medium transition-colors"
                >
                  Thử lại
                </button>
              </div>
            </div>
          </div>
        );
      }

      // In production: Auto-refresh after 2 seconds
      if (!this.state.retrying) {
        this.setState({ retrying: true });
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      }

      // Show minimal loading indicator while retrying
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-neutral-900">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-500 dark:text-gray-400 text-sm">Đang tải lại...</p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
