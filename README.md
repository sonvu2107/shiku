# 🌐 Shiku - Mạng xã hội hiện đại

[![GitHub](https://img.shields.io/badge/GitHub-sonvu2107%2Fshiku-blue)](https://github.com/sonvu2107/shiku)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-19.2-blue)](https://reactjs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-7.5-green)](https://www.mongodb.com/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4-38B2AC)](https://tailwindcss.com/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-4.8-black)](https://socket.io/)

> Lưu ý: Dự án này không hỗ trợ clone public. Tài liệu này mô tả cấu trúc và cách hoạt động của hệ thống.

---

##  Giới Thiệu

Shiku là một nền tảng mạng xã hội full-stack hiện đại được xây dựng với React + Vite (frontend) và Node.js + Express + MongoDB (backend). Ứng dụng cung cấp đầy đủ tính năng của một mạng xã hội hoàn chỉnh với hệ thống nhắn tin realtime, stories, groups, events, và nhiều tính năng độc đáo khác.

###  Website
- Production: https://shiku.click

---

##  Cấu Trúc Dự Án
```
Project_Shiku/
├── client/                 # Frontend React + Vite
│   ├── src/
│   │   ├── components/     # 87+ React components
│   │   ├── pages/          # 36+ trang ứng dụng
│   │   ├── hooks/          # Custom React hooks
│   │   ├── contexts/       # React Context providers
│   │   ├── services/       # Service layers
│   │   ├── utils/          # Utility functions
│   │   ├── api.js          # API client với axios
│   │   ├── chatAPI.js      # Chat API module
│   │   └── socket.js       # Socket.io client
│   └── public/             # Static assets
│
├── server/                 # Backend Node.js + Express
│   ├── src/
│   │   ├── routes/         # 31+ API routes
│   │   ├── models/         # 20 Mongoose models
│   │   ├── controllers/    # Route controllers
│   │   ├── middleware/     # Express middlewares
│   │   ├── services/       # Business logic services
│   │   ├── utils/          # Utility functions
│   │   ├── config/         # Configuration files
│   │   └── index.js        # Server entry point
│   └── uploads/            # Local file uploads
│
├── docs/                   # Documentation
├── scripts/                # Automation scripts
├── migration/              # Database migrations
└── script_test/            # Test scripts
```
---

##  Tech Stack

### Frontend
```
┌──────────────────────┬───────────────────────────────┐
│ Technology           │ Purpose                       │
├──────────────────────┼───────────────────────────────┤
│ React 19             │ UI Framework                  │
│ Vite                 │ Build tool & Dev server       │
│ TailwindCSS          │ Styling                       │
│ Framer Motion        │ Animations                    │
│ TanStack Query       │ Data fetching & caching       │
│ Socket.io Client     │ Realtime communication        │
│ Recharts             │ Data visualization            │
│ Three.js / OGL       │ 3D effects                    │
└──────────────────────┴───────────────────────────────┘

### Backend
┌──────────────────────┬───────────────────────────────┐
│ Technology           │ Purpose                       │
├──────────────────────┼───────────────────────────────┤
│ Node.js              │ Runtime environment           │
│ Express.js           │ Web framework                 │
│ MongoDB + Mongoose   │ Database                      │
│ Socket.io            │ Realtime WebSocket            │
│ Redis (ioredis)      │ Caching & sessions            │
│ Cloudinary           │ Media storage                 │
│ JWT                  │ Authentication                │
│ Helmet + CORS        │ Security                      │
│ Nodemailer/Resend    │ Email service                 │
│ Google Generative AI │ AI Chatbot                    │
└──────────────────────┴───────────────────────────────┘
```
---

##  Tính Năng Chính

###  Người Dùng & Xác Thực
- Đăng ký / Đăng nhập / Quên mật khẩu
- Xác thực JWT với HTTP-only cookies
- Profile tùy chỉnh với avatar video
- Hệ thống bạn bè & gợi ý kết bạn
- Theo dõi trạng thái online realtime
- Badge xác minh & hệ thống danh hiệu

###  Bài Viết & Nội Dung
- Tạo bài viết với text, media, mentions
- Markdown editor với preview
- Hệ thống Poll/Voting
- Comment với nested replies
- Like, Share, Save bài viết
- Hashtags & Trending tags
- Media gallery với lazy loading

###  Nhắn Tin Realtime
- Chat 1-1 và nhóm
- Tin nhắn với media, reactions
- Read receipts
- Typing indicators
- Video/Audio calls (UI ready)
- Chat popup & dropdown

###  Stories
- Tạo stories với image/video
- Story analytics & views
- Auto-expire sau 24h
- Story viewer với animations

###  Groups & Events
- Tạo và quản lý nhóm
- Group posts & discussions
- Tạo và tham gia sự kiện
- Lịch sự kiện

###  Hệ Thống Tu Luyện (Cultivation)
> Tính năng gamification độc đáo lấy cảm hứng từ game tu tiên

- Hệ thống cảnh giới tu vi
- Shop trang bị & inventory
- Quest & nhiệm vụ hàng ngày
- Battle system (PvP)
- Leaderboard bảng xếp hạng

###  AI Chatbot
- Tích hợp Google Gemini AI
- Trợ lý ảo hỗ trợ người dùng
- Lịch sử chat được lưu

###  Admin Dashboard
- Thống kê người dùng, bài viết
- Quản lý người dùng (ban, verify)
- API monitoring & health check
- Auto-like / Auto-view bot
- Role & permission management
- Security audit logs
- System alerts & notifications

###  Bảo Mật
- CSRF protection
- Rate limiting & Slow down
- Helmet security headers
- Input sanitization
- Audit logging
- Role-based access control

---

##  Các Models (Database Schema)
```
┌─────────────────┬───────────────────────────────┐
│ Model           │ Mô tả                         │
├─────────────────┼───────────────────────────────┤
│ User            │ Thông tin người dùng          │
│ Post            │ Bài viết                      │
│ Comment         │ Bình luận                     │
│ Message         │ Tin nhắn                      │
│ Conversation    │ Cuộc hội thoại                │
│ Group           │ Nhóm                          │
│ Event           │ Sự kiện                       │
│ Story           │ Stories                       │
│ Notification    │ Thông báo                     │
│ FriendRequest   │ Yêu cầu kết bạn               │
│ Poll            │ Bình chọn                     │
│ Media           │ Tệp media                     │
│ Role            │ Vai trò người dùng            │
│ Cultivation     │ Dữ liệu tu luyện              │
│ Equipment       │ Trang bị tu luyện             │
│ Battle          │ Dữ liệu PvP                   │
│ ChatHistory     │ Lịch sử chatbot               │
│ AuditLog        │ Log bảo mật                   │
│ ApiStats        │ Thống kê API                  │
│ SearchHistory   │ Lịch sử tìm kiếm              │
└─────────────────┴───────────────────────────────┘
```
---

##  API Routes Overview

### Authentication (/api/auth)
- POST /register - Đăng ký
- POST /login - Đăng nhập
- POST /logout - Đăng xuất
- POST /forgot-password - Quên mật khẩu
- POST /reset-password - Đặt lại mật khẩu

### Users (/api/users)
- GET /me - Thông tin user hiện tại
- GET /:id - Thông tin user khác
- PUT /profile - Cập nhật profile
- GET /search - Tìm kiếm user

### Posts (/api/posts)
- GET / - Danh sách bài viết
- POST / - Tạo bài viết
- GET /:id - Chi tiết bài viết
- PUT /:id - Sửa bài viết
- DELETE /:id - Xóa bài viết
- POST /:id/like - Like bài viết
- POST /:id/share - Share bài viết

### Comments (/api/comments)
- GET /post/:postId - Comments của bài viết
- POST / - Thêm comment
- PUT /:id - Sửa comment
- DELETE /:id - Xóa comment

### Messages (/api/messages)
- GET /conversations - Danh sách hội thoại
- GET /:conversationId - Tin nhắn trong hội thoại
- POST / - Gửi tin nhắn

### Friends (/api/friends)
- GET / - Danh sách bạn bè
- POST /request/:userId - Gửi yêu cầu kết bạn
- POST /accept/:requestId - Chấp nhận
- GET /suggestions - Gợi ý kết bạn

### Stories (/api/stories)
- GET / - Danh sách stories
- POST / - Tạo story
- POST /:id/view - Đánh dấu đã xem

### Groups (/api/groups)
- GET / - Danh sách nhóm
- POST / - Tạo nhóm
- POST /:id/join - Tham gia nhóm

### Events (/api/events)
- GET / - Danh sách sự kiện
- POST / - Tạo sự kiện
- POST /:id/attend - Tham gia sự kiện

### Uploads (/api/uploads)
- POST / - Upload file
- POST /direct/sign - Direct upload signature
- POST /direct/confirm - Confirm direct upload

### Admin (/api/admin, /api/health)
- Dashboard statistics
- User management
- System health checks

---

##  Cách Hoạt Động

### 1. Authentication Flow

1. User đăng nhập → Server verify credentials
2. Server tạo JWT access token + refresh token
3. Tokens được lưu trong HTTP-only cookies
4. Mỗi request kèm cookie → auth middleware verify
5. Token hết hạn → auto refresh với refresh token

### 2. Realtime Communication (Socket.io)

1. Client kết nối socket sau khi login
2. Server track connected users trong Map
3. Events được emit:
   - new_message: Tin nhắn mới
   - typing: Đang nhập
   - notification: Thông báo
   - user_status: Trạng thái online
   - friend_request: Yêu cầu kết bạn

### 3. Media Upload Flow

Option A - Server Upload:
1. Client gửi file → Server (multer)
2. Server upload lên Cloudinary
3. Server trả về URL

Option B - Direct Upload:
1. Client request signature từ server
2. Client upload trực tiếp lên Cloudinary
3. Client confirm với server → lưu metadata

### 4. Caching Strategy (Redis)
- Session data
- API response cache
- Rate limit counters
- User online status
- Chat presence

---

##  Frontend Architecture

### Component Structure
- Pages: Route-level components (Home, Profile, Chat, etc.)
- Components: Reusable UI pieces
  - Common: Avatar, Loader, Toast
  - Feature: PostCard, StoryViewer, ChatPopup
  - Admin: AdminCharts, RoleManagement
  - Profile: ProfileCustomization, ProfileEffect

### State Management
- React Context: Auth, Theme, Notifications
- TanStack Query: Server state & caching
- Local State: Component-specific UI state

### Styling
- TailwindCSS: Utility-first CSS
- CSS Modules: Component-specific styles
- Framer Motion: Animations

---

##  Responsive Design

Ứng dụng được tối ưu cho:
-  Mobile (< 768px)
-  Tablet (768px - 1024px)
-  Desktop (> 1024px)

Có các component riêng cho mobile:
- MobileMenu.jsx
- mobile-performance.css
- styles-mobile.css

---

##  Security Features
```
┌────────────────────┬───────────────────────────────────────┐
│ Feature            │ Implementation                        │
├────────────────────┼───────────────────────────────────────┤
│ Authentication     │ JWT với HTTP-only cookies             │
│ Password           │ bcryptjs hashing                      │
│ CSRF               │ Token-based protection                │
│ Rate Limiting      │ express-rate-limit                    │
│ Input Validation   │ express-validator, Joi, sanitize-html │
│ Security Headers   │ Helmet.js                             │
│ CORS               │ Whitelist origins                     │
│ Audit Logging      │ AuditLog model                        │
└────────────────────┴───────────────────────────────────────┘
```
---

##  Admin Features

### Dashboard Metrics
- Tổng số users, posts, comments
- Biểu đồ tăng trưởng theo thời gian
- Active users statistics
- API performance monitoring

### Management Tools
- User ban/unban
- Verify badges
- Content moderation
- Role management
- System health monitoring

---

##  License

MIT License

---

##  Tác Giả

Son Vu - @sonvu2107 (https://github.com/sonvu2107)

---

Made with ❤️ by Shiku


