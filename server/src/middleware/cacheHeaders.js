/**
 * Cache Headers Middleware
 * 
 * Middleware thêm các header cache phù hợp vào phản hồi.
 * Hỗ trợ nhiều chiến lược cache: static, stale-while-revalidate, ETag, smart cache.
 * 
 * @module cacheHeaders
 */

/**
 * Thêm header cache cho tài nguyên tĩnh/không thay đổi
 * @param {number} maxAge - Thời gian tối đa (giây) (mặc định 1 giờ)
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
 * Thêm header cache với `stale-while-revalidate`
 * @param {number} maxAge - Thời gian tươi (giây)
 * @param {number} staleTime - Thời gian stale (giây)
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
 * Không cache cho nội dung động
 */
export function noCache(req, res, next) {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
}

/**
 * Hỗ trợ ETag để cache hiệu quả hơn
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
 * Áp dụng chính sách cache phù hợp dựa trên loại route
 */
export function smartCache(req, res, next) {
  const path = req.path;

  // Tài nguyên tĩnh - cache dài hạn
  if (path.match(/\.(jpg|jpeg|png|gif|svg|ico|css|js|woff|woff2|ttf|eot)$/)) {
    return cacheControl(86400 * 30)(req, res, next); // 30 days
  }

  // Các endpoint API
  if (path.startsWith('/api/')) {
    // Dữ liệu theo người dùng - không cache
    if (path.includes('/me') || path.includes('/my-')) {
      return noCache(req, res, next);
    }

    // Dữ liệu công khai - cache ngắn có revalidation
    if (path.includes('/posts') || path.includes('/users')) {
      return staleWhileRevalidate(60, 300)(req, res, next);
    }

    // Dữ liệu tham chiếu tĩnh - cache dài hơn
    if (path.includes('/roles') || path.includes('/categories')) {
      return staleWhileRevalidate(300, 600)(req, res, next);
    }
  }

  // Mặc định - không cache để an toàn
  next();
}

/**
 * Cache có điều kiện dựa trên trạng thái xác thực
 */
export function authAwareCache(req, res, next) {
  if (req.user) {
    // Người dùng đã đăng nhập - không cache để đảm bảo dữ liệu luôn mới
    noCache(req, res, next);
  } else {
    // Người dùng công khai - cache để cải thiện hiệu năng
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
