import express from "express";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { createServer } from "http";
import { Server } from "socket.io";
import { connectDB } from "./config/db.js";
import { apiLimiter } from "./middleware/rateLimit.js";
import { notFound, errorHandler } from "./middleware/errorHandler.js";

import authRoutes from "./routes/auth.js";
import authTokenRoutes from "./routes/auth-token.js";
import postRoutes from "./routes/posts.js";
import commentRoutes from "./routes/comments.js";
import uploadRoutes from "./routes/uploads.js";
import adminRoutes from "./routes/admin.js";
import friendRoutes from "./routes/friends.js";
import userRoutes from "./routes/users.js";
import notificationRoutes from "./routes/notifications.js";
import messageRoutes from "./routes/messages.js";

dotenv.config();

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:5173", 
      "http://localhost:5174",
      "http://172.29.100.73:5173",
      "http://172.29.100.73:5174",
      "http://192.168.0.101:5173",
      "http://192.168.0.101:5174",
      ...(process.env.CORS_ORIGIN?.split(",") || [])
    ],
    credentials: true
  }
});

const PORT = process.env.PORT || 4000;

// middlewares
app.use(helmet());
app.use(cookieParser());
app.use(cors({ 
  origin: [
    "http://localhost:5173", 
    "http://localhost:5174",
    "http://172.29.100.73:5173",
    "http://172.29.100.73:5174",
    "http://192.168.0.101:5173",
    "http://192.168.0.101:5174",
    ...(process.env.CORS_ORIGIN?.split(",") || [])
  ], 
  credentials: true 
}));
app.use(express.json({ limit: "10mb" }));
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

// Debug middleware để log tất cả requests
app.use((req, res, next) => {
  console.log(`📝 ${req.method} ${req.path} - Body:`, req.body);
  next();
});

app.use("/api", apiLimiter);

// static uploads
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

// routes
app.get("/", (req, res) => res.json({ ok: true, message: "Blog API" }));
app.use("/api/auth", authRoutes);
app.use("/api/auth", authTokenRoutes); 
app.use("/api/posts", postRoutes);
app.use("/api/comments", commentRoutes);
app.use("/api/uploads", uploadRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/friends", friendRoutes);
app.use("/api/users", userRoutes);
app.use("/api/notifications", notificationRoutes);
// Make io available to routes
app.set('io', io);

import supportRoutes from "./routes/support.js";
app.use("/api/messages", messageRoutes);
app.use("/api/support", supportRoutes);

// error
app.use(notFound);
app.use(errorHandler);

// Socket.IO connection handling
io.on('connection', (socket) => {
  // Xử lý sự kiện call-offer (WebRTC signaling)
  socket.on('call-offer', ({ offer, conversationId }) => {
    // Phát tới tất cả thành viên trong phòng trừ người gọi
    socket.to(`conversation-${conversationId}`).emit('call-offer', {
      offer,
      conversationId,
      caller: socket.user || {}, // Nếu có thông tin user trên socket
      isVideo: offer?.type === 'video' // hoặc truyền từ client
    });
    console.log(`📞 call-offer sent to conversation-${conversationId}`);
  });
  console.log('🔌 User connected:', socket.id);

  // Join user to their personal room for notifications
  socket.on('join-user', (userId) => {
    socket.join(`user-${userId}`);
    console.log(`👤 User ${userId} joined personal room`);
  });

  // Join conversation room
  socket.on('join-conversation', (conversationId) => {
    socket.join(`conversation-${conversationId}`);
    console.log(`💬 User ${socket.id} joined conversation: ${conversationId}`);
    console.log(`💬 Room conversation-${conversationId} now has ${io.sockets.adapter.rooms.get(`conversation-${conversationId}`)?.size || 0} users`);
  });

  // Leave conversation room
  socket.on('leave-conversation', (conversationId) => {
    socket.leave(`conversation-${conversationId}`);
    console.log(`🚪 User left conversation: ${conversationId}`);
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log('🔌 User disconnected:', socket.id);
  });
});

// start
connectDB(process.env.MONGODB_URI).then(() => {
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server listening on http://localhost:${PORT}`);
    console.log(`📡 Network access: http://YOUR_IP:${PORT}`);
    console.log(`🔌 Socket.IO ready`);
  });
});
