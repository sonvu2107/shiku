/**
 * Centralized Logging System
 * Thay thế console.log với proper logging levels
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

  // Specialized logging methods
  security(event, details = {}) {
    this.warn(`SECURITY: ${event}`, details);
  }

  performance(operation, duration, details = {}) {
    this.info(`PERFORMANCE: ${operation} took ${duration}ms`, details);
  }

  database(operation, details = {}) {
    this.debug(`DATABASE: ${operation}`, details);
  }

  api(method, path, status, duration, details = {}) {
    this.info(`API: ${method} ${path} - ${status} (${duration}ms)`, details);
  }
}

// Export singleton instance
export const logger = new Logger();

// Export individual methods for convenience
export const { error, warn, info, debug, security, performance, database, api } = logger;
