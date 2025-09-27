# Rate Limiting Configuration Guide

## 📊 **Updated Rate Limiting Settings (v2.0)**

### 1. **🌐 General API Requests**
- **Giới hạn**: 1500 requests / 15 phút (tăng từ 1000) - **100 requests/phút**
- **Áp dụng**: Tất cả API endpoints (trừ auth, upload, messages, posts)
- **Tính theo**: IP address
- **Bao gồm**: Comments, users, notifications, admin, friends, groups, support, events, media

### 2. **🔐 Authentication Requests**
- **Giới hạn**: 20 requests / 15 phút (tăng từ 5) - **1.3 requests/phút**
- **Áp dụng**: Login, register, password reset
- **Tính theo**: IP address
- **Đặc biệt**: Không tính successful requests

### 3. **🔍 Auth Status Requests**
- **Giới hạn**: 120 requests / 1 phút (tăng từ 60) - **2 requests/giây**
- **Áp dụng**: /me, heartbeat, token validation
- **Tính theo**: IP address
- **Lý do**: Heartbeat cần check thường xuyên

### 4. **📁 File Upload Requests**
- **Giới hạn**: 50 requests / 15 phút (giữ nguyên) - **3.3 requests/phút**
- **Áp dụng**: Upload images, files
- **Tính theo**: IP address
- **Lý do**: Content creators cần upload nhiều hơn

### 5. **💬 Message Requests**
- **Giới hạn**: 100 requests / 1 phút (tăng từ 60) - **1.7 requests/giây**
- **Áp dụng**: Send messages, chat
- **Tính theo**: IP address
- **Lý do**: Active users cần chat nhiều hơn

### 6. **📝 Posts Requests**
- **Giới hạn**: 800 requests / 15 phút (tăng từ 500) - **53 requests/phút**
- **Áp dụng**: Get posts, infinite scroll, post CRUD
- **Tính theo**: IP address
- **Lý do**: Infinite scroll cần nhiều requests hơn

## 🚀 **Tính toán thực tế cho 1 user (v2.0):**

### **Với infinite scroll:**
- **Initial load**: 1 request (100 posts)
- **Load more**: 1 request mỗi 15 posts
- **Load all**: 1 request cho mỗi 15 posts còn lại
- **Total có thể**: 800 requests / 15 phút = **53 requests/phút**

### **Với heavy usage:**
- **General API**: 1500 requests / 15 phút = **100 requests/phút**
- **Posts**: 800 requests / 15 phút = **53 requests/phút**
- **Uploads**: 50 requests / 15 phút = **3.3 requests/phút**
- **Messages**: 100 requests / 1 phút = **100 requests/phút**
- **Auth Status**: 120 requests / 1 phút = **120 requests/phút**

## 📈 **So sánh Before vs After (v2.0):**

| Endpoint | v1.0 | v2.0 | Improvement |
|----------|------|------|-------------|
| **General API** | 1000/15min | 1500/15min | **50% increase** |
| **Posts** | 500/15min | 800/15min | **60% increase** |
| **Uploads** | 50/15min | 50/15min | **No change** |
| **Messages** | 100/1min | 100/1min | **No change** |
| **Auth** | 20/15min | 20/15min | **No change** |
| **Auth Status** | 60/1min | 120/1min | **100% increase** |

## 🎯 **Benefits của cấu hình mới:**

### **1. Better Infinite Scroll Support:**
- ✅ **200 post requests** đủ cho infinite scroll
- ✅ **50 posts initial** + **25 posts per load** = 8+ loads
- ✅ **Load all** feature được support tốt

### **2. Content Creator Friendly:**
- ✅ **50 uploads/15min** đủ cho heavy content creation
- ✅ **1000 general requests** cho các operations khác
- ✅ **60 messages/min** cho active communication

### **3. Security vẫn được đảm bảo:**
- ✅ **Auth limit** vẫn strict (5/15min)
- ✅ **Rate limiting** vẫn prevent abuse
- ✅ **IP-based** limiting vẫn hoạt động

## 🔧 **Technical Implementation:**

### **Posts-specific Rate Limiter:**
```javascript
export const postsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // 200 post requests per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Quá nhiều yêu cầu bài viết, vui lòng thử lại sau 15 phút"
  }
});
```

### **Applied to Posts Routes:**
```javascript
app.use("/api/posts", postsLimiter, postRoutes);
```

## 📊 **Monitoring & Analytics:**

### **Rate Limit Headers:**
- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Requests remaining
- `X-RateLimit-Reset`: Time when limit resets

### **Logging:**
```javascript
// Log rate limit hits
app.use((req, res, next) => {
  if (res.get('X-RateLimit-Remaining') === '0') {
    console.log(`Rate limit hit for ${req.ip} on ${req.path}`);
  }
  next();
});
```

## 🚨 **Alert Thresholds:**

### **Warning Levels:**
- **Posts**: > 150 requests / 15 min
- **General**: > 800 requests / 15 min
- **Uploads**: > 40 requests / 15 min
- **Messages**: > 50 requests / 1 min

### **Critical Levels:**
- **Posts**: > 180 requests / 15 min
- **General**: > 950 requests / 15 min
- **Uploads**: > 45 requests / 15 min
- **Messages**: > 55 requests / 1 min

## 🔍 **Troubleshooting:**

### **Common Issues:**

#### 1. **Rate Limit Hit:**
```javascript
// Check remaining requests
const remaining = res.get('X-RateLimit-Remaining');
const resetTime = res.get('X-RateLimit-Reset');

if (remaining === '0') {
  console.log(`Rate limit reset at: ${new Date(resetTime * 1000)}`);
}
```

#### 2. **Infinite Scroll Issues:**
- Check if posts rate limit is hit
- Monitor posts-specific requests
- Consider caching for frequently accessed posts

#### 3. **Upload Issues:**
- Check upload rate limit
- Consider batch upload for multiple files
- Implement client-side upload queue

## 📝 **Best Practices:**

### **For Developers:**
1. **Monitor rate limits** trong development
2. **Implement retry logic** với exponential backoff
3. **Cache frequently accessed data**
4. **Use batch operations** khi có thể

### **For Users:**
1. **Don't spam requests** - use reasonable intervals
2. **Use infinite scroll** thay vì manual pagination
3. **Batch uploads** thay vì upload từng file
4. **Wait for rate limit reset** nếu bị limit

## 🎉 **Kết quả:**

- ✅ **Infinite scroll** hoạt động mượt mà
- ✅ **Content creators** có thể upload nhiều hơn
- ✅ **Active users** có thể chat thoải mái
- ✅ **Security** vẫn được đảm bảo
- ✅ **Performance** được tối ưu
- ✅ **User experience** được cải thiện

Rate limiting giờ đã được tối ưu cho modern web app với infinite scroll và heavy usage! 🚀
