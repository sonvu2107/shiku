import mongoose from 'mongoose';

/**
 * GiftCode Schema - Hệ thống mã quà tặng
 */
const GiftCodeSchema = new mongoose.Schema({
    // Mã code (unique, uppercase)
    code: {
        type: String,
        required: true,
        unique: true,
        uppercase: true,
        trim: true,
        index: true
    },

    // Tên/mô tả code
    name: {
        type: String,
        required: true,
        trim: true
    },

    // Mô tả chi tiết
    description: {
        type: String,
        default: ''
    },

    // Loại code
    type: {
        type: String,
        enum: ['one_time', 'limited', 'unlimited'],
        default: 'limited'
        // one_time: Mỗi code chỉ dùng 1 lần (cho 1 user)
        // limited: Giới hạn số lần dùng
        // unlimited: Không giới hạn số lần dùng
    },

    // Phần thưởng
    rewards: {
        spiritStones: { type: Number, default: 0 },
        exp: { type: Number, default: 0 },
        items: [{
            itemId: String,
            type: String,
            name: String,
            quantity: { type: Number, default: 1 },
            metadata: mongoose.Schema.Types.Mixed
        }]
    },

    // Giới hạn
    maxUses: {
        type: Number,
        default: 1  // Tổng số lần có thể dùng
    },
    
    usedCount: {
        type: Number,
        default: 0  // Số lần đã dùng
    },

    // Danh sách user đã dùng
    usedBy: [{
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        usedAt: { type: Date, default: Date.now },
        username: String
    }],

    // Thời gian hiệu lực
    startDate: {
        type: Date,
        default: Date.now
    },
    
    endDate: {
        type: Date,
        default: null  // null = vĩnh viễn
    },

    // Trạng thái
    isActive: {
        type: Boolean,
        default: true
    },

    // Yêu cầu tối thiểu
    requirements: {
        minRealmLevel: { type: Number, default: 1 },
        maxRealmLevel: { type: Number, default: 999 }
    },

    // Metadata
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    
    createdAt: {
        type: Date,
        default: Date.now
    },
    
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Index cho tìm kiếm nhanh
GiftCodeSchema.index({ isActive: 1, startDate: 1, endDate: 1 });

// Pre-save middleware
GiftCodeSchema.pre('save', function(next) {
    this.updatedAt = new Date();
    next();
});

// Methods
GiftCodeSchema.methods.isValid = function() {
    const now = new Date();
    
    // Kiểm tra active
    if (!this.isActive) return { valid: false, reason: 'Mã đã bị vô hiệu hóa' };
    
    // Kiểm tra thời gian
    if (this.startDate && now < this.startDate) {
        return { valid: false, reason: 'Mã chưa có hiệu lực' };
    }
    if (this.endDate && now > this.endDate) {
        return { valid: false, reason: 'Mã đã hết hạn' };
    }
    
    // Kiểm tra số lần dùng
    if (this.type === 'limited' && this.usedCount >= this.maxUses) {
        return { valid: false, reason: 'Mã đã hết lượt sử dụng' };
    }
    
    return { valid: true };
};

GiftCodeSchema.methods.hasUserUsed = function(userId) {
    return this.usedBy.some(u => u.userId.toString() === userId.toString());
};

GiftCodeSchema.methods.canUserUse = function(userId, realmLevel = 1) {
    // Kiểm tra code hợp lệ
    const validCheck = this.isValid();
    if (!validCheck.valid) return validCheck;
    
    // Kiểm tra user đã dùng chưa
    if (this.hasUserUsed(userId)) {
        return { valid: false, reason: 'Bạn đã sử dụng mã này rồi' };
    }
    
    // Kiểm tra cảnh giới
    if (realmLevel < this.requirements.minRealmLevel) {
        return { valid: false, reason: `Cần đạt cảnh giới ${this.requirements.minRealmLevel} trở lên` };
    }
    if (realmLevel > this.requirements.maxRealmLevel) {
        return { valid: false, reason: `Chỉ dành cho cảnh giới ${this.requirements.maxRealmLevel} trở xuống` };
    }
    
    return { valid: true };
};

// Statics
GiftCodeSchema.statics.findValidCode = async function(code) {
    return this.findOne({ 
        code: code.toUpperCase().trim(),
        isActive: true
    });
};

const GiftCode = mongoose.model('GiftCode', GiftCodeSchema);

export default GiftCode;
