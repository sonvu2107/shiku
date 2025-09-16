# 🔒 Security Implementation Guide

## Tổng quan

Dự án MyBlog đã được nâng cấp với các tính năng bảo mật toàn diện để bảo vệ khỏi các lỗ hổng phổ biến và tấn công mạng.

## 🛡️ Các tính năng bảo mật đã implement

### 1. Input Validation & Sanitization
- **Joi Schema Validation**: Validate tất cả input với schema nghiêm ngặt
- **XSS Protection**: Sanitize HTML content để chống XSS
- **Password Strength**: Yêu cầu mật khẩu mạnh (8+ ký tự, chữ hoa, số, ký tự đặc biệt)
- **Email Validation**: Validate format email chính xác
- **Content Length Limits**: Giới hạn độ dài title (100 ký tự), content (5000 ký tự)

### 2. File Upload Security
- **Magic Bytes Detection**: Kiểm tra file signature thực tế, không chỉ dựa vào mimetype
- **File Type Validation**: Chỉ cho phép các loại file an toàn (jpg, png, mp4, webm, pdf)
- **Size Limits**: Giới hạn kích thước file (ảnh: 5MB, video: 50MB, document: 10MB)
- **Cloudinary Integration**: Upload an toàn lên Cloudinary với transformation

### 3. NoSQL Injection Protection
- **Regex Escaping**: Escape tất cả ký tự đặc biệt trong regex queries
- **Input Sanitization**: Sanitize tất cả input trước khi query MongoDB
- **Safe Query Builders**: Sử dụng các helper function an toàn cho MongoDB queries
- **Query Timeouts**: Giới hạn thời gian thực hiện query để tránh DoS

### 4. JWT Security Enhancement
- **Refresh Token System**: Implement refresh token với thời hạn 7 ngày
- **Token Blacklist**: Cơ chế blacklist token khi logout
- **Short-lived Access Tokens**: Access token chỉ có thời hạn 15 phút
- **Secure Token Storage**: Lưu token trong httpOnly cookies

### 5. Environment Variables Security
- **dotenv-safe**: Đảm bảo tất cả env vars cần thiết được set
- **Validation**: Validate format và độ mạnh của các env vars
- **No Sensitive Logging**: Không log giá trị nhạy cảm ra console

### 6. Security Logging & Monitoring
- **Comprehensive Logging**: Log tất cả hoạt động bảo mật quan trọng
- **Suspicious Activity Detection**: Phát hiện các hoạt động đáng ngờ
- **Rate Limit Logging**: Log khi rate limit bị vượt quá
- **File Upload Logging**: Log tất cả file upload attempts

### 7. Rate Limiting
- **Multiple Rate Limiters**: Các loại rate limiter khác nhau cho từng endpoint
- **IP-based Limiting**: Giới hạn theo IP address
- **User-based Limiting**: Giới hạn theo user (cho refresh token)
- **Graceful Degradation**: Xử lý rate limit một cách graceful

### 8. CORS & Security Headers
- **Strict CORS**: Chỉ cho phép các origin được whitelist
- **Helmet Security Headers**: Các security headers từ Helmet
- **Content Security Policy**: CSP để chống XSS
- **HSTS**: HTTP Strict Transport Security

## 🚀 Cách sử dụng

### 1. Cài đặt dependencies
```bash
cd server
npm install joi dotenv-safe file-type express-rate-limit express-validator helmet cors morgan
```

### 2. Cấu hình environment variables
```bash
cp env.example .env
# Chỉnh sửa .env với các giá trị thực tế
```

### 3. Chạy server với security features
```bash
# Chạy server secure
npm run start

# Hoặc chạy development mode
npm run dev
```

### 4. Chạy security tests
```bash
npm run test:security
```

## 📁 Cấu trúc file security

```
server/
├── src/
│   ├── middleware/
│   │   ├── validation.js          # Input validation với Joi
│   │   ├── fileUpload.js          # File upload security
│   │   ├── jwtSecurity.js         # JWT security với refresh token
│   │   └── securityLogging.js     # Security logging
│   ├── utils/
│   │   └── mongoSecurity.js       # MongoDB security utilities
│   ├── config/
│   │   └── env.js                 # Environment variables security
│   ├── routes/
│   │   ├── auth-secure.js         # Secure auth routes
│   │   ├── posts-secure.js        # Secure posts routes
│   │   └── uploads-secure.js      # Secure upload routes
│   └── index-secure.js            # Main server với security
├── scripts/
│   └── test-security.js           # Security testing script
├── logs/                          # Security logs directory
├── env.example                    # Environment variables template
└── SECURITY.md                    # This file
```

## 🔧 Configuration

### Environment Variables
```env
# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-at-least-32-characters-long
JWT_REFRESH_SECRET=your-super-secret-refresh-key-at-least-32-characters-long

# Database
MONGODB_URI=mongodb://localhost:27017/myblog

# Cloudinary
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# SMTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

### Rate Limiting Configuration
```javascript
// Có thể điều chỉnh trong src/config/env.js
rateLimit: {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // requests per window
  authMax: 5, // auth requests per window
  uploadMax: 50, // upload requests per window
  messageMax: 60, // messages per minute
  postsMax: 200 // post requests per window
}
```

## 🧪 Testing Security

### Chạy security tests
```bash
npm run test:security
```

### Các test cases bao gồm:
- Input validation (weak password, invalid email, XSS)
- Rate limiting
- JWT security (invalid token, expired token)
- File upload security
- CORS protection
- NoSQL injection protection
- Security headers
- Error handling

## 📊 Monitoring & Logging

### Security Logs
Logs được lưu trong `logs/security-YYYY-MM-DD.log` với format JSON:

```json
{
  "timestamp": "2024-01-01T00:00:00.000Z",
  "level": "INFO",
  "event": "LOGIN_SUCCESS",
  "data": {
    "email": "user@example.com",
    "ip": "127.0.0.1",
    "request": {
      "method": "POST",
      "url": "/api/auth/login",
      "ip": "127.0.0.1",
      "userAgent": "Mozilla/5.0...",
      "userId": "64f1a2b3c4d5e6f7g8h9i0j1"
    }
  }
}
```

### Log Events
- `LOGIN_SUCCESS` / `LOGIN_FAILED`
- `REGISTER_SUCCESS` / `REGISTER_FAILED`
- `LOGOUT`
- `PASSWORD_RESET`
- `TOKEN_REFRESH`
- `TOKEN_BLACKLIST`
- `RATE_LIMIT_EXCEEDED`
- `FILE_UPLOAD` / `FILE_UPLOAD_BLOCKED`
- `ADMIN_ACTION`
- `BAN_USER` / `UNBAN_USER`
- `UNAUTHORIZED_ACCESS`
- `SQL_INJECTION_ATTEMPT`
- `XSS_ATTEMPT`

## 🚨 Security Best Practices

### 1. Regular Security Updates
- Cập nhật dependencies thường xuyên
- Chạy `npm audit` để kiểm tra vulnerabilities
- Monitor security advisories

### 2. Environment Security
- Không commit file `.env`
- Sử dụng strong secrets cho JWT
- Rotate secrets định kỳ

### 3. Monitoring
- Monitor security logs thường xuyên
- Set up alerts cho suspicious activities
- Regular security testing

### 4. Database Security
- Sử dụng MongoDB authentication
- Enable SSL/TLS cho database connections
- Regular database backups

## 🔍 Troubleshooting

### Common Issues

1. **JWT Token Errors**
   - Kiểm tra JWT_SECRET có đủ mạnh không
   - Verify token format và expiration

2. **File Upload Issues**
   - Kiểm tra file type và size limits
   - Verify Cloudinary configuration

3. **Rate Limiting Issues**
   - Adjust rate limit settings nếu cần
   - Check IP whitelist cho development

4. **CORS Issues**
   - Verify allowed origins trong config
   - Check credentials settings

## 📞 Support

Nếu gặp vấn đề về security, vui lòng:
1. Check logs trong `logs/` directory
2. Run security tests: `npm run test:security`
3. Verify environment variables
4. Check MongoDB connection và permissions

## 🔄 Migration từ version cũ

Để migrate từ version cũ:

1. Backup database
2. Install new dependencies
3. Update environment variables
4. Test với security features
5. Deploy gradually

## 📈 Performance Impact

Security features có thể ảnh hưởng performance:
- Input validation: ~1-2ms per request
- File upload security: ~10-50ms per file
- JWT verification: ~1-3ms per request
- Logging: ~1-5ms per request

Tổng impact: ~5-10% slower response time, nhưng bảo mật được cải thiện đáng kể.
