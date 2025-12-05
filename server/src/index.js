// Import các thư viện cần thiết
// Import env config trước để load .env từ đúng vị trí (server/.env hoặc root/.env)
import "./config/env.js"; // Load .env từ server/.env hoặc root/.env
import 'dotenv/config'; // Fallback nếu env.js chưa load được
import express from "express";
import compression from "compression"; // Import compression
import helmet from "helmet"; // Security middleware
import cookieParser from "cookie-parser"; // Parse cookies
import cors from "cors"; // Cross-Origin Resource Sharing
import morgan from "morgan"; // HTTP request logger
// Note: csurf is deprecated, using custom csrfProtection instead
import { csrfProtection, csrfErrorHandler } from "./middleware/csrfProtection.js";
import path from "path";
import { fileURLToPath } from "url";
import { createServer } from "http"; // HTTP server
import { Server } from "socket.io"; // WebSocket server
import mongoose from "mongoose"; // MongoDB ODM

// Import config và middleware
import { connectDB } from "./config/db.js";
import { apiLimiter, authLimiter, authStatusLimiter, uploadLimiter, messageLimiter, postsLimiter } from "./middleware/rateLimit.js";
import { notFound, errorHandler } from "./middleware/errorHandler.js";
import { requestTimeout } from "./middleware/timeout.js";
import { authOptional } from "./middleware/auth.js";
import { correlationIdMiddleware } from "./middleware/correlationId.js";
import { isRedisConnected } from "./services/redisClient.js";
import User from "./models/User.js";
import { getClientAgent } from "./utils/clientAgent.js";
import { buildCookieOptions } from "./utils/cookieOptions.js";
import { checkProductionEnvironment } from "./utils/checkProductionEnv.js";

// Import tất cả routes
import authRoutes from "./routes/auth-secure.js"; // Authentication routes
import authTokenRoutes from "./routes/auth-token.js"; // Token validation routes
import postRoutes from "./routes/posts.js"; // Blog post routes
import commentRoutes from "./routes/comments.js"; // Comment routes
import uploadRoutes from "./routes/uploads.js"; // File upload routes
import adminRoutes from "./routes/admin.js"; // Admin management routes
import friendRoutes from "./routes/friends.js"; // Friend system routes
import userRoutes from "./routes/users.js"; // User profile routes
import notificationRoutes from "./routes/notifications.js"; // Notification routes
import messageRoutes from "./routes/messages.js"; // Chat/messaging routes
import groupPostsRouter from "./routes/groupPosts.js"; // Group posts routes
import supportRoutes from "./routes/support.js"; // Support/feedback routes
import groupRoutes from "./routes/groups.js"; // Groups/communities routes
import eventRoutes from "./routes/events.js"; // Events routes
import mediaRoutes from "./routes/media.js"; // Media routes
import apiMonitoringRoutes, { trackAPICall, cleanupInvalidEnvKeys } from "./routes/apiMonitoring.js"; // API Monitoring routes
import sitemapRoutes from "./routes/sitemap.js"; // Sitemap routes
import searchHistoryRoutes from "./routes/searchHistory.js"; // Search history routes
import storyRoutes from "./routes/stories.js"; // Stories routes
import pollRoutes from "./routes/polls.js"; // Polls routes
import healthRoutes from "./routes/health.js"; // Health check routes
import roleRoutes from "./routes/roles.js"; // Roles routes
import chatbotRoutes from "./routes/chatbot.js"; // Chatbot AI routes
import securityMonitoringRoutes from "./routes/securityMonitoring.js"; // Security monitoring routes
import cultivationRoutes from "./routes/cultivation.js"; // Cultivation/Tu Tiên routes
import battleRoutes from "./routes/battle.js"; // Battle/PK routes
import equipmentRoutes from "./routes/equipment.js"; // Equipment management routes

// Environment variables are loaded via `import 'dotenv/config'` at the top

// Tạo Express app và HTTP server
const app = express();
const server = createServer(app);

// Compress all HTTP responses
app.use(compression({
  level: 6, // Balanced compression
  threshold: 1024 // Only compress responses > 1KB
}));

// Trust proxy để rate limiting hoạt động đúng với reverse proxy (Render, Railway, Heroku, etc.)
// Note: If running behind multiple proxy layers (e.g., Cloudflare -> Nginx -> app),
// adjust this value or use 'true' to trust all proxies
app.set("trust proxy", 1);

// Import security config
import { securityConfig, isProduction } from "./config/env.js";

// Tạo Socket.IO server với CORS configuration và improved settings
const io = new Server(server, {
  cors: {
    origin: securityConfig.cors.origins,
    credentials: true,
    optionsSuccessStatus: 200,
    allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization', 'X-CSRF-Token', 'X-Refresh-Token', 'X-Session-ID', 'Cache-Control', 'Pragma', 'Expires']
  },
  // Add connection management settings
  pingTimeout: 60000, // 60 seconds
  pingInterval: 25000, // 25 seconds
  upgradeTimeout: 10000, // 10 seconds
  maxHttpBufferSize: 1e6, // 1MB
  transports: ['websocket', 'polling'],
  allowEIO3: false // Disable Engine.IO v3 for security (use v4 only)
});

// Track connected users to prevent memory leaks (single shared Map declared above)

// Port server sẽ chạy
const PORT = process.env.PORT || 4000;

// ==================== MIDDLEWARE SETUP ====================

// Correlation ID - PHẢI đặt đầu tiên để trace tất cả requests
app.use(correlationIdMiddleware);

// Parse cookie trước tiên
app.use(cookieParser());

// CORS cấu hình đầy đủ 
const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "https://shiku.click",
  "https://www.shiku.click",
  "https://shiku123.netlify.app"
];

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin only in development (Postman, curl, etc.)
    if (!origin) {
      if (!isProduction) {
        return callback(null, true);
      }
      return callback(new Error('Not allowed by CORS'));
    }
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-csrf-token', 'X-CSRF-Token', 'X-Requested-With', 'X-Session-ID', 'Accept', 'Origin', 'Cache-Control', 'Pragma'],
  exposedHeaders: ['set-cookie', 'Set-Cookie'],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204
};

app.use(cors(corsOptions));

// Security middleware - bảo vệ app khỏi các lỗ hổng thông thường
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "http:"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", "ws:", "wss:"],
      objectSrc: ["'none'"],
      frameSrc: ["'none'"],
      frameAncestors: ["'none'"],
      upgradeInsecureRequests: isProduction ? [] : null
    }
  },
  crossOriginEmbedderPolicy: false,
  // Anti-clickjacking protection (X-Frame-Options)
  frameguard: {
    action: 'deny'
  },
  // Prevent MIME type sniffing (X-Content-Type-Options)
  noSniff: true,
  // Additional security headers
  xssFilter: true,
  hidePoweredBy: true,
  hsts: isProduction ? {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  } : false,
  // Referrer Policy
  referrerPolicy: {
    policy: 'strict-origin-when-cross-origin'
  }
}));

// Additional security headers middleware
app.use((req, res, next) => {
  // Permissions-Policy (feature policy) - not covered by helmet
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

  // Referrer-Policy - additional enforcement
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  next();
});

// Parse JSON after CORS
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Custom CSRF Protection middleware (replaces deprecated csurf package)
// The csrfProtection middleware handles:
// - Generating CSRF tokens with signed timestamps
// - Validating tokens on POST/PUT/DELETE requests
// - Skipping validation for safe methods (GET, HEAD, OPTIONS)
// - Skipping specific paths like /api/auth/refresh
app.use(csrfProtection);
app.use(csrfErrorHandler);

// Logging và timeout
app.use(morgan(isProduction ? "combined" : "dev"));
app.use(requestTimeout(30000));


// Rate limiting cho tất cả API routes - REMOVED to avoid double limiting
// app.use("/api", apiLimiter); // Bỏ để tránh double rate limiting

// ==================== STATIC FILES ====================

// Setup __dirname cho ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Serve static uploaded files
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

// ==================== ROUTES SETUP ====================

// Root endpoint - API information
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Shiku API",
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
    docs: "/api/health, /api/csrf-token, /api/posts, etc."
  });
});

// Detailed health check endpoint with dependency checks
app.get("/health", (req, res) => {
  const startTime = Date.now();
  const health = {
    status: "healthy",
    timestamp: new Date().toISOString(),
    checks: {}
  };
  
  // Check MongoDB connection
  try {
    const mongoState = mongoose.connection.readyState;
    const mongoStates = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting'
    };
    health.checks.mongodb = {
      status: mongoState === 1 ? 'healthy' : 'unhealthy',
      state: mongoStates[mongoState] || 'unknown'
    };
    if (mongoState !== 1) {
      health.status = 'degraded';
    }
  } catch (error) {
    health.checks.mongodb = { status: 'unhealthy', error: error.message };
    health.status = 'degraded';
  }
  
  // Check Redis connection (if enabled)
  try {
    const redisConnected = isRedisConnected();
    health.checks.redis = {
      status: redisConnected ? 'healthy' : 'not-configured',
      enabled: process.env.USE_REDIS === 'true'
    };
  } catch (error) {
    health.checks.redis = { status: 'not-configured' };
  }

  // Add response time
  health.responseTime = `${Date.now() - startTime}ms`;
  
  // Minimal info in production to prevent fingerprinting
  if (isProduction) {
    return res.status(health.status === 'healthy' ? 200 : 503).json({
      status: health.status,
      timestamp: health.timestamp,
      responseTime: health.responseTime
    });
  }

  // Full info in dev/staging
  const memoryUsage = process.memoryUsage();
  const uptime = process.uptime();

  res.status(health.status === 'healthy' ? 200 : 503).json({
    ...health,
    uptime: uptime,
    memory: {
      heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
      rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`
    },
    connectedSockets: connectedUsers.size,
    nodeVersion: process.version,
    environment: process.env.NODE_ENV || 'development'
  });
});

// Heartbeat endpoint for monitoring services (Railway, Netlify, etc.)
app.get("/heartbeat", (req, res) => {
  // Minimal info in production to prevent fingerprinting
  if (isProduction) {
    return res.json({
      status: "ok",
      timestamp: new Date().toISOString()
    });
  }

  // Full info in dev/staging
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    environment: process.env.NODE_ENV || "development",
    connectedSockets: connectedUsers.size
  });
});

// Preflight helper for all routes

// CSRF token endpoint - using custom csrfProtection middleware
// The token is signed with timestamp and validated on subsequent requests
app.get("/api/csrf-token", (req, res) => {
  try {
    // Generate token using the csrfToken() method attached by csrfProtection middleware
    const token = req.csrfToken();

    res.json({
      csrfToken: token,
      csrfEnabled: true,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[CSRF] Error generating token:', error.message);
    res.status(500).json({ error: "Failed to generate CSRF token" });
  }
});

// ==================== TEST ENDPOINTS (Development/Staging Only) ====================

// Middleware to block test endpoints in production
const blockInProduction = (req, res, next) => {
  if (isProduction) {
    return res.status(403).json({
      error: "Test endpoints are disabled in production",
      code: "FORBIDDEN"
    });
  }
  next();
};

// Test CSRF middleware để kiểm tra token
app.post("/api/test-csrf-middleware", blockInProduction, (req, res) => {
  // Endpoint này đã được bảo vệ bởi middleware CSRF ở trên
  res.json({
    success: true,
    message: "Passed CSRF protection!",
    receivedToken: req.headers['x-csrf-token'] || req.body?._csrf,
    sessionID: req.cookies.sessionID
  });
});

// Test refresh endpoint without CSRF
app.post("/api/test-refresh", blockInProduction, (req, res) => {
  res.json({
    success: true,
    message: "Refresh endpoint test - no CSRF required",
    timestamp: new Date().toISOString(),
    cookies: req.cookies,
    hasRefreshToken: !!req.cookies?.refreshToken,
    method: req.method,
    path: req.path
  });
});

// Authentication status endpoint
app.get("/api/auth-status", (req, res) => {
  // Minimal info in production to prevent cookie structure disclosure
  if (isProduction) {
    return res.json({
      authenticated: !!req.cookies?.accessToken,
      timestamp: new Date().toISOString()
    });
  }

  // Full info in dev/staging
  res.json({
    authenticated: false, // This endpoint doesn't require auth
    timestamp: new Date().toISOString(),
    cookies: req.cookies,
    cookieNames: Object.keys(req.cookies || {}),
    hasRefreshToken: !!req.cookies?.refreshToken,
    hasAccessToken: !!req.cookies?.accessToken,
    hasCSRFToken: !!req.cookies?._csrf,
    environment: process.env.NODE_ENV,
    message: "Use this endpoint to check authentication status"
  });
});

// Clear rate limit endpoint (for debugging) - ADMIN ONLY
app.post("/api/clear-rate-limit", async (req, res) => {
  try {
    // Import auth middleware
    const { authRequired } = await import('./middleware/auth.js');
    
    // Check admin role
    await new Promise((resolve, reject) => {
      authRequired(req, res, (err) => {
        if (err) return reject(err);
        if (!req.user || req.user.role !== 'admin') {
          return reject(new Error('Admin access required'));
        }
        resolve();
      });
    });

    const { ip } = req.body;
    const targetIP = ip || req.ip;

    if (!global.refreshAttempts) {
      global.refreshAttempts = new Map();
    }

    const key = `refresh:${targetIP}`;
    const hadLimit = global.refreshAttempts.has(key);
    global.refreshAttempts.delete(key);

    res.json({
      success: true,
      message: `Rate limit cleared for IP: ${targetIP}`,
      hadLimit: hadLimit,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(error.message === 'Admin access required' ? 403 : 500).json({
      error: error.message || "Failed to clear rate limit",
      details: process.env.NODE_ENV === 'production' ? undefined : error.message
    });
  }
});

// Test timeout endpoint
app.get("/api/test-timeout", blockInProduction, (req, res) => {
  const delay = parseInt(req.query.delay) || 5000;
  const startTime = Date.now();

  setTimeout(() => {
    const duration = Date.now() - startTime;
    res.json({
      success: true,
      message: `Test completed after ${duration}ms`,
      requestedDelay: delay,
      actualDelay: duration
    });
  }, delay);
});

// Test token generation endpoint
app.post("/api/test-token-generation", blockInProduction, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: "Email and password required",
        code: "MISSING_CREDENTIALS"
      });
    }

    // Import dependencies
    const User = (await import("./models/User.js")).default;
    const bcrypt = (await import("bcryptjs")).default;
    const { generateTokenPair } = await import("./middleware/jwtSecurity.js");

    // Find user
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({
        error: "Invalid credentials",
        code: "INVALID_CREDENTIALS"
      });
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({
        error: "Invalid credentials",
        code: "INVALID_CREDENTIALS"
      });
    }

    // Test token generation
    const tokens = await generateTokenPair(user);

    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      },
      tokens: {
        accessToken: tokens.accessToken ? "GENERATED" : "MISSING",
        refreshToken: tokens.refreshToken ? "GENERATED" : "MISSING"
      },
      message: "Token generation test successful"
    });

  } catch (error) {
    res.status(500).json({
      error: "Token generation failed",
      code: "TOKEN_GENERATION_ERROR",
      details: process.env.NODE_ENV === "production" ? undefined : error.message,
      stack: process.env.NODE_ENV === "production" ? undefined : error.stack
    });
  }
});

// Test login endpoint
app.post("/api/test-login", blockInProduction, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: "Email and password required",
        code: "MISSING_CREDENTIALS"
      });
    }

    // Import User model
    const User = (await import("./models/User.js")).default;
    const bcrypt = (await import("bcryptjs")).default;
    const { generateTokenPair } = await import("./middleware/jwtSecurity.js");
    const { buildCookieOptions } = await import("./utils/cookieOptions.js");

    // Find user
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({
        error: "Invalid credentials",
        code: "INVALID_CREDENTIALS"
      });
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({
        error: "Invalid credentials",
        code: "INVALID_CREDENTIALS"
      });
    }

    // Generate tokens
    const tokens = await generateTokenPair(user);

    // Set cookies
    const accessCookieOptions = buildCookieOptions(15 * 60 * 1000);
    const refreshCookieOptions = buildCookieOptions(30 * 24 * 60 * 60 * 1000);

    res.cookie("accessToken", tokens.accessToken, accessCookieOptions);
    res.cookie("refreshToken", tokens.refreshToken, refreshCookieOptions);

    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      },
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      message: "Test login successful"
    });

  } catch (error) {
    res.status(500).json({
      error: "Internal server error",
      code: "INTERNAL_ERROR",
      details: process.env.NODE_ENV === "production" ? undefined : error.message
    });
  }
});

// Test CSRF endpoint
app.post("/api/test-csrf", blockInProduction, (req, res) => {
  res.json({
    success: true,
    message: "CSRF test successful!",
    timestamp: new Date().toISOString(),
    receivedCSRFToken: req.headers['x-csrf-token'],
    receivedCSRFCookie: req.cookies._csrf,
    origin: req.get('Origin')
  });
});

// CSRF và Session status endpoint
app.get("/api/csrf-status", (req, res) => {
  const csrfCookie = req.cookies?._csrf;

  // Minimal info in production
  if (isProduction) {
    return res.json({
      success: true,
      timestamp: new Date().toISOString(),
      csrfEnabled: true,
      csrfCookiePresent: Boolean(csrfCookie)
    });
  }

  // Full info in dev/staging
  const preview = csrfCookie ? `${csrfCookie.substring(0, 6)}...` : null;

  res.json({
    success: true,
    timestamp: new Date().toISOString(),
    csrfEnabled: true,
    csrfCookiePresent: Boolean(csrfCookie),
    csrfCookiePreview: preview,
    cookiesReceived: req.cookies
  });
});

// CORS preflight test endpoint
app.options("/api/cors-test", blockInProduction, (req, res) => {
  res.json({
    success: true,
    message: "CORS preflight successful!",
    timestamp: new Date().toISOString(),
    origin: req.get('Origin'),
    headers: req.headers,
    method: req.method
  });
});

app.post("/api/cors-test", blockInProduction, (req, res) => {
  res.json({
    success: true,
    message: "CORS POST test successful!",
    timestamp: new Date().toISOString(),
    origin: req.get('Origin'),
    method: req.method,
    headers: {
      'x-csrf-token': req.headers['x-csrf-token'],
      'authorization': req.headers['authorization'] ? 'present' : 'missing'
    }
  });
});

// Track API calls for monitoring
if ((process.env.DISABLE_API_TRACKING ?? "false") !== "true") {
  app.use("/api", trackAPICall);
}

// Mount tất cả API routes with specific rate limiting
// Auth routes need longer timeout due to token generation and database operations
app.use("/api/auth", requestTimeout(60000), authLimiter, authRoutes); // Authentication routes (auth-secure.js) with logout
app.use("/api/auth-token", requestTimeout(60000), authLimiter, authTokenRoutes); // Token validation routes (auth-token.js)
app.use("/api/posts", postsLimiter, postRoutes); // Blog posts CRUD with specific rate limiting
app.use("/api/comments", commentRoutes); // Comments system
app.use("/api/uploads", uploadLimiter, uploadRoutes); // File uploads
app.use("/api/admin", apiLimiter, adminRoutes); // Admin panel with rate limiting
app.use("/api/friends", friendRoutes); // Friend system
app.use("/api/users", userRoutes); // User profiles
app.use("/api/notifications", notificationRoutes); // Notifications
app.use("/api/messages", messageLimiter, messageRoutes); // Chat/messaging
app.use("/api/groups", groupPostsRouter); // Group posts
app.use("/api/support", supportRoutes); // Support tickets
app.use("/api/groups", groupRoutes); // Groups/communities
app.use("/api/events", eventRoutes); // Events
app.use("/api/media", mediaRoutes); // Media
app.use("/api/api-monitoring", apiLimiter, apiMonitoringRoutes); // API Monitoring with rate limiting
app.use("/api/sitemap", sitemapRoutes); // Sitemap generation
app.use("/api/search", searchHistoryRoutes); // Search history
app.use("/api/stories", apiLimiter, storyRoutes); // Stories with rate limiting
app.use("/api/polls", apiLimiter, pollRoutes); // Polls/Surveys with rate limiting
app.use("/api/health", healthRoutes); // Health check endpoint
app.use("/api/admin/roles", roleRoutes); // Roles routes
app.use("/api/chatbot", apiLimiter, chatbotRoutes); // AI Chatbot with rate limiting
app.use("/api/security", securityMonitoringRoutes); // Security monitoring routes (admin only)
app.use("/api/cultivation", apiLimiter, cultivationRoutes); // Tu Tiên system routes
app.use("/api/battle", apiLimiter, battleRoutes); // Battle/PK routes
app.use("/api/equipment", apiLimiter, equipmentRoutes); // Equipment management routes

// Làm cho Socket.IO instance có thể truy cập từ routes
app.set("io", io);

// ==================== ERROR HANDLING ====================

// CSRF error handler
app.use((err, req, res, next) => {
  if (err && err.code === 'EBADCSRFTOKEN') {
    // CSRF token validation failed
    return res.status(403).json({
      error: 'invalid csrf token',
      code: 'INVALID_CSRF_TOKEN'
    });
  }
  return next(err);
});
app.use(notFound);
// Global error handler
app.use(errorHandler);

// ==================== SOCKET.IO EVENT HANDLING ====================

// Import Socket rate limiting
import { socketRateLimitMiddleware, applyRateLimitToSocket } from './middleware/socketRateLimit.js';

// Track connected users to prevent memory leaks
const connectedUsers = new Map();

// Socket rate limiting middleware - MUST be first
io.use(socketRateLimitMiddleware);

// Socket authentication middleware
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;

    if (token) {
      try {
        const jwt = await import("jsonwebtoken");
        const payload = jwt.default.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(payload.id).select("-password");

        if (user) {
          socket.userId = user._id;
          socket.user = user;
        }
      } catch (error) {
        // Invalid token, continue without authentication
      }
    }

    next();
  } catch (error) {
    next();
  }
});

io.on("connection", async (socket) => {
  // Apply rate limiting to all socket events
  applyRateLimitToSocket(socket);
  
  // Store connection info
  connectedUsers.set(socket.id, {
    userId: socket.userId,
    user: socket.user,
    joinedRooms: new Set(),
    connectedAt: new Date()
  });

  // Cập nhật trạng thái online khi user kết nối
  if (socket.userId) {
    try {
      await User.findByIdAndUpdate(socket.userId, {
        isOnline: true,
        lastSeen: new Date()
      });

      // Thông báo cho tất cả bạn bè về trạng thái online
      const user = await User.findById(socket.userId).populate('friends', '_id');
      if (user && user.friends) {
        //  FIX BLOCKING forEach: Use setImmediate to yield event loop
        // Batch emit in chunks to prevent blocking
        const friends = user.friends;
        const BATCH_SIZE = 50; // Process 50 friends at a time

        for (let i = 0; i < friends.length; i += BATCH_SIZE) {
          const batch = friends.slice(i, i + BATCH_SIZE);

          // Yield to event loop between batches
          setImmediate(() => {
            batch.forEach(friend => {
              if (friend && friend._id) {
                try {
                  io.to(`user-${friend._id}`).emit('friend-online', {
                    userId: socket.userId,
                    isOnline: true,
                    lastSeen: new Date()
                  });
                } catch (err) {
                  // Silent error - don't break the loop
                }
              }
            });
          });
        }
      }
    } catch (error) {
      // Error updating user online status
    }
  }

  // ==================== WEBRTC CALL SIGNALING ====================

  // WebRTC signaling - xử lý call offer với error handling
  socket.on("call-offer", ({ offer, conversationId, isVideo }) => {
    try {
      if (!conversationId || !offer || !offer.type || !offer.sdp) {
        return;
      }

      // SECURITY: Only allow if user is authenticated and joined conversation
      if (!socket.userId) {
        return;
      }

      if (!isInConversationRoom(socket, conversationId)) {
        return;
      }

      const roomName = `conversation-${conversationId}`;

      // Gửi offer chỉ đến các users khác trong conversation (không gửi cho chính người gọi)
      socket.to(roomName).emit("call-offer", {
        offer,
        conversationId,
        caller: socket.userId || socket.user?._id || socket.user?.id || "unknown", // User ID của người gọi
        callerSocketId: socket.id, // Socket ID của người gọi để kiểm tra
        callerInfo: socket.user || {}, // Thông tin đầy đủ người gọi
        isVideo: isVideo || false // Phân biệt voice/video call
      });
    } catch (error) {
      // Silent error handling
    }
  });

  // Xử lý call answer từ callee
  socket.on("call-answer", ({ answer, conversationId }) => {
    try {
      if (!conversationId) {
        return;
      }

      // SECURITY: Only allow if user is authenticated and joined conversation
      if (!socket.userId || !isInConversationRoom(socket, conversationId)) {
        return;
      }

      // Gửi answer về cho caller
      socket.to(`conversation-${conversationId}`).emit("call-answer", {
        answer,
        conversationId
      });
    } catch (error) {
      // Silent error handling
    }
  });

  // Xử lý ICE candidates
  socket.on("call-candidate", ({ candidate, conversationId }) => {
    try {
      if (!conversationId) {
        return;
      }

      // SECURITY: Only allow if user is authenticated and joined conversation
      if (!socket.userId || !isInConversationRoom(socket, conversationId)) {
        return;
      }

      // Gửi ICE candidate đến các users khác
      socket.to(`conversation-${conversationId}`).emit("call-candidate", {
        candidate,
        conversationId
      });
    } catch (error) {
      // Silent error handling
    }
  });

  // Xử lý kết thúc cuộc gọi
  socket.on("call-end", ({ conversationId }) => {
    try {
      if (!conversationId) {
        return;
      }

      // SECURITY: Only allow if user is authenticated and joined conversation
      if (!socket.userId || !isInConversationRoom(socket, conversationId)) {
        return;
      }

      // Thông báo kết thúc cuộc gọi đến tất cả users trong conversation
      socket.to(`conversation-${conversationId}`).emit("call-end", {
        conversationId
      });
    } catch (error) {
      // Silent error handling
    }
  });

  // Join user vào personal room để nhận notifications
  socket.on("join-user", (userId) => {
    try {
      if (!userId) {
        return;
      }
      
      // SECURITY: Only allow user to join their own room
      if (!socket.userId || socket.userId.toString() !== userId.toString()) {
        socket.emit('error', { 
          code: 'FORBIDDEN', 
          message: 'Cannot join another user\'s room' 
        });
        return;
      }
      
      socket.join(`user-${userId}`);
      const userInfo = connectedUsers.get(socket.id);
      if (userInfo) {
        userInfo.userId = userId;
        userInfo.joinedRooms.add(`user-${userId}`);
      }
    } catch (error) {
      // Silent error handling
    }
  });

  socket.on("join-api-monitoring", () => {
    try {
      // SECURITY: Only allow admin to join API monitoring room
      if (!socket.user || socket.user.role !== 'admin') {
        socket.emit('error', { 
          code: 'FORBIDDEN', 
          message: 'Admin access required for API monitoring' 
        });
        return;
      }
      
      socket.join("api-monitoring");
      const userInfo = connectedUsers.get(socket.id);
      if (userInfo) {
        userInfo.joinedRooms.add("api-monitoring");
      }
    } catch (error) {
      // Silent error handling
    }
  });

  // Join conversation room để nhận messages real-time
  socket.on("join-conversation", async (conversationId) => {
    try {
      if (!conversationId) {
        return socket.emit("conversation-joined", {
          conversationId,
          success: false,
          error: "INVALID_CONVERSATION_ID"
        });
      }

      // SECURITY: Require authentication
      if (!socket.userId) {
        return socket.emit("conversation-joined", {
          conversationId,
          success: false,
          error: "AUTH_REQUIRED"
        });
      }

      // SECURITY: Verify user is participant in conversation
      const Conversation = (await import("./models/Conversation.js")).default;
      const conversation = await Conversation.findOne({
        _id: conversationId,
        "participants.user": socket.userId
      }).select("_id");

      if (!conversation) {
        return socket.emit("conversation-joined", {
          conversationId,
          success: false,
          error: "FORBIDDEN"
        });
      }

      socket.join(`conversation-${conversationId}`);

      const userInfo = connectedUsers.get(socket.id);
      if (userInfo) {
        userInfo.joinedRooms.add(`conversation-${conversationId}`);
      }

      // Emit confirmation về client
      socket.emit("conversation-joined", {
        conversationId,
        success: true,
        message: "Successfully joined conversation"
      });
    } catch (error) {
      socket.emit("conversation-joined", {
        conversationId,
        success: false,
        error: "INTERNAL_ERROR"
      });
    }
  });

  // Rời conversation room
  socket.on("leave-conversation", (conversationId) => {
    try {
      if (!conversationId) {
        return;
      }
      socket.leave(`conversation-${conversationId}`);
      const userInfo = connectedUsers.get(socket.id);
      if (userInfo) {
        userInfo.joinedRooms.delete(`conversation-${conversationId}`);
      }
    } catch (error) {
      // Silent error handling
    }
  });

  // ==================== HELPER FUNCTIONS ====================

  // Helper to check if socket is in conversation room
  const isInConversationRoom = (socket, conversationId) => {
    const userInfo = connectedUsers.get(socket.id);
    return userInfo?.joinedRooms.has(`conversation-${conversationId}`);
  };

  // ==================== POLL REALTIME VOTING ====================

  // Join poll room khi user vào xem poll
  socket.on("join-poll", async (pollId) => {
    try {
      if (!pollId) {
        return;
      }

      // SECURITY: Require authentication for polls
      if (!socket.userId) {
        return;
      }

      // SECURITY: Verify user has access to poll's post
      const Poll = (await import("./models/Poll.js")).default;
      const Post = (await import("./models/Post.js")).default;
      
      const poll = await Poll.findById(pollId).select("post").lean();
      if (!poll) {
        return;
      }

      // Check if post exists and user has access (published or author)
      const post = await Post.findOne({
        _id: poll.post,
        $or: [
          { status: "published" },
          { author: socket.userId }
        ]
      }).select("_id").lean();

      if (!post) {
        return;
      }

      socket.join(`poll-${pollId}`);
      const userInfo = connectedUsers.get(socket.id);
      if (userInfo) {
        userInfo.joinedRooms.add(`poll-${pollId}`);
      }
    } catch (error) {
      // Silent error handling
    }
  });

  // Leave poll room khi user rời khỏi poll
  socket.on("leave-poll", (pollId) => {
    try {
      if (!pollId) {
        return;
      }
      socket.leave(`poll-${pollId}`);
      const userInfo = connectedUsers.get(socket.id);
      if (userInfo) {
        userInfo.joinedRooms.delete(`poll-${pollId}`);
      }
    } catch (error) {
      // Silent error handling
    }
  });

  // Handle connection errors
  socket.on("error", (error) => {
    // Socket error
  });

  // Xử lý khi user disconnect với cleanup
  socket.on("disconnect", async (reason) => {
    // Cập nhật trạng thái offline khi user ngắt kết nối
    const userInfo = connectedUsers.get(socket.id);
    if (userInfo && userInfo.userId) {
      try {
        // Validate userId before query
        if (!mongoose.Types.ObjectId.isValid(userInfo.userId)) {
          console.warn('[WARN][SOCKET] Invalid userId on disconnect:', userInfo.userId);
          connectedUsers.delete(socket.id);
          return;
        }

        await User.findByIdAndUpdate(userInfo.userId, {
          isOnline: false,
          lastSeen: new Date()
        });

        // Thông báo cho tất cả bạn bè về trạng thái offline
        const user = await User.findById(userInfo.userId).populate('friends', '_id');
        if (user && user.friends && Array.isArray(user.friends)) {
          //  FIX BLOCKING forEach: Batch emit with setImmediate
          const friends = user.friends;
          const BATCH_SIZE = 50;

          for (let i = 0; i < friends.length; i += BATCH_SIZE) {
            const batch = friends.slice(i, i + BATCH_SIZE);

            setImmediate(() => {
              batch.forEach(friend => {
                if (friend && friend._id) {
                  try {
                    io.to(`user-${friend._id}`).emit('friend-offline', {
                      userId: userInfo.userId,
                      isOnline: false,
                      lastSeen: new Date()
                    });
                  } catch (err) {
                    // Silent error handling
                  }
                }
              });
            });
          }
        }
      } catch (error) {
        console.error('[ERROR][SOCKET] Error updating user offline status:', error.message);
      }
    }

    // Clean up user tracking
    connectedUsers.delete(socket.id);
  });
});

//  FIX BLOCKING setInterval: Wrap heavy operations in setImmediate
// Periodic cleanup of stale connections
setInterval(() => {
  // Yield to event loop immediately
  setImmediate(() => {
    const now = new Date();
    const staleThreshold = 5 * 60 * 1000; // 5 minutes

    for (const [socketId, userInfo] of connectedUsers.entries()) {
      if (now - userInfo.connectedAt > staleThreshold) {
        if (process.env.NODE_ENV === 'development') {
          // Cleaning up stale connection
        }
        connectedUsers.delete(socketId);
      }
    }
  });
}, 60000); // Run every minute

// Memory monitoring and warnings
setInterval(() => {
  // Yield to event loop for non-critical monitoring
  setImmediate(() => {
    const memoryUsage = process.memoryUsage();
    const heapUsedMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
    const heapTotalMB = Math.round(memoryUsage.heapTotal / 1024 / 1024);
    const rssMB = Math.round(memoryUsage.rss / 1024 / 1024);

    // Log memory stats every 5 minutes (only in development)
    if (process.env.NODE_ENV === 'development') {
      console.log(`[INFO][MEMORY] Heap: ${heapUsedMB}MB/${heapTotalMB}MB, RSS: ${rssMB}MB, Connected: ${connectedUsers.size}`);
    }

    // Warning if memory usage is high
    if (heapUsedMB > 400) { // 400MB threshold
      console.warn(`[WARN][SERVER] High memory usage: ${heapUsedMB}MB heap used`);
    }

    // Critical warning if memory usage is very high
    if (heapUsedMB > 800) { // 800MB threshold
      console.error(`[ERROR][SERVER] Critical memory usage: ${heapUsedMB}MB heap used - consider restarting`);
    }
  });
}, 5 * 60 * 1000); // Every 5 minutes

// ==================== PROCESS ERROR HANDLERS ====================

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('[ERROR][SERVER] Unhandled Rejection at:', promise, 'reason:', reason);
  // Exit in all environments to allow process manager (PM2/Docker/k8s) to restart cleanly
  // This prevents running in corrupted state
  console.log('[INFO][SERVER] Attempting graceful shutdown after unhandled rejection...');
  server.close(() => {
    console.log('[INFO][SERVER] Server closed');
    process.exit(1);
  });

  // Force exit if graceful shutdown takes too long
  setTimeout(() => {
    console.error('[ERROR][SERVER] Forced shutdown');
    process.exit(1);
  }, 10000);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('[ERROR][SERVER] Uncaught Exception:', error);
  // Graceful shutdown
  console.log('[INFO][SERVER] Attempting graceful shutdown...');
  server.close(() => {
    console.log('[INFO][SERVER] Server closed');
    process.exit(1);
  });

  // Force exit if graceful shutdown takes too long
  setTimeout(() => {
    console.error('[ERROR][SERVER] Forced shutdown');
    process.exit(1);
  }, 10000);
});

// Handle SIGTERM (e.g., from process managers)
process.on('SIGTERM', async () => {
  console.log('[INFO][SERVER] SIGTERM received, shutting down gracefully');

  // Centralized cleanup - call all cleanup functions
  try {
    // Import cleanup functions
    const { cleanupAPIMonitoring } = await import('./routes/apiMonitoring.js');
    const { cleanupJWTSecurity } = await import('./middleware/jwtSecurity.js');
    const { cleanupSecurityLogging } = await import('./middleware/securityLogging.js');

    // Run all cleanups in parallel with error handling
    await Promise.allSettled([
      cleanupAPIMonitoring(),
      Promise.resolve(cleanupJWTSecurity()),
      Promise.resolve(cleanupSecurityLogging())
    ]);

    console.log('[INFO][SERVER] All cleanup functions completed');
  } catch (error) {
    console.error('[ERROR][SERVER] Cleanup error:', error.message);
  }

  server.close(() => {
    console.log('[INFO][SERVER] Process terminated');
    process.exit(0);
  });

  // Force exit if graceful shutdown takes too long
  setTimeout(() => {
    console.error('[ERROR][SERVER] Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
});

// Handle SIGINT (Ctrl+C)
process.on('SIGINT', async () => {
  console.log('[INFO][SERVER] SIGINT received, shutting down gracefully');

  // Centralized cleanup - call all cleanup functions
  try {
    const { cleanupAPIMonitoring } = await import('./routes/apiMonitoring.js');
    const { cleanupJWTSecurity } = await import('./middleware/jwtSecurity.js');
    const { cleanupSecurityLogging } = await import('./middleware/securityLogging.js');

    await Promise.allSettled([
      cleanupAPIMonitoring(),
      Promise.resolve(cleanupJWTSecurity()),
      Promise.resolve(cleanupSecurityLogging())
    ]);

    console.log('[INFO][SERVER] All cleanup functions completed');
  } catch (error) {
    console.error('[ERROR][SERVER] Cleanup error:', error.message);
  }

  server.close(() => {
    console.log('[INFO][SERVER] Process terminated');
    process.exit(0);
  });

  // Force exit if graceful shutdown takes too long
  setTimeout(() => {
    console.error('[ERROR][SERVER] Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
});

export { app, server };
// ==================== SERVER STARTUP ====================
if (process.env.DISABLE_SERVER_START === "true") {
  console.log("[INFO][TEST] Server start skipped");
} else {
  // Check production environment before starting
  const envCheck = checkProductionEnvironment();
  if (!envCheck.isValid) {
    console.error("[ERROR][SERVER] Server startup aborted due to environment issues");
    process.exit(1);
  }

  connectDB(process.env.MONGODB_URI).then(async () => {

    // Setup database monitoring
    try {
      const { setupConnectionMonitoring } = await import("./utils/dbMonitor.js");
      setupConnectionMonitoring();
      console.log('[INFO][SERVER] Database monitoring enabled');
    } catch (monitorError) {
      console.warn('[WARN][SERVER] DB monitoring setup skipped:', monitorError.message);
    }

    // Run API monitoring cleanup after DB connection
    await cleanupInvalidEnvKeys();

    // Initialize Redis if enabled
    try {
      const { initializeRedis } = await import("./services/redisClient.js");
      await initializeRedis();
    } catch (redisError) {
      console.warn('[WARN][SERVER] Redis initialization skipped:', redisError.message);
    }

    server.listen(PORT, "0.0.0.0", () => {
      console.log(`[INFO][SERVER] Server listening on http://localhost:${PORT}`);
      console.log(`[INFO][SERVER] Network accessible on port ${PORT}`);
      console.log('[INFO][SERVER] Socket.IO ready');

      // Log environment info
      if (process.env.NODE_ENV === "production") {
        console.log("[INFO][SERVER] Production server started");
        console.log(`[INFO][SERVER] Environment: ${envCheck.environment.nodeEnv}`);
        console.log(`[INFO][SERVER] Cookie Domain: ${envCheck.environment.cookieDomain}`);
        console.log(`[INFO][SERVER] CORS Origin: ${envCheck.environment.corsOrigin}`);
      }
    });
  }).catch((error) => {
    console.error('[ERROR][SERVER] Failed to start server:', error);
    process.exit(1);
  });
}
