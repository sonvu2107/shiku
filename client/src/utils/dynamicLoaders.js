/**
 * Dynamic utility loaders to keep the initial bundle size small.
 * Each loader returns the requested module only when it is needed.
 */

export const loadCacheUtils = async () => {
  try {
    const [userCache, sessionCache] = await Promise.all([
      import("../utils/userCache.js"),
      import("../utils/sessionCache.js").catch(() => null)
    ]);

    return {
      userCache: userCache.default,
      sessionCache: sessionCache?.default
    };
  } catch (error) {
    console.warn("Failed to load cache utilities:", error);
    return null;
  }
};

export const loadPerformanceUtils = async () => {
  try {
    const performanceUtils = await import("../utils/performance.js").catch(() => null);
    return performanceUtils?.default;
  } catch (error) {
    console.warn("Failed to load performance utilities:", error);
    return null;
  }
};

export const loadAuthUtils = async () => {
  try {
    const [tokenManager, authHelpers] = await Promise.all([
      import("../utils/tokenManager.js"),
      import("../utils/authHelpers.js").catch(() => null)
    ]);

    return {
      tokenManager: tokenManager.default,
      authHelpers: authHelpers?.default
    };
  } catch (error) {
    console.warn("Failed to load auth utilities:", error);
    return null;
  }
};

export const loadThemeUtils = async () => {
  try {
    const themeUtils = await import("../utils/themeManager.js").catch(() => null);
    return themeUtils?.default;
  } catch (error) {
    console.warn("Failed to load theme utilities:", error);
    return null;
  }
};

export const loadAnalyticsUtils = async () => {
  try {
    const analyticsUtils = await import("../utils/analytics.js").catch(() => null);
    return analyticsUtils?.default;
  } catch (error) {
    console.warn("Failed to load analytics utilities:", error);
    return null;
  }
};

export const loadMediaUtils = async () => {
  try {
    const [imageUtils, videoUtils] = await Promise.all([
      import("../utils/imageProcessing.js").catch(() => null),
      import("../utils/videoProcessing.js").catch(() => null)
    ]);

    return {
      imageUtils: imageUtils?.default,
      videoUtils: videoUtils?.default
    };
  } catch (error) {
    console.warn("Failed to load media utilities:", error);
    return null;
  }
};

export const loadSocketUtils = async () => {
  try {
    const socketUtils = await import("../utils/socketHelpers.js").catch(() => null);
    return socketUtils?.default;
  } catch (error) {
    console.warn("Failed to load socket utilities:", error);
    return null;
  }
};

export const loadSecurityUtils = async () => {
  try {
    const securityUtils = await import("../utils/security.js").catch(() => null);
    return securityUtils?.default;
  } catch (error) {
    console.warn("Failed to load security utilities:", error);
    return null;
  }
};

export default {
  cache: loadCacheUtils,
  performance: loadPerformanceUtils,
  auth: loadAuthUtils,
  theme: loadThemeUtils,
  analytics: loadAnalyticsUtils,
  media: loadMediaUtils,
  socket: loadSocketUtils,
  security: loadSecurityUtils
};
