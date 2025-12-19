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
    color: "#9a6b1aff",
  },
  {
    level: 5,
    name: "Nguyên Anh",
    minExp: 15000,
    maxExp: 39999,
    description: "Nguyên Anh hình thành, thọ mệnh tăng mạnh",
    color: "#8B5CF6",
  },
  {
    level: 6,
    name: "Hóa Thần",
    minExp: 40000,
    maxExp: 99999,
    description: "Thần thức mạnh mẽ, có thể xuất khiếu",
    color: "#EC4899",
  },
  {
    level: 7,
    name: "Luyện Hư",
    minExp: 100000,
    maxExp: 249999,
    description: "Luyện hóa hư không, gần đạt đến đạo",
    color: "#14B8A6",
  },
  {
    level: 8,
    name: "Đại Thừa",
    minExp: 250000,
    maxExp: 499999,
    description: "Đại đạo viên mãn, chuẩn bị độ kiếp",
    color: "#F97316",
  },
  {
    level: 9,
    name: "Độ Kiếp",
    minExp: 500000,
    maxExp: 999999,
    description: "Đối mặt thiên kiếp, vượt qua sẽ thành tiên",
    color: "#EF4444",
  },
  {
    level: 10,
    name: "Tiên Nhân",
    minExp: 1000000,
    maxExp: 4999999,
    description: "Đạt đến cảnh giới bất tử, siêu thoát luân hồi",
    color: "#FFD700",
  },
  {
    level: 11,
    name: "Thiên Đế",
    minExp: 5000000,
    maxExp: Infinity,
    description: "Cảnh giới tối cao, thống trị thiên địa, vạn vật quy phục",
    color: "#FF00FF", // magenta
  }
];

// ==================== NHIỆM VỤ MẪU ====================
export const QUEST_TEMPLATES = {
  daily: [
    // === NHIỆM VỤ XÃ HỘI ===
    { id: "daily_login", name: "Điểm danh tu luyện", description: "Đăng nhập hàng ngày", expReward: 20, spiritStoneReward: 10, type: "daily" },
    { id: "daily_post", name: "Chia sẻ ngộ đạo", description: "Đăng 1 bài viết", expReward: 30, spiritStoneReward: 15, type: "daily", requirement: { action: "post", count: 1 } },
    { id: "daily_comment", name: "Luận đạo cùng đạo hữu", description: "Bình luận 3 bài viết", expReward: 20, spiritStoneReward: 10, type: "daily", requirement: { action: "comment", count: 3 } },
    { id: "daily_like", name: "Kết thiện duyên", description: "Thích 5 bài viết", expReward: 15, spiritStoneReward: 5, type: "daily", requirement: { action: "like", count: 5 } },
    
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
  BREAKTHROUGH_BOOST: "breakthrough_boost", // Tăng tỷ lệ độ kiếp
  CONSUMABLE: "consumable", // Vật phẩm tiêu hao
  PET: "pet",               // Linh thú
  MOUNT: "mount",           // Linh thú cưỡi
  TECHNIQUE: "technique"    // Công pháp
};

export const SHOP_ITEMS = [
  // ==================== DANH HIỆU (TITLE) ====================
  { id: "title_swordsman", name: "Kiếm Khách", type: ITEM_TYPES.TITLE, price: 100, description: "Danh hiệu cho người yêu kiếm thuật", rarity: "common" },
  { id: "title_scholar", name: "Thư Sinh", type: ITEM_TYPES.TITLE, price: 100, description: "Danh hiệu cho người ham học", rarity: "common" },
  { id: "title_hermit", name: "Ẩn Sĩ", type: ITEM_TYPES.TITLE, price: 200, description: "Danh hiệu cho người thích ẩn dật", rarity: "uncommon" },
  { id: "title_sage", name: "Hiền Giả", type: ITEM_TYPES.TITLE, price: 500, description: "Danh hiệu cao quý của bậc hiền triết", rarity: "rare" },
  { id: "title_demon_slayer", name: "Diệt Ma Giả", type: ITEM_TYPES.TITLE, price: 300, description: "Danh hiệu người diệt trừ yêu ma", rarity: "uncommon" },
  { id: "title_alchemist", name: "Luyện Đan Sư", type: ITEM_TYPES.TITLE, price: 400, description: "Danh hiệu bậc thầy luyện đan", rarity: "rare" },
  { id: "title_immortal", name: "Tiên Nhân", type: ITEM_TYPES.TITLE, price: 1000, description: "Danh hiệu tối cao - Tiên Nhân", rarity: "legendary" },
  { id: "title_dragon_rider", name: "Long Kỵ Sĩ", type: ITEM_TYPES.TITLE, price: 800, description: "Danh hiệu người cưỡi rồng", rarity: "epic" },
  { id: "title_night_walker", name: "Dạ Du Thần", type: ITEM_TYPES.TITLE, price: 350, description: "Danh hiệu kẻ lang thang trong đêm", rarity: "uncommon" },
  { id: "title_phoenix", name: "Phượng Hoàng Sứ Giả", type: ITEM_TYPES.TITLE, price: 1200, description: "Danh hiệu huyền thoại - Phượng Hoàng", rarity: "legendary" },

  // ==================== HUY HIỆU (BADGE) ====================
  { id: "badge_fire", name: "Hỏa Diễm Huy Hiệu", type: ITEM_TYPES.BADGE, price: 150, description: "Huy hiệu lửa rực cháy", rarity: "common" },
  { id: "badge_ice", name: "Băng Tuyết Huy Hiệu", type: ITEM_TYPES.BADGE, price: 150, description: "Huy hiệu băng lạnh", rarity: "common" },
  { id: "badge_thunder", name: "Lôi Điện Huy Hiệu", type: ITEM_TYPES.BADGE, price: 150, description: "Huy hiệu sấm sét", rarity: "common" },
  { id: "badge_wind", name: "Cuồng Phong Huy Hiệu", type: ITEM_TYPES.BADGE, price: 150, description: "Huy hiệu gió cuồng", rarity: "common" },
  { id: "badge_earth", name: "Đại Địa Huy Hiệu", type: ITEM_TYPES.BADGE, price: 150, description: "Huy hiệu đất đai vững chắc", rarity: "common" },
  { id: "badge_water", name: "Thủy Nguyên Huy Hiệu", type: ITEM_TYPES.BADGE, price: 150, description: "Huy hiệu nước trong veo", rarity: "common" },
  { id: "badge_yin_yang", name: "Âm Dương Huy Hiệu", type: ITEM_TYPES.BADGE, price: 400, description: "Huy hiệu cân bằng âm dương", rarity: "rare" },
  { id: "badge_dragon", name: "Long Văn Huy Hiệu", type: ITEM_TYPES.BADGE, price: 600, description: "Huy hiệu rồng thiêng", rarity: "epic" },
  { id: "badge_star", name: "Tinh Thần Huy Hiệu", type: ITEM_TYPES.BADGE, price: 250, description: "Huy hiệu ngôi sao lấp lánh", rarity: "uncommon" },
  { id: "badge_moon", name: "Nguyệt Quang Huy Hiệu", type: ITEM_TYPES.BADGE, price: 300, description: "Huy hiệu ánh trăng huyền bí", rarity: "uncommon" },
  { id: "badge_sun", name: "Thái Dương Huy Hiệu", type: ITEM_TYPES.BADGE, price: 350, description: "Huy hiệu mặt trời rực rỡ", rarity: "rare" },
  { id: "badge_chaos", name: "Hỗn Độn Huy Hiệu", type: ITEM_TYPES.BADGE, price: 1000, description: "Huy hiệu hỗn độn nguyên thủy", rarity: "legendary" },

  // ==================== KHUNG AVATAR (AVATAR_FRAME) ====================
  { id: "frame_gold", name: "Kim Sắc Khung", type: ITEM_TYPES.AVATAR_FRAME, price: 300, description: "Khung avatar màu vàng kim quý phái", color: "#FFD700", rarity: "rare" },
  { id: "frame_purple", name: "Tử Sắc Khung", type: ITEM_TYPES.AVATAR_FRAME, price: 300, description: "Khung avatar màu tím huyền bí", color: "#8B5CF6", rarity: "rare" },
  { id: "frame_jade", name: "Ngọc Bích Khung", type: ITEM_TYPES.AVATAR_FRAME, price: 350, description: "Khung avatar ngọc bích thanh thoát", color: "#10B981", rarity: "rare" },
  { id: "frame_ruby", name: "Hồng Ngọc Khung", type: ITEM_TYPES.AVATAR_FRAME, price: 350, description: "Khung avatar hồng ngọc rực rỡ", color: "#EF4444", rarity: "rare" },
  { id: "frame_sapphire", name: "Thanh Ngọc Khung", type: ITEM_TYPES.AVATAR_FRAME, price: 350, description: "Khung avatar thanh ngọc trong sáng", color: "#3B82F6", rarity: "rare" },
  { id: "frame_rainbow", name: "Thất Sắc Khung", type: ITEM_TYPES.AVATAR_FRAME, price: 800, description: "Khung avatar 7 màu lung linh", color: "rainbow", rarity: "epic" },
  { id: "frame_flames", name: "Hỏa Viêm Khung", type: ITEM_TYPES.AVATAR_FRAME, price: 500, description: "Khung avatar với ngọn lửa bập bùng", color: "#F97316", rarity: "epic", animated: true },
  { id: "frame_ice", name: "Băng Tinh Khung", type: ITEM_TYPES.AVATAR_FRAME, price: 500, description: "Khung avatar với tinh thể băng giá", color: "#06B6D4", rarity: "epic", animated: true },
  { id: "frame_celestial", name: "Thiên Giới Khung", type: ITEM_TYPES.AVATAR_FRAME, price: 1500, description: "Khung avatar huyền thoại từ thiên giới", color: "#FBBF24", rarity: "legendary", animated: true },

  // ==================== HIỆU ỨNG PROFILE (PROFILE_EFFECT) ====================
  { id: "effect_sparkle", name: "Tinh Quang Hiệu Ứng", type: ITEM_TYPES.PROFILE_EFFECT, price: 400, description: "Hiệu ứng lấp lánh trên profile", rarity: "rare" },
  { id: "effect_aurora", name: "Cực Quang Hiệu Ứng", type: ITEM_TYPES.PROFILE_EFFECT, price: 500, description: "Hiệu ứng cực quang huyền ảo trên profile", rarity: "epic" },
  { id: "effect_snow", name: "Tuyết Hoa Hiệu Ứng", type: ITEM_TYPES.PROFILE_EFFECT, price: 400, description: "Hiệu ứng tuyết rơi trên profile", rarity: "rare" },
  { id: "effect_petals", name: "Hoa Vũ Hiệu Ứng", type: ITEM_TYPES.PROFILE_EFFECT, price: 350, description: "Hiệu ứng cánh hoa bay trên profile", rarity: "rare" },
  { id: "effect_lightning", name: "Lôi Điện Hiệu Ứng", type: ITEM_TYPES.PROFILE_EFFECT, price: 600, description: "Hiệu ứng sấm chớp trên profile", rarity: "epic" },
  { id: "effect_aura", name: "Linh Khí Hiệu Ứng", type: ITEM_TYPES.PROFILE_EFFECT, price: 800, description: "Hiệu ứng linh khí tỏa sáng", rarity: "epic" },
  { id: "effect_galaxy", name: "Tinh Hà Hiệu Ứng", type: ITEM_TYPES.PROFILE_EFFECT, price: 1200, description: "Hiệu ứng ngân hà huyền bí", rarity: "legendary" },

  // ==================== ĐAN DƯỢC (EXP_BOOST) ====================
  { id: "exp_boost_2x", name: "Tu Luyện Đan (2x)", type: ITEM_TYPES.EXP_BOOST, price: 200, description: "Tăng gấp đôi exp trong 24h", duration: 24, multiplier: 2, rarity: "uncommon" },
  { id: "exp_boost_3x", name: "Thiên Tài Đan (3x)", type: ITEM_TYPES.EXP_BOOST, price: 500, description: "Tăng gấp 3 exp trong 24h", duration: 24, multiplier: 3, rarity: "rare" },
  { id: "exp_boost_5x", name: "Thần Đan (5x)", type: ITEM_TYPES.EXP_BOOST, price: 1000, description: "Tăng gấp 5 exp trong 12h", duration: 12, multiplier: 5, rarity: "epic" },
  { id: "exp_boost_mini", name: "Tiểu Hoàn Đan", type: ITEM_TYPES.EXP_BOOST, price: 50, description: "Tăng 50% exp trong 6h", duration: 6, multiplier: 1.5, rarity: "common" },

  // ==================== ĐAN DƯỢC ĐỘ KIẾP (BREAKTHROUGH_BOOST) ====================
  { id: "breakthrough_pill_small", name: "Tiểu Độ Kiếp Đan", type: ITEM_TYPES.BREAKTHROUGH_BOOST, price: 300, description: "Tăng 10% tỷ lệ độ kiếp (1 lần sử dụng)", breakthroughBonus: 10, img: "/assets/danduoc.jpg", rarity: "uncommon" },
  { id: "breakthrough_pill_medium", name: "Trung Độ Kiếp Đan", type: ITEM_TYPES.BREAKTHROUGH_BOOST, price: 600, description: "Tăng 20% tỷ lệ độ kiếp (1 lần sử dụng)", breakthroughBonus: 20, img: "/assets/danduoc.jpg", rarity: "rare" },
  { id: "breakthrough_pill_large", name: "Đại Độ Kiếp Đan", type: ITEM_TYPES.BREAKTHROUGH_BOOST, price: 1200, description: "Tăng 30% tỷ lệ độ kiếp (1 lần sử dụng)", breakthroughBonus: 30, img: "/assets/danduoc.jpg", rarity: "epic" },
  { id: "breakthrough_pill_perfect", name: "Hoàn Mỹ Độ Kiếp Đan", type: ITEM_TYPES.BREAKTHROUGH_BOOST, price: 2500, description: "Tăng 50% tỷ lệ độ kiếp (1 lần sử dụng)", breakthroughBonus: 50, rarity: "legendary" },

  // ==================== VẬT PHẨM TIÊU HAO (CONSUMABLE) ====================
  { id: "spirit_stone_pack_small", name: "Tiểu Linh Thạch Túi", type: ITEM_TYPES.CONSUMABLE, price: 0, description: "Nhận 50 linh thạch (chỉ mua bằng điểm)", spiritStoneReward: 50, rarity: "common" },
  { id: "lucky_charm", name: "Phúc Lộc Bùa", type: ITEM_TYPES.CONSUMABLE, price: 100, description: "Tăng 20% linh thạch nhận được trong 24h", duration: 24, spiritStoneBonus: 0.2, rarity: "uncommon" },
  { id: "meditation_incense", name: "Thiền Định Hương", type: ITEM_TYPES.CONSUMABLE, price: 80, description: "Nhận ngay 100 exp", expReward: 100, rarity: "common" },
  { id: "cultivation_manual", name: "Tu Luyện Bí Kíp", type: ITEM_TYPES.CONSUMABLE, price: 150, description: "Nhận ngay 300 exp", expReward: 300, rarity: "uncommon" },
  { id: "heavenly_scripture", name: "Thiên Thư", type: ITEM_TYPES.CONSUMABLE, price: 500, description: "Nhận ngay 1000 exp", expReward: 1000, rarity: "rare" },
  { id: "quest_refresh", name: "Nhiệm Vụ Lệnh", type: ITEM_TYPES.CONSUMABLE, price: 150, description: "Làm mới nhiệm vụ hàng ngày", rarity: "uncommon" },
  { id: "streak_protector", name: "Hộ Mệnh Phù", type: ITEM_TYPES.CONSUMABLE, price: 300, description: "Bảo vệ streak đăng nhập 1 lần", rarity: "rare" },

  // ==================== LINH THÚ (PET) ====================
  { id: "pet_fox", name: "Cửu Vĩ Hồ", type: ITEM_TYPES.PET, price: 800, description: "Linh thú hồ ly 9 đuôi, tăng 5% exp", expBonus: 0.05, rarity: "epic" },
  { id: "pet_dragon_baby", name: "Tiểu Long", type: ITEM_TYPES.PET, price: 1500, description: "Rồng con đáng yêu, tăng 10% exp", expBonus: 0.1, rarity: "legendary" },
  { id: "pet_phoenix_baby", name: "Tiểu Phượng", type: ITEM_TYPES.PET, price: 1500, description: "Phượng hoàng con, tăng 10% linh thạch", spiritStoneBonus: 0.1, rarity: "legendary" },
  { id: "pet_turtle", name: "Huyền Vũ Quy", type: ITEM_TYPES.PET, price: 600, description: "Rùa thần, bảo vệ streak đăng nhập", rarity: "rare" },
  { id: "pet_crane", name: "Tiên Hạc", type: ITEM_TYPES.PET, price: 700, description: "Hạc tiên, tăng 8% exp nhiệm vụ", questExpBonus: 0.08, rarity: "epic" },
  { id: "pet_cat", name: "Chiêu Tài Miêu", type: ITEM_TYPES.PET, price: 400, description: "Mèo may mắn, tăng 5% linh thạch", spiritStoneBonus: 0.05, rarity: "rare" },
  { id: "pet_rabbit", name: "Ngọc Thố", type: ITEM_TYPES.PET, price: 350, description: "Thỏ ngọc từ cung trăng", rarity: "rare" },

  // ==================== LINH THÚ CƯỠI (MOUNT) ====================
  { id: "mount_cloud", name: "Thần Vân", type: ITEM_TYPES.MOUNT, price: 1000, description: "Đám mây thần kỳ, tăng 15% Né Tránh", rarity: "epic", stats: { dodge: 0.15 } },
  { id: "mount_sword", name: "Ngự Kiếm", type: ITEM_TYPES.MOUNT, price: 1200, description: "Phi kiếm hành không, tăng 20% Tốc Độ và 10% Xuyên Thấu", rarity: "epic", stats: { speed: 0.20, penetration: 0.10 } },
  { id: "mount_lotus", name: "Liên Hoa Đài", type: ITEM_TYPES.MOUNT, price: 800, description: "Đài sen thần tiên, tăng 10% Hồi Phục và 10% Kháng Cự", rarity: "rare", stats: { regeneration: 0.10, resistance: 0.10 } },
  { id: "mount_tiger", name: "Bạch Hổ", type: ITEM_TYPES.MOUNT, price: 1500, description: "Bạch hổ thần thú, tăng 15% Tấn Công và 10% Chí Mạng", rarity: "legendary", stats: { attack: 0.15, criticalRate: 0.10 } },
  { id: "mount_dragon", name: "Thanh Long", type: ITEM_TYPES.MOUNT, price: 2000, description: "Thanh long uy nghiêm, tăng 15% Phòng Thủ và 15% Khí Huyết", rarity: "legendary", stats: { defense: 0.15, qiBlood: 0.15 } },
  { id: "mount_phoenix", name: "Chu Tước", type: ITEM_TYPES.MOUNT, price: 2000, description: "Chu tước lửa thiêng, tăng 20% Chí Mạng và 15% Hấp Huyết", rarity: "legendary", stats: { criticalRate: 0.20, lifesteal: 0.15 } },

  // ==================== CÔNG PHÁP (TECHNIQUE) ====================
  {
    id: "technique_basic_qi",
    name: "Cơ Bản Tụ Khí Pháp",
    type: ITEM_TYPES.TECHNIQUE,
    price: 500,
    description: "Công pháp cơ bản, tăng 5% Tấn Công và Phòng Thủ",
    rarity: "common",
    stats: { attack: 0.05, defense: 0.05 },
    skill: { name: "Tụ Khí", description: "Tăng 10% Khí Huyết trong 5 giây", cooldown: 30 }
  },
  {
    id: "technique_sword_heart",
    name: "Kiếm Tâm Quyết",
    type: ITEM_TYPES.TECHNIQUE,
    price: 1000,
    description: "Công pháp kiếm thuật, tăng 10% Tấn Công và 5% Chí Mạng",
    rarity: "uncommon",
    stats: { attack: 0.10, criticalRate: 0.05 },
    skill: { name: "Kiếm Khí", description: "Gây sát thương bằng 150% Tấn Công", cooldown: 20 }
  },
  {
    id: "technique_iron_body",
    name: "Thiết Bốc Công",
    type: ITEM_TYPES.TECHNIQUE,
    price: 1000,
    description: "Công pháp luyện thể, tăng 10% Phòng Thủ và 5% Khí Huyết",
    rarity: "uncommon",
    stats: { defense: 0.10, qiBlood: 0.05 },
    skill: { name: "Thiết Bốc", description: "Giảm 30% sát thương nhận trong 5 giây", cooldown: 25 }
  },
  {
    id: "technique_lightning_step",
    name: "Lôi Điện Bộ",
    type: ITEM_TYPES.TECHNIQUE,
    price: 1500,
    description: "Công pháp thân pháp, tăng 15% Tốc Độ và 10% Né Tránh",
    rarity: "rare",
    stats: { speed: 0.15, dodge: 0.10 },
    skill: { name: "Lôi Điện", description: "Tăng 50% Tốc Độ trong 8 giây", cooldown: 40 }
  },
  {
    id: "technique_dragon_breath",
    name: "Long Tức Công",
    type: ITEM_TYPES.TECHNIQUE,
    price: 2000,
    description: "Công pháp hô hấp, tăng 10% Chân Nguyên và 5% Hồi Phục",
    rarity: "rare",
    stats: { zhenYuan: 0.10, regeneration: 0.05 },
    skill: { name: "Long Tức", description: "Hồi 20% Chân Nguyên", cooldown: 30 }
  },
  {
    id: "technique_phoenix_rebirth",
    name: "Phượng Hoàng Tái Sinh",
    type: ITEM_TYPES.TECHNIQUE,
    price: 3000,
    description: "Công pháp huyền thoại, tăng 15% tất cả thông số",
    rarity: "legendary",
    stats: { attack: 0.15, defense: 0.15, qiBlood: 0.15, zhenYuan: 0.15, speed: 0.15, criticalRate: 0.15 },
    skill: { name: "Tái Sinh", description: "Hồi 50% Khí Huyết và Chân Nguyên", cooldown: 60 }
  },
  {
    id: "technique_void_walk",
    name: "Hư Không Bộ",
    type: ITEM_TYPES.TECHNIQUE,
    price: 2500,
    description: "Công pháp không gian, tăng 20% Xuyên Thấu và Kháng Cự",
    rarity: "epic",
    stats: { penetration: 0.20, resistance: 0.20 },
    skill: { name: "Hư Không", description: "Miễn dịch sát thương trong 2 giây", cooldown: 45 }
  },
  {
    id: "technique_blood_drain",
    name: "Hấp Huyết Đại Pháp",
    type: ITEM_TYPES.TECHNIQUE,
    price: 1800,
    description: "Công pháp tà đạo, tăng 15% Hấp Huyết",
    rarity: "epic",
    stats: { lifesteal: 0.15 },
    skill: { name: "Hấp Huyết", description: "Gây sát thương và hồi 30% sát thương gây ra", cooldown: 35 }
  }
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
  realmLevel: { type: Number, default: 1, min: 1, max: 11 },
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
  longestStreak: { type: Number, default: 0 },

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
    totalLikesGiven: { type: Number, default: 0 },
    totalLikesReceived: { type: Number, default: 0 },
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
  }
}, {
  timestamps: true
});

// ==================== INDEXES ====================
CultivationSchema.index({ exp: -1 });
CultivationSchema.index({ realmLevel: -1, exp: -1 });
CultivationSchema.index({ spiritStones: -1 });
CultivationSchema.index({ loginStreak: -1 });

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

  // Base stats theo cảnh giới
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
    10: { attack: 6400, defense: 3200, qiBlood: 64000, zhenYuan: 32000, speed: 60, criticalRate: 30, criticalDamage: 250, accuracy: 99, dodge: 30, penetration: 25, resistance: 25, lifesteal: 20, regeneration: 8, luck: 30 },
    11: { attack: 12800, defense: 6400, qiBlood: 128000, zhenYuan: 64000, speed: 70, criticalRate: 35, criticalDamage: 300, accuracy: 100, dodge: 35, penetration: 30, resistance: 30, lifesteal: 25, regeneration: 10, luck: 35 }
  };

  const baseStats = baseStatsByRealm[realmLevel] || baseStatsByRealm[1];

  // Exp bonus (tăng dần trong cảnh giới, 11 levels)
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
    11: { attack: 640, defense: 320, qiBlood: 6400, zhenYuan: 3200 }
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

  // Thêm bonus từ công pháp đã học
  if (this.learnedTechniques && this.learnedTechniques.length > 0) {
    this.learnedTechniques.forEach(learned => {
      const technique = SHOP_ITEMS.find(t => t.id === learned.techniqueId && t.type === ITEM_TYPES.TECHNIQUE);
      if (technique && technique.stats) {
        // Bonus tăng theo cấp độ công pháp (level 1 = 100%, level 10 = 200%)
        const levelMultiplier = 1 + (learned.level - 1) * 0.1;

        Object.keys(technique.stats).forEach(statKey => {
          const bonusPercent = technique.stats[statKey];
          if (finalStats[statKey] !== undefined) {
            if (statKey === 'attack' || statKey === 'defense' || statKey === 'qiBlood' || statKey === 'zhenYuan') {
              // Tăng theo phần trăm của giá trị hiện tại
              finalStats[statKey] = Math.floor(finalStats[statKey] * (1 + bonusPercent * levelMultiplier));
            } else if (statKey === 'speed' || statKey === 'penetration' || statKey === 'resistance' || statKey === 'luck') {
              // Tăng cộng dồn
              finalStats[statKey] = Math.floor(finalStats[statKey] + (baseStats[statKey] * bonusPercent * levelMultiplier));
            } else {
              // Tăng theo phần trăm (criticalRate, dodge, accuracy, lifesteal, regeneration)
              finalStats[statKey] = Math.min(100, finalStats[statKey] + (bonusPercent * 100 * levelMultiplier));
            }
          }
        });
      }
    });
  }

  // Thêm bonus từ linh thú (pet) đang trang bị
  if (this.equipped?.pet) {
    const pet = SHOP_ITEMS.find(p => p.id === this.equipped.pet && p.type === ITEM_TYPES.PET);
    if (pet) {
      // Pets thường tăng stats nhỏ dựa trên loại
      if (pet.expBonus) {
        // Pet tăng exp sẽ tăng luck để tăng cơ hội nhận bonus
        finalStats.luck = Math.floor(finalStats.luck + (pet.expBonus * 100));
      }
      if (pet.spiritStoneBonus) {
        finalStats.luck = Math.floor(finalStats.luck + (pet.spiritStoneBonus * 100));
      }
      if (pet.questExpBonus) {
        finalStats.luck = Math.floor(finalStats.luck + (pet.questExpBonus * 100));
      }
    }
  }

  // Thêm bonus từ tọa kỵ (mount) đang trang bị
  if (this.equipped?.mount) {
    const mount = SHOP_ITEMS.find(m => m.id === this.equipped.mount && m.type === ITEM_TYPES.MOUNT);
    if (mount && mount.stats) {
      // Áp dụng stats bonus từ mount
      Object.keys(mount.stats).forEach(statKey => {
        const bonusPercent = mount.stats[statKey];
        if (finalStats[statKey] !== undefined) {
          if (statKey === 'attack' || statKey === 'defense' || statKey === 'qiBlood' || statKey === 'zhenYuan' || statKey === 'speed') {
            // Tăng theo phần trăm của giá trị hiện tại
            finalStats[statKey] = Math.floor(finalStats[statKey] * (1 + bonusPercent));
          } else if (statKey === 'penetration' || statKey === 'resistance') {
            // Tăng cộng dồn
            finalStats[statKey] = Math.floor(finalStats[statKey] + (bonusPercent * 100));
          } else {
            // Tăng theo phần trăm (criticalRate, dodge, lifesteal, regeneration)
            finalStats[statKey] = Math.min(100, finalStats[statKey] + (bonusPercent * 100));
          }
        }
      });
    }
  }
  // Tích hợp equipment stats (async - sẽ được gọi riêng nếu cần)
  // Equipment stats sẽ được tính riêng qua getEquipmentStats() và merge ở route level

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

  // Exp cần để lên cấp: level * 100
  const expNeeded = learned.level * 100;

  learned.exp += expGain;
  learned.lastPracticedAt = new Date();

  // Kiểm tra lên cấp
  let leveledUp = false;
  while (learned.exp >= expNeeded && learned.level < 10) {
    learned.exp -= expNeeded;
    learned.level += 1;
    leveledUp = true;
  }

  // Giới hạn exp ở level 10
  if (learned.level >= 10) {
    learned.exp = Math.min(learned.exp, expNeeded - 1);
  }

  return { leveledUp, newLevel: learned.level, currentExp: learned.exp, expNeeded };
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
    const technique = SHOP_ITEMS.find(t => t.id === learned.techniqueId && t.type === ITEM_TYPES.TECHNIQUE);
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
  if (currentRealm.level >= 11) return 0;
  return currentRealm.maxExp - this.exp + 1;
};

/**
 * Tính phần trăm tiến độ cảnh giới hiện tại
 * Dựa trên realmLevel hiện tại, không phải realm từ exp
 */
CultivationSchema.methods.getRealmProgress = function () {
  // Dùng realmLevel hiện tại thay vì tính từ exp
  const currentRealm = CULTIVATION_REALMS.find(r => r.level === this.realmLevel) || CULTIVATION_REALMS[0];
  if (currentRealm.level >= 11) return 100;

  // Tính progress trong realm hiện tại
  const progressInRealm = this.exp - currentRealm.minExp;
  const realmRange = currentRealm.maxExp - currentRealm.minExp + 1;
  return Math.min(100, Math.floor((progressInRealm / realmRange) * 100));
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

  const finalAmount = Math.floor(amount * multiplier);
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
  this.spiritStones += amount;
  this.totalSpiritStonesEarned += amount;
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
  const expPerMinuteByRealm = {
    1: 2,    // Phàm Nhân
    2: 4,    // Luyện Khí
    3: 8,    // Trúc Cơ
    4: 15,   // Kim Đan
    5: 25,   // Nguyên Anh
    6: 40,   // Hóa Thần
    7: 60,   // Luyện Hư
    8: 100,  // Đại Thừa
    9: 150,  // Độ Kiếp
    10: 250, // Tiên Nhân
    11: 500  // Thiên Đế
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
  const baseStones = 10;
  const streakStoneBonus = Math.min(this.loginStreak * 2, 20);

  // Milestone bonuses cho streak 7 và 30
  let milestoneBonus = 0;
  if (this.loginStreak === 7) {
    milestoneBonus = 70;
  } else if (this.loginStreak === 30) {
    milestoneBonus = 250;
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
 * Cập nhật tiến độ nhiệm vụ
 */
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
 */
CultivationSchema.methods.buyItem = function (itemId) {
  const item = SHOP_ITEMS.find(i => i.id === itemId);
  if (!item) {
    throw new Error("Vật phẩm không tồn tại");
  }

  // Kiểm tra đã có chưa (trừ consumable items và exp boost)
  if (item.type !== ITEM_TYPES.EXP_BOOST && item.type !== ITEM_TYPES.CONSUMABLE) {
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

  // Trừ linh thạch
  this.spendSpiritStones(item.price);

  // Xử lý công pháp: tự động học khi mua
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

  equipments.forEach(eq => {
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

  // Đảm bảo tất cả quests đã được khởi tạo (cho các user cũ thiếu quests mới)
  let questsUpdated = false;
  
  // Kiểm tra và thêm daily quests còn thiếu
  const existingDailyQuestIds = new Set(cultivation.dailyQuests.map(q => q.questId));
  for (const template of QUEST_TEMPLATES.daily) {
    if (!existingDailyQuestIds.has(template.id)) {
      cultivation.dailyQuests.push({
        questId: template.id,
        progress: 0,
        completed: false,
        claimed: false
      });
      questsUpdated = true;
    }
  }
  
  // Kiểm tra và thêm weekly quests còn thiếu
  const existingWeeklyQuestIds = new Set(cultivation.weeklyQuests.map(q => q.questId));
  for (const template of QUEST_TEMPLATES.weekly) {
    if (!existingWeeklyQuestIds.has(template.id)) {
      cultivation.weeklyQuests.push({
        questId: template.id,
        progress: 0,
        completed: false,
        claimed: false
      });
      questsUpdated = true;
    }
  }
  
  // Kiểm tra và thêm achievements còn thiếu
  const existingAchievementIds = new Set(cultivation.achievements.map(q => q.questId));
  for (const template of QUEST_TEMPLATES.achievement) {
    if (!existingAchievementIds.has(template.id)) {
      cultivation.achievements.push({
        questId: template.id,
        progress: 0,
        completed: false,
        claimed: false
      });
      questsUpdated = true;
    }
  }
  
  if (questsUpdated) {
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
 * Sync cultivation cache to User after save
 */
CultivationSchema.post('save', async function (doc) {
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

const Cultivation = mongoose.model("Cultivation", CultivationSchema);

export default Cultivation;