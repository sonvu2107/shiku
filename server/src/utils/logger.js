/**
 * Centralized Logging System
 * 
 * Hệ thống logging tập trung thay thế console.log
 * Hỗ trợ các mức log: ERROR, WARN, INFO, DEBUG
 * Tự động format message với timestamp và metadata
 * 
 * @module logger
 */

const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';

class Logger {
  constructor() {
    this.levels = {
      ERROR: 0,
      WARN: 1,
      INFO: 2,
      DEBUG: 3
    };
    
    this.currentLevel = isDevelopment ? this.levels.DEBUG : this.levels.INFO;
  }

  formatMessage(level, message, meta = {}) {
    const timestamp = new Date().toISOString();
    const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
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
    if (this.currentLevel >= this.levels.DEBUG && isDevelopment) {
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
