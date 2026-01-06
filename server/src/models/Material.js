import mongoose from "mongoose";

/**
 * Material Schema - Hệ Thống Nguyên Liệu Luyện Khí
 * Materials drop from dungeons and are used for crafting equipment
 */

// ==================== ENUMS ====================
export const MATERIAL_TIERS = {
    PHAM_NHAN: 1,    // Phàm Nhân
    LUYEN_KHI: 2,    // Luyện Khí
    TRUC_CO: 3,      // Trúc Cơ
    KIM_DAN: 4,      // Kim Đan
    NGUYEN_ANH: 5,   // Nguyên Anh
    HOA_THAN: 6,     // Hóa Thần
    LUYEN_HU: 7,     // Luyện Hư
    HOP_THE: 8,      // Hợp Thể
    DAI_THUA: 9,     // Đại Thừa
    CHAN_TIEN: 10,   // Chân Tiên
    KIM_TIEN: 11,    // Kim Tiên
    TIEN_VUONG: 12,  // Tiên Vương
    THIEN_DE: 13,    // Tiên Đế
    THIEN_DAO: 14    // Thiên Đạo
};

export const MATERIAL_RARITY = {
    COMMON: 'common',
    UNCOMMON: 'uncommon',
    RARE: 'rare',
    EPIC: 'epic',
    LEGENDARY: 'legendary',
    MYTHIC: 'mythic'
};

// Ngũ Hành
export const MATERIAL_ELEMENTS = {
    METAL: 'metal',   // Kim
    WOOD: 'wood',     // Mộc
    WATER: 'water',   // Thủy
    FIRE: 'fire',     // Hỏa
    EARTH: 'earth'    // Thổ
};

// ==================== MATERIAL TEMPLATES ====================
// Pre-defined materials that can drop from dungeons
export const MATERIAL_TEMPLATES = [
    // ===== TIER 1-3: Early Game Materials =====
    { id: 'mat_iron_ore', name: 'Thiết Khoáng Thạch', tier: 1, element: 'metal', icon: '⛏️', description: 'Quặng sắt thô từ bí cảnh' },
    { id: 'mat_spirit_wood', name: 'Linh Mộc', tier: 1, element: 'wood', icon: '🪵', description: 'Gỗ linh thụ ngàn năm' },
    { id: 'mat_water_essence', name: 'Thủy Tinh Nguyên', tier: 1, element: 'water', icon: '💧', description: 'Tinh chất nước tinh khiết' },
    { id: 'mat_fire_stone', name: 'Hỏa Diễm Thạch', tier: 1, element: 'fire', icon: '🔥', description: 'Đá chứa lửa nguyên thủy' },
    { id: 'mat_earth_crystal', name: 'Địa Thổ Tinh', tier: 1, element: 'earth', icon: '💎', description: 'Tinh thể đất cổ đại' },

    // ===== TIER 4-6: Mid Game Materials =====
    { id: 'mat_gold_ore', name: 'Kim Tinh Khoáng', tier: 4, element: 'metal', icon: '✨', description: 'Quặng vàng chứa linh khí' },
    { id: 'mat_ancient_wood', name: 'Thái Cổ Thần Mộc', tier: 4, element: 'wood', icon: '🌳', description: 'Gỗ từ thần thụ vạn năm' },
    { id: 'mat_deep_water', name: 'Thâm Hải Tinh', tier: 4, element: 'water', icon: '🌊', description: 'Nước từ đáy biển vô tận' },
    { id: 'mat_phoenix_ash', name: 'Phượng Hoàng Tro', tier: 4, element: 'fire', icon: '🔶', description: 'Tro tàn của linh hỏa' },
    { id: 'mat_mountain_core', name: 'Sơn Nhạc Tinh Hạch', tier: 4, element: 'earth', icon: '🏔️', description: 'Lõi núi thiêng liêng' },

    // ===== TIER 7-10: Late Game Materials =====
    { id: 'mat_celestial_metal', name: 'Thiên Kim', tier: 7, element: 'metal', icon: '⚔️', description: 'Kim loại từ cửu thiên' },
    { id: 'mat_world_tree_bark', name: 'Thế Giới Thụ Bì', tier: 7, element: 'wood', icon: '🌲', description: 'Vỏ cây thế giới' },
    { id: 'mat_primordial_water', name: 'Hỗn Độn Thủy', tier: 7, element: 'water', icon: '🌀', description: 'Nước từ hỗn độn ban sơ' },
    { id: 'mat_sun_essence', name: 'Thái Dương Tinh Hỏa', tier: 7, element: 'fire', icon: '☀️', description: 'Tinh hỏa của thái dương' },
    { id: 'mat_void_earth', name: 'Hư Không Thổ', tier: 7, element: 'earth', icon: '🌑', description: 'Đất từ hư không' },

    // ===== TIER 11-14: End Game Materials =====
    { id: 'mat_divine_metal', name: 'Thần Kim', tier: 11, element: 'metal', icon: '🗡️', description: 'Kim loại của chư thần' },
    { id: 'mat_immortal_wood', name: 'Tiên Mộc', tier: 11, element: 'wood', icon: '🌴', description: 'Linh mộc từ tiên giới' },
    { id: 'mat_heavenly_water', name: 'Thiên Hà Thủy', tier: 11, element: 'water', icon: '🌌', description: 'Nước từ thiên hà' },
    { id: 'mat_dao_fire', name: 'Đạo Hỏa', tier: 11, element: 'fire', icon: '🔴', description: 'Lửa của đại đạo' },
    { id: 'mat_chaos_earth', name: 'Hỗn Độn Thổ', tier: 11, element: 'earth', icon: '⚫', description: 'Đất từ hỗn độn nguyên thủy' }
];

// Create lookup map for O(1) access
export const MATERIAL_TEMPLATES_MAP = new Map(
    MATERIAL_TEMPLATES.map(m => [m.id, m])
);

// ==================== MATERIAL SCHEMA (for catalog) ====================
const MaterialSchema = new mongoose.Schema({
    // Template ID from MATERIAL_TEMPLATES
    templateId: {
        type: String,
        required: true,
        index: true
    },

    name: {
        type: String,
        required: true
    },

    // Tier 1-14 (sync with realm levels)
    tier: {
        type: Number,
        min: 1,
        max: 14,
        required: true,
        index: true
    },

    // Rarity: common -> mythic
    rarity: {
        type: String,
        enum: Object.values(MATERIAL_RARITY),
        required: true,
        index: true
    },

    // Ngũ Hành element
    element: {
        type: String,
        enum: [...Object.values(MATERIAL_ELEMENTS), null],
        default: null
    },

    icon: {
        type: String,
        default: ''
    },

    description: {
        type: String,
        default: ''
    },

    // Metadata
    stackable: {
        type: Boolean,
        default: true
    },

    source: {
        type: String,
        enum: ['dungeon', 'event', 'shop', 'craft'],
        default: 'dungeon'
    },

    tradeable: {
        type: Boolean,
        default: false
    },

    isActive: {
        type: Boolean,
        default: true,
        index: true
    }
}, {
    timestamps: true,
    collection: 'materials'
});

// ==================== DROP LOG SCHEMA (for audit) ====================
const DropLogSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },

    dungeonId: {
        type: String,
        required: true
    },

    difficulty: {
        type: String,
        required: true
    },

    // Drop details
    drops: [{
        templateId: String,
        rarity: String,
        tier: Number,
        element: String,
        qty: { type: Number, default: 1 }
    }],

    // Drop metadata for debugging/balancing
    dropMeta: {
        rollsBase: Number,
        rollsBonus: Number,
        bonuses: [String], // ['no_death', 'speed_clear', 'solo']
        dungeonTier: Number
    }
}, {
    timestamps: true,
    collection: 'drop_logs'
});

// Indexes
DropLogSchema.index({ userId: 1, createdAt: -1 });
DropLogSchema.index({ dungeonId: 1, difficulty: 1 });

// ==================== EXPORTS ====================
const Material = mongoose.model('Material', MaterialSchema);
const DropLog = mongoose.model('DropLog', DropLogSchema);

export default Material;
export { DropLog };
