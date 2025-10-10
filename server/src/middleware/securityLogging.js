import fs from "fs";
import { getClientAgent } from "../utils/clientAgent.js";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Security Logging Middleware
 * Log các hoạt động bảo mật quan trọng và tránh leak thông tin nhạy cảm
 */

// Tạo thư mục logs nếu chưa có
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

/**
 * Log levels
 */
const LOG_LEVELS = {
  ERROR: 'ERROR',
  WARN: 'WARN',
  INFO: 'INFO',
  DEBUG: 'DEBUG'
};

/**
 * Security events cần log
 */
const SECURITY_EVENTS = {
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGIN_FAILED: 'LOGIN_FAILED',
  LOGOUT: 'LOGOUT',
  REGISTER_SUCCESS: 'REGISTER_SUCCESS',
  REGISTER_FAILED: 'REGISTER_FAILED',
  PASSWORD_RESET: 'PASSWORD_RESET',
  TOKEN_REFRESH: 'TOKEN_REFRESH',
  TOKEN_BLACKLIST: 'TOKEN_BLACKLIST',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  SUSPICIOUS_ACTIVITY: 'SUSPICIOUS_ACTIVITY',
  FILE_UPLOAD: 'FILE_UPLOAD',
  FILE_UPLOAD_BLOCKED: 'FILE_UPLOAD_BLOCKED',
  ADMIN_ACTION: 'ADMIN_ACTION',
  BAN_USER: 'BAN_USER',
  UNBAN_USER: 'UNBAN_USER',
  UNAUTHORIZED_ACCESS: 'UNAUTHORIZED_ACCESS',
  SQL_INJECTION_ATTEMPT: 'SQL_INJECTION_ATTEMPT',
  XSS_ATTEMPT: 'XSS_ATTEMPT'
};

/**
 * Tạo log entry
 * @param {string} level - Log level
 * @param {string} event - Security event
 * @param {Object} data - Data to log
 * @param {Object} req - Express request object
 * @returns {Object} - Log entry
 */
const createLogEntry = (level, event, data = {}, req = null) => {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    event,
    data: {
      ...data,
      // Thông tin request (không log sensitive data)
      request: req ? {
        method: req.method,
        url: req.url,
        ip: req.ip,
        clientAgent: getClientAgent(req),
        userId: req.user?.id || null,
        userRole: req.user?.role || null
      } : null
    }
  };

  return logEntry;
};

/**
 * Ghi log vào file
 * @param {Object} logEntry - Log entry
 */
const writeLog = (logEntry) => {
  const logFile = path.join(logsDir, `security-${new Date().toISOString().split('T')[0]}.log`);
  const logLine = JSON.stringify(logEntry) + '\n';
  
  fs.appendFileSync(logFile, logLine, 'utf8');
};

/**
 * Log security event
 * @param {string} level - Log level
 * @param {string} event - Security event
 * @param {Object} data - Data to log
 * @param {Object} req - Express request object
 */
export const logSecurityEvent = (level, event, data = {}, req = null) => {
  const logEntry = createLogEntry(level, event, data, req);
  
  // Console log trong development
  if (process.env.NODE_ENV === 'development') {
    console.log(`🔒 [${level}] ${event}:`, logEntry);
  }
  
  // Ghi vào file
  writeLog(logEntry);
};

/**
 * Middleware log tất cả requests (không log sensitive data)
 */
export const requestLogger = (req, res, next) => {
  // Chỉ log trong development hoặc khi có suspicious activity
  if (process.env.NODE_ENV === 'development') {
    const logData = {
      method: req.method,
      url: req.url,
      ip: req.ip,
      clientAgent: getClientAgent(req),
      userId: req.user?.id || null,
      userRole: req.user?.role || null,
      // Không log body để tránh leak sensitive data
      hasBody: !!req.body && Object.keys(req.body).length > 0,
      bodySize: req.body ? JSON.stringify(req.body).length : 0
    };

    console.log(`📝 ${req.method} ${req.url}`, logData);
  }

  next();
};

/**
 * Middleware log authentication events
 */
export const authLogger = (req, res, next) => {
  const originalSend = res.send;
  
  res.send = function(data) {
    // Log login success
    if (req.path === '/api/auth/login' && res.statusCode === 200) {
      logSecurityEvent(LOG_LEVELS.INFO, SECURITY_EVENTS.LOGIN_SUCCESS, {
        email: req.body?.email,
        ip: req.ip
      }, req);
    }
    
    // Log login failed
    if (req.path === '/api/auth/login' && res.statusCode === 401) {
      logSecurityEvent(LOG_LEVELS.WARN, SECURITY_EVENTS.LOGIN_FAILED, {
        email: req.body?.email,
        ip: req.ip,
        reason: 'Invalid credentials'
      }, req);
    }
    
    // Log register success
    if (req.path === '/api/auth/register' && res.statusCode === 200) {
      logSecurityEvent(LOG_LEVELS.INFO, SECURITY_EVENTS.REGISTER_SUCCESS, {
        email: req.body?.email,
        ip: req.ip
      }, req);
    }
    
    // Log register failed
    if (req.path === '/api/auth/register' && res.statusCode === 400) {
      logSecurityEvent(LOG_LEVELS.WARN, SECURITY_EVENTS.REGISTER_FAILED, {
        email: req.body?.email,
        ip: req.ip,
        reason: 'Validation failed'
      }, req);
    }
    
    // Log logout
    if (req.path === '/api/auth/logout' && res.statusCode === 200) {
      logSecurityEvent(LOG_LEVELS.INFO, SECURITY_EVENTS.LOGOUT, {
        userId: req.user?.id,
        ip: req.ip
      }, req);
    }
    
    originalSend.call(this, data);
  };
  
  next();
};

/**
 * Middleware log file upload events
 */
export const fileUploadLogger = (req, res, next) => {
  const originalSend = res.send;
  
  res.send = function(data) {
    // Log file upload success
    if (req.path.includes('/api/uploads') && res.statusCode === 200) {
      logSecurityEvent(LOG_LEVELS.INFO, SECURITY_EVENTS.FILE_UPLOAD, {
        fileName: req.file?.originalname,
        fileSize: req.file?.size,
        fileType: req.file?.mimetype,
        userId: req.user?.id,
        ip: req.ip
      }, req);
    }
    
    // Log file upload blocked
    if (req.path.includes('/api/uploads') && res.statusCode === 400) {
      logSecurityEvent(LOG_LEVELS.WARN, SECURITY_EVENTS.FILE_UPLOAD_BLOCKED, {
        fileName: req.file?.originalname,
        fileSize: req.file?.size,
        fileType: req.file?.mimetype,
        userId: req.user?.id,
        ip: req.ip,
        reason: 'Invalid file type or size'
      }, req);
    }
    
    originalSend.call(this, data);
  };
  
  next();
};

/**
 * Middleware log admin actions
 */
export const adminActionLogger = (req, res, next) => {
  const originalSend = res.send;
  
  res.send = function(data) {
    // Log admin actions
    if (req.path.includes('/api/admin') && req.user?.role === 'admin') {
      logSecurityEvent(LOG_LEVELS.INFO, SECURITY_EVENTS.ADMIN_ACTION, {
        action: req.method + ' ' + req.path,
        targetUserId: req.params?.userId,
        adminId: req.user.id,
        ip: req.ip
      }, req);
    }
    
    // Log ban/unban actions
    if (req.path.includes('/ban') || req.path.includes('/unban')) {
      const event = req.path.includes('/ban') ? SECURITY_EVENTS.BAN_USER : SECURITY_EVENTS.UNBAN_USER;
      logSecurityEvent(LOG_LEVELS.INFO, event, {
        targetUserId: req.params?.userId,
        adminId: req.user?.id,
        reason: req.body?.reason,
        ip: req.ip
      }, req);
    }
    
    originalSend.call(this, data);
  };
  
  next();
};

/**
 * Middleware detect suspicious activity
 */
export const suspiciousActivityDetector = (req, res, next) => {
  // Detect potential SQL injection
  const sqlInjectionPatterns = [
    /union\s+select/i,
    /drop\s+table/i,
    /insert\s+into/i,
    /delete\s+from/i,
    /update\s+set/i,
    /or\s+1\s*=\s*1/i,
    /';\s*drop/i,
    /--\s*$/i,
    /\/\*.*\*\//i
  ];
  
  // Detect potential XSS
  const xssPatterns = [
    /<script[^>]*>.*?<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<iframe[^>]*>.*?<\/iframe>/gi,
    /<object[^>]*>.*?<\/object>/gi,
    /<embed[^>]*>.*?<\/embed>/gi
  ];
  
  const checkPatterns = (input, patterns, eventType) => {
    if (typeof input === 'string') {
      patterns.forEach(pattern => {
        if (pattern.test(input)) {
          logSecurityEvent(LOG_LEVELS.WARN, eventType, {
            pattern: pattern.toString(),
            input: input.substring(0, 100), // Chỉ log 100 ký tự đầu
            ip: req.ip,
            userId: req.user?.id
          }, req);
        }
      });
    } else if (typeof input === 'object' && input !== null) {
      Object.values(input).forEach(value => checkPatterns(value, patterns, eventType));
    }
  };
  
  // Check request body
  if (req.body) {
    checkPatterns(req.body, sqlInjectionPatterns, SECURITY_EVENTS.SQL_INJECTION_ATTEMPT);
    checkPatterns(req.body, xssPatterns, SECURITY_EVENTS.XSS_ATTEMPT);
  }
  
  // Check query parameters
  if (req.query) {
    checkPatterns(req.query, sqlInjectionPatterns, SECURITY_EVENTS.SQL_INJECTION_ATTEMPT);
    checkPatterns(req.query, xssPatterns, SECURITY_EVENTS.XSS_ATTEMPT);
  }
  
  next();
};

/**
 * Middleware log rate limit exceeded
 */
export const rateLimitLogger = (req, res, next) => {
  const originalSend = res.send;
  
  res.send = function(data) {
    if (res.statusCode === 429) {
      logSecurityEvent(LOG_LEVELS.WARN, SECURITY_EVENTS.RATE_LIMIT_EXCEEDED, {
        path: req.path,
        method: req.method,
        ip: req.ip,
        userId: req.user?.id,
        clientAgent: getClientAgent(req)
      }, req);
    }
    
    originalSend.call(this, data);
  };
  
  next();
};

/**
 * Middleware log unauthorized access
 */
export const unauthorizedAccessLogger = (req, res, next) => {
  const originalSend = res.send;
  
  res.send = function(data) {
    if (res.statusCode === 401 || res.statusCode === 403) {
      logSecurityEvent(LOG_LEVELS.WARN, SECURITY_EVENTS.UNAUTHORIZED_ACCESS, {
        path: req.path,
        method: req.method,
        ip: req.ip,
        userId: req.user?.id,
        reason: res.statusCode === 401 ? 'Unauthorized' : 'Forbidden'
      }, req);
    }
    
    originalSend.call(this, data);
  };
  
  next();
};

/**
 * Cleanup old log files (older than 30 days)
 */
export const cleanupOldLogs = () => {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  fs.readdir(logsDir, (err, files) => {
    if (err) return;
    
    files.forEach(file => {
      if (file.startsWith('security-') && file.endsWith('.log')) {
        const filePath = path.join(logsDir, file);
        const stats = fs.statSync(filePath);
        
        if (stats.mtime < thirtyDaysAgo) {
          fs.unlinkSync(filePath);
          console.log(`🗑️ Deleted old log file: ${file}`);
        }
      }
    });
  });
};

// Cleanup old logs mỗi ngày
setInterval(cleanupOldLogs, 24 * 60 * 60 * 1000);

// Export constants
export { LOG_LEVELS, SECURITY_EVENTS };
