# Shiku Blog & Chat

Một nền tảng blog + chat hiện đại, fullstack: đăng ký/đăng nhập (JWT), viết/sửa/xoá bài, tag, tìm kiếm, bình luận, like, upload ảnh (local/Cloudinary), phân trang, chat Messenger-style, admin dashboard, feedback, settings, support, phân quyền, responsive, deploy Railway.

## Tính năng chính
- Đăng ký/Đăng nhập/JWT
- Quản lý bài viết: tạo, sửa, xoá, like, bình luận, tag, tìm kiếm
- Upload ảnh: local hoặc Cloudinary
- Chat Messenger-style: popup, dropdown, gửi ảnh, xem lịch sử
- Admin Dashboard: quản lý user, cấm user, gửi thông báo, xem góp ý
- Trang Settings: quản lý tài khoản, đổi mật khẩu, xoá tài khoản
- Trang Support: gửi góp ý/feedback
- Phân quyền: user thường, admin
- Responsive UI, sticky header, infinite scroll
- Tìm kiếm user/bài viết, dropdown chat, popup chat
- Triển khai Railway, cấu hình CI/CD

## Cấu trúc thư mục
```
MyBlog/
├─ client/      # React + Vite + Tailwind
│  ├─ src/
│  │  ├─ pages/ (Home, Login, Register, Profile, Settings, Support, AdminDashboard, Chat...)
│  │  ├─ components/ (Navbar, ChatDropdown, ChatPopup, PostCard, ...)
│  │  ├─ api.js, styles.css
│  └─ public/
├─ server/      # Node.js + Express + MongoDB
│  ├─ src/
│  │  ├─ models/ (User, Post, Comment, Message, Notification, ...)
│  │  ├─ routes/ (auth, posts, comments, messages, notifications, feedback, ...)
│  │  ├─ services/ (NotificationService, ...)
│  │  └─ index.js
│  └─ .env.example
├─ railway.json # Railway deploy config
├─ .gitignore
└─ README.md
```

## Hướng dẫn chạy local
### Backend
```bash
cd server
cp .env.example .env # điền MONGODB_URI, JWT_SECRET, CLOUDINARY_URL
npm install
npm run dev
```
Backend chạy ở `http://localhost:4000`

### Frontend
```bash
cd client
npm install
npm run dev
```
Frontend chạy ở `http://localhost:5173`

## Deploy Railway
1. Push code lên GitHub: [sonvu2107/shiku](https://github.com/sonvu2107/shiku)
2. Truy cập https://railway.app, tạo project mới, kết nối với repo.
3. Thiết lập biến môi trường `.env` cho server (MongoDB URI, JWT secret, Cloudinary, ...).
4. Railway sẽ tự động build và deploy.

## Biến môi trường
- Tạo file `.env` trong `server/` với các biến:
```
MONGODB_URI=...
JWT_SECRET=...
CLOUDINARY_URL=...
```

## Các endpoint chính
- Đăng nhập/Đăng ký: `/api/auth/register`, `/api/auth/login`, `/api/auth/me`
- Bài viết: `/api/posts`, `/api/posts/:id`, `/api/posts/slug/:slug`, `/api/posts/:id/like`
- Bình luận: `/api/comments/post/:postId`, `/api/comments/:id`
- Chat: `/api/messages`, `/api/conversations`, ...
- Thông báo: `/api/notifications`, `/api/notifications/system`, `/api/notifications/broadcast`
- Góp ý/feedback: `/api/support/feedback`
- Quản lý user: `/api/admin/users`, `/api/admin/ban-user`, `/api/admin/unban-user`

## Ghi chú
- UI sử dụng Tailwind, tối ưu responsive, sticky header, infinite scroll
- Đã có Messenger-style chat popup, dropdown, phân quyền, admin dashboard, feedback
- Không còn dark mode ở Settings
- Đã có .gitignore, railway.json, hướng dẫn deploy
- Nếu cần thêm hướng dẫn CI/CD, badge, hoặc tính năng mới, hãy liên hệ!
