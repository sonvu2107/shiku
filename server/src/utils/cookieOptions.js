/**
 * Cookie Options Builder
 * 
 * Module tạo cấu hình cookie với các thiết lập bảo mật phù hợp.
 * Hỗ trợ cả development và production environments.
 * 
 * Environment Variables:
 * - COOKIE_DOMAIN: Domain cho cookie trong production (vd: ".example.com")
 * - NODE_ENV: Xác định môi trường (production/development)
 * 
 * @module cookieOptions
 */

/**
 * Tạo cấu hình cookie với các thiết lập bảo mật
 * 
 * @param {number} maxAge - Thời gian sống của cookie (ms)
 * @param {Object} [overrides={}] - Các tùy chọn ghi đè
 * @returns {Object} Cấu hình cookie với các thuộc tính: httpOnly, secure, sameSite, domain, maxAge
 * 
 * @example
 * const options = buildCookieOptions(3600000); // 1 giờ
 * res.cookie('token', value, options);
 */
export const buildCookieOptions = (maxAge, overrides = {}) => {
  const isProduction = process.env.NODE_ENV === "production";
  const cookieDomain = isProduction ? (process.env.COOKIE_DOMAIN || ".shiku.click") : undefined;

  return {
    httpOnly: true,
    path: "/",
    secure: isProduction,
    sameSite: isProduction ? "lax" : "lax",
    domain: cookieDomain,
    maxAge,
    ...overrides,
  };
};
