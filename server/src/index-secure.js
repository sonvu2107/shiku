// Import các thư viện cần thiết
import express from "express";
import helmet from "helmet"; // Security middleware
import cookieParser from "cookie-parser"; // Parse cookies
import cors from "cors"; // Cross-Origin Resource Sharing
import morgan from "morgan"; // HTTP request logger
import dotenv from "dotenv"; // Environment variables
import path from "path";
import { fileURLToPath } from "url";
import { createServer } from "http"; // HTTP server
import { Server } from "socket.io"; // WebSocket server

// Import config và middleware
import { connectDB } from "./config/db.js";
import { securityConfig, validateEnvVars } from "./config/env.js";
import { apiLimiter, authLimiter, uploadLimiter, messageLimiter, postsLimiter } from "./middleware/rateLimit.js";
import { notFound, errorHandler } from "./middleware/errorHandler.js";
import { requestTimeout } from "./middleware/timeout.js";
import { authOptional } from "./middleware/jwtSecurity.js";
import User from "./models/User.js";

// Import security middleware
import {
  requestLogger,
  authLogger,
  fileUploadLogger,
  adminActionLogger,
  suspiciousActivityDetector,
  rateLimitLogger,
  unauthorizedAccessLogger
} from "./middleware/securityLogging.js";
import { proxyDebugMiddleware } from "./middleware/proxyDebug.js";
import { 
  rateLimitLogger,
  authRateLimitLogger,
  uploadRateLimitLogger,
  messageRateLimitLogger,
  postsRateLimitLogger
} from "./middleware/rateLimitLogger.js";

// Import tất cả routes
import authRoutes from "./routes/auth-secure.js"; // Secure authentication routes
import postRoutes from "./routes/posts-secure.js"; // Secure blog post routes
import uploadRoutes from "./routes/uploads-secure.js"; // Secure file upload routes
import commentRoutes from "./routes/comments.js"; // Comment routes
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

// Load environment variables
dotenv.config();

// Validate environment variables
validateEnvVars();

// Tạo Express app và HTTP server
const app = express();
const server = createServer(app);

// Trust proxy để rate limiting hoạt động đúng với reverse proxy (Railway, Heroku, etc.)
app.set("trust proxy", 1);

// Tạo Socket.IO server với CORS configuration và improved settings
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      console.log("🔌 Socket.IO Origin:", origin);
      // Cho phép requests từ allowed origins hoặc same-origin
      if (!origin || securityConfig.cors.origins.includes(origin)) {
        callback(null, true);
      } else {
        console.warn("❌ Blocked Socket.IO CORS:", origin);
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true // Cho phép gửi cookies và credentials
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
app.use(helmet(securityConfig.security.helmet));

// Parse cookies từ request headers
app.use(cookieParser());

// CORS configuration cho HTTP requests
app.use(cors({
  origin: (origin, callback) => {
    console.log("🌐 HTTP Request Origin:", origin);
    console.log("✅ Allowed Origins:", securityConfig.cors.origins);
    // Kiểm tra origin có trong danh sách allowed không
    if (!origin || securityConfig.cors.origins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn("❌ Blocked HTTP CORS:", origin);
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: securityConfig.cors.credentials // Cho phép gửi cookies và auth headers
}));

// Parse JSON body với limit 10MB (cho upload hình ảnh base64)
app.use(express.json({ limit: "10mb" }));

// HTTP request logging - detailed trong production, simple trong development
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

// Request timeout middleware - 30 seconds for regular requests
app.use(requestTimeout(30000));

// Security logging middleware
app.use(proxyDebugMiddleware); // Debug proxy info
app.use(requestLogger);
app.use(authLogger);
app.use(fileUploadLogger);
app.use(adminActionLogger);
app.use(suspiciousActivityDetector);
app.use(rateLimitLogger);
app.use(unauthorizedAccessLogger);

// Rate limiting cho tất cả API routes - REMOVED to avoid double limiting
// app.use("/api", apiLimiter); // Bỏ để tránh double rate limiting

// ==================== STATIC FILES ====================

// Setup __dirname cho ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Serve static uploaded files
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

// ==================== ROUTES SETUP ====================

// Health check endpoint with system stats
app.get("/", (req, res) => {
  const memoryUsage = process.memoryUsage();
  const uptime = process.uptime();
  
  res.json({ 
    ok: true, 
    message: "Blog API - Secure Version",
    version: "2.0.0",
    uptime: `${Math.floor(uptime / 60)} phút`,
    memory: {
      rss: `${Math.round(memoryUsage.rss / 1024 / 1024)} MB`,
      heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)} MB`,
      heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)} MB`
    },
    connectedSockets: connectedUsers.size,
    timestamp: new Date().toISOString(),
    security: {
      helmet: true,
      cors: true,
      rateLimit: true,
      inputValidation: true,
      fileUploadSecurity: true,
      jwtSecurity: true
    }
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
    environment: process.env.NODE_ENV || 'development',
    security: {
      helmet: true,
      cors: true,
      rateLimit: true,
      inputValidation: true,
      fileUploadSecurity: true,
      jwtSecurity: true
    }
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

// Mount tất cả API routes with specific rate limiting
app.use("/api/auth", authLimiter, authRateLimitLogger, authRoutes); // Secure authentication & authorization
app.use("/api/posts", postsLimiter, postsRateLimitLogger, postRoutes); // Secure blog posts CRUD
app.use("/api/comments", commentRoutes); // Comments system
app.use("/api/uploads", uploadLimiter, uploadRateLimitLogger, uploadRoutes); // Secure file uploads
app.use("/api/admin", adminRoutes); // Admin panel
app.use("/api/friends", friendRoutes); // Friend system
app.use("/api/users", userRoutes); // User profiles
app.use("/api/notifications", notificationRoutes); // Notifications
app.use("/api/messages", messageLimiter, messageRateLimitLogger, messageRoutes); // Chat/messaging
app.use("/api/groups", groupPostsRouter); // Group posts
app.use("/api/support", supportRoutes); // Support tickets
app.use("/api/groups", groupRoutes); // Groups/communities
app.use("/api/events", eventRoutes); // Events
app.use("/api/media", mediaRoutes); // Media

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

// Socket.IO connection handling
io.on("connection", (socket) => {
  console.log("🔌 New socket connection:", socket.id);
  
  // Handle authentication
  socket.on("authenticate", async (data) => {
    try {
      const { token } = data;
      if (!token) {
        socket.emit("auth_error", { message: "Token is required" });
        return;
      }

      // Verify token
      const jwt = await import("jsonwebtoken");
      const payload = jwt.default.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(payload.id).select("-password");
      
      if (!user) {
        socket.emit("auth_error", { message: "Invalid token" });
        return;
      }

      // Store user info
      socket.userId = user._id.toString();
      socket.user = user;
      connectedUsers.set(socket.id, user);
      
      // Join user to their personal room
      socket.join(`user-${user._id}`);
      
      // Update user online status
      user.isOnline = true;
      user.lastSeen = new Date();
      await user.save();
      
      socket.emit("authenticated", { user: { id: user._id, name: user.name, role: user.role } });
      console.log(`✅ User ${user.name} authenticated via socket`);
      
    } catch (error) {
      console.error("Socket authentication error:", error);
      socket.emit("auth_error", { message: "Authentication failed" });
    }
  });

  // Handle joining conversation rooms
  socket.on("join_conversation", (conversationId) => {
    if (!socket.userId) {
      socket.emit("error", { message: "Not authenticated" });
      return;
    }
    
    socket.join(`conversation-${conversationId}`);
    console.log(`📱 User ${socket.userId} joined conversation ${conversationId}`);
  });

  // Handle leaving conversation rooms
  socket.on("leave_conversation", (conversationId) => {
    socket.leave(`conversation-${conversationId}`);
    console.log(`📱 User ${socket.userId} left conversation ${conversationId}`);
  });

  // Handle disconnection
  socket.on("disconnect", async () => {
    console.log("🔌 Socket disconnected:", socket.id);
    
    if (socket.userId) {
      // Update user offline status
      try {
        await User.findByIdAndUpdate(socket.userId, {
          isOnline: false,
          lastSeen: new Date()
        });
      } catch (error) {
        console.error("Error updating user offline status:", error);
      }
    }
    
    connectedUsers.delete(socket.id);
  });
});

// ==================== SERVER STARTUP ====================

// Connect to database
connectDB(securityConfig.database.uri, securityConfig.database.options).then(() => {
  console.log("✅ Connected to MongoDB");
  
  // Start server
  server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🔒 Security features enabled:`);
    console.log(`   - Helmet security headers`);
    console.log(`   - CORS protection`);
    console.log(`   - Rate limiting`);
    console.log(`   - Input validation`);
    console.log(`   - File upload security`);
    console.log(`   - JWT security with refresh tokens`);
    console.log(`   - Security logging`);
    console.log(`   - NoSQL injection protection`);
    console.log(`   - XSS protection`);
  });
}).catch((error) => {
  console.error("❌ Database connection failed:", error);
  process.exit(1);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("🛑 SIGTERM received, shutting down gracefully");
  server.close(() => {
    console.log("✅ Process terminated");
    process.exit(0);
  });
});

process.on("SIGINT", () => {
  console.log("🛑 SIGINT received, shutting down gracefully");
  server.close(() => {
    console.log("✅ Process terminated");
    process.exit(0);
  });
});

export default app;
