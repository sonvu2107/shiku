
// Middleware bảo vệ các endpoint admin bằng giới hạn tốc độ và cache
import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';

/**
 * Giới hạn tốc độ cho các endpoint admin để chống spam/abuse
 */

// Giới hạn chung cho admin: mỗi IP chỉ được 100 request mỗi 15 phút
export const adminRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 phút
  max: 100, // Tối đa 100 request mỗi IP trong 15 phút
  message: {
    error: "Quá nhiều requests từ IP này, vui lòng thử lại sau 15 phút",
    code: "ADMIN_RATE_LIMIT_EXCEEDED"
  },
  standardHeaders: true, // Trả về thông tin rate limit qua header chuẩn
  legacyHeaders: false, // Không dùng header cũ
  skip: (req) => {
    // Bỏ qua giới hạn khi chạy local dev
    return process.env.NODE_ENV === 'development' && req.ip === '127.0.0.1';
  }
});

// Giới hạn nghiêm ngặt cho các thao tác admin nhạy cảm (ban, unban, xóa...)
export const strictAdminRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 phút
  max: 10, // Tối đa 10 request mỗi IP trong 5 phút
  message: {
    error: "Quá nhiều hành động nhạy cảm, vui lòng thử lại sau 5 phút",
    code: "STRICT_ADMIN_RATE_LIMIT_EXCEEDED"
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Bỏ qua giới hạn khi chạy local dev
    return process.env.NODE_ENV === 'development' && req.ip === '127.0.0.1';
  }
});

// Làm chậm gửi thông báo: sau 5 request sẽ bị delay dần (chống spam gửi noti)
export const notificationSlowDown = slowDown({
  windowMs: 15 * 60 * 1000, // 15 phút
  delayAfter: 5, // 5 request đầu không delay
  delayMs: () => 500, // Sau đó mỗi request bị delay 500ms
  maxDelayMs: 10000, // Tối đa delay 10 giây
  validate: { delayMs: false }, // Không cảnh báo
  skip: (req) => {
    // Bỏ qua khi dev local
    return process.env.NODE_ENV === 'development' && req.ip === '127.0.0.1';
  }
});

/**
 * Các middleware set header cache cho từng loại dữ liệu (tăng hiệu năng)
 */
// Cache kiểu stale-while-revalidate cho dữ liệu thống kê (5 phút, stale 10 phút)
export function statsCache(req, res, next) {
  if (req.method === 'GET') {
    res.set({
      'Cache-Control': 'public, max-age=300, stale-while-revalidate=600',
      'Vary': 'Authorization'
    });
  }
  next();
}

// Cache ngắn cho dữ liệu user (2 phút, stale 5 phút)
export function userCache(req, res, next) {
  if (req.method === 'GET') {
    res.set({
      'Cache-Control': 'public, max-age=120, stale-while-revalidate=300',
      'Vary': 'Authorization'
    });
  }
  next();
}

// Không cache cho dữ liệu realtime (user online, thông báo...)
export function noCache(req, res, next) {
  res.set({
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  });
  next();
}

// Cache lâu cho dữ liệu role (30 phút, stale 1 tiếng)
export function roleCache(req, res, next) {
  if (req.method === 'GET') {
    res.set({
      'Cache-Control': 'public, max-age=1800, stale-while-revalidate=3600',
      'Vary': 'Authorization'
    });
  }
  next();
}