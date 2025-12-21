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
      // Auto-refresh after 2 seconds instead of showing error
      // This handles cases where server just restarted after deploy
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
