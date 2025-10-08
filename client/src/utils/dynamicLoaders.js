/**
 * Dynamic Utils Loader - Tối ưu việc load utilities theo nhu cầu
 * Giúp giảm bundle size bằng cách chỉ load utilities khi cần thiết
 */

// 🌐 Safari-specific utilities (chỉ load trên Safari)
export const loadSafariUtils = async () => {
  if (!navigator.userAgent.includes('Safari') || navigator.userAgent.includes('Chrome')) {
    return null; // Không phải Safari, không cần load
  }
  
  try {
    const [csrfToken, safariSession, safariTest] = await Promise.all([
      import('../utils/csrfToken.js'),
      import('../utils/safariSession.js'), 
      import('../utils/safariTest.js')
    ]);
    
    return {
      csrfToken: csrfToken.default,
      safariSession: safariSession.default,
      safariTest: safariTest.default
    };
  } catch (error) {
    console.warn('Failed to load Safari utilities:', error);
    return null;
  }
};

// 🔄 Cache utilities (chỉ load khi cần cache)
export const loadCacheUtils = async () => {
  try {
    const [userCache, sessionCache] = await Promise.all([
      import('../utils/userCache.js'),
      import('../utils/sessionCache.js').catch(() => null) // Optional
    ]);
    
    return {
      userCache: userCache.default,
      sessionCache: sessionCache?.default
    };
  } catch (error) {
    console.warn('Failed to load cache utilities:', error);
    return null;
  }
};

// 📱 Mobile utilities (chỉ load trên mobile)
export const loadMobileUtils = async () => {
  const isMobile = window.innerWidth <= 768 || /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  
  if (!isMobile) {
    return null; // Không phải mobile, không cần load
  }
  
  try {
    const mobileUtils = await import('../utils/mobileDetection.js').catch(() => null);
    return mobileUtils?.default;
  } catch (error) {
    console.warn('Failed to load mobile utilities:', error);
    return null;
  }
};

// 🎯 Performance utilities (chỉ load khi enable performance monitoring)
export const loadPerformanceUtils = async () => {
  try {
    const performanceUtils = await import('../utils/performance.js').catch(() => null);
    return performanceUtils?.default;
  } catch (error) {
    console.warn('Failed to load performance utilities:', error);
    return null;
  }
};

// 🔐 Auth utilities (chỉ load khi cần authentication)
export const loadAuthUtils = async () => {
  try {
    const [tokenManager, authHelpers] = await Promise.all([
      import('../utils/tokenManager.js'),
      import('../utils/authHelpers.js').catch(() => null) // Optional
    ]);
    
    return {
      tokenManager: tokenManager.default,
      authHelpers: authHelpers?.default
    };
  } catch (error) {
    console.warn('Failed to load auth utilities:', error);
    return null;
  }
};

// 🎨 Theme utilities (chỉ load khi thay đổi theme)
export const loadThemeUtils = async () => {
  try {
    const themeUtils = await import('../utils/themeManager.js').catch(() => null);
    return themeUtils?.default;
  } catch (error) {
    console.warn('Failed to load theme utilities:', error);
    return null;
  }
};

// 📊 Analytics utilities (chỉ load khi enable analytics)
export const loadAnalyticsUtils = async () => {
  try {
    const analyticsUtils = await import('../utils/analytics.js').catch(() => null);
    return analyticsUtils?.default;
  } catch (error) {
    console.warn('Failed to load analytics utilities:', error);
    return null;
  }
};

// 🎵 Media utilities (chỉ load khi upload/xử lý media)
export const loadMediaUtils = async () => {
  try {
    const [imageUtils, videoUtils] = await Promise.all([
      import('../utils/imageProcessing.js').catch(() => null),
      import('../utils/videoProcessing.js').catch(() => null)
    ]);
    
    return {
      imageUtils: imageUtils?.default,
      videoUtils: videoUtils?.default
    };
  } catch (error) {
    console.warn('Failed to load media utilities:', error);
    return null;
  }
};

// 📡 WebSocket utilities (chỉ load khi establish WebSocket connection)
export const loadSocketUtils = async () => {
  try {
    const socketUtils = await import('../utils/socketHelpers.js').catch(() => null);
    return socketUtils?.default;
  } catch (error) {
    console.warn('Failed to load socket utilities:', error);
    return null;
  }
};

// 🛡️ Security utilities (chỉ load khi cần security features)
export const loadSecurityUtils = async () => {
  try {
    const securityUtils = await import('../utils/security.js').catch(() => null);
    return securityUtils?.default;
  } catch (error) {
    console.warn('Failed to load security utilities:', error);
    return null;
  }
};

// 💾 Export tất cả loaders
export default {
  safari: loadSafariUtils,
  cache: loadCacheUtils,
  mobile: loadMobileUtils,
  performance: loadPerformanceUtils,
  auth: loadAuthUtils,
  theme: loadThemeUtils,
  analytics: loadAnalyticsUtils,
  media: loadMediaUtils,
  socket: loadSocketUtils,
  security: loadSecurityUtils
};