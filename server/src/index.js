// Import các thư viện cần thiết
import express from "express";
import helmet from "helmet"; // Security middleware
import cookieParser from "cookie-parser"; // Parse cookies
import cors from "cors"; // Cross-Origin Resource Sharing
import morgan from "morgan"; // HTTP request logger
import csrf from "csurf"; // CSRF protection
import dotenv from "dotenv"; // Environment variables
import path from "path";
import { fileURLToPath } from "url";
import { createServer } from "http"; // HTTP server
import { Server } from "socket.io"; // WebSocket server
import crypto from "crypto"; // Cryptographic functions for CSRF tokens

// Import config và middleware
import { connectDB } from "./config/db.js";
import { apiLimiter, authLimiter, authStatusLimiter, uploadLimiter, messageLimiter, postsLimiter } from "./middleware/rateLimit.js";
import { notFound, errorHandler } from "./middleware/errorHandler.js";
import { requestTimeout } from "./middleware/timeout.js";
import { authOptional } from "./middleware/auth.js";
import User from "./models/User.js";

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
import roleRoutes from "./routes/roles.js"; // Role management routes

// Load environment variables
dotenv.config();

// Tạo Express app và HTTP server
const app = express();
const server = createServer(app);

// Trust proxy để rate limiting hoạt động đúng với reverse proxy (Railway, Heroku, etc.)
app.set("trust proxy", 1);

// Danh sách các origin được phép truy cập (CORS)
const allowedOrigins = [
  // Development origins
  ...(process.env.NODE_ENV === 'development' ? [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
    "http://localhost:3000",
    "http://localhost:3001"
  ] : []),
  
  // Production origins - ưu tiên environment variables
  ...(process.env.CORS_ORIGIN?.split(",").map(o => o.trim()) || []),
  
  // Fallback production domains (nếu không có CORS_ORIGIN)
  ...(process.env.NODE_ENV === 'production' && !process.env.CORS_ORIGIN ? [
    // Custom domains
    "https://shiku.click",
    "https://www.shiku.click",
    // Netlify domains
    "https://shiku123.netlify.app",
    "https://shiku123.netlify.com"
  ] : []),
  
  // Wildcard patterns (luôn có)
  "https://*.netlify.app",
  "https://*.netlify.com"
];

// Tạo Socket.IO server với CORS configuration và improved settings
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      // Kiểm tra origin có trong danh sách allowed không
      if (!origin) {
        callback(null, true);
        return;
      }
      
      // Check exact match
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      
      // Check wildcard patterns
      const isAllowed = allowedOrigins.some(allowedOrigin => {
        if (allowedOrigin.includes('*')) {
          const pattern = allowedOrigin.replace(/\*/g, '.*');
          const regex = new RegExp(`^${pattern}$`);
          return regex.test(origin);
        }
        return false;
      });
      
      if (isAllowed) {
        callback(null, true);
      } else {
        if (process.env.NODE_ENV === 'development') {
          console.warn(" Blocked Socket.IO CORS:", origin);
        }
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true, // Cho phép gửi cookies và credentials
    optionsSuccessStatus: 200, // Hỗ trợ legacy browsers
    allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization', 'X-CSRF-Token', 'X-Refresh-Token', 'Cache-Control', 'Pragma', 'Expires'] // Added all cache related headers
  },
  // Add connection management settings
  pingTimeout: 60000, // 60 seconds
  pingInterval: 25000, // 25 seconds
  upgradeTimeout: 10000, // 10 seconds
  maxHttpBufferSize: 1e6, // 1MB
  transports: ['websocket', 'polling'],
  allowEIO3: true // Allow Engine.IO v3 clients
});

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
      upgradeInsecureRequests: []
    }
  },
  crossOriginEmbedderPolicy: false
}));

// Parse cookies từ request headers
app.use(cookieParser());

// Parse JSON body với limit 10MB (cho upload hình ảnh base64)
app.use(express.json({ limit: "10mb" }));

// CORS configuration cho HTTP requests - Enhanced for Safari compatibility
// Đặt CORS trước CSRF để đảm bảo preflight requests không bị chặn
app.use(cors({
  origin: (origin, callback) => {
    // Kiểm tra origin có trong danh sách allowed không
    if (!origin) {
      callback(null, true);
      return;
    }
    
    // Check exact match
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }
    
    // Check wildcard patterns
    const isAllowed = allowedOrigins.some(allowedOrigin => {
      if (allowedOrigin.includes('*')) {
        const pattern = allowedOrigin.replace(/\*/g, '.*');
        const regex = new RegExp(`^${pattern}$`);
        return regex.test(origin);
      }
      return false;
    });
    
    if (isAllowed) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-csrf-token', 'X-CSRF-Token', 'X-Requested-With', 'Accept', 'Origin', 'Cache-Control', 'Pragma']
}));

// CSRF protection (must be after CORS to allow preflight requests)
// Sử dụng đối tượng lưu trữ token thay vì cookie để tránh vấn đề CSRF với Safari và các thiết bị mobile
const csrfTokenStore = {};

// Thay thế csurf bằng middleware tự tạo
app.use((req, res, next) => {
  // Skip CSRF check for OPTIONS request (preflight CORS)
  if (req.method === 'OPTIONS') {
    return next();
  }

  // Tạo hoặc lấy sessionID từ cookie
  let sessionID = req.cookies.sessionID;
  if (!sessionID) {
    sessionID = crypto.randomBytes(16).toString('hex');
    res.cookie('sessionID', sessionID, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", // Only secure in production
      sameSite: "lax", // Safari-friendly sameSite setting
      maxAge: 24 * 60 * 60 * 1000, // 1 day
      path: "/" // Explicit path for Safari compatibility
    });
  }

  // Phương thức để tạo CSRF token
  req.csrfToken = () => {
    const token = crypto.randomBytes(16).toString('hex');
    csrfTokenStore[sessionID] = {
      token,
      expiry: Date.now() + (60 * 60 * 1000) // 1 hour expiry
    };
    return token;
  };

  // Kiểm tra CSRF token chỉ cho các request thay đổi dữ liệu (POST, PUT, DELETE)
  if (['POST', 'PUT', 'DELETE'].includes(req.method) && 
      !req.path.startsWith('/api/csrf-token') && 
      !req.path.startsWith('/api/auth') &&
      !req.path.includes('/test')) {
    
    const token = req.headers['x-csrf-token'] || req.body?._csrf;
    const storedToken = csrfTokenStore[sessionID]?.token;

    if (!token || !storedToken || token !== storedToken) {
      return res.status(403).json({ 
        error: "CSRF token invalid", 
        code: "INVALID_CSRF_TOKEN",
        expected: storedToken,
        received: token,
        cookiePresent: !!req.cookies.sessionID
      });
    }
  }

  next();
});

// HTTP request logging - detailed trong production, simple trong development
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

// Request timeout middleware - 30 seconds for regular requests
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

// CORS test endpoint for Safari debugging
app.options('/api/csrf-token', (req, res) => {
  try {
    res.status(200)
      .header('Access-Control-Allow-Methods', 'GET, OPTIONS')
      .header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-CSRF-Token')
      .send();
  } catch (error) {
    console.error('Error in OPTIONS handler:', error);
    res.status(500).json({ error: error.message });
  }
});

// CSRF token endpoint
app.get('/api/csrf-token', (req, res) => {
  try {
    // Make sure csrfToken method exists
    if (typeof req.csrfToken !== 'function') {
      return res.status(500).json({ 
        error: 'CSRF protection not properly initialized'
      });
    }
    
    // Generate CSRF token
    const csrfToken = req.csrfToken();
    
    // Return the CSRF token
    return res.status(200).json({ 
      csrfToken, 
      sessionID: req.cookies.sessionID || 'No session ID found'
    });
  } catch (error) {
    return res.status(500).json({ 
      error: 'Failed to generate CSRF token',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Health check endpoint with system stats
app.get("/", (req, res) => {
  const memoryUsage = process.memoryUsage();
  const uptime = process.uptime();
  
  res.json({ 
    ok: true, 
    message: "Shiku API",
    uptime: `${Math.floor(uptime / 60)} phút`,
    memory: {
      rss: `${Math.round(memoryUsage.rss / 1024 / 1024)} MB`,
      heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)} MB`,
      heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)} MB`
    },
    connectedSockets: connectedUsers.size,
    timestamp: new Date().toISOString()
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

// CSRF token endpoint
app.get("/api/csrf-token", (req, res) => {
  const token = req.csrfToken();
  res.json({ 
    csrfToken: token,
    sessionID: req.cookies.sessionID?.substr(0, 6) + "...",
    timestamp: new Date().toISOString()
  });
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
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    headers: {
      origin: req.get('Origin'),
      referer: req.get('Referer'),
      host: req.get('Host'),
      cookie: req.get('Cookie')
    },
    csrfToken: req.csrfToken(),
    csrfCookie: req.cookies._csrf,
    corsConfig: {
      allowedOrigins: allowedOrigins,
      corsOriginEnv: process.env.CORS_ORIGIN,
      environment: process.env.NODE_ENV
    }
  });
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

// Safari CORS Test endpoint
app.get("/api/safari-test", (req, res) => {
  res.json({
    success: true,
    message: "Safari CORS test successful!",
    timestamp: new Date().toISOString(),
    browser: req.headers['user-agent'],
    allHeaders: req.headers,
    cookies: req.cookies
  });
});

// CSRF và Session status endpoint
app.get("/api/csrf-status", (req, res) => {
  const sessionID = req.cookies.sessionID;
  const csrfData = sessionID ? csrfTokenStore[sessionID] : null;
  
  res.json({
    success: true,
    timestamp: new Date().toISOString(),
    sessionStatus: {
      hasSession: !!sessionID,
      sessionID: sessionID ? sessionID.substr(0, 6) + "..." : null
    },
    csrfStatus: {
      hasStoredToken: !!csrfData,
      tokenExpiry: csrfData ? new Date(csrfData.expiry).toISOString() : null,
      isTokenExpired: csrfData ? Date.now() > csrfData.expiry : null
    },
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
app.use("/api", trackAPICall);

// Mount tất cả API routes with specific rate limiting
app.use("/api/auth", authLimiter, authRoutes); // Authentication & authorization (login, register)
app.use("/api/auth", authStatusLimiter, authTokenRoutes); // Token validation (me, heartbeat)
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
app.use("/api/admin/roles", roleRoutes); // Role management

// Làm cho Socket.IO instance có thể truy cập từ routes
app.set("io", io);

// ==================== ERROR HANDLING ====================

// 404 handler cho routes không tồn tại
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
    console.error("Socket error:", error);
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
        console.error("Error updating user offline status:", error);
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
        console.log(`Cleaning up stale connection: ${socketId}`);
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
    console.log(`📊 Memory Stats - Heap: ${heapUsedMB}/${heapTotalMB}MB, RSS: ${rssMB}MB, Sockets: ${connectedUsers.size}`);
  }
  
  // Warning if memory usage is high
  if (heapUsedMB > 400) { // 400MB threshold
    console.warn(`⚠️ High memory usage detected: ${heapUsedMB}MB heap used`);
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

// ==================== SERVER STARTUP ====================

// Kết nối database rồi start server
connectDB(process.env.MONGODB_URI).then(async () => {

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Server listening on http://localhost:${PORT}`);
    console.log(`📡 Network access: http://YOUR_IP:${PORT}`);
    console.log("🔌 Socket.IO ready");
  });
}).catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
