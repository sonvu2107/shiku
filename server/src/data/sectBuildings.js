// data/sectBuildings.js

/**
 * Định nghĩa các công trình có thể xây dựng trong Tông Môn
 */
export const SECT_BUILDINGS = {
    spirit_field: {
        id: "spirit_field",
        name: "Linh Điền",
        description: "Tăng Linh Khí thu được từ hoạt động hàng ngày",
        maxLevel: 3,
        costs: { 1: 1000, 2: 3000, 3: 8000 },
        effects: {
            1: { dailyBonusEnergy: 10 },
            2: { dailyBonusEnergy: 25 },
            3: { dailyBonusEnergy: 50 },
        },
    },
    library: {
        id: "library",
        name: "Tàng Kinh Các",
        description: "Mở khóa thêm slot công pháp cho thành viên",
        maxLevel: 3,
        costs: { 1: 1500, 2: 4500, 3: 12000 },
        effects: {
            1: { techniqueSlots: 1 },
            2: { techniqueSlots: 2 },
            3: { techniqueSlots: 3 },
        },
    },
    alchemy_room: {
        id: "alchemy_room",
        name: "Đan Phòng",
        description: "Giảm giá đan dược trong shop tông môn",
        maxLevel: 3,
        costs: { 1: 2000, 2: 6000, 3: 15000 },
        effects: {
            1: { shopDiscount: 0.05 },
            2: { shopDiscount: 0.10 },
            3: { shopDiscount: 0.15 },
        },
    },
    training_grounds: {
        id: "training_grounds",
        name: "Luyện Công Trường",
        description: "Tăng phần thưởng từ Arena/PK",
        maxLevel: 3,
        costs: { 1: 3000, 2: 8000, 3: 20000 },
        effects: {
            1: { arenaBonus: 0.10 },
            2: { arenaBonus: 0.20 },
            3: { arenaBonus: 0.30 },
        },
    },
};

/**
 * Cấp độ Tông Môn
 */
export const SECT_LEVELS = [
    { level: 1, name: "Tiểu Môn Phái", requiredEnergy: 0, memberCap: 20 },
    { level: 2, name: "Trung Môn Phái", requiredEnergy: 10000, memberCap: 50 },
    { level: 3, name: "Đại Môn Phái", requiredEnergy: 50000, memberCap: 100 },
    { level: 4, name: "Nhất Lưu Tông Môn", requiredEnergy: 200000, memberCap: 200 },
    { level: 5, name: "Đỉnh Cấp Tông Môn", requiredEnergy: 1000000, memberCap: 500 },
];

/**
 * Tỷ lệ contribution cho từng loại hoạt động
 * upvote = 0 để chống farm
 */
export const CONTRIBUTION_RATES = {
    post: 50,           // 20 → 50
    comment: 10,        // 5 → 10
    upvote: 0,          // Không tính (chống farm)
    upvote_received: 8, // 4 → 8
    daily_checkin: 20,  // 10 → 20
    raid_participation: 100, // 80 → 100
};

/**
 * Giới hạn hàng ngày cho mỗi user trong 1 tông môn
 */
export const CONTRIBUTION_CAPS = {
    post: 2,
    comment: 10,
    upvote_received: 20,
};

/**
 * Diminishing returns cho comment
 */
export const DIMINISHING_RETURNS = {
    comment: [
        { from: 1, to: 3, rate: 1.0 },   // 100%
        { from: 4, to: 10, rate: 0.4 },  // 40%
        { from: 11, to: Infinity, rate: 0 },  // 0%
    ],
};

/**
 * Validation rules cho contribution
 */
export const CONTRIBUTION_VALIDATION = {
    comment_min_length: 20,
    post_delete_grace_period_ms: 5 * 60 * 1000,  // 5 phút
};
