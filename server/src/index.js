// Import các thư viện cần thiết
import 'dotenv/config';
import express from "express";
import helmet from "helmet"; // Security middleware
import cookieParser from "cookie-parser"; // Parse cookies
import cors from "cors"; // Cross-Origin Resource Sharing
import morgan from "morgan"; // HTTP request logger
import csrf from "csurf"; // CSRF protection
import path from "path";
import { fileURLToPath } from "url";
import { createServer } from "http"; // HTTP server
import { Server } from "socket.io"; // WebSocket server

// Import config và middleware
import { connectDB } from "./config/db.js";
import { apiLimiter, authLimiter, authStatusLimiter, uploadLimiter, messageLimiter, postsLimiter } from "./middleware/rateLimit.js";
import { notFound, errorHandler } from "./middleware/errorHandler.js";
import { requestTimeout } from "./middleware/timeout.js";
import { authOptional } from "./middleware/auth.js";
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
import apiMonitoringRoutes, { trackAPICall } from "./routes/apiMonitoring.js"; // API Monitoring routes
import sitemapRoutes from "./routes/sitemap.js"; // Sitemap routes
import searchHistoryRoutes from "./routes/searchHistory.js"; // Search history routes
import storyRoutes from "./routes/stories.js"; // Stories routes
import pollRoutes from "./routes/polls.js"; // Polls routes
import healthRoutes from "./routes/health.js"; // Health check routes
import roleRoutes from "./routes/roles.js"; // Roles routes
import chatbotRoutes from "./routes/chatbot.js"; // Chatbot AI routes

// Environment variables are loaded via `import 'dotenv/config'` at the top

// Tạo Express app và HTTP server
const app = express();
const server = createServer(app);

// Trust proxy để rate limiting hoạt động đúng với reverse proxy (Render, Railway, Heroku, etc.)
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
  allowEIO3: true // Allow Engine.IO v3 clients
});

// Track connected users to prevent memory leaks (single shared Map declared above)

// Port server sẽ chạy
const PORT = process.env.PORT || 4000;

// ==================== MIDDLEWARE SETUP ====================

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
      frameSrc: ["'none'"], // Anti-clickjacking protection
      frameAncestors: ["'none'"], // Anti-clickjacking protection
      upgradeInsecureRequests: []
    }
  },
  crossOriginEmbedderPolicy: false,
  // Anti-clickjacking protection
  frameguard: { action: 'deny' },
  // Prevent MIME type sniffing
  noSniff: true,
  // Additional security headers
  xssFilter: true,
  hidePoweredBy: true,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// ==================== MIDDLEWARE SETUP ====================

// Parse cookie trước
app.use(cookieParser());

// CORS cấu hình đầy đủ 
const isProd = process.env.NODE_ENV === "production";
const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "https://shiku.click",
  "https://www.shiku.click",
  "https://shiku123.netlify.app"
];

const corsOptions = {
  origin: allowedOrigins,
  credentials: true, // Cho phép gửi cookie cross-origin
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "x-csrf-token",
    "X-CSRF-Token",
    "X-Requested-With",
    "X-Session-ID",
    "Accept",
    "Origin",
    "Cache-Control",
    "Pragma"
  ],
  exposedHeaders: ["set-cookie", "Set-Cookie"]
};

// Tạo middleware
app.use(cors(corsOptions));
app.options("*", cors(corsOptions)); // Đảm bảo preflight hoạt động

// Parse JSON after CORS
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// CSRF Cookie Options - Sử dụng buildCookieOptions để đồng bộ
const csrfCookieOptions = buildCookieOptions(60 * 60 * 1000, { httpOnly: true });

// CSRF middleware (phải sau CORS, cookieParser, bodyParser)
const csrfProtection = csrf({ cookie: csrfCookieOptions });

// Custom CSRF middleware that excludes refresh endpoint
app.use((req, res, next) => {
  // Skip CSRF for refresh endpoint
  if (req.path === '/api/auth/refresh' && req.method === 'POST') {
    return next();
  }
  // Apply CSRF protection for all other routes
  csrfProtection(req, res, next);
});

// Logging và timeout
app.use(morgan(isProd ? "combined" : "dev"));
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

// Detailed health check endpoint
app.get("/health", (req, res) => {
  const memoryUsage = process.memoryUsage();
  const uptime = process.uptime();

  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: uptime,
    memory: memoryUsage,
    connectedSockets: connectedUsers.size,
    nodeVersion: process.version,
    environment: process.env.NODE_ENV || 'development'
  });
});

// Heartbeat endpoint for monitoring services (Railway, Netlify, etc.)
app.get("/heartbeat", (req, res) => {
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

// CSRF token endpoint
app.get("/api/csrf-token", (req, res) => {
  try {
    const existingSecret = req.cookies._csrf;
    
    // csurf will automatically:
    // - Reuse secret if _csrf cookie exists
    // - Create new secret if not present
    const token = req.csrfToken();
    
    res.json({
      csrfToken: token,
      csrfEnabled: true,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to generate CSRF token" });
  }
});

// Test CSRF middleware để kiểm tra token
app.post("/api/test-csrf-middleware", (req, res) => {
  // Endpoint này đã được bảo vệ bởi middleware CSRF ở trên
  res.json({
    success: true,
    message: "Passed CSRF protection!",
    receivedToken: req.headers['x-csrf-token'] || req.body?._csrf,
    sessionID: req.cookies.sessionID
  });
});

// Debug endpoint để kiểm tra CORS và CSRF
app.get("/api/debug", (req, res) => {
  const origin = req.get('Origin');
  const isOriginAllowed = allowedOrigins.some(allowedOrigin => {
    if (allowedOrigin.includes('*')) {
      const pattern = allowedOrigin.replace(/\*/g, '.*');
      const regex = new RegExp(`^${pattern}$`);
      return regex.test(origin);
    }
    return allowedOrigin === origin;
  });

  res.json({
    success: true,
    timestamp: new Date().toISOString(),
    origin: origin,
    isOriginAllowed: isOriginAllowed,
    clientAgent: getClientAgent(req),
    ip: req.ip,
    headers: {
      origin: req.get('Origin'),
      referer: req.get('Referer'),
      host: req.get('Host'),
      cookie: req.get('Cookie')
    },
    csrfToken: (typeof req.csrfToken === 'function') ? req.csrfToken() : null,
    csrfCookie: req.cookies._csrf,
    corsConfig: {
      allowedOrigins: allowedOrigins,
      corsOriginEnv: process.env.CORS_ORIGIN,
      environment: process.env.NODE_ENV
    },
    cookies: req.cookies,
    cookieNames: Object.keys(req.cookies || {})
  });
});

// Production cookie debug endpoint
app.get("/api/debug-cookies", (req, res) => {
  const isProduction = process.env.NODE_ENV === "production";
  
  res.json({
    environment: process.env.NODE_ENV,
    isProduction,
    cookies: req.cookies,
    cookieNames: Object.keys(req.cookies || {}),
    headers: {
      origin: req.get('Origin'),
      referer: req.get('Referer'),
      host: req.get('Host'),
      userAgent: req.get('User-Agent')
    },
    cookieSettings: {
      domain: isProduction ? ".shiku.click" : undefined,
      secure: isProduction,
      sameSite: "lax",
      httpOnly: true
    }
  });
});

// Test refresh endpoint without CSRF
app.post("/api/test-refresh", (req, res) => {
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
  const isProduction = process.env.NODE_ENV === "production";
  
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

// Test session persistence endpoint
app.get("/api/test-session-persistence", async (req, res) => {
  try {
    const cookies = req.cookies;
    const hasAccessToken = !!cookies?.accessToken;
    const hasRefreshToken = !!cookies?.refreshToken;
    
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      cookies: {
        accessToken: hasAccessToken ? "EXISTS" : "MISSING",
        refreshToken: hasRefreshToken ? "EXISTS" : "MISSING",
        csrf: !!cookies?._csrf ? "EXISTS" : "MISSING"
      },
      cookieNames: Object.keys(cookies || {}),
      message: "Check if cookies are properly set for session persistence"
    });
  } catch (error) {
    res.status(500).json({
      error: "Internal server error",
      details: error.message
    });
  }
});

// Clear rate limit endpoint (for debugging)
app.post("/api/clear-rate-limit", (req, res) => {
  try {
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
    res.status(500).json({
      error: "Failed to clear rate limit",
      details: error.message
    });
  }
});

// Test timeout endpoint
app.get("/api/test-timeout", (req, res) => {
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
app.post("/api/test-token-generation", async (req, res) => {
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
    
    console.log("[test-token] User found:", user.name);
    console.log("[test-token] Attempting to generate token pair...");
    
    // Test token generation
    const tokens = await generateTokenPair(user);
    
    console.log("[test-token] Token generation successful");
    console.log("[test-token] Access token length:", tokens.accessToken?.length);
    console.log("[test-token] Refresh token length:", tokens.refreshToken?.length);
    
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
        refreshToken: tokens.refreshToken ? "GENERATED" : "MISSING",
        accessTokenLength: tokens.accessToken?.length,
        refreshTokenLength: tokens.refreshToken?.length
      },
      message: "Token generation test successful"
    });
    
  } catch (error) {
    console.error("[test-token] Token generation error:", error);
    res.status(500).json({
      error: "Token generation failed",
      code: "TOKEN_GENERATION_ERROR",
      details: process.env.NODE_ENV === "production" ? undefined : error.message,
      stack: process.env.NODE_ENV === "production" ? undefined : error.stack
    });
  }
});

// Test login endpoint
app.post("/api/test-login", async (req, res) => {
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
    console.error("Test login error:", error);
    res.status(500).json({
      error: "Internal server error",
      code: "INTERNAL_ERROR",
      details: process.env.NODE_ENV === "production" ? undefined : error.message
    });
  }
});

// Test CSRF endpoint
app.post("/api/test-csrf", (req, res) => {
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
app.options("/api/cors-test", (req, res) => {
  res.json({
    success: true,
    message: "CORS preflight successful!",
    timestamp: new Date().toISOString(),
    origin: req.get('Origin'),
    headers: req.headers,
    method: req.method
  });
});

app.post("/api/cors-test", (req, res) => {
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

// Track connected users to prevent memory leaks
const connectedUsers = new Map();

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
        user.friends.forEach(friend => {
          io.to(`user-${friend._id}`).emit('friend-online', {
            userId: socket.userId,
            isOnline: true,
            lastSeen: new Date()
          });
        });
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
  socket.on("join-conversation", (conversationId) => {
    try {
      if (!conversationId) {
        return;
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
        error: error.message
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

  // ==================== POLL REALTIME VOTING ====================

  // Join poll room khi user vào xem poll
  socket.on("join-poll", (pollId) => {
    try {
      if (!pollId) {
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
        await User.findByIdAndUpdate(userInfo.userId, {
          isOnline: false,
          lastSeen: new Date()
        });

        // Thông báo cho tất cả bạn bè về trạng thái offline
        const user = await User.findById(userInfo.userId).populate('friends', '_id');
        if (user && user.friends) {
          user.friends.forEach(friend => {
            io.to(`user-${friend._id}`).emit('friend-offline', {
              userId: userInfo.userId,
              isOnline: false,
              lastSeen: new Date()
            });
          });
        }
      } catch (error) {
        // Error updating user offline status
      }
    }

    // Clean up user tracking
    connectedUsers.delete(socket.id);
  });
});

// Periodic cleanup of stale connections
setInterval(() => {
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
}, 60000); // Run every minute

// Memory monitoring and warnings
setInterval(() => {
  const memoryUsage = process.memoryUsage();
  const heapUsedMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
  const heapTotalMB = Math.round(memoryUsage.heapTotal / 1024 / 1024);
  const rssMB = Math.round(memoryUsage.rss / 1024 / 1024);

  // Log memory stats every 5 minutes (only in development)
  if (process.env.NODE_ENV === 'development') {
    // Memory stats logged
  }

  // Warning if memory usage is high
  if (heapUsedMB > 400) { // 400MB threshold
    // High memory usage detected
  }

  // Critical warning if memory usage is very high
  if (heapUsedMB > 800) { // 800MB threshold
    console.error(`🚨 Critical memory usage: ${heapUsedMB}MB heap used - consider restarting`);
  }
}, 5 * 60 * 1000); // Every 5 minutes

// ==================== PROCESS ERROR HANDLERS ====================

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit process in production, just log the error
  if (process.env.NODE_ENV !== 'production') {
    process.exit(1);
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // Graceful shutdown
  console.log('Attempting graceful shutdown...');
  server.close(() => {
    console.log('Server closed');
    process.exit(1);
  });

  // Force exit if graceful shutdown takes too long
  setTimeout(() => {
    console.error('Forced shutdown');
    process.exit(1);
  }, 10000);
});

// Handle SIGTERM (e.g., from process managers)
process.on('SIGTERM', () => {
  console.log('📡 SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
  });
});

// Handle SIGINT (Ctrl+C)
process.on('SIGINT', () => {
  console.log('📡 SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
  });
});

export { app, server };
// ==================== SERVER STARTUP ====================
if (process.env.DISABLE_SERVER_START === "true") {
  console.log("[TEST] Server start skipped");
} else {
  // Check production environment before starting
  const envCheck = checkProductionEnvironment();
  if (!envCheck.isValid) {
    console.error("❌ Server startup aborted due to environment issues");
    process.exit(1);
  }

  connectDB(process.env.MONGODB_URI).then(async () => {

    server.listen(PORT, "0.0.0.0", () => {
      console.log(`Server listening on http://localhost:${PORT}`);
      console.log(`Network access: http://YOUR_IP:${PORT}`);
      console.log('✅ Socket.IO ready');
      
      // Log environment info
      if (process.env.NODE_ENV === "production") {
        console.log("🚀 Production server started");
        console.log(`Environment: ${envCheck.environment.nodeEnv}`);
        console.log(`Cookie Domain: ${envCheck.environment.cookieDomain}`);
        console.log(`CORS Origin: ${envCheck.environment.corsOrigin}`);
      }
    });
  }).catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });
}


