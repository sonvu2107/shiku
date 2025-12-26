/**
 * VibeCheck Model
 * 
 * Schema cho daily vibe check - câu hỏi hàng ngày của community
 * Mỗi ngày có 1 câu hỏi unique với các options để vote
 */

import mongoose from "mongoose";

const optionSchema = new mongoose.Schema({
    id: {
        type: String,
        required: true
    },
    label: {
        type: String,
        required: true
    },
    votes: {
        type: Number,
        default: 0
    }
}, { _id: false });

const vibeCheckSchema = new mongoose.Schema({
    // Ngày của vibe check (unique, chỉ lấy phần date không có time)
    date: {
        type: Date,
        required: true,
        unique: true,
        index: true
    },
    // Câu hỏi hiển thị
    question: {
        type: String,
        required: true,
        default: "Hôm nay bạn đang ở mood nào?"
    },
    // Các options để vote
    options: {
        type: [optionSchema],
        required: true,
        default: [
            { id: "happy", label: "Vui vẻ", votes: 0 },
            { id: "neutral", label: "Bình thường", votes: 0 },
            { id: "tired", label: "Mệt mỏi", votes: 0 },
            { id: "stressed", label: "Stress", votes: 0 }
        ]
    },
    // Tổng số votes (cached để query nhanh)
    totalVotes: {
        type: Number,
        default: 0
    },
    // Loại câu hỏi (để phân loại)
    category: {
        type: String,
        enum: ["mood", "activity", "preference", "fun"],
        default: "mood"
    },
    // Active hay không
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Index cho query theo ngày
vibeCheckSchema.index({ date: -1 });
vibeCheckSchema.index({ isActive: 1, date: -1 });

// Static method: Lấy hoặc tạo vibe check cho hôm nay
vibeCheckSchema.statics.getTodayVibeCheck = async function () {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let vibeCheck = await this.findOne({ date: today });

    if (!vibeCheck) {
        // Tự động tạo vibe check mới cho hôm nay
        vibeCheck = await this.create({
            date: today,
            question: getRandomQuestion(),
            options: getRandomOptions()
        });
    }

    return vibeCheck;
};

// Helper: Danh sách câu hỏi với options tương ứng (20+ câu hỏi)
const VIBE_CHECK_QUESTIONS = [
    // === MOOD ===
    {
        question: "Hôm nay bạn đang ở mood nào?",
        options: [
            { id: "happy", label: "Vui vẻ", votes: 0 },
            { id: "neutral", label: "Bình thường", votes: 0 },
            { id: "tired", label: "Mệt mỏi", votes: 0 },
            { id: "stressed", label: "Stress", votes: 0 },
            { id: "excited", label: "Hype", votes: 0 }
        ]
    },
    {
        question: "Năng lượng hôm nay của bạn?",
        options: [
            { id: "high", label: "Tràn đầy", votes: 0 },
            { id: "medium", label: "Ổn định", votes: 0 },
            { id: "low", label: "Yếu", votes: 0 },
            { id: "empty", label: "Cạn kiệt", votes: 0 }
        ]
    },
    {
        question: "Mức độ productive hôm nay?",
        options: [
            { id: "super", label: "Siêu năng suất", votes: 0 },
            { id: "good", label: "Khá tốt", votes: 0 },
            { id: "meh", label: "Tàm tạm", votes: 0 },
            { id: "lazy", label: "Lười biếng", votes: 0 }
        ]
    },
    // === PREFERENCES ===
    {
        question: "Cà phê hay trà?",
        options: [
            { id: "coffee", label: "Cà phê", votes: 0 },
            { id: "tea", label: "Trà", votes: 0 },
            { id: "both", label: "Cả hai", votes: 0 },
            { id: "neither", label: "Khác", votes: 0 }
        ]
    },
    {
        question: "Bạn làm việc hiệu quả hơn lúc nào?",
        options: [
            { id: "morning", label: "Sáng sớm", votes: 0 },
            { id: "afternoon", label: "Buổi chiều", votes: 0 },
            { id: "night", label: "Ban đêm", votes: 0 },
            { id: "anytime", label: "Bất cứ lúc nào", votes: 0 }
        ]
    },
    {
        question: "Mùa yêu thích của bạn?",
        options: [
            { id: "spring", label: "Xuân", votes: 0 },
            { id: "summer", label: "Hạ", votes: 0 },
            { id: "fall", label: "Thu", votes: 0 },
            { id: "winter", label: "Đông", votes: 0 }
        ]
    },
    {
        question: "Bạn thích đi du lịch kiểu nào?",
        options: [
            { id: "beach", label: "Biển", votes: 0 },
            { id: "mountain", label: "Núi", votes: 0 },
            { id: "city", label: "Thành phố", votes: 0 },
            { id: "countryside", label: "Nông thôn", votes: 0 }
        ]
    },
    // === ACTIVITIES ===
    {
        question: "Cuối tuần này bạn dự định làm gì?",
        options: [
            { id: "rest", label: "Nghỉ ngơi", votes: 0 },
            { id: "hangout", label: "Đi chơi", votes: 0 },
            { id: "work", label: "Làm việc", votes: 0 },
            { id: "hobby", label: "Hobby", votes: 0 }
        ]
    },
    {
        question: "Bạn đang làm gì lúc này?",
        options: [
            { id: "working", label: "Làm việc", votes: 0 },
            { id: "studying", label: "Học tập", votes: 0 },
            { id: "chilling", label: "Chill", votes: 0 },
            { id: "scrolling", label: "Lướt web", votes: 0 }
        ]
    },
    {
        question: "Hoạt động giải trí yêu thích?",
        options: [
            { id: "gaming", label: "Chơi game", votes: 0 },
            { id: "reading", label: "Đọc sách", votes: 0 },
            { id: "watching", label: "Xem phim", votes: 0 },
            { id: "sports", label: "Thể thao", votes: 0 }
        ]
    },
    // === FOOD ===
    {
        question: "Food mood hôm nay là gì?",
        options: [
            { id: "rice", label: "Cơm", votes: 0 },
            { id: "noodles", label: "Bún/Phở", votes: 0 },
            { id: "fastfood", label: "Fast food", votes: 0 },
            { id: "healthy", label: "Healthy", votes: 0 }
        ]
    },
    {
        question: "Đồ uống yêu thích?",
        options: [
            { id: "bubble", label: "Trà sữa", votes: 0 },
            { id: "coffee", label: "Cà phê", votes: 0 },
            { id: "juice", label: "Nước ép", votes: 0 },
            { id: "water", label: "Nước lọc", votes: 0 }
        ]
    },
    {
        question: "Bữa ăn quan trọng nhất?",
        options: [
            { id: "breakfast", label: "Sáng", votes: 0 },
            { id: "lunch", label: "Trưa", votes: 0 },
            { id: "dinner", label: "Tối", votes: 0 },
            { id: "snack", label: "Ăn vặt", votes: 0 }
        ]
    },
    // === MUSIC & ENTERTAINMENT ===
    {
        question: "Bạn đang nghe thể loại nhạc gì?",
        options: [
            { id: "vpop", label: "V-Pop", votes: 0 },
            { id: "kpop", label: "K-Pop", votes: 0 },
            { id: "usuk", label: "US-UK", votes: 0 },
            { id: "lofi", label: "Lo-fi", votes: 0 },
            { id: "none", label: "Không nghe", votes: 0 }
        ]
    },
    {
        question: "Thể loại phim yêu thích?",
        options: [
            { id: "action", label: "Hành động", votes: 0 },
            { id: "romance", label: "Tình cảm", votes: 0 },
            { id: "comedy", label: "Hài", votes: 0 },
            { id: "horror", label: "Kinh dị", votes: 0 }
        ]
    },
    // === SOCIAL ===
    {
        question: "Bạn thích hoạt động một mình hay nhóm?",
        options: [
            { id: "solo", label: "Một mình", votes: 0 },
            { id: "small", label: "Nhóm nhỏ", votes: 0 },
            { id: "big", label: "Đông đúc", votes: 0 },
            { id: "depends", label: "Tùy mood", votes: 0 }
        ]
    },
    {
        question: "Cách liên lạc ưa thích?",
        options: [
            { id: "text", label: "Nhắn tin", votes: 0 },
            { id: "call", label: "Gọi điện", votes: 0 },
            { id: "video", label: "Video call", votes: 0 },
            { id: "meet", label: "Gặp trực tiếp", votes: 0 }
        ]
    },
    // === FUN & RANDOM ===
    {
        question: "Nếu được chọn siêu năng lực?",
        options: [
            { id: "fly", label: "Bay", votes: 0 },
            { id: "invisible", label: "Tàng hình", votes: 0 },
            { id: "time", label: "Quay ngược thời gian", votes: 0 },
            { id: "read", label: "Đọc suy nghĩ", votes: 0 }
        ]
    },
    {
        question: "Pet yêu thích?",
        options: [
            { id: "dog", label: "Chó", votes: 0 },
            { id: "cat", label: "Mèo", votes: 0 },
            { id: "other", label: "Khác", votes: 0 },
            { id: "none", label: "Không nuôi", votes: 0 }
        ]
    },
    {
        question: "Bạn là người sáng tạo hay logic?",
        options: [
            { id: "creative", label: "Sáng tạo", votes: 0 },
            { id: "logic", label: "Logic", votes: 0 },
            { id: "both", label: "Cả hai", votes: 0 },
            { id: "neither", label: "Không biết", votes: 0 }
        ]
    },
    {
        question: "Màu sắc yêu thích?",
        options: [
            { id: "blue", label: "Xanh dương", votes: 0 },
            { id: "red", label: "Đỏ", votes: 0 },
            { id: "green", label: "Xanh lá", votes: 0 },
            { id: "black", label: "Đen", votes: 0 },
            { id: "other", label: "Khác", votes: 0 }
        ]
    }
];

// Helper: Lấy câu hỏi theo ngày
function getQuestionForToday() {
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
    return VIBE_CHECK_QUESTIONS[dayOfYear % VIBE_CHECK_QUESTIONS.length];
}

function getRandomQuestion() {
    return getQuestionForToday().question;
}

function getRandomOptions() {
    return getQuestionForToday().options;
}

const VibeCheck = mongoose.model("VibeCheck", vibeCheckSchema);

export default VibeCheck;
