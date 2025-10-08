/**
 * Cache Headers Middleware
 * Add appropriate cache headers to responses
 */

/**
 * Add cache headers for static/immutable resources
 * @param {number} maxAge - Max age in seconds (default 1 hour)
 */
export function cacheControl(maxAge = 3600) {
  return (req, res, next) => {
    // Only cache GET requests
    if (req.method === 'GET') {
      res.set('Cache-Control', `public, max-age=${maxAge}`);
    }
    next();
  };
}

/**
 * Add cache headers with stale-while-revalidate
 * @param {number} maxAge - Fresh time in seconds
 * @param {number} staleTime - Stale time in seconds
 */
export function staleWhileRevalidate(maxAge = 60, staleTime = 300) {
  return (req, res, next) => {
    if (req.method === 'GET') {
      res.set('Cache-Control', `public, max-age=${maxAge}, stale-while-revalidate=${staleTime}`);
    }
    next();
  };
}

/**
 * No cache for dynamic content
 */
export function noCache(req, res, next) {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
}

/**
 * ETag support for efficient caching
 */
export function etag(req, res, next) {
  const originalSend = res.send;

  res.send = function(data) {
    if (req.method === 'GET' && res.statusCode === 200) {
      const etag = `W/"${Buffer.from(JSON.stringify(data)).toString('base64').slice(0, 27)}"`;
      res.set('ETag', etag);

      // Check if client has the same version
      if (req.headers['if-none-match'] === etag) {
        res.status(304).end();
        return;
      }
    }

    originalSend.call(this, data);
  };

  next();
}

/**
 * Apply appropriate caching based on route type
 */
export function smartCache(req, res, next) {
  const path = req.path;

  // Static resources - long cache
  if (path.match(/\.(jpg|jpeg|png|gif|svg|ico|css|js|woff|woff2|ttf|eot)$/)) {
    return cacheControl(86400 * 30)(req, res, next); // 30 days
  }

  // API endpoints
  if (path.startsWith('/api/')) {
    // User-specific data - no cache
    if (path.includes('/me') || path.includes('/my-')) {
      return noCache(req, res, next);
    }

    // Public data - short cache with revalidation
    if (path.includes('/posts') || path.includes('/users')) {
      return staleWhileRevalidate(60, 300)(req, res, next);
    }

    // Static reference data - longer cache
    if (path.includes('/roles') || path.includes('/categories')) {
      return staleWhileRevalidate(300, 600)(req, res, next);
    }
  }

  // Default - no cache for safety
  next();
}

/**
 * Conditional caching based on auth status
 */
export function authAwareCache(req, res, next) {
  if (req.user) {
    // Logged in users - don't cache to ensure fresh data
    noCache(req, res, next);
  } else {
    // Public users - cache for better performance
    staleWhileRevalidate(60, 300)(req, res, next);
  }
}

export default {
  cacheControl,
  staleWhileRevalidate,
  noCache,
  etag,
  smartCache,
  authAwareCache
};
