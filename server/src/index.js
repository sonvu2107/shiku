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
import { apiLimiter, authLimiter, uploadLimiter, messageLimiter } from "./middleware/rateLimit.js";
import { notFound, errorHandler } from "./middleware/errorHandler.js";
import { requestTimeout } from "./middleware/timeout.js";

// Import tất cả routes
import authRoutes from "./routes/auth.js"; // Authentication routes
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

// Load environment variables
dotenv.config();

// Tạo Express app và HTTP server
const app = express();
const server = createServer(app);

// Danh sách các origin được phép truy cập (CORS)
const allowedOrigins = [
  "http://localhost:5173", // Vite dev server default
  "http://localhost:5174", // Vite dev server alternative
  "http://172.29.100.73:5173", // Local network access
  "http://172.29.100.73:5174",
  "http://192.168.0.101:5173",
  "http://192.168.0.101:5174",
  // Thêm origins từ environment variable nếu có
  ...(process.env.CORS_ORIGIN?.split(",").map(o => o.trim()) || [])
];

// Tạo Socket.IO server với CORS configuration và improved settings
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      console.log("🔌 Socket.IO Origin:", origin);
      // Cho phép requests từ allowed origins hoặc same-origin
      if (!origin || allowedOrigins.includes(origin)) {
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
app.use(helmet());
// Parse cookies từ request headers
app.use(cookieParser());

// CORS configuration cho HTTP requests
app.use(cors({
  origin: (origin, callback) => {
    console.log("🌐 HTTP Request Origin:", origin);
    console.log("✅ Allowed Origins:", allowedOrigins);
    // Kiểm tra origin có trong danh sách allowed không
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn("❌ Blocked HTTP CORS:", origin);
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true // Cho phép gửi cookies và auth headers
}));

// Parse JSON body với limit 10MB (cho upload hình ảnh base64)
app.use(express.json({ limit: "10mb" }));
// HTTP request logging - detailed trong production, simple trong development
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

// Request timeout middleware - 30 seconds for regular requests
app.use(requestTimeout(30000));

// Debug middleware - log tất cả requests để debug
app.use((req, res, next) => {
  console.log(`📝 ${req.method} ${req.path} - Body:`, req.body);
  next();
});

// Rate limiting cho tất cả API routes
app.use("/api", apiLimiter);

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
    message: "Blog API",
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

// Mount tất cả API routes with specific rate limiting
app.use("/api/auth", authLimiter, authRoutes); // Authentication & authorization
app.use("/api/auth", authTokenRoutes); // Token validation
app.use("/api/posts", postRoutes); // Blog posts CRUD
app.use("/api/comments", commentRoutes); // Comments system
app.use("/api/uploads", uploadLimiter, uploadRoutes); // File uploads
app.use("/api/admin", adminRoutes); // Admin panel
app.use("/api/friends", friendRoutes); // Friend system
app.use("/api/users", userRoutes); // User profiles
app.use("/api/notifications", notificationRoutes); // Notifications
app.use("/api/messages", messageLimiter, messageRoutes); // Chat/messaging
app.use("/api/groups", groupPostsRouter); // Group posts
app.use("/api/support", supportRoutes); // Support tickets
app.use("/api/groups", groupRoutes); // Groups/communities

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

io.on("connection", (socket) => {
  console.log("🔌 User connected:", socket.id);
  
  // Store connection info
  connectedUsers.set(socket.id, {
    userId: null,
    joinedRooms: new Set(),
    connectedAt: new Date()
  });

  // WebRTC signaling - xử lý call offer với error handling
  socket.on("call-offer", ({ offer, conversationId }) => {
    try {
      if (!conversationId) {
        console.warn("❌ Invalid conversationId in call-offer");
        return;
      }
      // Gửi offer đến tất cả users khác trong conversation
      socket.to(`conversation-${conversationId}`).emit("call-offer", {
        offer,
        conversationId,
        caller: socket.user || {}, // Thông tin người gọi
        isVideo: offer?.type === "video" // Phân biệt voice/video call
      });
      console.log(`📞 call-offer sent to conversation-${conversationId}`);
    } catch (error) {
      console.error("❌ Error handling call-offer:", error);
    }
  });

  // Join user vào personal room để nhận notifications
  socket.on("join-user", (userId) => {
    try {
      if (!userId) {
        console.warn("❌ Invalid userId in join-user");
        return;
      }
      socket.join(`user-${userId}`);
      const userInfo = connectedUsers.get(socket.id);
      if (userInfo) {
        userInfo.userId = userId;
        userInfo.joinedRooms.add(`user-${userId}`);
      }
      console.log(`👤 User ${userId} joined personal room`);
    } catch (error) {
      console.error("❌ Error in join-user:", error);
    }
  });

  // Join conversation room để nhận messages real-time
  socket.on("join-conversation", (conversationId) => {
    try {
      if (!conversationId) {
        console.warn("❌ Invalid conversationId in join-conversation");
        return;
      }
      socket.join(`conversation-${conversationId}`);
      const userInfo = connectedUsers.get(socket.id);
      if (userInfo) {
        userInfo.joinedRooms.add(`conversation-${conversationId}`);
      }
      console.log(`💬 User ${socket.id} joined conversation: ${conversationId}`);
    } catch (error) {
      console.error("❌ Error in join-conversation:", error);
    }
  });

  // Rời conversation room
  socket.on("leave-conversation", (conversationId) => {
    try {
      if (!conversationId) {
        console.warn("❌ Invalid conversationId in leave-conversation");
        return;
      }
      socket.leave(`conversation-${conversationId}`);
      const userInfo = connectedUsers.get(socket.id);
      if (userInfo) {
        userInfo.joinedRooms.delete(`conversation-${conversationId}`);
      }
      console.log(`🚪 User left conversation: ${conversationId}`);
    } catch (error) {
      console.error("❌ Error in leave-conversation:", error);
    }
  });

  // Handle connection errors
  socket.on("error", (error) => {
    console.error("❌ Socket error:", error);
  });

  // Xử lý khi user disconnect với cleanup
  socket.on("disconnect", (reason) => {
    console.log("🔌 User disconnected:", socket.id, "Reason:", reason);
    
    // Clean up user tracking
    const userInfo = connectedUsers.get(socket.id);
    if (userInfo) {
      console.log(`🧹 Cleaning up user ${userInfo.userId}, rooms: ${Array.from(userInfo.joinedRooms)}`);
    }
    connectedUsers.delete(socket.id);
  });
});

// Periodic cleanup of stale connections
setInterval(() => {
  const now = new Date();
  const staleThreshold = 5 * 60 * 1000; // 5 minutes
  
  for (const [socketId, userInfo] of connectedUsers.entries()) {
    if (now - userInfo.connectedAt > staleThreshold) {
      console.log(`🧹 Cleaning up stale connection: ${socketId}`);
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
  
  // Log memory stats every 5 minutes
  console.log(`📊 Memory Stats - Heap: ${heapUsedMB}/${heapTotalMB}MB, RSS: ${rssMB}MB, Sockets: ${connectedUsers.size}`);
  
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
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit process in production, just log the error
  if (process.env.NODE_ENV !== 'production') {
    process.exit(1);
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  // Graceful shutdown
  console.log('🔄 Attempting graceful shutdown...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(1);
  });
  
  // Force exit if graceful shutdown takes too long
  setTimeout(() => {
    console.error('❌ Forced shutdown');
    process.exit(1);
  }, 10000);
});

// Handle SIGTERM (e.g., from process managers)
process.on('SIGTERM', () => {
  console.log('📡 SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('✅ Process terminated');
  });
});

// Handle SIGINT (Ctrl+C)
process.on('SIGINT', () => {
  console.log('📡 SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('✅ Process terminated');
  });
});

// ==================== SERVER STARTUP ====================

// Kết nối database rồi start server
connectDB(process.env.MONGODB_URI).then(() => {
  server.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Server listening on http://localhost:${PORT}`);
    console.log(`📡 Network access: http://YOUR_IP:${PORT}`);
    console.log("🔌 Socket.IO ready");
  });
}).catch((error) => {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
});
