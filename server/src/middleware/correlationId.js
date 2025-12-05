/**
 * Correlation ID Middleware
 * 
 * Tạo và quản lý Correlation ID (Request ID) để trace requests qua hệ thống.
 * Giúp debug và monitor bằng cách liên kết tất cả logs của cùng một request.
 * 
 * @module correlationId
 */

import { v4 as uuidv4 } from 'uuid';

// Header name for correlation ID
const CORRELATION_ID_HEADER = 'X-Correlation-ID';
const REQUEST_ID_HEADER = 'X-Request-ID';

/**
 * Middleware tạo và gắn Correlation ID vào request
 * - Nếu client gửi X-Correlation-ID, sử dụng nó (để trace across services)
 * - Nếu không, tạo mới UUID v4
 * - Gắn vào req.correlationId và response header
 */
export function correlationIdMiddleware(req, res, next) {
  // Lấy correlation ID từ header hoặc tạo mới
  const correlationId = req.get(CORRELATION_ID_HEADER) || 
                        req.get(REQUEST_ID_HEADER) || 
                        uuidv4();
  
  // Validate format (chỉ chấp nhận UUID hoặc string alphanumeric)
  const isValidFormat = /^[a-zA-Z0-9-_]+$/.test(correlationId) && correlationId.length <= 64;
  const safeCorrelationId = isValidFormat ? correlationId : uuidv4();
  
  // Gắn vào request object
  req.correlationId = safeCorrelationId;
  req.requestStartTime = Date.now();
  
  // Gắn vào response header để client có thể trace
  res.setHeader(CORRELATION_ID_HEADER, safeCorrelationId);
  res.setHeader(REQUEST_ID_HEADER, safeCorrelationId);
  
  next();
}

/**
 * Helper function để lấy correlation ID từ request
 * @param {Object} req - Express request object
 * @returns {string} Correlation ID
 */
export function getCorrelationId(req) {
  return req?.correlationId || 'unknown';
}

/**
 * Helper function để tính thời gian xử lý request
 * @param {Object} req - Express request object
 * @returns {number} Duration in milliseconds
 */
export function getRequestDuration(req) {
  if (!req?.requestStartTime) return 0;
  return Date.now() - req.requestStartTime;
}

export default correlationIdMiddleware;
