import mongoose from "mongoose";

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
    color: "#9CA3AF", // gray
    icon: "👤"
  },
  { 
    level: 2, 
    name: "Luyện Khí", 
    minExp: 100, 
    maxExp: 999,
    description: "Bắt đầu cảm nhận linh khí trời đất",
    color: "#10B981", // green
    icon: "🌱"
  },
  { 
    level: 3, 
    name: "Trúc Cơ", 
    minExp: 1000, 
    maxExp: 4999,
    description: "Xây dựng nền tảng tu luyện vững chắc",
    color: "#3B82F6", // blue
    icon: "🏛️"
  },
  { 
    level: 4, 
    name: "Kim Đan", 
    minExp: 5000, 
    maxExp: 14999,
    description: "Ngưng tụ Kim Đan trong đan điền",
    color: "#F59E0B", // amber
    icon: "🔮"
  },
  { 
    level: 5, 
    name: "Nguyên Anh", 
    minExp: 15000, 
    maxExp: 39999,
    description: "Nguyên Anh hình thành, thọ mệnh tăng mạnh",
    color: "#8B5CF6", // purple
    icon: "👶"
  },
  { 
    level: 6, 
    name: "Hóa Thần", 
    minExp: 40000, 
    maxExp: 99999,
    description: "Thần thức mạnh mẽ, có thể xuất khiếu",
    color: "#EC4899", // pink
    icon: "✨"
  },
  { 
    level: 7, 
    name: "Luyện Hư", 
    minExp: 100000, 
    maxExp: 249999,
    description: "Luyện hóa hư không, gần đạt đến đạo",
    color: "#14B8A6", // teal
    icon: "🌀"
  },
  { 
    level: 8, 
    name: "Đại Thừa", 
    minExp: 250000, 
    maxExp: 499999,
    description: "Đại đạo viên mãn, chuẩn bị độ kiếp",
    color: "#F97316", // orange
    icon: "🌟"
  },
  { 
    level: 9, 
    name: "Độ Kiếp", 
    minExp: 500000, 
    maxExp: 999999,
    description: "Đối mặt thiên kiếp, vượt qua sẽ thành tiên",
    color: "#EF4444", // red
    icon: "⚡"
  },
  { 
    level: 10, 
    name: "Tiên Nhân", 
    minExp: 1000000, 
    maxExp: Infinity,
    description: "Đạt đến cảnh giới bất tử, siêu thoát luân hồi",
    color: "#FFD700", // gold
    icon: "🏆"
  }
];

// ==================== NHIỆM VỤ MẪU ====================
export const QUEST_TEMPLATES = {
  daily: [
    { id: "daily_login", name: "Điểm danh tu luyện", description: "Đăng nhập hàng ngày", expReward: 20, spiritStoneReward: 10, type: "daily" },
    { id: "daily_post", name: "Chia sẻ ngộ đạo", description: "Đăng 1 bài viết", expReward: 30, spiritStoneReward: 15, type: "daily", requirement: { action: "post", count: 1 } },
    { id: "daily_comment", name: "Luận đạo cùng đạo hữu", description: "Bình luận 3 bài viết", expReward: 20, spiritStoneReward: 10, type: "daily", requirement: { action: "comment", count: 3 } },
    { id: "daily_like", name: "Kết thiện duyên", description: "Thích 5 bài viết", expReward: 15, spiritStoneReward: 5, type: "daily", requirement: { action: "like", count: 5 } }
  ],
  weekly: [
    { id: "weekly_posts", name: "Tinh cần tu luyện", description: "Đăng 7 bài viết trong tuần", expReward: 200, spiritStoneReward: 100, type: "weekly", requirement: { action: "post", count: 7 } },
    { id: "weekly_social", name: "Kết giao đạo hữu", description: "Kết bạn với 3 người", expReward: 150, spiritStoneReward: 80, type: "weekly", requirement: { action: "friend", count: 3 } },
    { id: "weekly_event", name: "Tham gia hội đạo", description: "Tham gia 1 sự kiện", expReward: 100, spiritStoneReward: 50, type: "weekly", requirement: { action: "event", count: 1 } }
  ],
  achievement: [
    { id: "first_post", name: "Bước đầu nhập đạo", description: "Đăng bài viết đầu tiên", expReward: 50, spiritStoneReward: 30, type: "achievement", requirement: { action: "post", count: 1 } },
    { id: "social_butterfly", name: "Nhân duyên quảng đại", description: "Có 10 bạn bè", expReward: 100, spiritStoneReward: 50, type: "achievement", requirement: { action: "friend", count: 10 } },
    { id: "popular_post", name: "Danh tiếng nổi khắp", description: "Có bài viết được 50 lượt thích", expReward: 200, spiritStoneReward: 100, type: "achievement", requirement: { action: "post_likes", count: 50 } },
    { id: "streak_7", name: "Kiên trì tu luyện", description: "Đăng nhập 7 ngày liên tục", expReward: 150, spiritStoneReward: 70, type: "achievement", requirement: { action: "login_streak", count: 7 } },
    { id: "streak_30", name: "Đạo tâm kiên định", description: "Đăng nhập 30 ngày liên tục", expReward: 500, spiritStoneReward: 250, type: "achievement", requirement: { action: "login_streak", count: 30 } },
    { id: "realm_jindan", name: "Kim Đan thành tựu", description: "Đạt cảnh giới Kim Đan", expReward: 0, spiritStoneReward: 500, type: "achievement", requirement: { action: "realm", count: 4 } },
    { id: "realm_yuanying", name: "Nguyên Anh xuất thế", description: "Đạt cảnh giới Nguyên Anh", expReward: 0, spiritStoneReward: 1000, type: "achievement", requirement: { action: "realm", count: 5 } }
  ]
};

// ==================== VẬT PHẨM ====================
export const ITEM_TYPES = {
  TITLE: "title",           // Danh hiệu
  BADGE: "badge",           // Huy hiệu
  AVATAR_FRAME: "avatar_frame", // Khung avatar
  PROFILE_EFFECT: "profile_effect", // Hiệu ứng profile
  EXP_BOOST: "exp_boost",   // Tăng exp
  CONSUMABLE: "consumable", // Vật phẩm tiêu hao
  PET: "pet",               // Linh thú
  MOUNT: "mount"            // Linh thú cưỡi
};

export const SHOP_ITEMS = [
  // ==================== DANH HIỆU (TITLE) ====================
  { id: "title_swordsman", name: "Kiếm Khách", type: ITEM_TYPES.TITLE, price: 100, description: "Danh hiệu cho người yêu kiếm thuật", icon: "⚔️", rarity: "common" },
  { id: "title_scholar", name: "Thư Sinh", type: ITEM_TYPES.TITLE, price: 100, description: "Danh hiệu cho người ham học", icon: "📚", rarity: "common" },
  { id: "title_hermit", name: "Ẩn Sĩ", type: ITEM_TYPES.TITLE, price: 200, description: "Danh hiệu cho người thích ẩn dật", icon: "🏔️", rarity: "uncommon" },
  { id: "title_sage", name: "Hiền Giả", type: ITEM_TYPES.TITLE, price: 500, description: "Danh hiệu cao quý của bậc hiền triết", icon: "🧙", rarity: "rare" },
  { id: "title_demon_slayer", name: "Diệt Ma Giả", type: ITEM_TYPES.TITLE, price: 300, description: "Danh hiệu người diệt trừ yêu ma", icon: "👹", rarity: "uncommon" },
  { id: "title_alchemist", name: "Luyện Đan Sư", type: ITEM_TYPES.TITLE, price: 400, description: "Danh hiệu bậc thầy luyện đan", icon: "⚗️", rarity: "rare" },
  { id: "title_immortal", name: "Tiên Nhân", type: ITEM_TYPES.TITLE, price: 1000, description: "Danh hiệu tối cao - Tiên Nhân", icon: "✨", rarity: "legendary" },
  { id: "title_dragon_rider", name: "Long Kỵ Sĩ", type: ITEM_TYPES.TITLE, price: 800, description: "Danh hiệu người cưỡi rồng", icon: "🐲", rarity: "epic" },
  { id: "title_night_walker", name: "Dạ Du Thần", type: ITEM_TYPES.TITLE, price: 350, description: "Danh hiệu kẻ lang thang trong đêm", icon: "🌙", rarity: "uncommon" },
  { id: "title_phoenix", name: "Phượng Hoàng Sứ Giả", type: ITEM_TYPES.TITLE, price: 1200, description: "Danh hiệu huyền thoại - Phượng Hoàng", icon: "🔥", rarity: "legendary" },

  // ==================== HUY HIỆU (BADGE) ====================
  { id: "badge_fire", name: "Hỏa Diễm Huy Hiệu", type: ITEM_TYPES.BADGE, price: 150, description: "Huy hiệu lửa rực cháy", icon: "🔥", rarity: "common" },
  { id: "badge_ice", name: "Băng Tuyết Huy Hiệu", type: ITEM_TYPES.BADGE, price: 150, description: "Huy hiệu băng lạnh", icon: "❄️", rarity: "common" },
  { id: "badge_thunder", name: "Lôi Điện Huy Hiệu", type: ITEM_TYPES.BADGE, price: 150, description: "Huy hiệu sấm sét", icon: "⚡", rarity: "common" },
  { id: "badge_wind", name: "Cuồng Phong Huy Hiệu", type: ITEM_TYPES.BADGE, price: 150, description: "Huy hiệu gió cuồng", icon: "🌪️", rarity: "common" },
  { id: "badge_earth", name: "Đại Địa Huy Hiệu", type: ITEM_TYPES.BADGE, price: 150, description: "Huy hiệu đất đai vững chắc", icon: "🌍", rarity: "common" },
  { id: "badge_water", name: "Thủy Nguyên Huy Hiệu", type: ITEM_TYPES.BADGE, price: 150, description: "Huy hiệu nước trong veo", icon: "💧", rarity: "common" },
  { id: "badge_yin_yang", name: "Âm Dương Huy Hiệu", type: ITEM_TYPES.BADGE, price: 400, description: "Huy hiệu cân bằng âm dương", icon: "☯️", rarity: "rare" },
  { id: "badge_dragon", name: "Long Văn Huy Hiệu", type: ITEM_TYPES.BADGE, price: 600, description: "Huy hiệu rồng thiêng", icon: "🐉", rarity: "epic" },
  { id: "badge_star", name: "Tinh Thần Huy Hiệu", type: ITEM_TYPES.BADGE, price: 250, description: "Huy hiệu ngôi sao lấp lánh", icon: "⭐", rarity: "uncommon" },
  { id: "badge_moon", name: "Nguyệt Quang Huy Hiệu", type: ITEM_TYPES.BADGE, price: 300, description: "Huy hiệu ánh trăng huyền bí", icon: "🌙", rarity: "uncommon" },
  { id: "badge_sun", name: "Thái Dương Huy Hiệu", type: ITEM_TYPES.BADGE, price: 350, description: "Huy hiệu mặt trời rực rỡ", icon: "☀️", rarity: "rare" },
  { id: "badge_chaos", name: "Hỗn Độn Huy Hiệu", type: ITEM_TYPES.BADGE, price: 1000, description: "Huy hiệu hỗn độn nguyên thủy", icon: "🌀", rarity: "legendary" },

  // ==================== KHUNG AVATAR (AVATAR_FRAME) ====================
  { id: "frame_gold", name: "Kim Sắc Khung", type: ITEM_TYPES.AVATAR_FRAME, price: 300, description: "Khung avatar màu vàng kim quý phái", color: "#FFD700", icon: "🟡", rarity: "rare" },
  { id: "frame_purple", name: "Tử Sắc Khung", type: ITEM_TYPES.AVATAR_FRAME, price: 300, description: "Khung avatar màu tím huyền bí", color: "#8B5CF6", icon: "🟣", rarity: "rare" },
  { id: "frame_jade", name: "Ngọc Bích Khung", type: ITEM_TYPES.AVATAR_FRAME, price: 350, description: "Khung avatar ngọc bích thanh thoát", color: "#10B981", icon: "💚", rarity: "rare" },
  { id: "frame_ruby", name: "Hồng Ngọc Khung", type: ITEM_TYPES.AVATAR_FRAME, price: 350, description: "Khung avatar hồng ngọc rực rỡ", color: "#EF4444", icon: "❤️", rarity: "rare" },
  { id: "frame_sapphire", name: "Thanh Ngọc Khung", type: ITEM_TYPES.AVATAR_FRAME, price: 350, description: "Khung avatar thanh ngọc trong sáng", color: "#3B82F6", icon: "💙", rarity: "rare" },
  { id: "frame_rainbow", name: "Thất Sắc Khung", type: ITEM_TYPES.AVATAR_FRAME, price: 800, description: "Khung avatar 7 màu lung linh", color: "rainbow", icon: "🌈", rarity: "epic" },
  { id: "frame_flames", name: "Hỏa Viêm Khung", type: ITEM_TYPES.AVATAR_FRAME, price: 500, description: "Khung avatar với ngọn lửa bập bùng", color: "#F97316", icon: "🔥", rarity: "epic", animated: true },
  { id: "frame_ice", name: "Băng Tinh Khung", type: ITEM_TYPES.AVATAR_FRAME, price: 500, description: "Khung avatar với tinh thể băng giá", color: "#06B6D4", icon: "❄️", rarity: "epic", animated: true },
  { id: "frame_celestial", name: "Thiên Giới Khung", type: ITEM_TYPES.AVATAR_FRAME, price: 1500, description: "Khung avatar huyền thoại từ thiên giới", color: "#FBBF24", icon: "✨", rarity: "legendary", animated: true },

  // ==================== HIỆU ỨNG PROFILE (PROFILE_EFFECT) ====================
  { id: "effect_sparkle", name: "Tinh Quang Hiệu Ứng", type: ITEM_TYPES.PROFILE_EFFECT, price: 400, description: "Hiệu ứng lấp lánh trên profile", icon: "✨", rarity: "rare" },
  { id: "effect_flames", name: "Hỏa Diễm Hiệu Ứng", type: ITEM_TYPES.PROFILE_EFFECT, price: 500, description: "Hiệu ứng ngọn lửa trên profile", icon: "🔥", rarity: "epic" },
  { id: "effect_snow", name: "Tuyết Hoa Hiệu Ứng", type: ITEM_TYPES.PROFILE_EFFECT, price: 400, description: "Hiệu ứng tuyết rơi trên profile", icon: "❄️", rarity: "rare" },
  { id: "effect_petals", name: "Hoa Vũ Hiệu Ứng", type: ITEM_TYPES.PROFILE_EFFECT, price: 350, description: "Hiệu ứng cánh hoa bay trên profile", icon: "🌸", rarity: "rare" },
  { id: "effect_lightning", name: "Lôi Điện Hiệu Ứng", type: ITEM_TYPES.PROFILE_EFFECT, price: 600, description: "Hiệu ứng sấm chớp trên profile", icon: "⚡", rarity: "epic" },
  { id: "effect_aura", name: "Linh Khí Hiệu Ứng", type: ITEM_TYPES.PROFILE_EFFECT, price: 800, description: "Hiệu ứng linh khí tỏa sáng", icon: "💫", rarity: "epic" },
  { id: "effect_galaxy", name: "Tinh Hà Hiệu Ứng", type: ITEM_TYPES.PROFILE_EFFECT, price: 1200, description: "Hiệu ứng ngân hà huyền bí", icon: "🌌", rarity: "legendary" },

  // ==================== ĐAN DƯỢC (EXP_BOOST) ====================
  { id: "exp_boost_2x", name: "Tu Luyện Đan (2x)", type: ITEM_TYPES.EXP_BOOST, price: 200, description: "Tăng gấp đôi exp trong 24h", duration: 24, multiplier: 2, icon: "💊", rarity: "uncommon" },
  { id: "exp_boost_3x", name: "Thiên Tài Đan (3x)", type: ITEM_TYPES.EXP_BOOST, price: 500, description: "Tăng gấp 3 exp trong 24h", duration: 24, multiplier: 3, icon: "💎", rarity: "rare" },
  { id: "exp_boost_5x", name: "Thần Đan (5x)", type: ITEM_TYPES.EXP_BOOST, price: 1000, description: "Tăng gấp 5 exp trong 12h", duration: 12, multiplier: 5, icon: "🌟", rarity: "epic" },
  { id: "exp_boost_mini", name: "Tiểu Hoàn Đan", type: ITEM_TYPES.EXP_BOOST, price: 50, description: "Tăng 50% exp trong 6h", duration: 6, multiplier: 1.5, icon: "🔮", rarity: "common" },

  // ==================== VẬT PHẨM TIÊU HAO (CONSUMABLE) ====================
  { id: "spirit_stone_pack_small", name: "Tiểu Linh Thạch Túi", type: ITEM_TYPES.CONSUMABLE, price: 0, description: "Nhận 50 linh thạch (chỉ mua bằng điểm)", spiritStoneReward: 50, icon: "💰", rarity: "common" },
  { id: "lucky_charm", name: "Phúc Lộc Bùa", type: ITEM_TYPES.CONSUMABLE, price: 100, description: "Tăng 20% linh thạch nhận được trong 24h", duration: 24, spiritStoneBonus: 0.2, icon: "🍀", rarity: "uncommon" },
  { id: "meditation_incense", name: "Thiền Định Hương", type: ITEM_TYPES.CONSUMABLE, price: 80, description: "Nhận ngay 100 exp", expReward: 100, icon: "🕯️", rarity: "common" },
  { id: "cultivation_manual", name: "Tu Luyện Bí Kíp", type: ITEM_TYPES.CONSUMABLE, price: 150, description: "Nhận ngay 300 exp", expReward: 300, icon: "📜", rarity: "uncommon" },
  { id: "heavenly_scripture", name: "Thiên Thư", type: ITEM_TYPES.CONSUMABLE, price: 500, description: "Nhận ngay 1000 exp", expReward: 1000, icon: "📖", rarity: "rare" },
  { id: "quest_refresh", name: "Nhiệm Vụ Lệnh", type: ITEM_TYPES.CONSUMABLE, price: 150, description: "Làm mới nhiệm vụ hàng ngày", icon: "🔄", rarity: "uncommon" },
  { id: "streak_protector", name: "Hộ Mệnh Phù", type: ITEM_TYPES.CONSUMABLE, price: 300, description: "Bảo vệ streak đăng nhập 1 lần", icon: "🛡️", rarity: "rare" },

  // ==================== LINH THÚ (PET) ====================
  { id: "pet_fox", name: "Cửu Vĩ Hồ", type: ITEM_TYPES.PET, price: 800, description: "Linh thú hồ ly 9 đuôi, tăng 5% exp", expBonus: 0.05, icon: "🦊", rarity: "epic" },
  { id: "pet_dragon_baby", name: "Tiểu Long", type: ITEM_TYPES.PET, price: 1500, description: "Rồng con đáng yêu, tăng 10% exp", expBonus: 0.1, icon: "🐉", rarity: "legendary" },
  { id: "pet_phoenix_baby", name: "Tiểu Phượng", type: ITEM_TYPES.PET, price: 1500, description: "Phượng hoàng con, tăng 10% linh thạch", spiritStoneBonus: 0.1, icon: "🐦", rarity: "legendary" },
  { id: "pet_turtle", name: "Huyền Vũ Quy", type: ITEM_TYPES.PET, price: 600, description: "Rùa thần, bảo vệ streak đăng nhập", icon: "🐢", rarity: "rare" },
  { id: "pet_crane", name: "Tiên Hạc", type: ITEM_TYPES.PET, price: 700, description: "Hạc tiên, tăng 8% exp nhiệm vụ", questExpBonus: 0.08, icon: "🦢", rarity: "epic" },
  { id: "pet_cat", name: "Chiêu Tài Miêu", type: ITEM_TYPES.PET, price: 400, description: "Mèo may mắn, tăng 5% linh thạch", spiritStoneBonus: 0.05, icon: "🐱", rarity: "rare" },
  { id: "pet_rabbit", name: "Ngọc Thố", type: ITEM_TYPES.PET, price: 350, description: "Thỏ ngọc từ cung trăng", icon: "🐰", rarity: "rare" },

  // ==================== LINH THÚ CƯỠI (MOUNT) ====================
  { id: "mount_cloud", name: "Thần Vân", type: ITEM_TYPES.MOUNT, price: 1000, description: "Đám mây thần kỳ để di chuyển", icon: "☁️", rarity: "epic" },
  { id: "mount_sword", name: "Ngự Kiếm", type: ITEM_TYPES.MOUNT, price: 1200, description: "Phi kiếm hành không", icon: "🗡️", rarity: "epic" },
  { id: "mount_lotus", name: "Liên Hoa Đài", type: ITEM_TYPES.MOUNT, price: 800, description: "Đài sen thần tiên", icon: "🪷", rarity: "rare" },
  { id: "mount_tiger", name: "Bạch Hổ", type: ITEM_TYPES.MOUNT, price: 1500, description: "Bạch hổ thần thú", icon: "🐅", rarity: "legendary" },
  { id: "mount_dragon", name: "Thanh Long", type: ITEM_TYPES.MOUNT, price: 2000, description: "Thanh long uy nghiêm", icon: "🐲", rarity: "legendary" },
  { id: "mount_phoenix", name: "Chu Tước", type: ITEM_TYPES.MOUNT, price: 2000, description: "Chu tước lửa thiêng", icon: "🔥", rarity: "legendary" }
];

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
  type: { type: String, enum: Object.values(ITEM_TYPES), required: true },
  quantity: { type: Number, default: 1 },
  equipped: { type: Boolean, default: false },
  acquiredAt: { type: Date, default: Date.now },
  expiresAt: { type: Date }, // Cho các item có thời hạn như exp boost
  metadata: { type: mongoose.Schema.Types.Mixed } // Thông tin thêm
}, { _id: false });

// ==================== EXP LOG SCHEMA ====================
const ExpLogSchema = new mongoose.Schema({
  amount: { type: Number, required: true },
  source: { type: String, required: true }, // post, comment, like, daily_login, quest, etc.
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
  exp: { type: Number, default: 0, min: 0 }, // Tổng tu vi (experience)
  realmLevel: { type: Number, default: 1, min: 1, max: 10 }, // Cảnh giới hiện tại (1-10)
  realmName: { type: String, default: "Phàm Nhân" }, // Tên cảnh giới
  subLevel: { type: Number, default: 1, min: 1, max: 10 }, // Tiểu cấp trong cảnh giới (sơ/trung/hậu kỳ)

  // ==================== LINH THẠCH ====================
  spiritStones: { type: Number, default: 0, min: 0 }, // Tiền tệ trong game
  totalSpiritStonesEarned: { type: Number, default: 0 }, // Tổng linh thạch đã kiếm được

  // ==================== STREAK ĐĂNG NHẬP ====================
  loginStreak: { type: Number, default: 0 }, // Số ngày đăng nhập liên tục
  lastLoginDate: { type: Date }, // Ngày đăng nhập cuối
  longestStreak: { type: Number, default: 0 }, // Streak dài nhất

  // ==================== NHIỆM VỤ ====================
  dailyQuests: [QuestProgressSchema], // Nhiệm vụ hàng ngày
  weeklyQuests: [QuestProgressSchema], // Nhiệm vụ hàng tuần
  achievements: [QuestProgressSchema], // Thành tựu

  // ==================== DAILY PROGRESS TRACKING ====================
  dailyProgress: {
    posts: { type: Number, default: 0 },
    comments: { type: Number, default: 0 },
    likes: { type: Number, default: 0 },
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
  inventory: [InventoryItemSchema], // Các vật phẩm sở hữu

  // ==================== TRANG BỊ ĐANG DÙNG ====================
  equipped: {
    title: { type: String, default: null }, // Danh hiệu đang dùng
    badge: { type: String, default: null }, // Huy hiệu đang dùng
    avatarFrame: { type: String, default: null } // Khung avatar
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
    select: false // Không trả về mặc định để tránh query nặng
  },

  // ==================== THỐNG KÊ ====================
  stats: {
    totalPostsCreated: { type: Number, default: 0 },
    totalCommentsCreated: { type: Number, default: 0 },
    totalLikesGiven: { type: Number, default: 0 },
    totalLikesReceived: { type: Number, default: 0 },
    totalQuestsCompleted: { type: Number, default: 0 },
    totalDaysActive: { type: Number, default: 0 }
  }
}, {
  timestamps: true
});

// ==================== INDEXES ====================
CultivationSchema.index({ exp: -1 }); // Cho leaderboard
CultivationSchema.index({ realmLevel: -1, exp: -1 });
CultivationSchema.index({ spiritStones: -1 });
CultivationSchema.index({ loginStreak: -1 });

// ==================== INSTANCE METHODS ====================

/**
 * Lấy thông tin cảnh giới từ exp
 */
CultivationSchema.methods.getRealmFromExp = function() {
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
CultivationSchema.methods.getExpToNextRealm = function() {
  const currentRealm = this.getRealmFromExp();
  if (currentRealm.level >= 10) return 0; // Đã max
  return currentRealm.maxExp - this.exp + 1;
};

/**
 * Tính phần trăm tiến độ cảnh giới hiện tại
 */
CultivationSchema.methods.getRealmProgress = function() {
  const realm = this.getRealmFromExp();
  if (realm.level >= 10) return 100;
  const progressInRealm = this.exp - realm.minExp;
  const realmRange = realm.maxExp - realm.minExp + 1;
  return Math.min(100, Math.floor((progressInRealm / realmRange) * 100));
};

/**
 * Cộng exp và cập nhật cảnh giới
 * @param {number} amount - Số exp cần cộng
 * @param {string} source - Nguồn exp
 * @param {string} description - Mô tả
 */
CultivationSchema.methods.addExp = function(amount, source, description = "") {
  // Tính multiplier từ active boosts
  let multiplier = 1;
  const now = new Date();
  this.activeBoosts = this.activeBoosts.filter(boost => boost.expiresAt > now);
  for (const boost of this.activeBoosts) {
    if (boost.type === 'exp_boost') {
      multiplier = Math.max(multiplier, boost.multiplier);
    }
  }

  const finalAmount = Math.floor(amount * multiplier);
  this.exp += finalAmount;

  // Cập nhật cảnh giới
  const newRealm = this.getRealmFromExp();
  const oldRealmLevel = this.realmLevel;
  this.realmLevel = newRealm.level;
  this.realmName = newRealm.name;

  // Tính sub-level (1-10 trong mỗi cảnh giới)
  const progressPercent = this.getRealmProgress();
  this.subLevel = Math.max(1, Math.ceil(progressPercent / 10));

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
    leveledUp: newRealm.level > oldRealmLevel,
    newRealm: newRealm.level > oldRealmLevel ? newRealm : null
  };
};

/**
 * Cộng linh thạch
 */
CultivationSchema.methods.addSpiritStones = function(amount, source) {
  this.spiritStones += amount;
  this.totalSpiritStonesEarned += amount;
  return this.spiritStones;
};

/**
 * Trừ linh thạch (mua đồ)
 */
CultivationSchema.methods.spendSpiritStones = function(amount) {
  if (this.spiritStones < amount) {
    throw new Error("Không đủ linh thạch");
  }
  this.spiritStones -= amount;
  return this.spiritStones;
};

/**
 * Xử lý đăng nhập hàng ngày
 */
CultivationSchema.methods.processLogin = function() {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  if (this.lastLoginDate) {
    const lastLogin = new Date(this.lastLoginDate);
    const lastLoginDay = new Date(lastLogin.getFullYear(), lastLogin.getMonth(), lastLogin.getDate());
    
    const diffDays = Math.floor((today - lastLoginDay) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      // Đã đăng nhập hôm nay rồi
      return { alreadyLoggedIn: true, streak: this.loginStreak };
    } else if (diffDays === 1) {
      // Đăng nhập liên tục
      this.loginStreak += 1;
    } else {
      // Mất streak
      this.loginStreak = 1;
    }
  } else {
    this.loginStreak = 1;
  }

  this.lastLoginDate = now;
  this.longestStreak = Math.max(this.longestStreak, this.loginStreak);
  this.stats.totalDaysActive += 1;

  // Phần thưởng đăng nhập
  const baseExp = 20;
  const streakBonus = Math.min(this.loginStreak * 5, 50); // Max +50 exp cho streak
  const baseStones = 10;
  const streakStoneBonus = Math.min(this.loginStreak * 2, 20);

  const expResult = this.addExp(baseExp + streakBonus, "daily_login", `Điểm danh ngày ${this.loginStreak}`);
  this.addSpiritStones(baseStones + streakStoneBonus, "daily_login");

  return {
    alreadyLoggedIn: false,
    streak: this.loginStreak,
    expEarned: expResult.addedExp,
    stonesEarned: baseStones + streakStoneBonus,
    leveledUp: expResult.leveledUp,
    newRealm: expResult.newRealm
  };
};

/**
 * Reset nhiệm vụ hàng ngày
 */
CultivationSchema.methods.resetDailyQuests = function() {
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
CultivationSchema.methods.resetWeeklyQuests = function() {
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
 * Cập nhật tiến độ nhiệm vụ
 */
CultivationSchema.methods.updateQuestProgress = function(action, count = 1) {
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
    case 'friend':
      this.weeklyProgress.friends += count;
      break;
    case 'event':
      this.weeklyProgress.events += count;
      break;
  }

  return results;
};

/**
 * Claim phần thưởng nhiệm vụ
 */
CultivationSchema.methods.claimQuestReward = function(questId) {
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
 */
CultivationSchema.methods.buyItem = function(itemId) {
  const item = SHOP_ITEMS.find(i => i.id === itemId);
  if (!item) {
    throw new Error("Vật phẩm không tồn tại");
  }

  // Kiểm tra đã có chưa (trừ consumable items)
  if (item.type !== ITEM_TYPES.EXP_BOOST) {
    const existing = this.inventory.find(i => i.itemId === itemId);
    if (existing) {
      throw new Error("Bạn đã sở hữu vật phẩm này");
    }
  }

  // Trừ linh thạch
  this.spendSpiritStones(item.price);

  // Thêm vào inventory
  const inventoryItem = {
    itemId: item.id,
    name: item.name,
    type: item.type,
    quantity: 1,
    equipped: false,
    acquiredAt: new Date(),
    metadata: { ...item }
  };

  // Xử lý item có thời hạn
  if (item.type === ITEM_TYPES.EXP_BOOST) {
    inventoryItem.expiresAt = new Date(Date.now() + item.duration * 60 * 60 * 1000);
    // Kích hoạt boost ngay
    this.activeBoosts.push({
      type: 'exp_boost',
      multiplier: item.multiplier,
      expiresAt: inventoryItem.expiresAt
    });
  }

  this.inventory.push(inventoryItem);

  return inventoryItem;
};

/**
 * Trang bị vật phẩm
 */
CultivationSchema.methods.equipItem = function(itemId) {
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
  }

  return item;
};

/**
 * Bỏ trang bị vật phẩm
 */
CultivationSchema.methods.unequipItem = function(itemId) {
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
  }

  return item;
};

// ==================== STATIC METHODS ====================

/**
 * Lấy hoặc tạo cultivation cho user
 */
CultivationSchema.statics.getOrCreate = async function(userId) {
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

  if (needsSave) {
    await cultivation.save();
  } else {
    // Nếu không save, vẫn sync cultivationCache để đảm bảo data đồng bộ
    try {
      const User = mongoose.model('User');
      await User.findByIdAndUpdate(userId, {
        $set: {
          'cultivationCache.realmLevel': cultivation.realmLevel,
          'cultivationCache.realmName': cultivation.realmName,
          'cultivationCache.exp': cultivation.exp
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
CultivationSchema.statics.getLeaderboard = async function(type = 'exp', limit = 50) {
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
 * Sync cultivation cache to User after save
 */
CultivationSchema.post('save', async function(doc) {
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
          avatarFrame: doc.equipped?.avatarFrame || null
        }
      }
    });
  } catch (error) {
    console.error('[CULTIVATION] Error syncing cultivation cache to user:', error);
  }
});

const Cultivation = mongoose.model("Cultivation", CultivationSchema);

export default Cultivation;
