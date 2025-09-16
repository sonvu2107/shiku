# 🎉 Hướng dẫn sử dụng tính năng Events & Media

## 📋 Tổng quan

Hệ thống đã được bổ sung hai tính năng chính:
- **Events (Sự kiện)**: Cho phép tạo, quản lý và tham gia sự kiện
- **Media (Kho media)**: Cho phép upload và quản lý hình ảnh, video

## 🚀 Cách khởi động

### 1. Khởi động Server
```bash
cd server
npm run dev
```

### 2. Khởi động Client
```bash
cd client
npm run dev
```

## 📅 Tính năng Events

### Tạo sự kiện mới
1. Truy cập `/events`
2. Nhấn nút "Tạo sự kiện"
3. Điền thông tin:
   - **Tiêu đề**: Tên sự kiện (bắt buộc)
   - **Mô tả**: Chi tiết sự kiện (bắt buộc)
   - **Ngày & Giờ**: Thời gian diễn ra (bắt buộc)
   - **Địa điểm**: Nơi tổ chức
   - **Số người tối đa**: Giới hạn người tham gia
   - **Tags**: Từ khóa phân loại
   - **Công khai**: Cho phép mọi người tìm thấy

### Quản lý sự kiện
- **Xem danh sách**: Tất cả sự kiện với bộ lọc
- **Tìm kiếm**: Theo tên, mô tả, địa điểm
- **Lọc**: Tất cả, sắp diễn ra, đã kết thúc, của tôi
- **Tham gia/Rời**: Nút tham gia cho sự kiện sắp diễn ra
- **Chỉnh sửa/Xóa**: Chỉ người tạo mới có quyền

### API Endpoints Events
```
GET    /api/events              # Lấy danh sách sự kiện
GET    /api/events/:id          # Chi tiết sự kiện
POST   /api/events              # Tạo sự kiện mới
PUT    /api/events/:id          # Cập nhật sự kiện
DELETE /api/events/:id          # Xóa sự kiện
POST   /api/events/:id/join     # Tham gia sự kiện
POST   /api/events/:id/leave    # Rời sự kiện
```

## 📸 Tính năng Media

### Upload media
1. Truy cập `/media`
2. Nhấn nút "Tải lên"
3. Chọn file hoặc kéo thả:
   - **Hình ảnh**: JPG, PNG, GIF, WebP
   - **Video**: MP4, AVI, MOV, WMV, WebM
   - **Audio**: MP3, WAV, OGG, M4A
   - **Tài liệu**: PDF, DOC, DOCX
4. Giới hạn: 50MB/file

### Quản lý media
- **Xem lưới/danh sách**: Chuyển đổi chế độ hiển thị
- **Tìm kiếm**: Theo tên file, tiêu đề
- **Lọc**: Tất cả, hình ảnh, video
- **Xem/Download**: Xem chi tiết và tải xuống
- **Chỉnh sửa**: Cập nhật tiêu đề, mô tả
- **Xóa**: Xóa file khỏi kho

### API Endpoints Media
```
GET    /api/media               # Lấy danh sách media
GET    /api/media/:id           # Chi tiết media
POST   /api/media               # Tạo media mới
PUT    /api/media/:id           # Cập nhật media
DELETE /api/media/:id           # Xóa media
POST   /api/media/:id/view      # Tăng lượt xem
POST   /api/uploads/media       # Upload file lên Cloudinary
```

## 🎨 Giao diện người dùng

### Responsive Design
- **Mobile**: Tối ưu cho điện thoại
- **Tablet**: Layout linh hoạt
- **Desktop**: Giao diện đầy đủ

### Toast Notifications
- **Success**: Thông báo thành công (xanh)
- **Error**: Thông báo lỗi (đỏ)
- **Warning**: Cảnh báo (vàng)
- **Info**: Thông tin (xanh dương)

### Tính năng UI
- **Loading states**: Spinner khi tải
- **Empty states**: Thông báo khi không có dữ liệu
- **Error handling**: Xử lý lỗi user-friendly
- **Form validation**: Kiểm tra dữ liệu đầu vào

## 🗄️ Cơ sở dữ liệu

### Collections MongoDB
- **events**: Lưu trữ thông tin sự kiện
- **media**: Lưu trữ metadata media
- **users**: Thông tin người dùng (đã có)

### Cloudinary
- **Upload**: File được lưu trên Cloudinary
- **Optimization**: Tự động tối ưu hình ảnh
- **CDN**: Phân phối nhanh toàn cầu

## 🔧 Cấu hình

### Environment Variables
```env
# MongoDB
MONGODB_URI=mongodb://localhost:27017/blog

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# JWT
JWT_SECRET=your_jwt_secret
```

### CORS Configuration
Server đã được cấu hình CORS cho:
- `http://localhost:5173` (Vite dev)
- `http://localhost:5174` (Vite alt)
- Các IP local network

## 🧪 Testing

### Test API với Postman
1. Import collection từ `server/postman/`
2. Set environment variables
3. Chạy các test cases

### Test Frontend
1. Mở browser developer tools
2. Kiểm tra Network tab
3. Test các tính năng upload, tạo sự kiện

## 📱 Mobile Optimization

### Responsive Breakpoints
- **xs**: < 640px (Mobile)
- **sm**: 640px+ (Large Mobile)
- **md**: 768px+ (Tablet)
- **lg**: 1024px+ (Desktop)
- **xl**: 1280px+ (Large Desktop)

### Mobile Features
- Touch-friendly buttons
- Swipe gestures
- Optimized images
- Fast loading

## 🚨 Troubleshooting

### Lỗi thường gặp

#### 1. Upload thất bại
- Kiểm tra kích thước file (< 50MB)
- Kiểm tra định dạng file được hỗ trợ
- Kiểm tra kết nối internet

#### 2. Tạo sự kiện lỗi
- Kiểm tra ngày diễn ra (phải trong tương lai)
- Kiểm tra thông tin bắt buộc
- Kiểm tra quyền đăng nhập

#### 3. API không hoạt động
- Kiểm tra server đang chạy
- Kiểm tra CORS configuration
- Kiểm tra database connection

### Debug Tips
1. Mở browser console
2. Kiểm tra Network requests
3. Xem server logs
4. Kiểm tra database

## 🔄 Cập nhật tiếp theo

### Tính năng có thể thêm
- [ ] Push notifications cho sự kiện
- [ ] Real-time updates với Socket.IO
- [ ] Analytics cho media và events
- [ ] Export/Import sự kiện
- [ ] Calendar integration
- [ ] Email reminders
- [ ] Advanced search filters
- [ ] Bulk operations

### Cải thiện hiệu suất
- [ ] Lazy loading cho media
- [ ] Infinite scroll
- [ ] Image optimization
- [ ] Caching strategies
- [ ] CDN optimization

## 📞 Hỗ trợ

Nếu gặp vấn đề, hãy:
1. Kiểm tra logs trong console
2. Xem server logs
3. Kiểm tra network requests
4. Tạo issue với thông tin chi tiết

---

**Chúc bạn sử dụng hệ thống hiệu quả! 🎉**
