/**
 * CAPTCHA Verification Service
 * 
 * Dịch vụ xác minh CAPTCHA, hỗ trợ nhiều provider:
 * - Google reCAPTCHA v2/v3
 * - hCaptcha
 * - Cloudflare Turnstile
 * 
 * Cấu hình trong .env:
 * - CAPTCHA_ENABLED=true         - Bật/tắt CAPTCHA
 * - CAPTCHA_PROVIDER=recaptcha   - Provider: recaptcha, hcaptcha, turnstile
 * - CAPTCHA_SECRET_KEY=xxx       - Secret key từ provider
 * - CAPTCHA_SITE_KEY=xxx         - Site key (cho frontend)
 * - CAPTCHA_THRESHOLD=0.5        - Điểm tối thiểu (reCAPTCHA v3)
 */

// ============================================================
// CẤU HÌNH
// ============================================================

const config = {
  enabled: process.env.CAPTCHA_ENABLED === 'true',
  provider: process.env.CAPTCHA_PROVIDER || 'recaptcha',
  secretKey: process.env.CAPTCHA_SECRET_KEY,
  siteKey: process.env.CAPTCHA_SITE_KEY,
  threshold: parseFloat(process.env.CAPTCHA_THRESHOLD) || 0.5,
  
  endpoints: {
    recaptcha: 'https://www.google.com/recaptcha/api/siteverify',
    hcaptcha: 'https://hcaptcha.com/siteverify',
    turnstile: 'https://challenges.cloudflare.com/turnstile/v0/siteverify'
  }
};

// ============================================================
// HÀM XÁC MINH
// ============================================================

/**
 * Xác minh CAPTCHA token với provider đã cấu hình
 * @param {string} token - CAPTCHA token từ frontend
 * @param {string} [remoteIP] - IP của client
 * @returns {Promise<{success: boolean, score?: number, action?: string, error?: string}>}
 */
export async function verifyCaptcha(token, remoteIP = null) {
  if (!config.enabled) {
    return { success: true, bypassed: true, reason: 'CAPTCHA disabled' };
  }

  if (!config.secretKey) {
    console.error('[CAPTCHA] Secret key chưa được cấu hình');
    return { success: false, error: 'CAPTCHA chưa được cấu hình đúng' };
  }

  if (!token) {
    return { success: false, error: 'CAPTCHA token là bắt buộc' };
  }

  try {
    switch (config.provider) {
      case 'recaptcha':
        return await verifyRecaptcha(token, remoteIP);
      case 'hcaptcha':
        return await verifyHCaptcha(token, remoteIP);
      case 'turnstile':
        return await verifyTurnstile(token, remoteIP);
      default:
        return { success: false, error: `Provider không hợp lệ: ${config.provider}` };
    }
  } catch (error) {
    console.error('[CAPTCHA] Lỗi xác minh:', error.message);
    return { success: false, error: 'Xác minh CAPTCHA thất bại' };
  }
}

/**
 * Xác minh Google reCAPTCHA v2/v3
 */
async function verifyRecaptcha(token, remoteIP) {
  const formData = new URLSearchParams();
  formData.append('secret', config.secretKey);
  formData.append('response', token);
  if (remoteIP) {
    formData.append('remoteip', remoteIP);
  }

  const response = await fetch(config.endpoints.recaptcha, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: formData
  });

  const data = await response.json();

  if (!data.success) {
    return {
      success: false,
      error: data['error-codes']?.join(', ') || 'Xác minh reCAPTCHA thất bại'
    };
  }

  // Với reCAPTCHA v3, kiểm tra điểm số
  if (typeof data.score === 'number') {
    if (data.score < config.threshold) {
      return {
        success: false,
        score: data.score,
        action: data.action,
        error: `Điểm quá thấp: ${data.score} < ${config.threshold}`
      };
    }
    return {
      success: true,
      score: data.score,
      action: data.action
    };
  }

  // reCAPTCHA v2 - chỉ cần kiểm tra success
  return { success: true };
}

/**
 * Xác minh hCaptcha
 */
async function verifyHCaptcha(token, remoteIP) {
  const formData = new URLSearchParams();
  formData.append('secret', config.secretKey);
  formData.append('response', token);
  if (remoteIP) {
    formData.append('remoteip', remoteIP);
  }

  const response = await fetch(config.endpoints.hcaptcha, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: formData
  });

  const data = await response.json();

  if (!data.success) {
    return {
      success: false,
      error: data['error-codes']?.join(', ') || 'Xác minh hCaptcha thất bại'
    };
  }

  return { success: true };
}

/**
 * Xác minh Cloudflare Turnstile
 */
async function verifyTurnstile(token, remoteIP) {
  const body = {
    secret: config.secretKey,
    response: token
  };
  if (remoteIP) {
    body.remoteip = remoteIP;
  }

  const response = await fetch(config.endpoints.turnstile, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  const data = await response.json();

  if (!data.success) {
    return {
      success: false,
      error: data['error-codes']?.join(', ') || 'Xác minh Turnstile thất bại'
    };
  }

  return { success: true };
}

// ============================================================
// MIDDLEWARE
// ============================================================

/**
 * Middleware xác minh CAPTCHA bắt buộc
 * Sử dụng khi route luôn yêu cầu CAPTCHA
 */
export function captchaMiddleware(req, res, next) {
  if (!config.enabled) {
    return next();
  }

  if (!req.captchaRequired && !req.body?.captchaToken) {
    return next();
  }

  const token = req.body?.captchaToken || req.headers['x-captcha-token'];
  const remoteIP = req.ip;

  verifyCaptcha(token, remoteIP)
    .then(result => {
      if (result.success) {
        req.captchaVerified = true;
        req.captchaScore = result.score;
        next();
      } else {
        res.status(400).json({
          error: 'Xác minh CAPTCHA thất bại',
          code: 'CAPTCHA_FAILED',
          details: result.error
        });
      }
    })
    .catch(error => {
      console.error('[CAPTCHA] Lỗi middleware:', error);
      res.status(500).json({
        error: 'Lỗi xác minh CAPTCHA',
        code: 'CAPTCHA_ERROR'
      });
    });
}

/**
 * Middleware xác minh CAPTCHA có điều kiện
 * Chỉ yêu cầu CAPTCHA khi rate limit threshold đạt (set bởi progressiveRateLimit)
 */
export function conditionalCaptchaMiddleware(req, res, next) {
  if (!req.captchaRequired) {
    return next();
  }

  console.log('[CAPTCHA] Yêu cầu CAPTCHA cho request từ', req.ip);

  if (!config.enabled) {
    console.warn('[CAPTCHA] CAPTCHA được yêu cầu nhưng đã bị tắt trong config');
    return next();
  }

  const token = req.body?.captchaToken || req.headers['x-captcha-token'];
  
  if (!token) {
    console.log('[CAPTCHA] Thiếu CAPTCHA token, trả về lỗi');
    return res.status(400).json({
      error: 'Yêu cầu xác minh CAPTCHA',
      code: 'CAPTCHA_REQUIRED',
      requiresCaptcha: true,
      siteKey: config.siteKey,
      provider: config.provider,
      message: 'Bạn cần giải CAPTCHA để tiếp tục đăng nhập'
    });
  }

  console.log('[CAPTCHA] Đang xác minh CAPTCHA token...');
  verifyCaptcha(token, req.ip)
    .then(result => {
      if (result.success) {
        console.log('[CAPTCHA] Xác minh CAPTCHA thành công');
        req.captchaVerified = true;
        next();
      } else {
        console.log('[CAPTCHA] Xác minh CAPTCHA thất bại:', result.error);
        res.status(400).json({
          error: 'Xác minh CAPTCHA thất bại',
          code: 'CAPTCHA_FAILED',
          details: result.error,
          requiresCaptcha: true,
          siteKey: config.siteKey,
          provider: config.provider
        });
      }
    })
    .catch(error => {
      console.error('[CAPTCHA] Lỗi middleware:', error);
      res.status(500).json({
        error: 'Lỗi xác minh CAPTCHA',
        code: 'CAPTCHA_ERROR'
      });
    });
}

// ============================================================
// HÀM TIỆN ÍCH
// ============================================================

/**
 * Lấy cấu hình CAPTCHA cho frontend
 */
export function getCaptchaConfig() {
  return {
    enabled: config.enabled,
    provider: config.provider,
    siteKey: config.siteKey,
    threshold: config.threshold
  };
}

/**
 * Kiểm tra CAPTCHA có được bật không
 */
export function isCaptchaEnabled() {
  return config.enabled;
}

/**
 * Lấy thống kê cho monitoring
 */
export function getCaptchaStats() {
  return {
    enabled: config.enabled,
    provider: config.provider,
    configured: Boolean(config.secretKey && config.siteKey),
    threshold: config.threshold
  };
}

export default {
  verify: verifyCaptcha,
  middleware: captchaMiddleware,
  conditionalMiddleware: conditionalCaptchaMiddleware,
  getConfig: getCaptchaConfig,
  isEnabled: isCaptchaEnabled,
  getStats: getCaptchaStats
};
