/**
 * Centralized Logging System
 * 
 * Hệ thống logging tập trung thay thế console.log
 * Hỗ trợ các mức log: ERROR, WARN, INFO, DEBUG
 * Tự động format message với timestamp và metadata
 * 
 * PRODUCTION: Chỉ log ERROR, WARN, INFO (không có DEBUG)
 * DEVELOPMENT: Log tất cả các mức
 * 
 * @module logger
 */

const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';

// Sensitive keys to redact from logs
const SENSITIVE_KEYS = ['password', 'token', 'secret', 'authorization', 'cookie', 'apiKey', 'api_key', 'accessToken', 'refreshToken'];

class Logger {
  constructor() {
    this.levels = {
      ERROR: 0,
      WARN: 1,
      INFO: 2,
      DEBUG: 3
    };
    
    // Production: INFO level, Development: DEBUG level
    this.currentLevel = isProduction ? this.levels.INFO : this.levels.DEBUG;
  }

  /**
   * Redact sensitive information from meta object
   * @param {any} meta - Object to redact
   * @param {number} depth - Current recursion depth (prevent infinite loops)
   */
  redactSensitive(meta, depth = 0) {
    // Prevent deep recursion (max 5 levels)
    if (depth > 5) return '[MAX_DEPTH]';
    if (!meta || typeof meta !== 'object') return meta;
    
    const redacted = Array.isArray(meta) ? [...meta] : { ...meta };
    
    for (const key in redacted) {
      if (SENSITIVE_KEYS.some(sk => key.toLowerCase().includes(sk.toLowerCase()))) {
        redacted[key] = '[REDACTED]';
      } else if (typeof redacted[key] === 'object' && redacted[key] !== null) {
        redacted[key] = this.redactSensitive(redacted[key], depth + 1);
      }
    }
    
    return redacted;
  }

  formatMessage(level, message, meta = {}) {
    const timestamp = new Date().toISOString();
    // Redact sensitive data in production
    const safeMeta = isProduction ? this.redactSensitive(meta) : meta;
    const metaStr = Object.keys(safeMeta).length > 0 ? ` ${JSON.stringify(safeMeta)}` : '';
    return `[${timestamp}] [${level}] ${message}${metaStr}`;
  }

  error(message, meta = {}) {
    if (this.currentLevel >= this.levels.ERROR) {
      console.error(this.formatMessage('ERROR', message, meta));
    }
  }

  warn(message, meta = {}) {
    if (this.currentLevel >= this.levels.WARN) {
      console.warn(this.formatMessage('WARN', message, meta));
    }
  }

  info(message, meta = {}) {
    if (this.currentLevel >= this.levels.INFO) {
      console.log(this.formatMessage('INFO', message, meta));
    }
  }

  debug(message, meta = {}) {
    // DEBUG logs are ONLY shown in development
    if (!isProduction && this.currentLevel >= this.levels.DEBUG) {
      console.log(this.formatMessage('DEBUG', message, meta));
    }
  }

  /**
   * Log sự kiện bảo mật
   * @param {string} event - Tên sự kiện bảo mật
   * @param {Object} details - Chi tiết sự kiện
   */
  security(event, details = {}) {
    this.warn(`SECURITY: ${event}`, details);
  }

  /**
   * Log hiệu năng (performance)
   * @param {string} operation - Tên thao tác
   * @param {number} duration - Thời gian thực thi (ms)
   * @param {Object} details - Chi tiết bổ sung
   */
  performance(operation, duration, details = {}) {
    this.info(`PERFORMANCE: ${operation} took ${duration}ms`, details);
  }

  /**
   * Log thao tác database
   * @param {string} operation - Tên thao tác database
   * @param {Object} details - Chi tiết bổ sung
   */
  database(operation, details = {}) {
    this.debug(`DATABASE: ${operation}`, details);
  }

  /**
   * Log API request
   * @param {string} method - HTTP method
   * @param {string} path - API path
   * @param {number} status - HTTP status code
   * @param {number} duration - Thời gian xử lý (ms)
   * @param {Object} details - Chi tiết bổ sung
   */
  api(method, path, status, duration, details = {}) {
    this.info(`API: ${method} ${path} - ${status} (${duration}ms)`, details);
  }
}

// Export singleton instance
export const logger = new Logger();

// Export các method riêng lẻ để tiện sử dụng
export const { error, warn, info, debug, security, performance, database, api } = logger;
