/**
 * DailyActivity Model
 * Lưu snapshot số user hoạt động mỗi ngày để thống kê chính xác
 * Được populate bởi cron job chạy 23:59 hàng ngày
 */
import { Schema, model } from 'mongoose';

const DailyActivitySchema = new Schema({
    // Format: "YYYY-MM-DD"
    date: {
        type: String,
        required: true,
        unique: true
    },
    // Danh sách user ID đã hoạt động trong ngày
    activeUserIds: [{
        type: Schema.Types.ObjectId,
        ref: 'User'
    }],
    // Số lượng user hoạt động (cache để query nhanh)
    count: {
        type: Number,
        default: 0
    },
    // Thời điểm snapshot
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Index để query theo ngày nhanh hơn
DailyActivitySchema.index({ date: -1 });

export default model('DailyActivity', DailyActivitySchema);
