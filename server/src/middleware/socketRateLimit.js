/**
 * Socket.IO Rate Limiting Middleware
 * 
 * Bảo vệ WebSocket khỏi DOS attacks bằng cách giới hạn số lượng events mỗi client.
 * 
 * @module socketRateLimit
 */

// Rate limit configuration
const config = {
  // General events rate limit
  eventsPerSecond: 50,           // Max events per second per socket
  eventsWindowMs: 1000,          // Window size in ms
  
  // Specific event limits
  messageEventsPerMinute: 60,    // Max message events per minute
  joinEventsPerMinute: 30,       // Max join room events per minute
  
  // Penalty configuration
  warningThreshold: 3,           // Number of violations before warning
  disconnectThreshold: 10,       // Number of violations before disconnect
  penaltyDurationMs: 60000,      // Penalty duration (1 minute)
  
  // Cleanup configuration
  cleanupIntervalMs: 5 * 60 * 1000,  // Cleanup stale entries every 5 minutes
  maxInactiveMs: 10 * 60 * 1000      // Remove entries inactive for 10 minutes
};

// Track rate limit data per socket
const socketRateLimits = new Map();

// Cleanup interval reference
let cleanupInterval = null;

/**
 * Start periodic cleanup of stale socket tracking entries
 */
function startCleanupInterval() {
  if (cleanupInterval) return;
  
  cleanupInterval = setInterval(() => {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [socketId, tracking] of socketRateLimits.entries()) {
      // Remove entries that haven't had activity
      const lastEvent = Math.max(
        tracking.events[tracking.events.length - 1] || 0,
        tracking.messageEvents[tracking.messageEvents.length - 1] || 0,
        tracking.joinEvents[tracking.joinEvents.length - 1] || 0
      );
      
      if (now - lastEvent > config.maxInactiveMs) {
        socketRateLimits.delete(socketId);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      console.log(`[SOCKET-RATE-LIMIT] Cleaned ${cleaned} stale entries, ${socketRateLimits.size} remaining`);
    }
  }, config.cleanupIntervalMs);
  
  // Don't prevent Node.js from exiting
  cleanupInterval.unref();
}

/**
 * Initialize rate limit tracking for a socket
 */
function initSocketTracking(socketId) {
  socketRateLimits.set(socketId, {
    events: [],
    messageEvents: [],
    joinEvents: [],
    violations: 0,
    penalizedUntil: null
  });
  
  // Ensure cleanup is running
  startCleanupInterval();
}

/**
 * Clean up tracking for disconnected socket
 */
function cleanupSocketTracking(socketId) {
  socketRateLimits.delete(socketId);
}

/**
 * Check if socket is currently penalized
 */
function isPenalized(socketId) {
  const tracking = socketRateLimits.get(socketId);
  if (!tracking || !tracking.penalizedUntil) return false;
  
  if (Date.now() > tracking.penalizedUntil) {
    tracking.penalizedUntil = null;
    tracking.violations = 0;
    return false;
  }
  
  return true;
}

/**
 * Record a violation and apply penalty if needed
 */
function recordViolation(socket, eventName) {
  const tracking = socketRateLimits.get(socket.id);
  if (!tracking) return;
  
  tracking.violations++;
  
  if (tracking.violations >= config.disconnectThreshold) {
    console.warn(`[SOCKET-RATE-LIMIT] Disconnecting socket ${socket.id} due to excessive violations`);
    socket.emit('rate-limit-exceeded', { 
      message: 'Bạn đã bị ngắt kết nối do gửi quá nhiều yêu cầu',
      type: 'disconnect'
    });
    socket.disconnect(true);
    return true;
  }
  
  if (tracking.violations >= config.warningThreshold) {
    tracking.penalizedUntil = Date.now() + config.penaltyDurationMs;
    socket.emit('rate-limit-exceeded', {
      message: 'Bạn đang gửi yêu cầu quá nhanh, vui lòng chờ một phút',
      type: 'temporary-block',
      retryAfter: config.penaltyDurationMs / 1000
    });
    console.warn(`[SOCKET-RATE-LIMIT] Socket ${socket.id} penalized for event: ${eventName}`);
  }
  
  return false;
}

/**
 * Clean old events from tracking array
 */
function cleanOldEvents(events, windowMs) {
  const cutoff = Date.now() - windowMs;
  return events.filter(timestamp => timestamp > cutoff);
}

/**
 * Check general event rate limit
 */
function checkEventRateLimit(socket, eventName) {
  const tracking = socketRateLimits.get(socket.id);
  if (!tracking) {
    initSocketTracking(socket.id);
    return true;
  }
  
  // Check if penalized
  if (isPenalized(socket.id)) {
    return false;
  }
  
  // Clean old events and add new one
  tracking.events = cleanOldEvents(tracking.events, config.eventsWindowMs);
  
  if (tracking.events.length >= config.eventsPerSecond) {
    recordViolation(socket, eventName);
    return false;
  }
  
  tracking.events.push(Date.now());
  return true;
}

/**
 * Check message event rate limit
 */
function checkMessageRateLimit(socket) {
  const tracking = socketRateLimits.get(socket.id);
  if (!tracking) return true;
  
  tracking.messageEvents = cleanOldEvents(tracking.messageEvents, 60000); // 1 minute
  
  if (tracking.messageEvents.length >= config.messageEventsPerMinute) {
    recordViolation(socket, 'message');
    return false;
  }
  
  tracking.messageEvents.push(Date.now());
  return true;
}

/**
 * Check join room event rate limit
 */
function checkJoinRateLimit(socket) {
  const tracking = socketRateLimits.get(socket.id);
  if (!tracking) return true;
  
  tracking.joinEvents = cleanOldEvents(tracking.joinEvents, 60000); // 1 minute
  
  if (tracking.joinEvents.length >= config.joinEventsPerMinute) {
    recordViolation(socket, 'join');
    return false;
  }
  
  tracking.joinEvents.push(Date.now());
  return true;
}

/**
 * Middleware wrapper để rate limit event handlers
 * @param {Function} handler - Original event handler
 * @param {Object} options - Rate limit options
 * @returns {Function} Wrapped handler with rate limiting
 */
export function rateLimitedHandler(handler, options = {}) {
  return function(socket, ...args) {
    if (!checkEventRateLimit(socket, options.eventName || 'unknown')) {
      return; // Rate limited, don't execute handler
    }
    
    // Additional checks based on event type
    if (options.isMessage && !checkMessageRateLimit(socket)) {
      return;
    }
    
    if (options.isJoin && !checkJoinRateLimit(socket)) {
      return;
    }
    
    // Execute original handler
    return handler.call(this, socket, ...args);
  };
}

/**
 * Socket.IO connection middleware with rate limiting
 * Attach this to io.use() before connection handlers
 */
export function socketRateLimitMiddleware(socket, next) {
  initSocketTracking(socket.id);
  
  // Cleanup on disconnect
  socket.on('disconnect', () => {
    cleanupSocketTracking(socket.id);
  });
  
  next();
}

/**
 * Wrap all socket event handlers with rate limiting
 * @param {Socket} socket - Socket.IO socket instance
 */
export function applyRateLimitToSocket(socket) {
  const originalOn = socket.on.bind(socket);
  
  socket.on = function(eventName, handler) {
    // Skip internal events
    const internalEvents = ['disconnect', 'error', 'connect', 'connecting'];
    if (internalEvents.includes(eventName)) {
      return originalOn(eventName, handler);
    }
    
    // Determine rate limit options based on event name
    const options = {
      eventName,
      isMessage: eventName.includes('message') || eventName.includes('send'),
      isJoin: eventName.includes('join')
    };
    
    // Wrap handler with rate limiting
    const wrappedHandler = function(...args) {
      if (!checkEventRateLimit(socket, eventName)) {
        return;
      }
      
      if (options.isMessage && !checkMessageRateLimit(socket)) {
        return;
      }
      
      if (options.isJoin && !checkJoinRateLimit(socket)) {
        return;
      }
      
      return handler.apply(this, args);
    };
    
    return originalOn(eventName, wrappedHandler);
  };
}

export default {
  socketRateLimitMiddleware,
  applyRateLimitToSocket,
  rateLimitedHandler,
  cleanupSocketTracking
};
