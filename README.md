# Fullstack Blog (Express + MongoDB + React + Vite)

Một blog tối giản, đủ chức năng: đăng ký/đăng nhập (JWT), viết/sửa/xoá bài, tag, tìm kiếm, bình luận, like, ảnh cover, upload ảnh (local hoặc Cloudinary), phân trang.

## 1) Yêu cầu
- Node.js 18+
- Tài khoản MongoDB Atlas (hoặc MongoDB local)
- (Tuỳ chọn) Cloudinary để lưu ảnh

## 2) Cấu trúc
```
blog-fullstack/
├─ server/               # API Express + MongoDB
│  ├─ src/
│  │  ├─ config/db.js
│  │  ├─ middleware/ (auth, limiter, error)
│  │  ├─ models/ (User, Post, Comment)
│  │  ├─ routes/ (auth, posts, comments, uploads)
│  │  └─ index.js
│  └─ .env.example
└─ client/               # React + Vite + Tailwind
   └─ src/ (pages, components, api.js)
```

## 3) Chạy local

### 3.1 Backend
```bash
cd server
cp .env.example .env
# sửa .env: MONGODB_URI, JWT_SECRET, CORS_ORIGIN (http://localhost:5173)
npm i
npm run start   # hoặc: npm run dev (nếu đã cài nodemon)
```

Backend chạy ở `http://localhost:4000`.

### 3.2 Frontend
```bash
cd client
npm i
# tạo file .env ở thư mục client nếu muốn cấu hình:
# VITE_API_URL=http://localhost:4000
npm run dev
```

Frontend chạy ở `http://localhost:5173`.

## 4) Endpoints chính
- `POST /api/auth/register` { name, email, password }
- `POST /api/auth/login` { email, password }
- `GET  /api/auth/me` (Bearer token)
- `GET  /api/posts` ?page ?limit ?q ?tag ?author ?status
- `GET  /api/posts/slug/:slug`
- `POST /api/posts` (auth) { title, content, tags[], coverUrl, status }
- `PUT  /api/posts/:id` (auth)
- `DELETE /api/posts/:id` (auth)
- `POST /api/posts/:id/like` (auth)
- `GET  /api/comments/post/:postId`
- `POST /api/comments/post/:postId` (auth)
- `DELETE /api/comments/:id` (auth)

## 5) Upload ảnh
Mặc định lưu file vào thư mục `server/uploads` và truy cập qua `/uploads/<tên_file>`.
Nếu cấu hình Cloudinary trong `.env` (CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET) thì ảnh sẽ được up lên Cloudinary và trả về `secure_url`.

## 6) Triển khai
- **Backend**: Railway/Render/Fly… (Node server). Set env giống `.env.example`. Bật CORS_ORIGIN với domain của frontend.
- **Frontend**: Netlify/Vercel/GitHub Pages. Set `VITE_API_URL` trỏ tới domain backend.

## 7) Ghi chú
- Đây là khung sườn sạch để bắt đầu. Bạn có thể bổ sung: phân quyền admin UI, sitemap/SEO, RSS, slug tuỳ biến, editor nâng cao, xác thực email, refresh token, v.v.
- Mọi phần tử UI đã viết bằng Tailwind (tối giản) để bạn dễ chỉnh.

# MyBlog

## Deploy & Development

- Frontend: React + Vite (client/)
- Backend: Node.js + Express (server/)
- Database: MongoDB
- Styling: Tailwind CSS

### Local Development
```bash
cd client
npm install
npm run dev

cd ../server
npm install
npm run dev
```

### Deploy on Railway
1. Push code lên GitHub: [sonvu2107/shiku](https://github.com/sonvu2107/shiku)
2. Truy cập https://railway.app, tạo project mới, kết nối với repo.
3. Thiết lập biến môi trường `.env` cho server (MongoDB URI, JWT secret, Cloudinary, ...).
4. Railway sẽ tự động build và deploy.

### Environment Variables
- Tạo file `.env` trong `server/` với các biến:
```
MONGODB_URI=...
JWT_SECRET=...
CLOUDINARY_URL=...
```

### Notes
- Đảm bảo đã có file `.gitignore` để không push thông tin nhạy cảm.
- Đã có sẵn cấu hình cho Railway và Vite.
