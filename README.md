# 🌐 Shiku - Mạng xã hội hiện đại

[![GitHub](https://img.shields.io/badge/GitHub-sonvu2107%2Fshiku-blue)](https://github.com/sonvu2107/shiku)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18.3-blue)](https://reactjs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-7.5-green)](https://www.mongodb.com/)

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
- **React 18.3** - UI framework
- **React Router 6** - Client-side routing
- **TailwindCSS 3.4** - Utility-first CSS
- **Vite 5.4** - Build tool & dev server
- **Socket.IO Client** - Real-time communication
- **Axios** - HTTP client với retry logic
- **TanStack Query** - Data fetching & caching
- **Lucide React** - Icon library
- **React Markdown** - Markdown rendering
- **IndexedDB** - Client-side storage

### Backend
- **Node.js & Express** - Server framework
- **MongoDB & Mongoose 7.5** - Database
- **Socket.IO 4.8** - WebSocket server
- **JWT** - Authentication tokens
- **Bcrypt** - Password hashing
- **Helmet** - Security middleware
- **CORS** - Cross-origin resource sharing
- **Express Rate Limit** - Rate limiting
- **Multer** - File upload handling
- **Cloudinary** - Image/video hosting
- **Nodemailer** - Email service
- **Sanitize HTML** - XSS protection
- **Morgan** - HTTP request logging

### DevOps & Testing
- **Jest** - Testing framework
- **Supertest** - API testing
- **Nodemon** - Auto-restart server
- **ESLint** - Code linting
- **Prettier** - Code formatting

## Cấu trúc dự án

```
Project_Shiku/
├── client/                 # Frontend React app
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── pages/         # Page components
│   │   ├── utils/         # Utility functions
│   │   ├── api.js         # API client
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
├── script_test/          # Testing scripts
└── migration/            # Database migrations
```

## Cài đặt & Chạy

### Yêu cầu hệ thống
- Node.js 18+ 
- MongoDB 5+
- npm hoặc yarn

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

# Cloudinary (optional)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Email (optional)
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password

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

- **Infinite scroll** với virtualization cho danh sách dài
- **Image optimization** tự động với Cloudinary
- **Code splitting** và lazy loading components
- **API caching** với React Query
- **IndexedDB** cho offline support
- **Compression** cho assets và API responses
- **CDN** cho static files

## Bảo mật

-  **CSRF Protection** - Bảo vệ chống CSRF attacks
-  **Rate Limiting** - Giới hạn request (50/15min dev, 10/15min prod)
-  **Helmet.js** - Security headers tự động
-  **JWT Tokens** - Access & Refresh tokens
-  **Password Hashing** - Bcrypt với salt rounds
-  **Input Validation** - Express-validator & Joi
-  **XSS Protection** - Sanitize HTML input
-  **CORS** - Controlled cross-origin access
-  **HTTPS** - Enforced in production
-  **Environment Variables** - Sensitive data protection

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
- `FRONTEND_URL` - Frontend URL
- Các Cloudinary credentials
- Email service credentials

## Đóng góp

Mọi đóng góp đều được chào đón! Để đóng góp:

1. Fork repository
2. Tạo branch mới (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Mở Pull Request

## License

Dự án này được phát hành dưới giấy phép ISC.

## Tác giả

**Son Vu**
- GitHub: [@sonvu2107](https://github.com/sonvu2107)
- Repository: [shiku](https://github.com/sonvu2107/shiku)

## Cảm ơn

Cảm ơn tất cả các thư viện và công cụ open-source đã được sử dụng trong dự án này!

---

⭐ Nếu bạn thấy dự án này hữu ích, hãy cho một star trên GitHub!
