import mongoose from "mongoose";

/**
 * Report Schema
 * Định nghĩa cấu trúc lưu trữ cho báo cáo vi phạm
 * Hỗ trợ báo cáo: bài viết (post), bình luận (comment), người dùng (user)
 */
const ReportSchema = new mongoose.Schema({
    // ==================== NGƯỜI BÁO CÁO ====================
    reporter: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true
    },

    // ==================== MỤC TIÊU BÁO CÁO ====================
    targetType: {
        type: String,
        enum: ["post", "comment", "user"],
        required: true,
        index: true
    },
    targetId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        index: true
    },

    // ==================== LÝ DO BÁO CÁO ====================
    reason: {
        type: String,
        enum: ["spam", "harassment", "inappropriate", "misinformation", "other"],
        required: true
    },
    description: {
        type: String,
        maxlength: 500,
        trim: true
    },

    // ==================== TRẠNG THÁI XỬ LÝ ====================
    status: {
        type: String,
        enum: ["pending", "resolved", "dismissed"],
        default: "pending",
        index: true
    },
    resolvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    resolvedAt: Date,
    resolution: {
        type: String,
        maxlength: 500
    },

    // ==================== METADATA ====================
    // Snapshot of target at report time (in case target is deleted)
    targetSnapshot: {
        content: String,
        authorId: mongoose.Schema.Types.ObjectId,
        authorName: String
    }
}, { timestamps: true });

// ==================== INDEXES ====================
ReportSchema.index({ status: 1, createdAt: -1 });
ReportSchema.index({ targetType: 1, targetId: 1 });
ReportSchema.index({ reporter: 1, targetId: 1 }, { unique: true }); // Prevent duplicate reports

// ==================== STATICS ====================

/**
 * Lấy danh sách reports với pagination và filters
 */
ReportSchema.statics.getReports = async function (options = {}) {
    const {
        page = 1,
        limit = 20,
        status,
        targetType,
        sortBy = 'createdAt',
        sortOrder = 'desc'
    } = options;

    const query = {};
    if (status) query.status = status;
    if (targetType) query.targetType = targetType;

    const skip = (page - 1) * limit;
    const sortOptions = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [reports, total] = await Promise.all([
        this.find(query)
            .populate('reporter', 'name email avatarUrl')
            .populate('resolvedBy', 'name email')
            .sort(sortOptions)
            .skip(skip)
            .limit(limit)
            .lean(),
        this.countDocuments(query)
    ]);

    return {
        reports,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
            hasNextPage: page < Math.ceil(total / limit),
            hasPrevPage: page > 1
        }
    };
};

/**
 * Đếm số reports pending
 */
ReportSchema.statics.getPendingCount = async function () {
    return this.countDocuments({ status: 'pending' });
};

export default mongoose.model("Report", ReportSchema);
