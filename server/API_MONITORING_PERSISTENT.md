# API Monitoring với Persistent Storage

## Tổng quan

Hệ thống API Monitoring đã được cập nhật để sử dụng persistent storage thay vì in-memory storage. Điều này có nghĩa là dữ liệu monitoring sẽ được lưu trữ trong database và không bị mất khi:

- Admin tắt web hoặc đăng xuất
- Server restart hoặc maintenance  
- Có user khác truy cập hệ thống

## Tính năng mới

### 1. Persistent Database Storage
- **Model**: `ApiStats` trong MongoDB
- **Lưu trữ**: Tất cả dữ liệu API calls, rate limits, real-time updates
- **Tự động tạo**: Document được tạo tự động khi cần thiết

### 2. Real-time Updates từ Database
- Real-time updates được lưu trữ trong database
- Tải lại dữ liệu khi admin mở lại web
- Không bị mất dữ liệu khi refresh

### 3. Data Retention
- **Tự động xóa**: Dữ liệu cũ hơn 7 ngày
- **Hourly reset**: Stats hiện tại reset mỗi giờ
- **Historical data**: Lưu trữ 24 giờ dữ liệu chi tiết

### 4. Performance Optimization
- **Indexing**: Database indexes cho performance tốt
- **Memory efficient**: Sử dụng Maps thay vì objects
- **Batch operations**: Tối ưu database operations

## Cấu trúc Database

### ApiStats Schema
```javascript
{
  totalRequests: Number,
  rateLimitHits: Number,
  lastReset: Date,
  hourlyStats: [{
    hour: Number,
    totalRequests: Number,
    rateLimitHits: Number,
    requestsByEndpoint: Map,
    requestsByIP: Map,
    timestamp: Date
  }],
  currentPeriod: {
    requestsByEndpoint: Map,
    requestsByIP: Map,
    requestsByHour: Map,
    rateLimitHitsByEndpoint: Map
  },
  realtimeUpdates: [{
    endpoint: String,
    method: String,
    ip: String,
    statusCode: Number,
    userAgent: String,
    timestamp: Date
  }]
}
```

## API Endpoints

### GET /api/api-monitoring/stats
Lấy thống kê API từ database
- **Response**: Thống kê chi tiết với dữ liệu persistent
- **Real-time updates**: 50 updates gần nhất từ database

### POST /api/api-monitoring/reset
Reset tất cả stats trong database
- **Action**: Xóa tất cả dữ liệu hiện tại
- **Preserve**: Không ảnh hưởng đến historical data

### GET /api/api-monitoring/rate-limits
Lấy thông tin rate limits (không thay đổi)

## Scripts Quản lý

### Cleanup Script
```bash
npm run cleanup-api-stats
```
- Xóa dữ liệu cũ hơn 7 ngày
- Chạy tự động mỗi 24 giờ
- Có thể chạy thủ công khi cần

### Monitor Script
```bash
npm run monitor-api
```
- Monitor rate limits real-time
- Hiển thị thống kê chi tiết

## Cấu hình

### Environment Variables
Không cần thêm biến môi trường mới, sử dụng `MONGODB_URI` hiện có.

### Database Connection
Hệ thống tự động kết nối database thông qua `connectDB()` trong `index.js`.

## Monitoring Features

### 1. Real-time Tracking
- Mỗi API call được track và lưu vào database
- WebSocket updates cho admin dashboard
- Persistent real-time updates list

### 2. Historical Data
- 24 giờ dữ liệu chi tiết theo giờ
- Top endpoints và IPs
- Rate limit hits theo endpoint

### 3. Performance Metrics
- Requests per minute
- Rate limit hit rate
- Hourly distribution charts

## Troubleshooting

### Database Connection Issues
```bash
# Kiểm tra kết nối MongoDB
node -e "console.log(process.env.MONGODB_URI)"
```

### Cleanup Manual
```bash
# Chạy cleanup thủ công
npm run cleanup-api-stats
```

### Reset Stats
```bash
# Reset qua API
curl -X POST http://localhost:5000/api/api-monitoring/reset \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Performance Considerations

### 1. Database Size
- Dữ liệu được tự động cleanup mỗi 24h
- Chỉ giữ 7 ngày dữ liệu
- Real-time updates giới hạn 100 entries

### 2. Memory Usage
- Sử dụng Maps thay vì objects
- Batch database operations
- Efficient indexing

### 3. Network Traffic
- WebSocket updates chỉ gửi cho admin
- Client polling fallback khi WebSocket fail
- Compressed data structures

## Migration từ In-Memory

Hệ thống tự động migrate từ in-memory sang database:
1. Tạo document mới nếu chưa có
2. Bắt đầu tracking với database
3. Không cần migration script

## Security

### 1. Access Control
- Chỉ admin mới có thể xem stats
- Rate limiting vẫn hoạt động bình thường
- CSRF protection

### 2. Data Privacy
- IP addresses được track nhưng không lưu user info
- User agents được truncate
- Không lưu sensitive data

## Monitoring Dashboard

### UI Updates
- Badge "Persistent" hiển thị storage type
- Thông tin về data retention
- Real-time updates từ database
- Historical data visualization

### Real-time Features
- Live API calls feed
- WebSocket updates
- Auto-refresh fallback
- Error handling

## Best Practices

### 1. Regular Cleanup
- Chạy cleanup script định kỳ
- Monitor database size
- Check performance metrics

### 2. Monitoring
- Watch for high rate limit hits
- Monitor unusual traffic patterns
- Check error rates

### 3. Maintenance
- Regular database backups
- Monitor disk space
- Check connection health

## Support

Nếu gặp vấn đề với hệ thống monitoring:
1. Kiểm tra database connection
2. Chạy cleanup script
3. Check server logs
4. Verify admin permissions
