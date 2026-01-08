import mongoose from "mongoose";
import { getTierBySubLevel, TIER_CONFIG, DEBUFF_TYPES, applyDebuffEffects } from '../data/tierConfig.js';

/**
 * Cultivation Schema - Hệ Thống Tu Tiên
 * Lưu thông tin tu luyện: cảnh giới, tu vi (exp), linh thạch, vật phẩm, nhiệm vụ
 */

// ==================== CẢNH GIỚI TU LUYỆN ====================
export const CULTIVATION_REALMS = [
  {
    level: 1,
    name: "Phàm Nhân",
    minExp: 0,
    maxExp: 99,
    description: "Người thường chưa bước vào con đường tu tiên",
    color: "#9CA3AF",
  },
  {
    level: 2,
    name: "Luyện Khí",
    minExp: 100,
    maxExp: 999,
    description: "Bắt đầu cảm nhận linh khí trời đất",
    color: "#10B981",
  },
  {
    level: 3,
    name: "Trúc Cơ",
    minExp: 1000,
    maxExp: 4999,
    description: "Xây dựng nền tảng tu luyện vững chắc",
    color: "#3B82F6",
  },
  {
    level: 4,
    name: "Kim Đan",
    minExp: 5000,
    maxExp: 14999,
    description: "Ngưng tụ Kim Đan trong đan điền",
    color: "#9A6B1A",
  },
  {
    level: 5,
    name: "Nguyên Anh",
    minExp: 15000,
    maxExp: 39999,
    description: "Nguyên Anh hình thành, thần hồn xuất khiếu",
    color: "#8B5CF6",
  },
  {
    level: 6,
    name: "Hóa Thần",
    minExp: 40000,
    maxExp: 99999,
    description: "Thần thức viên mãn, thân tâm hợp nhất",
    color: "#EC4899",
  },
  {
    level: 7,
    name: "Luyện Hư",
    minExp: 100000,
    maxExp: 249999,
    description: "Luyện hóa hư không, bước vào tầng cao tu hành",
    color: "#14B8A6",
  },
  {
    level: 8,
    name: "Hợp Thể",
    minExp: 250000,
    maxExp: 499999,
    description: "Nguyên thần và nhục thân hợp nhất",
    color: "#22C55E",
  },
  {
    level: 9,
    name: "Đại Thừa",
    minExp: 500000,
    maxExp: 999999,
    description: "Đại đạo gần viên mãn, chuẩn bị nghịch thiên",
    color: "#F97316",
  },

  {
    level: 10,
    name: "Chân Tiên",
    minExp: 1000000,
    maxExp: 2999999,
    description: "Vượt qua thiên kiếp, chính thức bước vào tiên đạo",
    color: "#60A5FA",
  },
  {
    level: 11,
    name: "Kim Tiên",
    minExp: 3000000,
    maxExp: 6999999,
    description: "Tiên lực ngưng luyện, bất tử bất diệt",
    color: "#FACC15",
  },
  {
    level: 12,
    name: "Tiên Vương",
    minExp: 7000000,
    maxExp: 14999999,
    description: "Thống lĩnh một phương tiên giới",
    color: "#A855F7",
  },
  {
    level: 13,
    name: "Tiên Đế",
    minExp: 15000000,
    maxExp: 29999999,
    description: "Chấp chưởng đại đạo, hiệu lệnh tiên giới",
    color: "#EF4444",
  },
  {
    level: 14,
    name: "Thiên Đế",
    minExp: 30000000,
    maxExp: Infinity,
    description: "Cảnh giới chí cao, thiên địa đồng thọ",
    color: "#FF00FF",
  },
];

// ==================== NHIỆM VỤ MẪU ====================
export const QUEST_TEMPLATES = {
  daily: [
    // === NHIỆM VỤ XÃ HỘI ===
    { id: "daily_login", name: "Điểm danh tu luyện", description: "Đăng nhập hàng ngày", expReward: 20, spiritStoneReward: 10, type: "daily" },
    { id: "daily_post", name: "Chia sẻ ngộ đạo", description: "Đăng 1 bài viết", expReward: 30, spiritStoneReward: 15, type: "daily", requirement: { action: "post", count: 1 } },
    { id: "daily_comment", name: "Luận đạo cùng đạo hữu", description: "Bình luận 3 bài viết", expReward: 20, spiritStoneReward: 10, type: "daily", requirement: { action: "comment", count: 3 } },
    { id: "daily_upvote", name: "Kết thiện duyên", description: "Upvote 5 bài viết", expReward: 15, spiritStoneReward: 5, type: "daily", requirement: { action: "upvote", count: 5 } },

    // === NHIỆM VỤ TU TIÊN ===
    { id: "daily_yinyang", name: "Thu linh khí", description: "Thu thập linh khí 20 lần", expReward: 25, spiritStoneReward: 15, type: "daily", requirement: { action: "yinyang_click", count: 20 } },
    { id: "daily_pk", name: "Luyện võ đài", description: "Tham gia 3 trận luận võ", expReward: 40, spiritStoneReward: 25, type: "daily", requirement: { action: "pk_battle", count: 3 } },
    { id: "daily_pk_win", name: "Chiến thắng luận võ", description: "Thắng 1 trận luận võ", expReward: 50, spiritStoneReward: 30, type: "daily", requirement: { action: "pk_win", count: 1 } },
    { id: "daily_dungeon", name: "Thám hiểm bí cảnh", description: "Hoàn thành 5 tầng bí cảnh", expReward: 35, spiritStoneReward: 20, type: "daily", requirement: { action: "dungeon_floor", count: 5 } },
    { id: "daily_passive", name: "Tĩnh tọa tu luyện", description: "Thu thập tu vi tích lũy 1 lần", expReward: 15, spiritStoneReward: 10, type: "daily", requirement: { action: "passive_collect", count: 1 } }
  ],
  weekly: [
    { id: "weekly_posts", name: "Tinh cần tu luyện", description: "Đăng 7 bài viết trong tuần", expReward: 200, spiritStoneReward: 100, type: "weekly", requirement: { action: "post", count: 7 } },
    { id: "weekly_social", name: "Kết giao đạo hữu", description: "Kết bạn với 3 người", expReward: 150, spiritStoneReward: 80, type: "weekly", requirement: { action: "friend", count: 3 } },
    { id: "weekly_event", name: "Tham gia hội đạo", description: "Tham gia 1 sự kiện", expReward: 100, spiritStoneReward: 50, type: "weekly", requirement: { action: "event", count: 1 } },
    // === NHIỆM VỤ BÍ CẢNH ===
    { id: "weekly_dungeon_clear", name: "Chinh phục bí cảnh", description: "Hoàn thành 1 bí cảnh (clear full)", expReward: 300, spiritStoneReward: 150, type: "weekly", requirement: { action: "dungeon_clear", count: 1 } },
    { id: "weekly_dungeon_master", name: "Bí cảnh đại sư", description: "Hoàn thành 3 bí cảnh trong tuần", expReward: 600, spiritStoneReward: 300, type: "weekly", requirement: { action: "dungeon_clear", count: 3 } }
  ],
  achievement: [
    { id: "first_post", name: "Bước đầu nhập đạo", description: "Đăng bài viết đầu tiên", expReward: 50, spiritStoneReward: 30, type: "achievement", requirement: { action: "post", count: 1 } },
    { id: "social_butterfly", name: "Nhân duyên quảng đại", description: "Có 10 bạn bè", expReward: 100, spiritStoneReward: 50, type: "achievement", requirement: { action: "friend", count: 10 } },
    { id: "popular_post", name: "Danh tiếng nổi khắp", description: "Có bài viết được 50 upvote", expReward: 200, spiritStoneReward: 100, type: "achievement", requirement: { action: "post_upvotes", count: 50 } },
    // === LOGIN STREAK MILESTONES ===
    { id: "streak_7", name: "Kiên trì tu luyện", description: "Đăng nhập 7 ngày liên tục", expReward: 150, spiritStoneReward: 70, type: "achievement", requirement: { action: "login_streak", count: 7 } },
    { id: "streak_30", name: "Đạo tâm kiên định", description: "Đăng nhập 30 ngày liên tục", expReward: 500, spiritStoneReward: 250, type: "achievement", requirement: { action: "login_streak", count: 30 } },
    { id: "streak_60", name: "Tu luyện bất khuất", description: "Đăng nhập 60 ngày liên tục", expReward: 1000, spiritStoneReward: 500, type: "achievement", requirement: { action: "login_streak", count: 60 } },
    { id: "streak_90", name: "Đạo cốt phi phàm", description: "Đăng nhập 90 ngày liên tục", expReward: 2000, spiritStoneReward: 1000, type: "achievement", requirement: { action: "login_streak", count: 90 } },
    { id: "streak_365", name: "Thiên Đạo Vĩnh Hằng", description: "Đăng nhập 365 ngày liên tục", expReward: 10000, spiritStoneReward: 5000, type: "achievement", requirement: { action: "login_streak", count: 365 } },
    // === REALM ACHIEVEMENTS ===
    { id: "realm_jindan", name: "Kim Đan thành tựu", description: "Đạt cảnh giới Kim Đan", expReward: 0, spiritStoneReward: 500, type: "achievement", requirement: { action: "realm", count: 4 } },
    { id: "realm_yuanying", name: "Nguyên Anh xuất thế", description: "Đạt cảnh giới Nguyên Anh", expReward: 0, spiritStoneReward: 1000, type: "achievement", requirement: { action: "realm", count: 5 } },
    // === DUNGEON ACHIEVEMENTS ===
    { id: "dungeon_first_clear", name: "Sơ nhập bí cảnh", description: "Hoàn thành bí cảnh đầu tiên", expReward: 100, spiritStoneReward: 50, type: "achievement", requirement: { action: "dungeon_clear", count: 1 } },
    { id: "dungeon_explorer", name: "Bí cảnh thám hiểm gia", description: "Hoàn thành 10 bí cảnh", expReward: 500, spiritStoneReward: 250, type: "achievement", requirement: { action: "dungeon_clear", count: 10 } },
    { id: "dungeon_master", name: "Bí cảnh chí tôn", description: "Hoàn thành 50 bí cảnh", expReward: 2000, spiritStoneReward: 1000, type: "achievement", requirement: { action: "dungeon_clear", count: 50 } }
  ]
};

// ==================== VẬT PHẨM (imported from data/shopItems.js) ====================
// Re-export for backward compatibility
export {
  ITEM_TYPES,
  SHOP_ITEMS,
  SHOP_ITEMS_MAP,
  SHOP_ITEMS_BY_TYPE,
  TECHNIQUES_MAP
} from '../data/shopItems.js';

// Import for use in this file
import { ITEM_TYPES, SHOP_ITEMS, SHOP_ITEMS_MAP, TECHNIQUES_MAP } from '../data/shopItems.js';
import { SECT_TECHNIQUES_MAP } from '../data/sectTechniques.js';

// ==================== QUEST PROGRESS SCHEMA ====================
const QuestProgressSchema = new mongoose.Schema({
  questId: { type: String, required: true },
  progress: { type: Number, default: 0 },
  completed: { type: Boolean, default: false },
  claimed: { type: Boolean, default: false },
  completedAt: { type: Date },
  claimedAt: { type: Date }
}, { _id: false });

// ==================== INVENTORY ITEM SCHEMA ====================
const InventoryItemSchema = new mongoose.Schema({
  itemId: { type: String, required: true },
  name: { type: String, required: true },
  type: {
    type: String,
    required: true,
    // Cho phép cả ITEM_TYPES và equipment types (equipment_weapon, equipment_armor, etc.)
    validate: {
      validator: function (v) {
        const validTypes = Object.values(ITEM_TYPES);
        return validTypes.includes(v) || v.startsWith('equipment_');
      },
      message: 'Type phải là một trong ITEM_TYPES hoặc bắt đầu bằng "equipment_"'
    }
  },
  quantity: { type: Number, default: 1 },
  equipped: { type: Boolean, default: false },
  acquiredAt: { type: Date, default: Date.now },
  expiresAt: { type: Date },
  metadata: { type: mongoose.Schema.Types.Mixed }
}, { _id: false });

// ==================== EXP LOG SCHEMA ====================
const ExpLogSchema = new mongoose.Schema({
  amount: { type: Number, required: true },
  source: { type: String, required: true },
  description: { type: String },
  timestamp: { type: Date, default: Date.now }
}, { _id: false });

// ==================== CULTIVATION SCHEMA ====================
const CultivationSchema = new mongoose.Schema({
  // ==================== LIÊN KẾT USER ====================
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true,
    index: true
  },

  // ==================== TU VI & CẢNH GIỚI ====================
  exp: { type: Number, default: 0, min: 0 },
  realmLevel: { type: Number, default: 1, min: 1, max: 14 },
  realmName: { type: String, default: "Phàm Nhân" },
  subLevel: { type: Number, default: 1, min: 1, max: 10 },

  // ==================== HÌNH TƯỢNG NHÂN VẬT ====================
  characterAppearance: {
    type: String,
    enum: ['Immortal_male', 'Immortal_female', 'Demon_male', 'Demon_female'],
    default: 'Immortal_male'
  },
  lastAppearanceChangeAt: { type: Date },

  // ==================== LINH THẠCH ====================
  spiritStones: { type: Number, default: 0, min: 0 },
  totalSpiritStonesEarned: { type: Number, default: 0 },

  // ==================== STREAK ĐĂNG NHẬP ====================
  loginStreak: { type: Number, default: 0 },
  lastLoginDate: { type: Date },
  lastLoginDayKey: { type: String, default: null },
  lastDailyResetKey: { type: String, default: null },
  lastWeeklyResetKey: { type: String, default: null },
  longestStreak: { type: Number, default: 0 },

  // ==================== VERSIONING FOR CACHE INVALIDATION ====================
  dataVersion: { type: Number, default: 0, min: 0 },
  statsVersion: { type: Number, default: 0, min: 0 },

  // ==================== PASSIVE EXP ====================
  lastPassiveExpCollected: { type: Date, default: Date.now },

  // ==================== NHIỆM VỤ ====================
  dailyQuests: [QuestProgressSchema],
  weeklyQuests: [QuestProgressSchema],
  achievements: [QuestProgressSchema],

  // ==================== DAILY PROGRESS TRACKING ====================
  dailyProgress: {
    posts: { type: Number, default: 0 },
    comments: { type: Number, default: 0 },
    likes: { type: Number, default: 0 },
    upvotes: { type: Number, default: 0 },
    lastReset: { type: Date, default: Date.now }
  },

  // ==================== WEEKLY PROGRESS TRACKING ====================
  weeklyProgress: {
    posts: { type: Number, default: 0 },
    friends: { type: Number, default: 0 },
    events: { type: Number, default: 0 },
    lastReset: { type: Date, default: Date.now }
  },

  // ==================== KHO ĐỒ ====================
  inventory: [InventoryItemSchema],

  // ==================== NGUYÊN LIỆU LUYỆN KHÍ ====================
  materials: [{
    templateId: { type: String, required: true },
    name: { type: String, required: true },
    tier: { type: Number, min: 1, max: 14, required: true },
    rarity: { type: String, enum: ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'], required: true },
    element: { type: String, enum: ['metal', 'wood', 'water', 'fire', 'earth', null], default: null },
    icon: { type: String, default: '' },
    qty: { type: Number, default: 1, min: 1 },
    acquiredAt: { type: Date, default: Date.now }
  }],

  // ==================== CÔNG PHÁP TÔNG MÔN ====================
  sectTechniques: [{
    id: { type: String, required: true },
    learnedAt: { type: Date, default: Date.now }
  }],

  // ==================== TRANG BỊ ĐANG DÙNG ====================
  equipped: {
    title: { type: String, default: null },
    badge: { type: String, default: null },
    avatarFrame: { type: String, default: null },
    profileEffect: { type: String, default: null },
    pet: { type: String, default: null },
    mount: { type: String, default: null },
    weapon: { type: mongoose.Schema.Types.ObjectId, ref: 'Equipment', default: null },
    magicTreasure: { type: mongoose.Schema.Types.ObjectId, ref: 'Equipment', default: null },
    helmet: { type: mongoose.Schema.Types.ObjectId, ref: 'Equipment', default: null },
    chest: { type: mongoose.Schema.Types.ObjectId, ref: 'Equipment', default: null },
    shoulder: { type: mongoose.Schema.Types.ObjectId, ref: 'Equipment', default: null },
    gloves: { type: mongoose.Schema.Types.ObjectId, ref: 'Equipment', default: null },
    boots: { type: mongoose.Schema.Types.ObjectId, ref: 'Equipment', default: null },
    belt: { type: mongoose.Schema.Types.ObjectId, ref: 'Equipment', default: null },
    ring: { type: mongoose.Schema.Types.ObjectId, ref: 'Equipment', default: null },
    necklace: { type: mongoose.Schema.Types.ObjectId, ref: 'Equipment', default: null },
    earring: { type: mongoose.Schema.Types.ObjectId, ref: 'Equipment', default: null },
    bracelet: { type: mongoose.Schema.Types.ObjectId, ref: 'Equipment', default: null },
    powerItem: { type: mongoose.Schema.Types.ObjectId, ref: 'Equipment', default: null }
  },

  // ==================== CÔNG PHÁP ĐÃ HỌC ====================
  learnedTechniques: [{
    techniqueId: { type: String, required: true },
    level: { type: Number, default: 1, min: 1, max: 10 },
    exp: { type: Number, default: 0 },
    learnedAt: { type: Date, default: Date.now },
    lastPracticedAt: { type: Date }
  }],

  // ==================== CÔNG PHÁP CHIẾN ĐẤU TRANG BỊ ====================
  // Chỉ các công pháp trong slot mới được dùng trong PK/Dungeon
  equippedCombatTechniques: [{
    slotIndex: { type: Number, required: true, min: 0, max: 4 },
    techniqueId: { type: String, required: true }
  }],

  // Công pháp efficiency đang trang bị (dùng cho YinYang click)
  equippedEfficiencyTechnique: { type: String, default: null },

  // Session vận công đang active (semi-auto technique)
  activeTechniqueSession: {
    sessionId: { type: String },
    techniqueId: { type: String },
    startedAt: { type: Date },
    endsAt: { type: Date },
    realmAtStart: { type: Number },
    claimedAt: { type: Date, default: null }
  },

  // Kết quả claim gần nhất (cho retry idempotent)
  lastTechniqueClaim: {
    sessionId: { type: String },
    techniqueId: { type: String },
    allowedExp: { type: Number },
    requestedExp: { type: Number },
    claimedAt: { type: Date }
  },

  // Timestamp lần claim cuối (cho cooldown 15s)
  lastTechniqueClaimTime: { type: Date, default: null },

  // ==================== PHIÊN LUYỆN CÔNG PHÁP (NHẬP ĐỊNH 10 PHÚT) ====================
  // Cho phép luyện TẤT CẢ công pháp cùng lúc, 1 click = 10 phút
  activePracticeSession: {
    sessionId: { type: String },
    startedAt: { type: Date },
    endsAt: { type: Date },
    techniqueIds: [{ type: String }], // Danh sách công pháp đang luyện
    expPerTechnique: { type: Number, default: 400 }, // ~40 lần luyện * 10 exp
    claimedAt: { type: Date, default: null }
  },

  // ==================== BUFF/BOOST ĐANG HOẠT ĐỘNG ====================
  activeBoosts: [{
    type: { type: String },
    multiplier: { type: Number, default: 1 },
    expiresAt: { type: Date }
  }],

  // ==================== LỊCH SỬ EXP ====================
  expLog: {
    type: [ExpLogSchema],
    default: [],
    select: false
  },

  // ==================== THỐNG KÊ ====================
  stats: {
    totalPostsCreated: { type: Number, default: 0 },
    totalCommentsCreated: { type: Number, default: 0 },
    totalLikesGiven: { type: Number, default: 0 }, // Legacy - giữ lại để tương thích
    totalLikesReceived: { type: Number, default: 0 }, // Legacy - giữ lại để tương thích
    totalUpvotesGiven: { type: Number, default: 0 }, // NEW - upvote system
    totalUpvotesReceived: { type: Number, default: 0 }, // NEW - upvote system
    totalQuestsCompleted: { type: Number, default: 0 },
    totalDaysActive: { type: Number, default: 0 }
  },

  // ==================== ĐỘ KIẾP (BREAKTHROUGH) ====================
  breakthroughSuccessRate: { type: Number, default: 30, min: 0, max: 100 },
  breakthroughFailureCount: { type: Number, default: 0, min: 0 },
  lastBreakthroughAttempt: { type: Date },
  breakthroughCooldownUntil: { type: Date },

  // ==================== BÍ CẢNH (DUNGEON) ====================
  dungeonProgress: [{
    dungeonId: { type: String, required: true },
    currentFloor: { type: Number, default: 0 },
    highestFloor: { type: Number, default: 0 },
    totalClears: { type: Number, default: 0 },
    inProgress: { type: Boolean, default: false },
    currentRunId: { type: mongoose.Schema.Types.ObjectId, ref: 'DungeonRun' },
    lastClearedAt: { type: Date },
    cooldownUntil: { type: Date }
  }],

  // Thống kê dungeon tổng hợp
  dungeonStats: {
    totalDungeonsCleared: { type: Number, default: 0 },
    totalMonstersKilled: { type: Number, default: 0 },
    totalBossesKilled: { type: Number, default: 0 },
    totalDungeonExpEarned: { type: Number, default: 0 },
    totalDungeonSpiritStonesEarned: { type: Number, default: 0 }
  },

  // ==================== GÓI MUA 1 LẦN ====================
  // Track các item oneTimePurchase đã mua (để chặn mua lại dù đã dùng)
  purchasedOneTimeItems: [{ type: String }],

  // ==================== DEBUFFS (Nghịch Thiên) ====================
  debuffs: [{
    type: { type: String, required: true },
    remainingBattles: { type: Number, default: 3 },
    appliedAt: { type: Date, default: Date.now }
  }],

  // ==================== BATTLE IDEMPOTENCY (DB-level backup) ====================
  // Store recent battle requestIds to prevent double reward when Redis unavailable
  recentBattleRequestIds: {
    type: [String],
    default: [],
    select: false // Don't include in normal queries
  }
}, {
  timestamps: true
});

// ==================== INDEXES ====================
// Core sorting indexes
CultivationSchema.index({ exp: -1 });
CultivationSchema.index({ realmLevel: -1, exp: -1 });
CultivationSchema.index({ spiritStones: -1 });
CultivationSchema.index({ loginStreak: -1 });
// Leaderboard indexes (NEW)
CultivationSchema.index({ longestStreak: -1 });
CultivationSchema.index({ totalSpiritStonesEarned: -1 });
// Breakthrough cooldown lookup (NEW)
CultivationSchema.index({ breakthroughCooldownUntil: 1 }, { sparse: true });
// Dungeon progress optimization
CultivationSchema.index({ 'dungeonProgress.dungeonId': 1 });
// Quest lookups optimization
CultivationSchema.index({ 'dailyQuests.questId': 1 });

// ==================== INSTANCE METHODS ====================

/**
 * Tính toán thông số chiến đấu dựa trên cảnh giới và tu vi
 * @returns {Object} Thông số chiến đấu
 */
CultivationSchema.methods.calculateCombatStats = function () {
  const realmLevel = this.realmLevel || 1;
  const currentExp = this.exp || 0;
  const realm = CULTIVATION_REALMS.find(r => r.level === realmLevel) || CULTIVATION_REALMS[0];

  // Tính progress trong cảnh giới (0-1)
  const expProgress = realm.maxExp !== Infinity
    ? Math.min(1, Math.max(0, (currentExp - realm.minExp) / (realm.maxExp - realm.minExp)))
    : Math.min(1, (currentExp - realm.minExp) / 1000000);

  // Base stats theo cảnh giới (14 levels)
  const baseStatsByRealm = {
    1: { attack: 10, defense: 5, qiBlood: 100, zhenYuan: 50, speed: 10, criticalRate: 5, criticalDamage: 150, accuracy: 80, dodge: 5, penetration: 0, resistance: 0, lifesteal: 0, regeneration: 0.5, luck: 5 },
    2: { attack: 25, defense: 12, qiBlood: 250, zhenYuan: 120, speed: 15, criticalRate: 8, criticalDamage: 160, accuracy: 85, dodge: 8, penetration: 2, resistance: 2, lifesteal: 1, regeneration: 1, luck: 8 },
    3: { attack: 50, defense: 25, qiBlood: 500, zhenYuan: 250, speed: 20, criticalRate: 10, criticalDamage: 170, accuracy: 88, dodge: 10, penetration: 5, resistance: 5, lifesteal: 2, regeneration: 1.5, luck: 10 },
    4: { attack: 100, defense: 50, qiBlood: 1000, zhenYuan: 500, speed: 25, criticalRate: 12, criticalDamage: 180, accuracy: 90, dodge: 12, penetration: 8, resistance: 8, lifesteal: 3, regeneration: 2, luck: 12 },
    5: { attack: 200, defense: 100, qiBlood: 2000, zhenYuan: 1000, speed: 30, criticalRate: 15, criticalDamage: 190, accuracy: 92, dodge: 15, penetration: 12, resistance: 12, lifesteal: 5, regeneration: 3, luck: 15 },
    6: { attack: 400, defense: 200, qiBlood: 4000, zhenYuan: 2000, speed: 35, criticalRate: 18, criticalDamage: 200, accuracy: 94, dodge: 18, penetration: 15, resistance: 15, lifesteal: 7, regeneration: 4, luck: 18 },
    7: { attack: 800, defense: 400, qiBlood: 8000, zhenYuan: 4000, speed: 40, criticalRate: 20, criticalDamage: 210, accuracy: 96, dodge: 20, penetration: 18, resistance: 18, lifesteal: 10, regeneration: 5, luck: 20 },
    8: { attack: 1600, defense: 800, qiBlood: 16000, zhenYuan: 8000, speed: 45, criticalRate: 22, criticalDamage: 220, accuracy: 97, dodge: 22, penetration: 20, resistance: 20, lifesteal: 12, regeneration: 6, luck: 22 },
    9: { attack: 3200, defense: 1600, qiBlood: 32000, zhenYuan: 16000, speed: 50, criticalRate: 25, criticalDamage: 230, accuracy: 98, dodge: 25, penetration: 22, resistance: 22, lifesteal: 15, regeneration: 7, luck: 25 },
    10: { attack: 6400, defense: 3200, qiBlood: 64000, zhenYuan: 32000, speed: 55, criticalRate: 28, criticalDamage: 240, accuracy: 99, dodge: 28, penetration: 25, resistance: 25, lifesteal: 18, regeneration: 8, luck: 28 },
    11: { attack: 12800, defense: 6400, qiBlood: 128000, zhenYuan: 64000, speed: 60, criticalRate: 30, criticalDamage: 250, accuracy: 99, dodge: 30, penetration: 28, resistance: 28, lifesteal: 20, regeneration: 9, luck: 30 },
    12: { attack: 25600, defense: 12800, qiBlood: 256000, zhenYuan: 128000, speed: 65, criticalRate: 32, criticalDamage: 270, accuracy: 100, dodge: 32, penetration: 30, resistance: 30, lifesteal: 22, regeneration: 10, luck: 32 },
    13: { attack: 51200, defense: 25600, qiBlood: 512000, zhenYuan: 256000, speed: 70, criticalRate: 35, criticalDamage: 290, accuracy: 100, dodge: 35, penetration: 32, resistance: 32, lifesteal: 25, regeneration: 12, luck: 35 },
    14: { attack: 102400, defense: 51200, qiBlood: 1024000, zhenYuan: 512000, speed: 80, criticalRate: 40, criticalDamage: 350, accuracy: 100, dodge: 40, penetration: 35, resistance: 35, lifesteal: 30, regeneration: 15, luck: 40 }
  };

  const baseStats = baseStatsByRealm[realmLevel] || baseStatsByRealm[1];

  // Exp bonus (tăng dần trong cảnh giới, 14 levels)
  const expBonusMultiplier = {
    1: { attack: 0.5, defense: 0.25, qiBlood: 5, zhenYuan: 2.5 },
    2: { attack: 1.2, defense: 0.6, qiBlood: 12, zhenYuan: 6 },
    3: { attack: 2.5, defense: 1.25, qiBlood: 25, zhenYuan: 12.5 },
    4: { attack: 5, defense: 2.5, qiBlood: 50, zhenYuan: 25 },
    5: { attack: 10, defense: 5, qiBlood: 100, zhenYuan: 50 },
    6: { attack: 20, defense: 10, qiBlood: 200, zhenYuan: 100 },
    7: { attack: 40, defense: 20, qiBlood: 400, zhenYuan: 200 },
    8: { attack: 80, defense: 40, qiBlood: 800, zhenYuan: 400 },
    9: { attack: 160, defense: 80, qiBlood: 1600, zhenYuan: 800 },
    10: { attack: 320, defense: 160, qiBlood: 3200, zhenYuan: 1600 },
    11: { attack: 640, defense: 320, qiBlood: 6400, zhenYuan: 3200 },
    12: { attack: 1280, defense: 640, qiBlood: 12800, zhenYuan: 6400 },
    13: { attack: 2560, defense: 1280, qiBlood: 25600, zhenYuan: 12800 },
    14: { attack: 5120, defense: 2560, qiBlood: 51200, zhenYuan: 25600 }
  };

  const bonus = expBonusMultiplier[realmLevel] || expBonusMultiplier[1];
  const expLevel = Math.floor(expProgress * 11); // 0-11 levels trong cảnh giới

  // Tính base stats
  let finalStats = {
    attack: Math.floor(baseStats.attack + (bonus.attack * expLevel)),
    defense: Math.floor(baseStats.defense + (bonus.defense * expLevel)),
    qiBlood: Math.floor(baseStats.qiBlood + (bonus.qiBlood * expLevel)),
    zhenYuan: Math.floor(baseStats.zhenYuan + (bonus.zhenYuan * expLevel)),
    speed: baseStats.speed,
    criticalRate: baseStats.criticalRate,
    criticalDamage: baseStats.criticalDamage,
    dodge: baseStats.dodge,
    accuracy: baseStats.accuracy,
    penetration: baseStats.penetration,
    resistance: baseStats.resistance,
    lifesteal: baseStats.lifesteal,
    regeneration: baseStats.regeneration,
    luck: baseStats.luck
  };

  // Tích lũy bonus dạng phần trăm và dạng cộng thẳng
  const percentBonuses = {
    attack: 0, defense: 0, qiBlood: 0, zhenYuan: 0,
    speed: 0, criticalRate: 0, criticalDamage: 0,
    accuracy: 0, dodge: 0, penetration: 0, resistance: 0,
    lifesteal: 0, regeneration: 0, luck: 0
  };

  const flatBonuses = {
    attack: 0, defense: 0, qiBlood: 0, zhenYuan: 0,
    speed: 0, criticalRate: 0, criticalDamage: 0,
    accuracy: 0, dodge: 0, penetration: 0, resistance: 0,
    lifesteal: 0, regeneration: 0, luck: 0
  };

  // 1. Bonus từ công pháp đã học (Learned Techniques)
  if (this.learnedTechniques && this.learnedTechniques.length > 0) {
    this.learnedTechniques.forEach(learned => {
      const technique = TECHNIQUES_MAP.get(learned.techniqueId);
      if (technique && technique.stats) {
        const levelMultiplier = 1 + (learned.level - 1) * 0.1;
        // DEBUG: Log stats calculation
        // console.log(`[Stats Debug] Tech: ${technique.name}, Level: ${learned.level}, Multiplier: ${levelMultiplier}`);

        Object.keys(technique.stats).forEach(statKey => {
          const bonusValue = technique.stats[statKey];
          if (finalStats[statKey] !== undefined) {
            if (['attack', 'defense', 'qiBlood', 'zhenYuan'].includes(statKey)) {
              percentBonuses[statKey] += (bonusValue * levelMultiplier);
            } else if (['speed', 'penetration', 'resistance', 'luck'].includes(statKey)) {
              flatBonuses[statKey] += (baseStats[statKey] * bonusValue * levelMultiplier);
            } else if (['criticalRate', 'dodge', 'lifesteal', 'regeneration', 'criticalDamage', 'accuracy'].includes(statKey)) {
              // percentage stats represented as 0-100
              flatBonuses[statKey] += (bonusValue * 100 * levelMultiplier);
            }
          }
        });
      }
    });
  }

  // 2. Bonus từ công pháp tông môn (Sect Techniques)
  if (this.sectTechniques && this.sectTechniques.length > 0) {
    this.sectTechniques.forEach(learned => {
      const technique = SECT_TECHNIQUES_MAP.get(learned.id);
      if (technique && technique.stats) {
        Object.keys(technique.stats).forEach(statKey => {
          const bonusValue = technique.stats[statKey];
          if (finalStats[statKey] !== undefined) {
            if (['attack', 'defense', 'qiBlood', 'zhenYuan'].includes(statKey)) {
              percentBonuses[statKey] += bonusValue;
            } else if (['speed', 'penetration', 'resistance', 'luck'].includes(statKey)) {
              flatBonuses[statKey] += (baseStats[statKey] * bonusValue);
            } else if (['criticalRate', 'dodge', 'lifesteal', 'regeneration', 'criticalDamage', 'accuracy'].includes(statKey)) {
              // percentage stats represented as 0-100
              flatBonuses[statKey] += (bonusValue * 100);
            }
          }
        });
      }
    });
  }

  // 3. Bonus từ Vật phẩm kích hoạt (Active Boosts - Pills/Charms)
  if (this.activeBoosts && this.activeBoosts.length > 0) {
    const now = new Date();
    this.activeBoosts.forEach(boost => {
      if (new Date(boost.expiresAt) > now) {
        // Map boost types to stats
        // Hiện tại shopItems chỉ có EXP/SStone boost, nhưng ta chuẩn bị sẵn cho ATK/DEF boost
        if (boost.type === 'attack_boost') percentBonuses.attack += (boost.multiplier - 1);
        if (boost.type === 'defense_boost') percentBonuses.defense += (boost.multiplier - 1);
        // Example: Lucky Charm increases Spirit Stones, maybe gives Luck?
        if (boost.itemId === 'lucky_charm') flatBonuses.luck += 5;
      }
    });
  }

  // 4. Bonus từ Linh Thú (Pet)
  if (this.equipped?.pet) {
    const pet = SHOP_ITEMS_MAP.get(this.equipped.pet);
    if (pet && pet.type === ITEM_TYPES.PET) {
      if (pet.expBonus) flatBonuses.luck += (pet.expBonus * 100);
      if (pet.spiritStoneBonus) flatBonuses.luck += (pet.spiritStoneBonus * 100);
      if (pet.questExpBonus) flatBonuses.luck += (pet.questExpBonus * 100);
    }
  }

  // 5. Bonus từ Tọa Kỵ (Mount)
  if (this.equipped?.mount) {
    const mount = SHOP_ITEMS_MAP.get(this.equipped.mount);
    if (mount && mount.type === ITEM_TYPES.MOUNT && mount.stats) {
      Object.keys(mount.stats).forEach(statKey => {
        const bonusValue = mount.stats[statKey];
        if (finalStats[statKey] !== undefined) {
          if (['attack', 'defense', 'qiBlood', 'zhenYuan', 'speed'].includes(statKey)) {
            percentBonuses[statKey] += bonusValue;
          } else if (['penetration', 'resistance'].includes(statKey)) {
            flatBonuses[statKey] += (bonusValue * 100);
          } else {
            flatBonuses[statKey] += (bonusValue * 100);
          }
        }
      });
    }
  }

  // Apply Totals (Additive Calculation)
  // Formula: Base * (1 + PercentSum) + FlatSum
  Object.keys(finalStats).forEach(key => {
    if (['attack', 'defense', 'qiBlood', 'zhenYuan', 'speed'].includes(key)) {
      finalStats[key] = Math.floor(finalStats[key] * (1 + (percentBonuses[key] || 0))) + (flatBonuses[key] || 0);
    } else {
      // Crit, Dodge, etc. are additive only (Base is already %)
      finalStats[key] = finalStats[key] + (flatBonuses[key] || 0) + (percentBonuses[key] || 0);
    }
  });
  // Tích hợp equipment stats (async - sẽ được gọi riêng nếu cần)
  // Equipment stats sẽ được tính riêng qua getEquipmentStats() và merge ở route level

  // ==================== HARD CAPS FOR PERCENTAGE STATS ====================
  // Apply hard caps to prevent overpowered builds
  finalStats.dodge = Math.min(50, finalStats.dodge);           // Max 50% dodge
  finalStats.criticalRate = Math.min(60, finalStats.criticalRate); // Max 60% crit rate
  finalStats.accuracy = Math.min(100, finalStats.accuracy);    // Max 100% accuracy
  finalStats.lifesteal = Math.min(30, finalStats.lifesteal);   // Max 30% lifesteal

  return finalStats;
};

/**
 * Luyện công pháp (tăng exp và level)
 * @param {string} techniqueId - ID công pháp
 * @param {number} expGain - Exp nhận được khi luyện
 */
CultivationSchema.methods.practiceTechnique = function (techniqueId, expGain = 10) {
  const learned = this.learnedTechniques?.find(t => t.techniqueId === techniqueId);
  if (!learned) {
    throw new Error("Bạn chưa học công pháp này");
  }

  learned.exp += expGain;
  learned.lastPracticedAt = new Date();

  // Kiểm tra lên cấp - recalculate expNeeded each iteration
  let leveledUp = false;
  while (learned.level < 10) {
    const expNeeded = learned.level * 100; // Recalculate based on current level
    if (learned.exp >= expNeeded) {
      learned.exp -= expNeeded;
      learned.level += 1;
      leveledUp = true;
    } else {
      break;
    }
  }

  // Giới hạn exp ở level 10
  // Cap exp at max for level 10
  if (learned.level >= 10) {
    const maxExpAtLevel10 = 10 * 100 - 1; // 999
    learned.exp = Math.min(learned.exp, maxExpAtLevel10);
  }

  return { leveledUp, newLevel: learned.level, currentExp: learned.exp, expNeeded: learned.level * 100 };
};

/**
 * Lấy danh sách kỹ năng từ công pháp đã học
 * @returns {Array} Danh sách kỹ năng
 */
CultivationSchema.methods.getSkills = function () {
  if (!this.learnedTechniques || this.learnedTechniques.length === 0) {
    return [];
  }

  return this.learnedTechniques.map(learned => {
    // Use TECHNIQUES_MAP for O(1) lookup
    const technique = TECHNIQUES_MAP.get(learned.techniqueId);
    if (technique && technique.skill) {
      return {
        techniqueId: learned.techniqueId,
        techniqueName: technique.name,
        skillName: technique.skill.name,
        skillDescription: technique.skill.description,
        cooldown: technique.skill.cooldown,
        level: learned.level
      };
    }
    return null;
  }).filter(Boolean);
};

/**
 * Lấy thông tin cảnh giới từ exp
 */
CultivationSchema.methods.getRealmFromExp = function () {
  const exp = this.exp;
  for (let i = CULTIVATION_REALMS.length - 1; i >= 0; i--) {
    if (exp >= CULTIVATION_REALMS[i].minExp) {
      return CULTIVATION_REALMS[i];
    }
  }
  return CULTIVATION_REALMS[0];
};

/**
 * Tính exp cần cho cảnh giới tiếp theo
 */
CultivationSchema.methods.getExpToNextRealm = function () {
  const currentRealm = this.getRealmFromExp();
  if (currentRealm.level >= 14) return 0;
  return currentRealm.maxExp - this.exp + 1;
};

/**
 * Tính phần trăm tiến độ cảnh giới hiện tại
 * Dựa trên realmLevel hiện tại, không phải realm từ exp
 */
CultivationSchema.methods.getRealmProgress = function () {
  // Dùng realmLevel hiện tại thay vì tính từ exp
  const currentRealm = CULTIVATION_REALMS.find(r => r.level === this.realmLevel) || CULTIVATION_REALMS[0];
  if (currentRealm.level >= 14) return 100;

  // Tính progress trong realm hiện tại
  const progressInRealm = this.exp - currentRealm.minExp;
  const realmRange = currentRealm.maxExp - currentRealm.minExp + 1;
  return Math.min(100, Math.floor((progressInRealm / realmRange) * 100));
};

/**
 * Lấy thông tin tier (Sơ/Trung/Đại Thành/Viên Mãn)
 * @returns {Object} Tier info với key, name, privileges
 */
CultivationSchema.methods.getTierInfo = function () {
  return getTierBySubLevel(this.subLevel || 1);
};

/**
 * Lấy tên đầy đủ: "Kim Đan - Đại Thành"
 * @returns {string} Full realm name với tier
 */
CultivationSchema.methods.getFullRealmName = function () {
  const realm = CULTIVATION_REALMS.find(r => r.level === this.realmLevel);
  const tier = this.getTierInfo();
  return `${realm?.name || 'Phàm Nhân'} - ${tier.name}`;
};

/**
 * Lấy danh sách debuffs đang active
 * @returns {Array} Active debuffs
 */
CultivationSchema.methods.getActiveDebuffs = function () {
  return (this.debuffs || []).filter(d => d.remainingBattles > 0);
};

/**
 * Tiêu hao 1 lượt debuff sau mỗi trận đấu
 * Xóa debuffs đã hết lượt
 */
CultivationSchema.methods.consumeDebuffBattle = function () {
  if (this.debuffs && this.debuffs.length > 0) {
    this.debuffs.forEach(d => {
      if (d.remainingBattles > 0) d.remainingBattles--;
    });
    // Xóa các debuff đã hết lượt
    this.debuffs = this.debuffs.filter(d => d.remainingBattles > 0);
  }
};

/**
 * Thêm hoặc reset debuff (không stack vô hạn)
 * @param {string} debuffType - Loại debuff
 * @param {number} duration - Số trận còn lại
 */
CultivationSchema.methods.applyDebuff = function (debuffType, duration) {
  if (!this.debuffs) this.debuffs = [];

  const existingIndex = this.debuffs.findIndex(d => d.type === debuffType);
  if (existingIndex >= 0) {
    // Reset duration (không stack)
    this.debuffs[existingIndex].remainingBattles = Math.max(
      this.debuffs[existingIndex].remainingBattles,
      duration
    );
    this.debuffs[existingIndex].appliedAt = new Date();
  } else {
    // Thêm mới
    this.debuffs.push({
      type: debuffType,
      remainingBattles: duration,
      appliedAt: new Date()
    });
  }
};

/**
 * Tính số slot công pháp chiến đấu tối đa dựa trên realm level
 * @returns {number} Số slot (2-5)
 */
CultivationSchema.methods.getMaxCombatSlots = function () {
  const realmLevel = this.realmLevel || 1;

  if (realmLevel <= 2) return 2; // Phàm Nhân, Luyện Khí
  if (realmLevel <= 4) return 3; // Trúc Cơ, Kim Đan
  if (realmLevel <= 6) return 4; // Nguyên Anh, Hóa Thần
  return 5; // Luyện Hư trở lên
};

/**
 * Lấy bonus từ pet đang trang bị
 * @returns {Object} { expBonus, spiritStoneBonus, questExpBonus }
 */
CultivationSchema.methods.getPetBonuses = function () {
  const bonuses = { expBonus: 0, spiritStoneBonus: 0, questExpBonus: 0 };

  if (this.equipped?.pet) {
    const pet = SHOP_ITEMS_MAP.get(this.equipped.pet);
    if (pet && pet.type === ITEM_TYPES.PET) {
      bonuses.expBonus = pet.expBonus || 0;
      bonuses.spiritStoneBonus = pet.spiritStoneBonus || 0;
      bonuses.questExpBonus = pet.questExpBonus || 0;
    }
  }

  return bonuses;
};

/**
 * Cộng exp và cập nhật cảnh giới
 * @param {number} amount 
 * @param {string} source 
 * @param {string} description 
 */
CultivationSchema.methods.addExp = function (amount, source, description = "") {
  // Tính multiplier từ active boosts
  let multiplier = 1;
  const now = new Date();
  this.activeBoosts = this.activeBoosts.filter(boost => boost.expiresAt > now);
  for (const boost of this.activeBoosts) {
    if (boost.type === 'exp_boost') {
      multiplier = Math.max(multiplier, boost.multiplier);
    }
  }

  // Thêm bonus từ pet (dùng Math.max để nhất quán với boost logic)
  const petBonuses = this.getPetBonuses();
  // Pet exp bonus: chọn giá trị cao nhất thay vì cộng dồn
  const petExpMultiplier = petBonuses.expBonus > 0 ? Math.max(1, 1 + petBonuses.expBonus) : 1;

  const finalAmount = Math.floor(amount * multiplier * petExpMultiplier);
  const oldExp = this.exp;
  this.exp += finalAmount;

  // Chỉ cập nhật sub-level dựa trên progress trong realm hiện tại
  const progressPercent = this.getRealmProgress();
  this.subLevel = Math.max(1, Math.ceil(progressPercent / 10));

  // Kiểm tra xem có đủ exp để breakthrough không
  const newRealmFromExp = this.getRealmFromExp();
  const canBreakthrough = newRealmFromExp.level > this.realmLevel;

  // Log exp (giới hạn 100 entries gần nhất)
  if (!this.expLog) this.expLog = [];
  this.expLog.push({
    amount: finalAmount,
    source,
    description: description || `+${finalAmount} exp từ ${source}`,
    timestamp: now
  });
  if (this.expLog.length > 100) {
    this.expLog = this.expLog.slice(-100);
  }

  return {
    addedExp: finalAmount,
    totalExp: this.exp,
    multiplier,
    leveledUp: false,
    newRealm: null,
    canBreakthrough: canBreakthrough
  };
};

/**
 * Cộng linh thạch
 */
CultivationSchema.methods.addSpiritStones = function (amount, source) {
  // Thêm bonus từ pet
  const petBonuses = this.getPetBonuses();
  const petSpiritStoneMultiplier = 1 + petBonuses.spiritStoneBonus;

  const finalAmount = Math.floor(amount * petSpiritStoneMultiplier);
  this.spiritStones += finalAmount;
  this.totalSpiritStonesEarned += finalAmount;
  return this.spiritStones;
};

/**
 * Thu thập passive exp (tu vi tăng dần theo thời gian)
 * @returns {Object} Kết quả thu thập
 */
CultivationSchema.methods.collectPassiveExp = function () {
  const now = new Date();
  const lastCollected = this.lastPassiveExpCollected || now;

  // Tính thời gian đã trôi qua (giây)
  const elapsedMs = now.getTime() - new Date(lastCollected).getTime();
  const elapsedMinutes = Math.floor(elapsedMs / (1000 * 60));

  // Giới hạn tối đa 24h = 1440 phút (để tránh tích lũy quá nhiều khi offline lâu)
  const maxMinutes = 1440;
  const effectiveMinutes = Math.min(elapsedMinutes, maxMinutes);

  // Tối thiểu 1 phút mới có exp
  if (effectiveMinutes < 1) {
    return {
      collected: false,
      message: "Chưa đủ thời gian để thu thập tu vi",
      nextCollectIn: 60 - Math.floor((elapsedMs / 1000) % 60)
    };
  }

  // Base passive exp theo cảnh giới (tu vi cao = nhận nhiều hơn)
  // Phàm Nhân (1): 2 exp/phút
  // Luyện Khí (2): 4 exp/phút
  // Trúc Cơ (3): 8 exp/phút
  // Kim Đan (4): 15 exp/phút
  // Nguyên Anh (5): 25 exp/phút
  // Hóa Thần (6): 40 exp/phút
  // Luyện Hư (7): 60 exp/phút
  // Đại Thừa (8): 100 exp/phút
  // Độ Kiếp (9): 150 exp/phút
  // Tiên Nhân (10): 250 exp/phút
  // Exp per minute (14 levels)
  const expPerMinuteByRealm = {
    1: 2,     // Phàm Nhân
    2: 4,     // Luyện Khí
    3: 8,     // Trúc Cơ
    4: 15,    // Kim Đan
    5: 25,    // Nguyên Anh
    6: 40,    // Hóa Thần
    7: 60,    // Luyện Hư
    8: 100,   // Hợp Thể
    9: 150,   // Đại Thừa
    10: 250,  // Chân Tiên
    11: 400,  // Kim Tiên
    12: 600,  // Tiên Vương
    13: 800,  // Tiên Đế
    14: 1000  // Thiên Đế
  };

  const baseExpPerMinute = expPerMinuteByRealm[this.realmLevel] || 2;
  const baseExp = effectiveMinutes * baseExpPerMinute;

  // Tính multiplier từ active boosts (đan dược x2, x3, etc.)
  let multiplier = 1;
  this.activeBoosts = this.activeBoosts.filter(boost => boost.expiresAt > now);
  for (const boost of this.activeBoosts) {
    if (boost.type === 'exp' || boost.type === 'exp_boost') {
      multiplier = Math.max(multiplier, boost.multiplier);
    }
  }

  // Áp dụng multiplier từ đan dược
  const finalExp = Math.floor(baseExp * multiplier);

  // Cộng exp
  this.exp += finalExp;

  const progressPercent = this.getRealmProgress();
  this.subLevel = Math.max(1, Math.ceil(progressPercent / 10));

  // Log exp
  if (!this.expLog) this.expLog = [];
  this.expLog.push({
    amount: finalExp,
    source: 'passive',
    description: multiplier > 1
      ? `Tu luyện ${effectiveMinutes} phút (x${multiplier} đan dược)`
      : `Tu luyện ${effectiveMinutes} phút`,
    timestamp: now
  });
  if (this.expLog.length > 100) {
    this.expLog = this.expLog.slice(-100);
  }

  // Cập nhật thời gian thu thập
  this.lastPassiveExpCollected = now;

  // Tính realm có thể đạt được từ exp
  const potentialRealm = this.getRealmFromExp();
  const currentRealm = CULTIVATION_REALMS.find(r => r.level === this.realmLevel) || CULTIVATION_REALMS[0];
  const canBreakthrough = potentialRealm.level > this.realmLevel;

  return {
    collected: true,
    expEarned: finalExp,
    baseExp,
    multiplier,
    minutesElapsed: effectiveMinutes,
    totalExp: this.exp,
    leveledUp: false,
    newRealm: null,
    canBreakthrough: canBreakthrough,
    potentialRealm: canBreakthrough ? potentialRealm : null,
    activeBoosts: this.activeBoosts.map(b => ({
      type: b.type,
      multiplier: b.multiplier,
      expiresAt: b.expiresAt
    }))
  };
};

/**
 * Trừ linh thạch (mua đồ)
 */
CultivationSchema.methods.spendSpiritStones = function (amount) {
  if (this.spiritStones < amount) {
    throw new Error("Không đủ linh thạch");
  }
  this.spiritStones -= amount;
  return this.spiritStones;
};

/**
 * Xử lý đăng nhập hàng ngày
 */
CultivationSchema.methods.processLogin = function () {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  let diffDays = 0;
  let streakContinued = false;

  if (this.lastLoginDate) {
    const lastLogin = new Date(this.lastLoginDate);
    const lastLoginDay = new Date(lastLogin.getFullYear(), lastLogin.getMonth(), lastLogin.getDate());

    diffDays = Math.floor((today - lastLoginDay) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      // Đã đăng nhập hôm nay rồi
      return { alreadyLoggedIn: true, streak: this.loginStreak };
    } else if (diffDays === 1) {
      // Đăng nhập liên tục
      this.loginStreak += 1;
      streakContinued = true;
    } else {
      // Mất streak
      this.loginStreak = 1;
    }
  } else {
    this.loginStreak = 1;
  }

  // Lưu lastLoginDate cũ để kiểm tra
  const hadPreviousLogin = !!this.lastLoginDate;

  this.lastLoginDate = now;
  this.longestStreak = Math.max(this.longestStreak, this.loginStreak);
  this.stats.totalDaysActive += 1;

  // Cập nhật quest progress cho login_streak achievements
  // Chỉ cập nhật khi streak tiếp tục (không reset) hoặc login lần đầu
  if (streakContinued || !hadPreviousLogin) {
    this.updateQuestProgress('login_streak', 1);
  }

  // Đánh dấu daily_login quest hoàn thành (quest không có requirement, tự động complete khi login)
  const dailyLoginQuest = this.dailyQuests.find(q => q.questId === 'daily_login');
  if (dailyLoginQuest && !dailyLoginQuest.completed) {
    dailyLoginQuest.completed = true;
    dailyLoginQuest.completedAt = new Date();
  }

  // Phần thưởng đăng nhập
  const baseExp = 20;
  const streakBonus = Math.min(this.loginStreak * 5, 50); // Max +50 exp cho streak

  // Linh thạch: Tăng mạnh cho tuần đầu tiên để hỗ trợ tân thủ
  let baseStones = 10;
  if (this.loginStreak === 1) {
    baseStones = 50; // Ngày đầu tiên: 50 linh thạch (welcome bonus)
  } else if (this.loginStreak === 2) {
    baseStones = 30; // Ngày 2: 30 linh thạch
  } else if (this.loginStreak === 3) {
    baseStones = 40; // Ngày 3: 40 linh thạch  
  } else if (this.loginStreak <= 7) {
    baseStones = 20; // Ngày 4-7: 20 linh thạch
  }
  const streakStoneBonus = Math.min((this.loginStreak - 1) * 2, 20); // -1 để không double bonus ngày đầu

  // Milestone bonuses cho streak 7, 30, 60, 90, 365
  let milestoneBonus = 0;
  if (this.loginStreak === 7) {
    milestoneBonus = 70;
  } else if (this.loginStreak === 30) {
    milestoneBonus = 250;
  } else if (this.loginStreak === 60) {
    milestoneBonus = 500;
  } else if (this.loginStreak === 90) {
    milestoneBonus = 1000;
  } else if (this.loginStreak === 365) {
    milestoneBonus = 5000;
  }

  const totalStones = baseStones + streakStoneBonus + milestoneBonus;

  const expResult = this.addExp(baseExp + streakBonus, "daily_login", `Điểm danh ngày ${this.loginStreak}`);
  this.addSpiritStones(totalStones, "daily_login");

  return {
    alreadyLoggedIn: false,
    streak: this.loginStreak,
    expEarned: expResult.addedExp,
    stonesEarned: totalStones,
    milestoneBonus: milestoneBonus > 0 ? milestoneBonus : undefined,
    leveledUp: expResult.leveledUp,
    newRealm: expResult.newRealm
  };
};

/**
 * Reset nhiệm vụ hàng ngày
 */
CultivationSchema.methods.resetDailyQuests = function () {
  const now = new Date();
  const lastReset = this.dailyProgress.lastReset;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const lastResetDay = new Date(lastReset.getFullYear(), lastReset.getMonth(), lastReset.getDate());

  if (today > lastResetDay) {
    // Reset daily progress
    this.dailyProgress = {
      posts: 0,
      comments: 0,
      likes: 0,
      upvotes: 0,
      lastReset: now
    };

    // Reset daily quests
    this.dailyQuests = QUEST_TEMPLATES.daily.map(quest => ({
      questId: quest.id,
      progress: 0,
      completed: false,
      claimed: false
    }));

    return true;
  }
  return false;
};

/**
 * Reset nhiệm vụ hàng tuần
 */
CultivationSchema.methods.resetWeeklyQuests = function () {
  const now = new Date();
  const lastReset = this.weeklyProgress.lastReset;

  // Tính tuần hiện tại và tuần của lần reset cuối
  const getWeekNumber = (date) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 4 - (d.getDay() || 7));
    const yearStart = new Date(d.getFullYear(), 0, 1);
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  };

  if (getWeekNumber(now) !== getWeekNumber(lastReset) || now.getFullYear() !== lastReset.getFullYear()) {
    // Reset weekly progress
    this.weeklyProgress = {
      posts: 0,
      friends: 0,
      events: 0,
      lastReset: now
    };

    // Reset weekly quests
    this.weeklyQuests = QUEST_TEMPLATES.weekly.map(quest => ({
      questId: quest.id,
      progress: 0,
      completed: false,
      claimed: false
    }));

    return true;
  }
  return false;
};

/**
 * Sync tiến độ achievements từ dữ liệu hiện có của user (retroactive)
 * Gọi method này khi user login hoặc khi init achievements lần đầu
 * @param {Object} options - Optional data từ bên ngoài
 * @param {number} options.friendsCount - Số bạn bè hiện tại của user
 */
CultivationSchema.methods.syncAchievementsProgress = function (options = {}) {
  // Khởi tạo achievements nếu chưa có
  if (!this.achievements || this.achievements.length === 0) {
    this.achievements = QUEST_TEMPLATES.achievement.map(quest => ({
      questId: quest.id,
      progress: 0,
      completed: false,
      claimed: false
    }));
  }

  // Thêm các achievements mới nếu có
  for (const template of QUEST_TEMPLATES.achievement) {
    const existing = this.achievements.find(a => a.questId === template.id);
    if (!existing) {
      this.achievements.push({
        questId: template.id,
        progress: 0,
        completed: false,
        claimed: false
      });
    }
  }

  // Lấy dữ liệu hiện có từ user
  const loginStreak = this.loginStreak || 0;
  const longestStreak = this.longestStreak || 0;
  const totalDungeonsCleared = this.dungeonStats?.totalDungeonsCleared || 0;
  const realmLevel = this.realmLevel || 1;
  const totalPostsCreated = this.stats?.totalPostsCreated || 0;
  const friendsCount = options.friendsCount || 0;

  // Cập nhật progress cho từng achievement dựa trên dữ liệu hiện có
  for (const achievement of this.achievements) {
    if (achievement.claimed) continue; // Đã nhận rồi thì bỏ qua

    const template = QUEST_TEMPLATES.achievement.find(t => t.id === achievement.questId);
    if (!template || !template.requirement) continue;

    let currentProgress = 0;

    switch (template.requirement.action) {
      case 'login_streak':
        // Dùng max của streak hiện tại và longestStreak
        currentProgress = Math.max(loginStreak, longestStreak);
        break;

      case 'dungeon_clear':
        currentProgress = totalDungeonsCleared;
        break;

      case 'realm':
        currentProgress = realmLevel;
        break;

      case 'post':
        currentProgress = totalPostsCreated;
        break;

      case 'friend':
        currentProgress = friendsCount;
        break;

      // Các action khác như post_upvotes sẽ được track realtime
      default:
        continue;
    }

    // Chỉ cập nhật nếu progress mới cao hơn
    if (currentProgress > achievement.progress) {
      achievement.progress = Math.min(currentProgress, template.requirement.count);

      // Check hoàn thành
      if (achievement.progress >= template.requirement.count && !achievement.completed) {
        achievement.completed = true;
        achievement.completedAt = new Date();
      }
    }
  }

  return this.achievements;
};
CultivationSchema.methods.updateQuestProgress = function (action, count = 1) {
  const results = [];

  // Helper function để cập nhật quest
  const updateQuest = (quests, templates) => {
    for (const quest of quests) {
      if (quest.completed) continue;

      const template = templates.find(t => t.id === quest.questId);
      if (!template || !template.requirement) continue;

      if (template.requirement.action === action) {
        quest.progress = Math.min(quest.progress + count, template.requirement.count);
        if (quest.progress >= template.requirement.count && !quest.completed) {
          quest.completed = true;
          quest.completedAt = new Date();
          results.push({ quest: template, type: 'completed' });
        }
      }
    }
  };

  // Cập nhật daily quests
  updateQuest(this.dailyQuests, QUEST_TEMPLATES.daily);

  // Cập nhật weekly quests
  updateQuest(this.weeklyQuests, QUEST_TEMPLATES.weekly);

  // Cập nhật achievements
  updateQuest(this.achievements, QUEST_TEMPLATES.achievement);

  // Cập nhật progress tracking
  switch (action) {
    case 'post':
      this.dailyProgress.posts += count;
      this.weeklyProgress.posts += count;
      this.stats.totalPostsCreated += count;
      break;
    case 'comment':
      this.dailyProgress.comments += count;
      this.stats.totalCommentsCreated += count;
      break;
    case 'like':
      this.dailyProgress.likes += count;
      this.stats.totalLikesGiven += count;
      break;
    case 'upvote':
      this.dailyProgress.upvotes = (this.dailyProgress.upvotes || 0) + count;
      this.stats.totalUpvotesGiven = (this.stats.totalUpvotesGiven || 0) + count;
      break;
    case 'receive_upvote':
      this.stats.totalUpvotesReceived = (this.stats.totalUpvotesReceived || 0) + count;
      break;
    case 'friend':
      this.weeklyProgress.friends += count;
      break;
    case 'event':
      this.weeklyProgress.events += count;
      break;
    // Tu tiên actions - không cần track riêng vì chỉ dùng cho quest
    case 'yinyang_click':
    case 'pk_battle':
    case 'pk_win':
    case 'dungeon_floor':
    case 'dungeon_clear':
    case 'passive_collect':
      // Chỉ dùng cho quest tracking, không cần dailyProgress riêng
      break;
  }

  return results;
};

/**
 * Claim phần thưởng nhiệm vụ
 */
CultivationSchema.methods.claimQuestReward = function (questId) {
  // Tìm quest trong tất cả các loại
  let quest = this.dailyQuests.find(q => q.questId === questId);
  let template = QUEST_TEMPLATES.daily.find(t => t.id === questId);

  if (!quest) {
    quest = this.weeklyQuests.find(q => q.questId === questId);
    template = QUEST_TEMPLATES.weekly.find(t => t.id === questId);
  }

  if (!quest) {
    quest = this.achievements.find(q => q.questId === questId);
    template = QUEST_TEMPLATES.achievement.find(t => t.id === questId);
  }

  if (!quest || !template) {
    throw new Error("Không tìm thấy nhiệm vụ");
  }

  if (!quest.completed) {
    throw new Error("Nhiệm vụ chưa hoàn thành");
  }

  if (quest.claimed) {
    throw new Error("Đã nhận thưởng rồi");
  }

  // Nhận thưởng
  quest.claimed = true;
  quest.claimedAt = new Date();
  this.stats.totalQuestsCompleted += 1;

  const expResult = this.addExp(template.expReward, "quest", `Hoàn thành: ${template.name}`);
  this.addSpiritStones(template.spiritStoneReward, "quest");

  return {
    expEarned: expResult.addedExp,
    stonesEarned: template.spiritStoneReward,
    leveledUp: expResult.leveledUp,
    newRealm: expResult.newRealm
  };
};

/**
 * Mua vật phẩm
 * @param {string} itemId - ID vật phẩm
 * @param {number} overridePrice - Giá đã được giảm từ Đan Phòng (optional) - là TỔNG GIÁ (đã nhân quantity)
 * @param {number} quantity - Số lượng mua (default: 1)
 */
CultivationSchema.methods.buyItem = function (itemId, overridePrice = null, quantity = 1) {
  // Use SHOP_ITEMS_MAP for O(1) lookup
  const item = SHOP_ITEMS_MAP.get(itemId);
  if (!item) {
    throw new Error("Vật phẩm không tồn tại");
  }

  // Validate quantity
  const qty = Math.floor(Number(quantity)) || 1;
  if (qty < 1 || qty > 99) {
    throw new Error("Số lượng không hợp lệ (1-99)");
  }

  // Xử lý items chỉ mua 1 lần (starter pack) - không cho phép mua nhiều
  if (item.oneTimePurchase) {
    if (qty > 1) {
      throw new Error("Vật phẩm này chỉ có thể mua 1 cái");
    }
    // Kiểm tra đã mua chưa (dùng purchasedOneTimeItems để track vĩnh viễn)
    if (!this.purchasedOneTimeItems) {
      this.purchasedOneTimeItems = [];
    }

    if (this.purchasedOneTimeItems.includes(itemId)) {
      // Trả về thông báo thay vì throw error
      return {
        type: 'starter_pack',
        alreadyPurchased: true,
        name: item.name,
        message: 'Bạn đã nhận gói quà này rồi!'
      };
    }

    // Đánh dấu đã mua (vĩnh viễn, không thể mua lại)
    this.purchasedOneTimeItems.push(itemId);

    // CHỈ thêm gói vào inventory, KHÔNG cộng rewards ngay
    // Rewards sẽ được cộng khi user bấm "Dùng"
    const inventoryItem = {
      itemId: item.id,
      name: item.name,
      type: ITEM_TYPES.CONSUMABLE,
      quantity: 1,
      equipped: false,
      acquiredAt: new Date(),
      metadata: {
        ...item, // Copy toàn bộ thông tin gốc
        oneTimePurchase: true,
        unopened: true // Đánh dấu chưa mở
      }
    };
    this.inventory.push(inventoryItem);

    return {
      type: 'starter_pack',
      name: item.name,
      purchased: true, // Chỉ mua, chưa mở
      message: 'Đã thêm vào túi đồ. Bấm "Dùng" để nhận phần thưởng!'
    };
  }

  // Kiểm tra đã có chưa (trừ consumable items và exp boost - có thể mua nhiều)
  const isStackable = item.type === ITEM_TYPES.EXP_BOOST || item.type === ITEM_TYPES.CONSUMABLE || item.type === 'breakthrough_boost';

  if (!isStackable) {
    // Với công pháp, kiểm tra đã học chưa
    if (item.type === ITEM_TYPES.TECHNIQUE) {
      const alreadyLearned = this.learnedTechniques?.some(t => t.techniqueId === itemId);
      if (alreadyLearned) {
        throw new Error("Bạn đã học công pháp này rồi");
      }
    } else {
      const existing = this.inventory.find(i => i.itemId === itemId);
      if (existing) {
        throw new Error("Bạn đã sở hữu vật phẩm này");
      }
    }
  }

  // Trừ linh thạch (dùng giá đã giảm nếu có - đây là TỔNG GIÁ đã nhân quantity)
  const finalPrice = overridePrice !== null ? overridePrice : (item.price * qty);
  this.spendSpiritStones(finalPrice);

  // Xử lý công pháp: tự động học khi mua (không cho phép mua nhiều)
  if (item.type === ITEM_TYPES.TECHNIQUE) {
    if (!this.learnedTechniques) {
      this.learnedTechniques = [];
    }
    const learnedTechnique = {
      techniqueId: item.id,
      level: 1,
      exp: 0,
      learnedAt: new Date(),
      lastPracticedAt: null
    };
    this.learnedTechniques.push(learnedTechnique);
    return { type: 'technique', learnedTechnique, name: item.name }; // Trả về thông tin công pháp đã học
  }

  // Xử lý items có thể stack (exp_boost, breakthrough_boost, consumable)
  if (isStackable) {
    // Tìm item cùng loại đã có trong inventory
    const existingItem = this.inventory.find(i => i.itemId === itemId);

    if (existingItem) {
      // Stack lên item đã có
      existingItem.quantity = (existingItem.quantity || 1) + qty;
      return { ...existingItem, addedQuantity: qty };
    }
  }

  // Thêm mới vào inventory
  const inventoryItem = {
    itemId: item.id,
    name: item.name,
    type: item.type,
    quantity: qty,
    equipped: false,
    acquiredAt: new Date(),
    metadata: { ...item }
  };

  // Xử lý item có thời hạn
  // NOTE: Không tự động kích hoạt boost khi mua - user phải bấm "Dùng" thủ công
  // Đã bỏ auto-activation vì gây double buff
  if (item.type === ITEM_TYPES.EXP_BOOST || item.type === 'breakthrough_boost') {
    // Lưu thông tin duration vào metadata để sử dụng khi user click "Dùng"
    inventoryItem.metadata.duration = item.duration;
    inventoryItem.metadata.multiplier = item.multiplier;
  }

  this.inventory.push(inventoryItem);

  return inventoryItem;
};

/**
 * Trang bị vật phẩm
 */
CultivationSchema.methods.equipItem = function (itemId) {
  const item = this.inventory.find(i => i.itemId === itemId);
  if (!item) {
    throw new Error("Bạn không sở hữu vật phẩm này");
  }

  // Bỏ trang bị item cùng loại
  this.inventory.forEach(i => {
    if (i.type === item.type) {
      i.equipped = false;
    }
  });

  // Trang bị item mới
  item.equipped = true;

  // Cập nhật equipped
  switch (item.type) {
    case ITEM_TYPES.TITLE:
      this.equipped.title = item.itemId;
      break;
    case ITEM_TYPES.BADGE:
      this.equipped.badge = item.itemId;
      break;
    case ITEM_TYPES.AVATAR_FRAME:
      this.equipped.avatarFrame = item.itemId;
      break;
    case ITEM_TYPES.PROFILE_EFFECT:
      this.equipped.profileEffect = item.itemId;
      break;
    case ITEM_TYPES.PET:
      this.equipped.pet = item.itemId;
      break;
    case ITEM_TYPES.MOUNT:
      this.equipped.mount = item.itemId;
      break;
  }

  return item;
};

/**
 * Bỏ trang bị vật phẩm
 */
CultivationSchema.methods.unequipItem = function (itemId) {
  const item = this.inventory.find(i => i.itemId === itemId);
  if (!item) {
    throw new Error("Bạn không sở hữu vật phẩm này");
  }

  item.equipped = false;

  switch (item.type) {
    case ITEM_TYPES.TITLE:
      this.equipped.title = null;
      break;
    case ITEM_TYPES.BADGE:
      this.equipped.badge = null;
      break;
    case ITEM_TYPES.AVATAR_FRAME:
      this.equipped.avatarFrame = null;
      break;
    case ITEM_TYPES.PROFILE_EFFECT:
      this.equipped.profileEffect = null;
      break;
    case ITEM_TYPES.PET:
      this.equipped.pet = null;
      break;
    case ITEM_TYPES.MOUNT:
      this.equipped.mount = null;
      break;
  }

  return item;
};

/**
 * Trang bị equipment (vũ khí, giáp, trang sức)
 * @param {mongoose.Types.ObjectId} equipmentId - ID của equipment
 * @param {string} slot - Slot để trang bị (weapon, helmet, chest, etc.)
 */
CultivationSchema.methods.equipEquipment = async function (equipmentId, slot) {
  const Equipment = mongoose.model('Equipment');
  const equipment = await Equipment.findById(equipmentId);

  if (!equipment || !equipment.is_active) {
    throw new Error("Equipment không tồn tại hoặc đã bị vô hiệu hóa");
  }

  // Kiểm tra level requirement
  if (this.realmLevel < equipment.level_required) {
    throw new Error(`Cần đạt cảnh giới cấp ${equipment.level_required} để trang bị`);
  }

  // Auto-detect slot nếu không chỉ định
  if (!slot) {
    if (equipment.type === 'weapon') slot = 'weapon';
    else if (equipment.type === 'magic_treasure') slot = 'magicTreasure';
    else if (equipment.type === 'armor') {
      if (equipment.subtype === 'helmet') slot = 'helmet';
      else if (equipment.subtype === 'chest') slot = 'chest';
      else if (equipment.subtype === 'shoulder') slot = 'shoulder';
      else if (equipment.subtype === 'gloves') slot = 'gloves';
      else if (equipment.subtype === 'boots') slot = 'boots';
      else if (equipment.subtype === 'belt') slot = 'belt';
      else throw new Error("Cần chỉ định slot cho armor");
    }
    else if (equipment.type === 'accessory') {
      // Default to ring if not specified
      slot = 'ring';
    }
    else if (equipment.type === 'power_item') slot = 'powerItem';
    else throw new Error("Không thể xác định slot cho equipment này");
  }

  // Kiểm tra slot có hợp lệ không
  if (!this.equipped.hasOwnProperty(slot)) {
    throw new Error(`Slot ${slot} không hợp lệ`);
  }

  // Bỏ trang bị equipment cũ ở slot này (nếu có)
  const oldEquipmentId = this.equipped[slot];
  if (oldEquipmentId) {
    this.equipped[slot] = null;
  }

  // Trang bị equipment mới
  this.equipped[slot] = equipmentId;

  return equipment;
};

/**
 * Bỏ trang bị equipment
 * @param {string} slot - Slot cần bỏ trang bị
 */
CultivationSchema.methods.unequipEquipment = function (slot) {
  if (!this.equipped.hasOwnProperty(slot)) {
    throw new Error(`Slot ${slot} không hợp lệ`);
  }

  if (!this.equipped[slot]) {
    throw new Error(`Slot ${slot} không có equipment nào được trang bị`);
  }

  this.equipped[slot] = null;

  return { slot, unequipped: true };
};

/**
 * Tính tổng stats từ tất cả equipment đang trang bị
 */
CultivationSchema.methods.getEquipmentStats = async function () {
  const Equipment = mongoose.model('Equipment');
  const equipmentIds = Object.values(this.equipped).filter(id =>
    id && mongoose.Types.ObjectId.isValid(id)
  );

  if (equipmentIds.length === 0) {
    return {
      attack: 0,
      defense: 0,
      hp: 0,
      crit_rate: 0,
      crit_damage: 0,
      penetration: 0,
      speed: 0,
      evasion: 0,
      hit_rate: 0,
      elemental_damage: {},
      skill_bonus: 0,
      energy_regen: 0,
      lifesteal: 0,
      true_damage: 0,
      buff_duration: 0
    };
  }

  const equipments = await Equipment.find({ _id: { $in: equipmentIds }, is_active: true });

  const totalStats = {
    attack: 0,
    defense: 0,
    hp: 0,
    crit_rate: 0,
    crit_damage: 0,
    penetration: 0,
    speed: 0,
    evasion: 0,
    hit_rate: 0,
    elemental_damage: {},
    skill_bonus: 0,
    energy_regen: 0,
    lifesteal: 0,
    true_damage: 0,
    buff_duration: 0
  };

  // Track các equipment bị hỏng để thông báo
  const brokenEquipments = [];

  // Tạo map để tra cứu nhanh durability từ inventory
  const inventoryDurabilityMap = new Map();
  this.inventory.forEach(item => {
    if (item.type?.startsWith('equipment_')) {
      const id = item.metadata?._id?.toString() || item.itemId?.toString();
      if (id && item.metadata?.durability) {
        inventoryDurabilityMap.set(id, item.metadata.durability);
      }
    }
  });

  equipments.forEach(eq => {
    // Lấy durability từ inventory (riêng cho user), không phải từ Equipment collection
    const userDurability = inventoryDurabilityMap.get(eq._id.toString());
    const durability = userDurability || eq.durability || { current: 100, max: 100 };

    // Kiểm tra equipment bị hỏng (durability = 0)
    const isBroken = durability.current <= 0;
    if (isBroken) {
      brokenEquipments.push({
        id: eq._id,
        name: eq.name,
        type: eq.type,
        subtype: eq.subtype
      });
      // Equipment bị hỏng không cộng stats
      return;
    }

    const stats = eq.getTotalStats();
    totalStats.attack += stats.attack || 0;
    totalStats.defense += stats.defense || 0;
    totalStats.hp += stats.hp || 0;
    totalStats.crit_rate += stats.crit_rate || 0;
    totalStats.crit_damage += stats.crit_damage || 0;
    totalStats.penetration += stats.penetration || 0;
    totalStats.speed += stats.speed || 0;
    totalStats.evasion += stats.evasion || 0;
    totalStats.hit_rate += stats.hit_rate || 0;
    totalStats.skill_bonus += stats.skill_bonus || 0;
    totalStats.energy_regen += stats.energy_regen || 0;
    totalStats.lifesteal += stats.lifesteal || 0;
    totalStats.true_damage += stats.true_damage || 0;
    totalStats.buff_duration += stats.buff_duration || 0;

    // Merge elemental damage
    if (stats.elemental_damage) {
      Object.entries(stats.elemental_damage).forEach(([element, damage]) => {
        totalStats.elemental_damage[element] = (totalStats.elemental_damage[element] || 0) + damage;
      });
    }
  });

  // Thêm thông tin về equipment bị hỏng vào response
  if (brokenEquipments.length > 0) {
    totalStats.brokenEquipments = brokenEquipments;
  }

  // Cap percentages at 1.0 (100%)
  totalStats.crit_rate = Math.min(totalStats.crit_rate, 1.0);
  totalStats.crit_damage = Math.min(totalStats.crit_damage, 1.0);
  totalStats.evasion = Math.min(totalStats.evasion, 1.0);
  totalStats.hit_rate = Math.min(totalStats.hit_rate, 1.0);
  totalStats.lifesteal = Math.min(totalStats.lifesteal, 1.0);

  return totalStats;
};

// ==================== STATIC METHODS ====================

/**
 * Lấy hoặc tạo cultivation cho user
 */
CultivationSchema.statics.getOrCreate = async function (userId) {
  let cultivation = await this.findOne({ user: userId });
  let needsSave = false;

  if (!cultivation) {
    cultivation = new this({
      user: userId,
      dailyQuests: QUEST_TEMPLATES.daily.map(q => ({
        questId: q.id,
        progress: 0,
        completed: false,
        claimed: false
      })),
      weeklyQuests: QUEST_TEMPLATES.weekly.map(q => ({
        questId: q.id,
        progress: 0,
        completed: false,
        claimed: false
      })),
      achievements: QUEST_TEMPLATES.achievement.map(q => ({
        questId: q.id,
        progress: 0,
        completed: false,
        claimed: false
      }))
    });
    needsSave = true;
  }

  // Reset quests nếu cần 
  const dailyReset = cultivation.resetDailyQuests();
  const weeklyReset = cultivation.resetWeeklyQuests();
  if (dailyReset || weeklyReset) {
    needsSave = true;
  }

  // Loại bỏ duplicate quests sau reset 
  const removeDuplicateQuests = (quests, templateIds) => {
    const seen = new Set();
    const unique = [];
    for (const quest of quests) {
      if (!seen.has(quest.questId) && templateIds.has(quest.questId)) {
        seen.add(quest.questId);
        unique.push(quest);
      }
    }
    return unique;
  };

  const dailyTemplateIds = new Set(QUEST_TEMPLATES.daily.map(t => t.id));
  const weeklyTemplateIds = new Set(QUEST_TEMPLATES.weekly.map(t => t.id));
  const achievementTemplateIds = new Set(QUEST_TEMPLATES.achievement.map(t => t.id));

  // Loại bỏ duplicate và quests không còn trong template
  const originalDailyCount = cultivation.dailyQuests.length;
  const originalWeeklyCount = cultivation.weeklyQuests.length;
  const originalAchievementCount = cultivation.achievements.length;

  cultivation.dailyQuests = removeDuplicateQuests(cultivation.dailyQuests, dailyTemplateIds);
  cultivation.weeklyQuests = removeDuplicateQuests(cultivation.weeklyQuests, weeklyTemplateIds);
  cultivation.achievements = removeDuplicateQuests(cultivation.achievements, achievementTemplateIds);

  if (cultivation.dailyQuests.length !== originalDailyCount ||
    cultivation.weeklyQuests.length !== originalWeeklyCount ||
    cultivation.achievements.length !== originalAchievementCount) {
    needsSave = true;
  }

  // Sync quests còn thiếu nếu KHÔNG có reset
  if (!dailyReset) {
    const existingDailyIds = new Set(cultivation.dailyQuests.map(q => q.questId));
    for (const template of QUEST_TEMPLATES.daily) {
      if (!existingDailyIds.has(template.id)) {
        cultivation.dailyQuests.push({
          questId: template.id,
          progress: 0,
          completed: false,
          claimed: false
        });
        needsSave = true;
      }
    }
  }

  if (!weeklyReset) {
    const existingWeeklyIds = new Set(cultivation.weeklyQuests.map(q => q.questId));
    for (const template of QUEST_TEMPLATES.weekly) {
      if (!existingWeeklyIds.has(template.id)) {
        cultivation.weeklyQuests.push({
          questId: template.id,
          progress: 0,
          completed: false,
          claimed: false
        });
        needsSave = true;
      }
    }
  }

  // Luôn sync achievements (không reset hàng ngày)
  const existingAchievementIds = new Set(cultivation.achievements.map(q => q.questId));
  for (const template of QUEST_TEMPLATES.achievement) {
    if (!existingAchievementIds.has(template.id)) {
      cultivation.achievements.push({
        questId: template.id,
        progress: 0,
        completed: false,
        claimed: false
      });
      needsSave = true;
    }
  }

  // Lấy số bạn bè của user để sync achievement
  let friendsCount = 0;
  try {
    const User = mongoose.model('User');
    const user = await User.findById(userId).select('friends').lean();
    friendsCount = user?.friends?.length || 0;
  } catch (err) {
    console.error('[CULTIVATION] Error getting friends count:', err);
  }

  // Sync achievement progress từ dữ liệu hiện có (retroactive)
  const achievementsSynced = cultivation.syncAchievementsProgress({ friendsCount });
  if (achievementsSynced) {
    needsSave = true;
  }

  if (needsSave) {
    // Handle VersionError with retry
    let retries = 3;
    while (retries > 0) {
      try {
        await cultivation.save();
        break;
      } catch (error) {
        if (error.name === 'VersionError' && retries > 1) {
          // Reload document and retry
          cultivation = await this.findOne({ user: userId });
          if (!cultivation) break;
          retries--;
          continue;
        }
        throw error;
      }
    }
  } else {
    try {
      const User = mongoose.model('User');
      await User.findByIdAndUpdate(userId, {
        $set: {
          'cultivationCache.realmLevel': cultivation.realmLevel,
          'cultivationCache.realmName': cultivation.realmName,
          'cultivationCache.exp': cultivation.exp,
          'cultivationCache.equipped.title': cultivation.equipped?.title || null,
          'cultivationCache.equipped.badge': cultivation.equipped?.badge || null,
          'cultivationCache.equipped.avatarFrame': cultivation.equipped?.avatarFrame || null,
          'cultivationCache.equipped.profileEffect': cultivation.equipped?.profileEffect || null
        }
      });
    } catch (error) {
      console.error('[CULTIVATION] Error syncing cultivation cache:', error);
    }
  }

  return cultivation;
};

/**
 * Leaderboard
 */
CultivationSchema.statics.getLeaderboard = async function (type = 'exp', limit = 50) {
  let sortField;
  switch (type) {
    case 'exp':
      sortField = { exp: -1 };
      break;
    case 'realm':
      sortField = { realmLevel: -1, exp: -1 };
      break;
    case 'spiritStones':
      sortField = { totalSpiritStonesEarned: -1 };
      break;
    case 'streak':
      sortField = { longestStreak: -1 };
      break;
    default:
      sortField = { exp: -1 };
  }

  return this.find()
    .sort(sortField)
    .limit(limit)
    .populate('user', 'name avatarUrl')
    .select('user exp realmLevel realmName spiritStones loginStreak longestStreak equipped stats');
};

// ==================== POST-SAVE MIDDLEWARE ====================
/**
 * Sync cultivation cache to User after save - ONLY when critical fields change
 * Uses modifiedPaths from pre-save to avoid unnecessary database writes
 */

// Track modified paths in pre-save
CultivationSchema.pre('save', function (next) {
  // Store which cache-critical fields were modified
  this._cacheFieldsModified =
    this.isModified('realmLevel') ||
    this.isModified('realmName') ||
    this.isModified('exp') ||
    this.isModified('equipped.title') ||
    this.isModified('equipped.badge') ||
    this.isModified('equipped.avatarFrame') ||
    this.isModified('equipped.profileEffect');
  next();
});

CultivationSchema.post('save', async function (doc) {
  // Skip sync if no cache-critical fields were modified
  if (!this._cacheFieldsModified) {
    return;
  }

  try {
    const User = mongoose.model('User');
    await User.findByIdAndUpdate(doc.user, {
      $set: {
        'cultivationCache.realmLevel': doc.realmLevel,
        'cultivationCache.realmName': doc.realmName,
        'cultivationCache.exp': doc.exp,
        'cultivationCache.equipped': {
          title: doc.equipped?.title || null,
          badge: doc.equipped?.badge || null,
          avatarFrame: doc.equipped?.avatarFrame || null,
          profileEffect: doc.equipped?.profileEffect || null
        }
      }
    });
  } catch (error) {
    console.error('[CULTIVATION] Error syncing cultivation cache to user:', error);
  }
});

// ==================== STATIC METHODS FOR ATOMIC QUEST RESETS ====================
import { getDayKey, getWeekKey } from "../services/timeKeys.js";

/**
 * Ensure daily quests are reset if needed (atomic, timezone-aware)
 * @param {ObjectId|string} userId - User ID
 * @param {Date} now - Current date (default: new Date())
 * @returns {Promise<boolean>} True if reset occurred
 */
CultivationSchema.statics.ensureDailyReset = async function (userId, now = new Date()) {
  const dayKey = getDayKey(now);

  // Reset dailyQuests only (achievements NOT reset)
  const result = await this.updateOne(
    { user: userId, lastDailyResetKey: { $ne: dayKey } },
    {
      $set: {
        lastDailyResetKey: dayKey,
        "dailyProgress.posts": 0,
        "dailyProgress.comments": 0,
        "dailyProgress.likes": 0,
        "dailyProgress.upvotes": 0,
        "dailyProgress.lastReset": now,

        "dailyQuests.$[].progress": 0,
        "dailyQuests.$[].completed": false,
        "dailyQuests.$[].claimed": false,
        "dailyQuests.$[].completedAt": null,
        "dailyQuests.$[].claimedAt": null,
      },
      $inc: { dataVersion: 1 },
    }
  );

  return result.modifiedCount > 0;
};

/**
 * Ensure weekly quests are reset if needed (atomic, timezone-aware)
 * @param {ObjectId|string} userId - User ID
 * @param {Date} now - Current date (default: new Date())
 * @returns {Promise<boolean>} True if reset occurred
 */
CultivationSchema.statics.ensureWeeklyReset = async function (userId, now = new Date()) {
  const weekKey = getWeekKey(now);

  const result = await this.updateOne(
    { user: userId, lastWeeklyResetKey: { $ne: weekKey } },
    {
      $set: {
        lastWeeklyResetKey: weekKey,
        "weeklyProgress.posts": 0,
        "weeklyProgress.friends": 0,
        "weeklyProgress.events": 0,
        "weeklyProgress.lastReset": now,

        "weeklyQuests.$[].progress": 0,
        "weeklyQuests.$[].completed": false,
        "weeklyQuests.$[].claimed": false,
        "weeklyQuests.$[].completedAt": null,
        "weeklyQuests.$[].claimedAt": null,
      },
      $inc: { dataVersion: 1 },
    }
  );

  return result.modifiedCount > 0;
};

const Cultivation = mongoose.model("Cultivation", CultivationSchema);

export default Cultivation;