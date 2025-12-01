/**
 * Progressive Rate Limiting Middleware
 * 
 * Giới hạn tốc độ đăng nhập với exponential backoff.
 * Tăng thời gian chờ theo cấp số nhân khi có nhiều lần thất bại liên tiếp.
 * 
 * Tính năng:
 * - Exponential backoff: 1s → 2s → 4s → 8s → ... → tối đa 30 phút
 * - Theo dõi theo IP
 * - Tự động reset khi đăng nhập thành công
 * - Yêu cầu CAPTCHA sau N lần thất bại (có thể cấu hình)
 */

// ============================================================
// CẤU HÌNH
// ============================================================

const config = {
  initialLockoutMs: 1000,              // Thời gian lockout ban đầu (1 giây)
  maxLockoutMs: 30 * 60 * 1000,       // Thời gian lockout tối đa (30 phút)
  backoffMultiplier: 2,                // Hệ số nhân cho exponential backoff
  captchaThreshold: 5,                 // Số lần thất bại trước khi yêu cầu CAPTCHA
  failureWindowMs: 60 * 60 * 1000,    // Cửa sổ thời gian theo dõi (1 giờ)
  maxFailuresInWindow: 20,             // Số lần thất bại tối đa trước khi lockout vĩnh viễn
  cleanupIntervalMs: 5 * 60 * 1000    // Khoảng thời gian dọn dẹp (5 phút)
};

// ============================================================
// LƯU TRỮ TRONG RAM
// ============================================================

// Theo dõi các lần thất bại theo IP
const failedAttempts = new Map();

// ============================================================
// HÀM CỐT LÕI
// ============================================================

/**
 * Tính thời gian lockout dựa trên số lần thất bại
 * @param {number} attempts - Số lần thất bại
 * @returns {number} Thời gian lockout (milliseconds)
 */
function calculateLockoutDuration(attempts) {
  if (attempts <= 0) return 0;
  
  // Exponential backoff: initialLockout * (multiplier ^ (attempts - 1))
  const duration = config.initialLockoutMs * Math.pow(config.backoffMultiplier, attempts - 1);
  
  return Math.min(duration, config.maxLockoutMs);
}

/**
 * Lấy hoặc tạo entry theo dõi cho IP
 */
function getTrackingEntry(ip) {
  if (!failedAttempts.has(ip)) {
    failedAttempts.set(ip, {
      attempts: 0,
      lastAttempt: null,
      lockoutUntil: null,
      failures: []
    });
  }
  return failedAttempts.get(ip);
}

/**
 * Ghi nhận một lần đăng nhập thất bại
 * @param {string} ip - IP của client
 * @returns {Object} Trạng thái sau khi ghi nhận
 */
export function recordFailedAttempt(ip) {
  const entry = getTrackingEntry(ip);
  const now = Date.now();
  
  // Xóa các lần thất bại cũ ngoài cửa sổ thời gian
  entry.failures = entry.failures.filter(
    time => now - time < config.failureWindowMs
  );
  
  entry.failures.push(now);
  entry.attempts++;
  entry.lastAttempt = new Date();
  
  const lockoutDuration = calculateLockoutDuration(entry.attempts);
  entry.lockoutUntil = new Date(now + lockoutDuration);
  
  failedAttempts.set(ip, entry);
  
  const requiresCaptcha = config.captchaThreshold > 0 && 
                          entry.attempts >= config.captchaThreshold;
  
  const isPermanentlyLocked = entry.failures.length >= config.maxFailuresInWindow;
  
  return {
    attempts: entry.attempts,
    lockoutDuration,
    lockoutUntil: entry.lockoutUntil,
    requiresCaptcha,
    isPermanentlyLocked,
    failuresInWindow: entry.failures.length
  };
}

/**
 * Reset các lần thất bại cho IP (gọi khi đăng nhập thành công)
 */
export function resetFailedAttempts(ip) {
  failedAttempts.delete(ip);
}

/**
 * Kiểm tra IP có đang bị lockout không
 * @param {string} ip - IP của client
 * @returns {Object} Trạng thái lockout
 */
export function checkLockoutStatus(ip) {
  const entry = failedAttempts.get(ip);
  
  if (!entry) {
    return {
      isLockedOut: false,
      lockoutRemaining: 0,
      attempts: 0,
      requiresCaptcha: false
    };
  }
  
  const now = Date.now();
  
  entry.failures = entry.failures.filter(
    time => now - time < config.failureWindowMs
  );
  
  // Kiểm tra lockout vĩnh viễn
  if (entry.failures.length >= config.maxFailuresInWindow) {
    return {
      isLockedOut: true,
      lockoutRemaining: config.failureWindowMs,
      attempts: entry.attempts,
      requiresCaptcha: true,
      isPermanentlyLocked: true,
      message: "Quá nhiều lần đăng nhập thất bại. Vui lòng thử lại sau 1 giờ."
    };
  }
  
  // Kiểm tra lockout tạm thời
  if (entry.lockoutUntil && entry.lockoutUntil.getTime() > now) {
    const remaining = entry.lockoutUntil.getTime() - now;
    return {
      isLockedOut: true,
      lockoutRemaining: remaining,
      attempts: entry.attempts,
      requiresCaptcha: config.captchaThreshold > 0 && 
                       entry.attempts >= config.captchaThreshold
    };
  }
  
  return {
    isLockedOut: false,
    lockoutRemaining: 0,
    attempts: entry.attempts,
    requiresCaptcha: config.captchaThreshold > 0 && 
                     entry.attempts >= config.captchaThreshold
  };
}

/**
 * Lấy thống kê cho monitoring
 */
export function getProgressiveRateLimitStats() {
  const now = Date.now();
  let lockedOut = 0;
  let total = failedAttempts.size;
  
  for (const [, entry] of failedAttempts.entries()) {
    if (entry.lockoutUntil && entry.lockoutUntil.getTime() > now) {
      lockedOut++;
    }
  }
  
  return {
    totalTrackedIPs: total,
    currentlyLockedOut: lockedOut,
    captchaThreshold: config.captchaThreshold,
    maxLockoutMinutes: config.maxLockoutMs / 60000
  };
}

// ============================================================
// EXPRESS MIDDLEWARE
// ============================================================

/**
 * Middleware giới hạn tốc độ đăng nhập với exponential backoff
 * Kiểm tra trạng thái lockout trước khi cho phép request tiếp tục
 */
export function progressiveAuthRateLimit(req, res, next) {
  const ip = getClientIP(req);
  const status = checkLockoutStatus(ip);
  
  if (status.isLockedOut) {
    const retryAfter = Math.ceil(status.lockoutRemaining / 1000);
    
    res.setHeader('Retry-After', retryAfter);
    res.setHeader('X-RateLimit-Reset', new Date(Date.now() + status.lockoutRemaining).toISOString());
    
    const response = {
      error: status.isPermanentlyLocked 
        ? "Quá nhiều lần đăng nhập thất bại. Vui lòng thử lại sau 1 giờ."
        : `Vui lòng chờ ${retryAfter} giây trước khi thử lại`,
      code: "RATE_LIMITED",
      retryAfter,
      attempts: status.attempts
    };
    
    if (status.requiresCaptcha) {
      response.requiresCaptcha = true;
      response.message = "Bạn cần giải CAPTCHA để tiếp tục";
    }
    
    return res.status(429).json(response);
  }
  
  // Đặt flag yêu cầu CAPTCHA nếu đã đạt ngưỡng
  if (status.requiresCaptcha) {
    req.captchaRequired = true;
    console.log(`[ProgressiveRateLimit] IP ${ip} yêu cầu CAPTCHA (attempts: ${status.attempts})`);
  }
  
  // Gắn các hàm helper vào req để route handler sử dụng
  req.recordAuthFailure = () => {
    const result = recordFailedAttempt(ip);
    console.log(`[ProgressiveRateLimit] Đã ghi nhận thất bại cho IP ${ip}:`, {
      attempts: result.attempts,
      requiresCaptcha: result.requiresCaptcha,
      lockoutDuration: result.lockoutDuration
    });
    return result;
  };
  req.resetAuthFailures = () => resetFailedAttempts(ip);
  
  next();
}

/**
 * Lấy IP của client, xử lý proxy
 */
function getClientIP(req) {
  const forwardedFor = req.get('X-Forwarded-For');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }
  
  const realIP = req.get('X-Real-IP');
  if (realIP) {
    return realIP;
  }
  
  return req.ip || 'unknown';
}

// ============================================================
// DỌN DẸP
// ============================================================

let cleanupInterval = null;

function startCleanup() {
  if (cleanupInterval) return;
  
  cleanupInterval = setInterval(() => {
    const now = Date.now();
    
    for (const [ip, entry] of failedAttempts.entries()) {
      entry.failures = entry.failures.filter(
        time => now - time < config.failureWindowMs
      );
      
      if (entry.failures.length === 0 && 
          (!entry.lockoutUntil || entry.lockoutUntil.getTime() <= now)) {
        failedAttempts.delete(ip);
      }
    }
  }, config.cleanupIntervalMs);
  
  if (cleanupInterval.unref) {
    cleanupInterval.unref();
  }
}

export function stopCleanup() {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
  }
}

startCleanup();

export default {
  middleware: progressiveAuthRateLimit,
  recordFailedAttempt,
  resetFailedAttempts,
  checkLockoutStatus,
  getStats: getProgressiveRateLimitStats,
  stopCleanup
};
