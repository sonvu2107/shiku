# Rate Limiting Configuration Guide

## 📊 **Updated Rate Limiting Settings**

### 1. **🌐 General API Requests**
- **Giới hạn**: 1000 requests / 15 phút (tăng từ 300)
- **Áp dụng**: Tất cả API endpoints (trừ auth, upload, messages, posts)
- **Tính theo**: IP address
- **Bao gồm**: Comments, users, notifications, admin, friends, groups, support

### 2. **🔐 Authentication Requests**
- **Giới hạn**: 5 requests / 15 phút (giữ nguyên)
- **Áp dụng**: Login, register, password reset
- **Tính theo**: IP address
- **Đặc biệt**: Không tính successful requests

### 3. **📁 File Upload Requests**
- **Giới hạn**: 50 requests / 15 phút (tăng từ 20)
- **Áp dụng**: Upload images, files
- **Tính theo**: IP address
- **Lý do**: Content creators cần upload nhiều hơn

### 4. **💬 Message Requests**
- **Giới hạn**: 60 requests / 1 phút (tăng từ 30)
- **Áp dụng**: Send messages, chat
- **Tính theo**: IP address
- **Lý do**: Active users cần chat nhiều hơn

### 5. **📝 Posts Requests (NEW)**
- **Giới hạn**: 200 requests / 15 phút
- **Áp dụng**: Get posts, infinite scroll, post CRUD
- **Tính theo**: IP address
- **Lý do**: Infinite scroll cần nhiều requests

## 🚀 **Tính toán thực tế cho 1 user:**

### **Với infinite scroll:**
- **Initial load**: 1 request (50 posts)
- **Load more**: 1 request mỗi 25 posts
- **Load all**: 1 request cho mỗi 25 posts còn lại
- **Total có thể**: 200 requests / 15 phút = **13+ requests/phút**

### **Với heavy usage:**
- **General API**: 1000 requests / 15 phút = **67 requests/phút**
- **Posts**: 200 requests / 15 phút = **13 requests/phút**
- **Uploads**: 50 requests / 15 phút = **3+ requests/phút**
- **Messages**: 60 requests / 1 phút = **60 requests/phút**

## 📈 **So sánh Before vs After:**

| Endpoint | Before | After | Improvement |
|----------|--------|-------|-------------|
| **General API** | 300/15min | 1000/15min | **233% increase** |
| **Posts** | 300/15min | 200/15min | **Dedicated limit** |
| **Uploads** | 20/15min | 50/15min | **150% increase** |
| **Messages** | 30/1min | 60/1min | **100% increase** |
| **Auth** | 5/15min | 5/15min | **No change** |

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
