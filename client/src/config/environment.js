/**
 * Client Environment Configuration
 * Manages environment-specific settings for the React client
 */

// Environment detection
export const isDevelopment = import.meta.env.DEV;
export const isProduction = import.meta.env.PROD;
export const mode = import.meta.env.MODE;

// API Configuration
export const API_CONFIG = {
  // Base URL for API calls
  baseURL: import.meta.env.VITE_API_URL || (isProduction ? 'https://api.shiku.click' : 'http://localhost:4000'),
  
  // WebSocket URL
  wsURL: import.meta.env.VITE_WS_URL || (isProduction ? 'wss://api.shiku.click' : 'ws://localhost:4000'),
  
  // Timeout settings
  timeout: isProduction ? 15000 : 5000, // Longer timeout for Render
  
  // Retry settings
  retryAttempts: isProduction ? 3 : 1,
  retryDelay: 1000
};

// Feature Flags
export const FEATURES = {
  // Development features
  enableDebugMode: isDevelopment,
  enableApiTester: isDevelopment,
  enablePerformanceMonitoring: isDevelopment,
  
  // Production features
  enableAnalytics: isProduction,
  enableErrorReporting: isProduction,
  enableServiceWorker: isProduction,
  
  // Conditional features
  enableChat: true,
  enableStories: true,
  enableGroups: true,
  enableEvents: true,
  enablePolls: true
};

// Security Configuration
export const SECURITY_CONFIG = {
  // Token settings
  tokenRefreshThreshold: 5 * 60 * 1000, // 5 minutes before expiry
  maxTokenRefreshAttempts: 3,
  
  // CSRF settings
  csrfTokenRefreshInterval: 30 * 60 * 1000, // 30 minutes
  
  // Session settings
  sessionTimeout: 24 * 60 * 60 * 1000, // 24 hours
  heartbeatInterval: 60 * 1000, // 1 minute
  
  // Rate limiting
  maxRequestsPerMinute: isProduction ? 60 : 120,
  maxUploadsPerHour: isProduction ? 10 : 50
};

// Performance Configuration
export const PERFORMANCE_CONFIG = {
  // Image optimization
  imageQuality: isProduction ? 85 : 95,
  imageMaxWidth: isProduction ? 1920 : 2560,
  imageMaxHeight: isProduction ? 1080 : 1440,
  
  // Lazy loading
  lazyLoadThreshold: isProduction ? 100 : 200,
  
  // Caching
  cacheMaxAge: isProduction ? 7 * 24 * 60 * 60 * 1000 : 60 * 60 * 1000, // 7 days vs 1 hour
  
  // Bundle optimization
  enableCodeSplitting: true,
  enableTreeShaking: isProduction,
  enableMinification: isProduction
};

// Logging Configuration
export const LOGGING_CONFIG = {
  level: isProduction ? 'error' : 'debug',
  enableConsoleLogging: !isProduction,
  enableRemoteLogging: isProduction,
  maxLogEntries: isProduction ? 100 : 1000
};

// Analytics Configuration (Production only)
export const ANALYTICS_CONFIG = isProduction ? {
  googleAnalyticsId: import.meta.env.VITE_GA_ID,
  enablePageTracking: true,
  enableEventTracking: true,
  enablePerformanceTracking: true
} : null;

// Error Reporting Configuration (Production only)
export const ERROR_REPORTING_CONFIG = isProduction ? {
  enableSentry: !!import.meta.env.VITE_SENTRY_DSN,
  sentryDsn: import.meta.env.VITE_SENTRY_DSN,
  environment: mode,
  release: import.meta.env.VITE_APP_VERSION || '1.0.0'
} : null;

// Development Tools
export const DEV_TOOLS = {
  enableReactDevTools: isDevelopment,
  enableReduxDevTools: isDevelopment,
  enableApiMocking: isDevelopment,
  enableHotReload: isDevelopment
};

// Export all configurations
export default {
  API_CONFIG,
  FEATURES,
  SECURITY_CONFIG,
  PERFORMANCE_CONFIG,
  LOGGING_CONFIG,
  ANALYTICS_CONFIG,
  ERROR_REPORTING_CONFIG,
  DEV_TOOLS,
  isDevelopment,
  isProduction,
  mode
};
