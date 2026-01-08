/**
 * Custom CSRF Protection Middleware
 * 
 * Thay thế csurf (deprecated) bằng implementation sử dụng crypto.
 * Sử dụng Double Submit Cookie pattern + Signed tokens.
 * 
 * @module csrfProtection
 */

import crypto from 'crypto';

// Configuration
const config = {
  tokenLength: 32,                    // Length of CSRF token
  cookieName: '_csrf',                // Cookie name for CSRF secret
  headerName: 'x-csrf-token',         // Header to check for token
  tokenExpiry: 60 * 60 * 1000,        // Token expiry (1 hour)
  ignoreMethods: ['GET', 'HEAD', 'OPTIONS'], // Methods to skip
  ignorePaths: ['/api/auth/refresh', '/api/battle/training']  // Paths to skip CSRF check
};

// Cache signing secret (evaluated once at startup)
let cachedSigningSecret = null;

// Get signing secret (cached for performance)
const getSigningSecret = () => {
  if (!cachedSigningSecret) {
    cachedSigningSecret = process.env.CSRF_SECRET || process.env.JWT_SECRET || 'fallback-csrf-secret';
  }
  return cachedSigningSecret;
};

/**
 * Generate random bytes as hex string
 */
function generateSecret() {
  return crypto.randomBytes(config.tokenLength).toString('hex');
}

/**
 * Create signed CSRF token
 * @param {string} secret - The secret stored in cookie
 * @returns {string} Signed token
 */
function createToken(secret) {
  const timestamp = Date.now().toString(36);
  const data = `${secret}.${timestamp}`;
  const signature = crypto
    .createHmac('sha256', getSigningSecret())
    .update(data)
    .digest('hex')
    .slice(0, 16);

  return `${timestamp}.${signature}`;
}

/**
 * Verify CSRF token
 * @param {string} secret - The secret stored in cookie
 * @param {string} token - The token from header/body
 * @returns {boolean} Whether token is valid
 */
function verifyToken(secret, token) {
  if (!secret || !token) return false;

  try {
    const [timestamp, signature] = token.split('.');
    if (!timestamp || !signature) return false;

    // Check expiry
    const tokenTime = parseInt(timestamp, 36);
    if (Date.now() - tokenTime > config.tokenExpiry) {
      return false;
    }

    // Verify signature
    const data = `${secret}.${timestamp}`;
    const expectedSignature = crypto
      .createHmac('sha256', getSigningSecret())
      .update(data)
      .digest('hex')
      .slice(0, 16);

    // Constant-time comparison to prevent timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch (error) {
    return false;
  }
}

/**
 * Build cookie options
 * @param {Object} additionalOptions - Additional cookie options
 */
function buildCookieOptions(additionalOptions = {}) {
  const isProduction = process.env.NODE_ENV === 'production';

  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    maxAge: config.tokenExpiry,
    path: '/',
    ...additionalOptions
  };
}

/**
 * CSRF Protection Middleware
 * 
 * Usage:
 * ```
 * import { csrfProtection, csrfErrorHandler } from './middleware/csrfProtection.js';
 * app.use(csrfProtection);
 * app.use(csrfErrorHandler);
 * 
 * // Get token endpoint
 * app.get('/api/csrf-token', (req, res) => {
 *   res.json({ csrfToken: req.csrfToken() });
 * });
 * ```
 */
export function csrfProtection(req, res, next) {
  // Skip ignored methods
  if (config.ignoreMethods.includes(req.method)) {
    return setupCsrfToken(req, res, next);
  }

  // Skip ignored paths
  if (config.ignorePaths.some(path => req.path.startsWith(path))) {
    return setupCsrfToken(req, res, next);
  }

  // Get secret from cookie
  const secret = req.cookies?.[config.cookieName];

  // Get token from header or body
  const token = req.get(config.headerName) ||
    req.get('X-CSRF-Token') ||
    req.body?._csrf ||
    req.query?._csrf;

  // Verify token
  if (!verifyToken(secret, token)) {
    const error = new Error('Invalid CSRF token');
    error.code = 'EBADCSRFTOKEN';
    error.status = 403;
    return next(error);
  }

  setupCsrfToken(req, res, next);
}

/**
 * Setup csrfToken() method on request
 */
function setupCsrfToken(req, res, next) {
  // Get or create secret
  let secret = req.cookies?.[config.cookieName];

  if (!secret) {
    secret = generateSecret();
    res.cookie(config.cookieName, secret, buildCookieOptions());
  }

  // Attach csrfToken method to request
  req.csrfToken = () => createToken(secret);

  next();
}

/**
 * CSRF Error Handler
 */
export function csrfErrorHandler(err, req, res, next) {
  if (err.code === 'EBADCSRFTOKEN') {
    return res.status(403).json({
      error: 'CSRF token không hợp lệ hoặc đã hết hạn',
      code: 'INVALID_CSRF_TOKEN'
    });
  }
  next(err);
}

/**
 * Alternative: Double Submit Cookie middleware
 * Simpler approach that compares cookie value with header value
 */
export function doubleSubmitCsrf(req, res, next) {
  // Skip ignored methods
  if (config.ignoreMethods.includes(req.method)) {
    return setupDoubleSubmitToken(req, res, next);
  }

  // Skip ignored paths
  if (config.ignorePaths.some(path => req.path.startsWith(path))) {
    return setupDoubleSubmitToken(req, res, next);
  }

  const cookieToken = req.cookies?.[config.cookieName];
  const headerToken = req.get(config.headerName) || req.get('X-CSRF-Token');

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    const error = new Error('Invalid CSRF token');
    error.code = 'EBADCSRFTOKEN';
    error.status = 403;
    return next(error);
  }

  setupDoubleSubmitToken(req, res, next);
}

function setupDoubleSubmitToken(req, res, next) {
  let token = req.cookies?.[config.cookieName];

  if (!token) {
    token = generateSecret();
    res.cookie(config.cookieName, token, buildCookieOptions({ httpOnly: false }));
  }

  req.csrfToken = () => token;
  next();
}

export default csrfProtection;
