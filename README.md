# 🌐 Shiku - Mạng xã hội hiện đại

[![GitHub](https://img.shields.io/badge/GitHub-sonvu2107%2Fshiku-blue)](https://github.com/sonvu2107/shiku)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-19.2-blue)](https://reactjs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-7.5-green)](https://www.mongodb.com/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4-38B2AC)](https://tailwindcss.com/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-4.8-black)](https://socket.io/)

Shiku là một nền tảng mạng xã hội đầy đủ tính năng, được xây dựng với công nghệ web hiện đại. Ứng dụng cung cấp trải nghiệm người dùng mượt mà với các tính năng như đăng bài viết, nhắn tin real-time, hệ thống bạn bè, nhóm, sự kiện và nhiều hơn nữa.

## Tính năng chính

### Mạng xã hội cơ bản
- **Bài viết (Posts)**: Tạo, chỉnh sửa, xóa bài viết với hỗ trợ văn bản, hình ảnh và video
- **Bình luận (Comments)**: Hệ thống bình luận lồng nhau (nested comments) với khả năng reply, edit, delete
- **Emotes/Reactions**: Thả cảm xúc cho bài viết và bình luận
- **Tìm kiếm & Lọc**: Tìm kiếm bài viết, sắp xếp theo mới nhất/cũ nhất/xem nhiều nhất/nhiều tương tác nhất
- **Stories**: Chia sẻ khoảnh khắc ngắn giống Instagram/Facebook Stories
- **Infinite Scroll**: Tải bài viết tự động khi cuộn trang

### Hệ thống người dùng
- **Xác thực (Authentication)**: Đăng ký, đăng nhập, quên mật khẩu với JWT tokens
- **Profile**: Trang cá nhân với avatar, bio, thông tin cá nhân
- **Bạn bè (Friends)**: Gửi/nhận lời mời kết bạn, xem danh sách bạn bè, bạn bè online
- **Chặn người dùng (Block)**: Chặn người dùng không mong muốn
- **Theo dõi online**: Hiển thị trạng thái online/offline của bạn bè

### Nhắn tin & Giao tiếp
- **Chat Real-time**: Nhắn tin 1-1 và nhóm với Socket.IO
- **Hỗ trợ media**: Gửi hình ảnh, video trong tin nhắn
- **Cuộc gọi**: Tích hợp cuộc gọi video/voice (WebRTC)
- **Thông báo (Notifications)**: Thông báo real-time về hoạt động

### Nhóm & Sự kiện
- **Nhóm (Groups)**: Tạo và quản lý nhóm/cộng đồng
- **Vai trò nhóm**: Owner, Admin, Member với quyền hạn khác nhau
- **Bài viết nhóm**: Đăng bài riêng trong nhóm
- **Sự kiện (Events)**: Tạo và quản lý sự kiện với thời gian, địa điểm
- **RSVP**: Tham gia/quan tâm đến sự kiện

### Tính năng nâng cao
- **Media Gallery**: Quản lý tất cả ảnh/video đã đăng
- **Saved Posts**: Lưu bài viết yêu thích để xem lại
- **Dark Mode**: Chế độ tối/sáng
- **Polls**: Tạo bình chọn trong bài viết
- **Hashtags**: Tổ chức bài viết theo chủ đề
- **Search History**: Lưu lịch sử tìm kiếm

### Bảo mật & Hiệu năng
- **CSRF Protection**: Bảo vệ chống Cross-Site Request Forgery
- **Rate Limiting**: Giới hạn request để chống spam/DDoS
- **Helmet.js**: Security headers tự động
- **JWT Authentication**: Access & Refresh tokens
- **Password Encryption**: Mã hóa mật khẩu với bcrypt
- **Image Optimization**: Tối ưu hóa hình ảnh tự động
- **Caching**: Cache dữ liệu để tăng tốc độ
- **Compression**: Nén response để giảm bandwidth

### Quản trị (Admin)
- **Dashboard**: Thống kê người dùng, bài viết, hoạt động
- **User Management**: Quản lý người dùng, ban/unban
- **Content Moderation**: Kiểm duyệt nội dung
- **Feedback System**: Xem và quản lý phản hồi từ người dùng
- **API Monitoring**: Theo dõi hiệu năng API

## Công nghệ sử dụng

### Frontend
- **React 19.2** - UI framework (latest stable)
- **React Router 6.26** - Client-side routing
- **TailwindCSS 3.4.10** - Utility-first CSS
- **Vite 5.4.6** - Build tool & dev server
- **Socket.IO Client 4.8.1** - Real-time communication
- **Axios Retry 4.5** - HTTP client với retry logic
- **TanStack Query 5.90** - Data fetching & caching
- **TanStack Virtual 3.13** - Virtualized lists
- **Framer Motion 12.23** - Animation library
- **Lucide React 0.542** - Icon library
- **React Markdown 9** - Markdown rendering
- **idb 8** - IndexedDB wrapper
- **date-fns 4.1** - Date utility library
- **Vaul 1.1** - Drawer component

### Backend
- **Node.js 18+ & Express 4.18** - Server framework
- **MongoDB & Mongoose 7.5** - Database
- **Socket.IO 4.7.2** - WebSocket server
- **JWT (jsonwebtoken 9)** - Authentication tokens
- **Bcryptjs 2.4** - Password hashing
- **Helmet 7** - Security middleware
- **CORS** - Cross-origin resource sharing
- **Express Rate Limit 6.11** - Rate limiting
- **Express Slow Down 3** - Request throttling
- **Multer 1.4.5** - File upload handling
- **Cloudinary 1.40** - Image/video hosting
- **Nodemailer 7** - Email service
- **Resend 4** - Modern email API
- **Sanitize HTML 2.17** - XSS protection
- **Morgan 1.10** - HTTP request logging
- **ioredis 5.8** - Redis client
- **Google Generative AI 0.24** - AI integration
- **Joi 18** - Schema validation

### DevOps & Testing
- **Jest 29.7** - Testing framework
- **Supertest 6.3** - API testing
- **Nodemon 3** - Auto-restart server
- **Terser 5.44** - JavaScript minification
- **Vite Plugin Compression** - Gzip/Brotli compression
- **Vite Plugin PWA** - Progressive Web App support

## Cấu trúc dự án

```
Project_Shiku/
├── client/                 # Frontend React app
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── pages/         # Page components
│   │   ├── contexts/      # React contexts
│   │   ├── hooks/         # Custom hooks
│   │   ├── services/      # Service layer
│   │   ├── utils/         # Utility functions
│   │   ├── constants/     # App constants
│   │   ├── config/        # Configuration
│   │   ├── api.js         # API client
│   │   ├── chatAPI.js     # Chat API client
│   │   ├── socket.js      # Socket.IO client
│   │   └── App.jsx        # Main app component
│   ├── public/            # Static assets
│   └── package.json
│
├── server/                # Backend Node.js app
│   ├── src/
│   │   ├── models/       # Mongoose models
│   │   ├── routes/       # Express routes
│   │   ├── middleware/   # Custom middleware
│   │   ├── services/     # Business logic
│   │   ├── utils/        # Utility functions
│   │   ├── config/       # Configuration
│   │   └── index.js      # Server entry point
│   ├── scripts/          # Utility scripts
│   └── package.json
│
├── docs/                  # Documentation
├── scripts/              # Build & utility scripts
├── script_test/          # Testing scripts
├── bats/                 # Batch scripts (Windows)
└── migration/            # Database migrations
```

## Cài đặt & Chạy

### Yêu cầu hệ thống
- Node.js 18+ (khuyến nghị 20+)
- MongoDB 5+ hoặc MongoDB Atlas
- npm hoặc yarn
- Redis (optional, cho caching nâng cao)

### Bước 1: Clone repository
```bash
git clone https://github.com/sonvu2107/shiku.git
cd shiku
```

### Bước 2: Cài đặt dependencies

**Backend:**
```bash
cd server
npm install
```

**Frontend:**
```bash
cd ../client
npm install
```

### Bước 3: Cấu hình môi trường

**Backend** - Tạo file `server/.env`:
```env
# Server
PORT=5000
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/shiku

# JWT
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRES_IN=1h
REFRESH_TOKEN_SECRET=your_refresh_token_secret_here
REFRESH_TOKEN_EXPIRES_IN=7d

# CSRF
CSRF_SECRET=your_csrf_secret_key_here

# Redis (optional)
REDIS_URL=redis://localhost:6379

# Cloudinary (optional)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Email - Nodemailer (optional)
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password

# Email - Resend (optional)
RESEND_API_KEY=your_resend_api_key

# Google Generative AI (optional)
GOOGLE_AI_API_KEY=your_google_ai_api_key

# Frontend URL
FRONTEND_URL=http://localhost:5173
```

**Frontend** - Tạo file `client/.env`:
```env
VITE_API_URL=http://localhost:5000
VITE_SOCKET_URL=http://localhost:5000
```

### Bước 4: Khởi động MongoDB
```bash
# Windows
net start MongoDB

# Linux/Mac
sudo systemctl start mongod
```

### Bước 5: Chạy ứng dụng

**Development mode:**

Terminal 1 - Backend:
```bash
cd server
npm run dev
```

Terminal 2 - Frontend:
```bash
cd client
npm run dev
```

Ứng dụng sẽ chạy tại:
- Frontend: http://localhost:5173
- Backend API: http://localhost:5000

**Production mode:**

Backend:
```bash
cd server
npm start
```

Frontend:
```bash
cd client
npm run build
npm run preview
```

### Bước 6: Tạo admin user (optional)
```bash
cd server
npm run create-admin
```

## API Documentation

### Authentication
- `POST /api/auth/register` - Đăng ký tài khoản
- `POST /api/auth/login` - Đăng nhập
- `POST /api/auth/logout` - Đăng xuất
- `POST /api/auth/refresh` - Refresh access token
- `GET /api/auth/me` - Lấy thông tin user hiện tại
- `POST /api/auth/forgot-password` - Quên mật khẩu
- `POST /api/auth/reset-password` - Reset mật khẩu

### Posts
- `GET /api/posts` - Lấy danh sách bài viết
- `GET /api/posts/:id` - Lấy chi tiết bài viết
- `POST /api/posts` - Tạo bài viết mới
- `PUT /api/posts/:id` - Cập nhật bài viết
- `DELETE /api/posts/:id` - Xóa bài viết
- `POST /api/posts/:id/emote` - Thả cảm xúc
- `POST /api/posts/:id/save` - Lưu bài viết
- `GET /api/posts/saved` - Lấy bài viết đã lưu

### Comments
- `GET /api/comments/post/:postId` - Lấy comments của bài viết
- `POST /api/comments/post/:postId` - Tạo comment mới
- `PUT /api/comments/:id` - Cập nhật comment
- `DELETE /api/comments/:id` - Xóa comment
- `POST /api/comments/:id/emote` - Thả cảm xúc comment

### Friends
- `GET /api/friends` - Lấy danh sách bạn bè
- `POST /api/friends/request/:userId` - Gửi lời mời kết bạn
- `PUT /api/friends/accept/:userId` - Chấp nhận lời mời
- `DELETE /api/friends/:userId` - Xóa bạn bè
- `GET /api/friends/online` - Lấy danh sách bạn bè online

### Messages
- `GET /api/messages/conversations` - Lấy danh sách cuộc trò chuyện
- `GET /api/messages/:conversationId` - Lấy tin nhắn của cuộc trò chuyện
- `POST /api/messages` - Gửi tin nhắn mới
- `PUT /api/messages/:id` - Cập nhật tin nhắn
- `DELETE /api/messages/:id` - Xóa tin nhắn

### Groups
- `GET /api/groups` - Lấy danh sách nhóm
- `GET /api/groups/:id` - Lấy chi tiết nhóm
- `POST /api/groups` - Tạo nhóm mới
- `PUT /api/groups/:id` - Cập nhật nhóm
- `POST /api/groups/:id/join` - Tham gia nhóm
- `POST /api/groups/:id/leave` - Rời nhóm

### Events
- `GET /api/events` - Lấy danh sách sự kiện
- `GET /api/events/:id` - Lấy chi tiết sự kiện
- `POST /api/events` - Tạo sự kiện mới
- `PUT /api/events/:id` - Cập nhật sự kiện
- `POST /api/events/:id/rsvp` - RSVP sự kiện

## Testing

### Chạy tests
```bash
# Unit tests
cd server
npm test

# API tests
cd script_test
npm test

# Load tests
node script_test/load-test.js
```

### Health check
```bash
node health-check.js
```

## Scripts hữu ích

```bash
# Tạo test users
node server/create-test-users.cjs

# Check API endpoints
node script_test/comprehensive-check.js

# Auto-like posts (testing)
.\auto-like-posts.bat

# Show summary
.\show-summary.bat
```

## Hiệu năng

- **React 19** với automatic batching và concurrent features
- **Infinite scroll** với virtualization (TanStack Virtual) cho danh sách dài
- **Image optimization** tự động với Cloudinary
- **Code splitting** và lazy loading components
- **API caching** với TanStack Query v5
- **IndexedDB** cho offline support (idb)
- **Compression** cho assets và API responses (gzip/brotli)
- **CDN** cho static files
- **Redis caching** cho server-side caching
- **Request throttling** với express-slow-down
- **Framer Motion** cho smooth animations

## Bảo mật

-  **CSRF Protection** - Bảo vệ chống CSRF attacks
-  **Rate Limiting** - Giới hạn request (50/15min dev, 10/15min prod)
-  **Request Throttling** - Slow down cho suspicious requests
-  **Helmet.js** - Security headers tự động
-  **JWT Tokens** - Access & Refresh tokens
-  **Password Hashing** - Bcryptjs với salt rounds
-  **Input Validation** - Express-validator & Joi
-  **XSS Protection** - Sanitize HTML input
-  **CORS** - Controlled cross-origin access
-  **HTTPS** - Enforced in production
-  **Environment Variables** - Sensitive data protection
-  **File Type Validation** - Secure file uploads

## Deployment

### Railway/Render
Dự án đã được cấu hình sẵn cho deploy lên Railway/Render:
- `railway.json` - Railway configuration
- `render-config.md` - Render deployment guide
- `RENDER-DEPLOYMENT-GUIDE.md` - Chi tiết hướng dẫn

### Environment Variables Production
Đảm bảo set các biến môi trường sau:
- `NODE_ENV=production`
- `MONGODB_URI` - MongoDB connection string
- `JWT_SECRET` - JWT secret key
- `REFRESH_TOKEN_SECRET` - Refresh token secret
- `FRONTEND_URL` - Frontend URL
- `REDIS_URL` - Redis connection string (optional)
- `GOOGLE_AI_API_KEY` - Google AI API key (optional)
- Các Cloudinary credentials
- Email service credentials (Nodemailer hoặc Resend)

## Đóng góp

Mọi đóng góp đều được chào đón! Để đóng góp:

1. Fork repository
2. Tạo branch mới (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Mở Pull Request

## License

Dự án này được phát hành dưới giấy phép MIT.

## Tác giả

**Son Vu**
- GitHub: [@sonvu2107](https://github.com/sonvu2107)
- Repository: [shiku](https://github.com/sonvu2107/shiku)

## Changelog

### v1.1.0 (November 2025)
-  Nâng cấp React từ 18.3 lên **19.2.0**
-  Nâng cấp TanStack Query lên **5.90**
-  Thêm **Framer Motion 12.23** cho animations
-  Thêm **TanStack Virtual 3.13** cho virtualized lists
-  Thêm **ioredis 5.8** cho Redis caching
-  Thêm **Google Generative AI 0.24** integration
-  Thêm **Resend 4** cho modern email API
-  Thêm **Vaul 1.1** cho drawer components
-  Cải thiện hiệu năng với React 19 concurrent features
-  Thêm express-slow-down cho request throttling
-  Thêm file-type validation cho secure uploads
-  Cập nhật tất cả dependencies lên phiên bản mới nhất

## Cảm ơn

Cảm ơn tất cả các thư viện và công cụ open-source đã được sử dụng trong dự án này!

---

⭐ Nếu bạn thấy dự án này hữu ích, hãy cho một star trên GitHub!
