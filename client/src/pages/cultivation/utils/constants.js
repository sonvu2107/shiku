/**
 * Constants for Cultivation System
 */

export const LOG_MESSAGES = [
  "Hấp thu tinh hoa nhật nguyệt...",
  "Vận chuyển một vòng đại chu thiên...",
  "Cảm ngộ thiên đạo...",
  "Linh khí tụ về đan điền...",
  "Tâm cảnh bình ổn, tu vi tăng tiến...",
  "Luyện hóa trọc khí...",
  "Ngộ ra một chút chân lý...",
  "Phát hiện một luồng linh khí lạ...",
  "Nghe thấy tiếng đại đạo thì thầm...",
  "Thu thập linh khí thiên địa...",
  "Cảm nhận được dao động của vũ trụ...",
  "Tinh khí thần hợp nhất...",
  "Đan điền ấm áp, tu vi dần tăng...",
  "Hấp thu tinh hoa từ thiên địa...",
  "Linh khí xoay quanh thân thể...",
  "Cảm ngộ được một phần đại đạo...",
  "Chân nguyên trong cơ thể dần dày đặc...",
  "Thiên địa linh khí quy về một mạch...",
  "Tâm thần tĩnh lặng, tu vi tự nhiên tăng...",
  "Phát hiện một điểm sáng trong đan điền...",
  "Linh khí như sương mù bao phủ...",
  "Cảm nhận được nhịp đập của thiên địa...",
  "Tinh khí hội tụ, tu vi thăng hoa...",
  "Đạo tâm kiên định, bất động như sơn...",
  "Linh khí tuần hoàn trong kinh mạch...",
  "Cảm ngộ được bí mật của vạn vật...",
  "Thiên địa linh khí như dòng sông chảy...",
  "Tâm cảnh thanh tịnh, tu vi tự nhiên tăng...",
  "Hấp thu tinh hoa từ vạn vật...",
  "Linh khí như ánh sáng xuyên qua thân thể..."
];

export const RARITY_COLORS = {
  common: { bg: 'bg-slate-700/50', border: 'border-slate-600', text: 'text-slate-300', label: 'Phàm Phẩm' },
  uncommon: { bg: 'bg-emerald-900/30', border: 'border-emerald-600/50', text: 'text-emerald-400', label: 'Tinh Phẩm' },
  rare: { bg: 'bg-blue-900/30', border: 'border-blue-500/50', text: 'text-blue-400', label: 'Hiếm Có' },
  epic: { bg: 'bg-purple-900/30', border: 'border-purple-500/50', text: 'text-purple-400', label: 'Cực Phẩm' },
  legendary: { bg: 'bg-amber-900/30', border: 'border-amber-500/50', text: 'text-amber-400', label: 'Thần Bảo' },
  mythic: { bg: 'bg-rose-900/30', border: 'border-rose-500/50', text: 'text-rose-400', label: 'Tiên Bảo' }
};

export const TECHNIQUE_ICON_MAP = {
  technique_basic_qi: 'CircleDot',
  technique_sword_heart: 'Sword',
  technique_iron_body: 'Shield',
  technique_lightning_step: 'Zap',
  technique_dragon_breath: 'Flame',
  technique_phoenix_rebirth: 'Feather',
  technique_void_walk: 'Ghost',
  technique_blood_drain: 'Droplet'
};



export const SHOP_ITEM_DATA = {
  // ==================== DANH HIỆU (TITLE) ====================
  title_swordsman: { id: "title_swordsman", name: "Kiếm Khách", type: "title", price: 100, description: "Danh hiệu cho người yêu kiếm thuật", rarity: "common" },
  title_scholar: { id: "title_scholar", name: "Thư Sinh", type: "title", price: 100, description: "Danh hiệu cho người ham học", rarity: "common" },
  title_hermit: { id: "title_hermit", name: "Ẩn Sĩ", type: "title", price: 200, description: "Danh hiệu cho người thích ẩn dật", rarity: "uncommon" },
  title_sage: { id: "title_sage", name: "Hiền Giả", type: "title", price: 500, description: "Danh hiệu cao quý của bậc hiền triết", rarity: "rare" },
  title_demon_slayer: { id: "title_demon_slayer", name: "Diệt Ma Giả", type: "title", price: 300, description: "Danh hiệu người diệt trừ yêu ma", rarity: "uncommon" },
  title_alchemist: { id: "title_alchemist", name: "Luyện Đan Sư", type: "title", price: 400, description: "Danh hiệu bậc thầy luyện đan", rarity: "rare" },
  title_immortal: { id: "title_immortal", name: "Tiên Nhân", type: "title", price: 1000, description: "Danh hiệu tối cao - Tiên Nhân", rarity: "legendary" },
  title_dragon_rider: { id: "title_dragon_rider", name: "Long Kỵ Sĩ", type: "title", price: 800, description: "Danh hiệu người cưỡi rồng", rarity: "epic" },
  title_night_walker: { id: "title_night_walker", name: "Dạ Du Thần", type: "title", price: 350, description: "Danh hiệu kẻ lang thang trong đêm", rarity: "uncommon" },
  title_phoenix: { id: "title_phoenix", name: "Phượng Hoàng Sứ Giả", type: "title", price: 1200, description: "Danh hiệu huyền thoại - Phượng Hoàng", rarity: "legendary" },

  // ==================== HUY HIỆU (BADGE) ====================
  badge_fire: { id: "badge_fire", name: "Hỏa Diễm Huy Hiệu", type: "badge", price: 150, description: "Huy hiệu lửa rực cháy", rarity: "common" },
  badge_ice: { id: "badge_ice", name: "Băng Tuyết Huy Hiệu", type: "badge", price: 150, description: "Huy hiệu băng lạnh", rarity: "common" },
  badge_thunder: { id: "badge_thunder", name: "Lôi Điện Huy Hiệu", type: "badge", price: 150, description: "Huy hiệu sấm sét", rarity: "common" },
  badge_wind: { id: "badge_wind", name: "Cuồng Phong Huy Hiệu", type: "badge", price: 150, description: "Huy hiệu gió cuồng", rarity: "common" },
  badge_earth: { id: "badge_earth", name: "Đại Địa Huy Hiệu", type: "badge", price: 150, description: "Huy hiệu đất đai vững chắc", rarity: "common" },
  badge_water: { id: "badge_water", name: "Thủy Nguyên Huy Hiệu", type: "badge", price: 150, description: "Huy hiệu nước trong veo", rarity: "common" },
  badge_yin_yang: { id: "badge_yin_yang", name: "Âm Dương Huy Hiệu", type: "badge", price: 400, description: "Huy hiệu cân bằng âm dương", rarity: "rare" },
  badge_dragon: { id: "badge_dragon", name: "Long Văn Huy Hiệu", type: "badge", price: 600, description: "Huy hiệu rồng thiêng", rarity: "epic" },
  badge_star: { id: "badge_star", name: "Tinh Thần Huy Hiệu", type: "badge", price: 250, description: "Huy hiệu ngôi sao lấp lánh", rarity: "uncommon" },
  badge_moon: { id: "badge_moon", name: "Nguyệt Quang Huy Hiệu", type: "badge", price: 300, description: "Huy hiệu ánh trăng huyền bí", rarity: "uncommon" },
  badge_sun: { id: "badge_sun", name: "Thái Dương Huy Hiệu", type: "badge", price: 350, description: "Huy hiệu mặt trời rực rỡ", rarity: "rare" },
  badge_chaos: { id: "badge_chaos", name: "Hỗn Độn Huy Hiệu", type: "badge", price: 1000, description: "Huy hiệu hỗn độn nguyên thủy", rarity: "legendary" },

  // ==================== KHUNG AVATAR (AVATAR_FRAME) ====================
  frame_gold: { id: "frame_gold", name: "Kim Sắc Khung", type: "avatar_frame", price: 300, description: "Khung avatar màu vàng kim quý phái", color: "#FFD700", rarity: "rare" },
  frame_purple: { id: "frame_purple", name: "Tử Sắc Khung", type: "avatar_frame", price: 300, description: "Khung avatar màu tím huyền bí", color: "#8B5CF6", rarity: "rare" },
  frame_jade: { id: "frame_jade", name: "Ngọc Bích Khung", type: "avatar_frame", price: 350, description: "Khung avatar ngọc bích thanh thoát", color: "#10B981", rarity: "rare" },
  frame_ruby: { id: "frame_ruby", name: "Hồng Ngọc Khung", type: "avatar_frame", price: 350, description: "Khung avatar hồng ngọc rực rỡ", color: "#EF4444", rarity: "rare" },
  frame_sapphire: { id: "frame_sapphire", name: "Thanh Ngọc Khung", type: "avatar_frame", price: 350, description: "Khung avatar thanh ngọc trong sáng", color: "#3B82F6", rarity: "rare" },
  frame_rainbow: { id: "frame_rainbow", name: "Thất Sắc Khung", type: "avatar_frame", price: 800, description: "Khung avatar 7 màu lung linh", color: "rainbow", rarity: "epic" },
  frame_flames: { id: "frame_flames", name: "Hỏa Viêm Khung", type: "avatar_frame", price: 500, description: "Khung avatar với ngọn lửa bập bùng", color: "#F97316", rarity: "epic", animated: true },
  frame_ice: { id: "frame_ice", name: "Băng Tinh Khung", type: "avatar_frame", price: 500, description: "Khung avatar với tinh thể băng giá", color: "#06B6D4", rarity: "epic", animated: true },
  frame_celestial: { id: "frame_celestial", name: "Thiên Giới Khung", type: "avatar_frame", price: 1500, description: "Khung avatar huyền thoại từ thiên giới", color: "#FBBF24", rarity: "legendary", animated: true },

  // ==================== HIỆU ỨNG PROFILE (PROFILE_EFFECT) ====================
  effect_sparkle: { id: "effect_sparkle", name: "Tinh Quang Hiệu Ứng", type: "profile_effect", price: 400, description: "Hiệu ứng lấp lánh trên profile", rarity: "rare" },
  effect_aurora: { id: "effect_aurora", name: "Cực Quang Hiệu Ứng", type: "profile_effect", price: 500, description: "Hiệu ứng cực quang huyền ảo trên profile", rarity: "epic" },
  effect_snow: { id: "effect_snow", name: "Tuyết Hoa Hiệu Ứng", type: "profile_effect", price: 400, description: "Hiệu ứng tuyết rơi trên profile", rarity: "rare" },
  effect_petals: { id: "effect_petals", name: "Hoa Vũ Hiệu Ứng", type: "profile_effect", price: 350, description: "Hiệu ứng cánh hoa bay trên profile", rarity: "rare" },
  effect_lightning: { id: "effect_lightning", name: "Lôi Điện Hiệu Ứng", type: "profile_effect", price: 600, description: "Hiệu ứng sấm chớp trên profile", rarity: "epic" },
  effect_aura: { id: "effect_aura", name: "Linh Khí Hiệu Ứng", type: "profile_effect", price: 800, description: "Hiệu ứng linh khí tỏa sáng", rarity: "epic" },
  effect_galaxy: { id: "effect_galaxy", name: "Tinh Hà Hiệu Ứng", type: "profile_effect", price: 1200, description: "Hiệu ứng ngân hà huyền bí", rarity: "legendary" },

  // ==================== ĐAN DƯỢC (EXP_BOOST) ====================
  exp_boost_2x: { id: "exp_boost_2x", name: "Tu Luyện Đan (2x)", type: "exp_boost", price: 200, description: "Tăng gấp đôi exp trong 24h", duration: 24, multiplier: 2, rarity: "uncommon" },
  exp_boost_3x: { id: "exp_boost_3x", name: "Thiên Tài Đan (3x)", type: "exp_boost", price: 500, description: "Tăng gấp 3 exp trong 24h", duration: 24, multiplier: 3, rarity: "rare" },
  exp_boost_5x: { id: "exp_boost_5x", name: "Thần Đan (5x)", type: "exp_boost", price: 1000, description: "Tăng gấp 5 exp trong 12h", duration: 12, multiplier: 5, rarity: "epic" },
  exp_boost_mini: { id: "exp_boost_mini", name: "Tiểu Hoàn Đan", type: "exp_boost", price: 50, description: "Tăng 50% exp trong 6h", duration: 6, multiplier: 1.5, rarity: "common" },

  // ==================== ĐAN DƯỢC ĐỘ KIẾP (BREAKTHROUGH_BOOST) ====================
  breakthrough_pill_small: { id: "breakthrough_pill_small", name: "Tiểu Độ Kiếp Đan", type: "breakthrough_boost", price: 300, description: "Tăng 10% tỷ lệ độ kiếp (1 lần sử dụng)", breakthroughBonus: 10, img: "/assets/danduoc.jpg", rarity: "uncommon" },
  breakthrough_pill_medium: { id: "breakthrough_pill_medium", name: "Trung Độ Kiếp Đan", type: "breakthrough_boost", price: 600, description: "Tăng 20% tỷ lệ độ kiếp (1 lần sử dụng)", breakthroughBonus: 20, img: "/assets/danduoc.jpg", rarity: "rare" },
  breakthrough_pill_large: { id: "breakthrough_pill_large", name: "Đại Độ Kiếp Đan", type: "breakthrough_boost", price: 1200, description: "Tăng 30% tỷ lệ độ kiếp (1 lần sử dụng)", breakthroughBonus: 30, img: "/assets/danduoc.jpg", rarity: "epic" },
  breakthrough_pill_perfect: { id: "breakthrough_pill_perfect", name: "Hoàn Mỹ Độ Kiếp Đan", type: "breakthrough_boost", price: 2500, description: "Tăng 50% tỷ lệ độ kiếp (1 lần sử dụng)", breakthroughBonus: 50, rarity: "legendary" },

  // ==================== VẬT PHẨM TIÊU HAO (CONSUMABLE) ====================
  spirit_stone_pack_small: { id: "spirit_stone_pack_small", name: "Tiểu Linh Thạch Túi", type: "consumable", price: 0, description: "Nhận 50 linh thạch (chỉ mua bằng điểm)", spiritStoneReward: 50, rarity: "common" },
  lucky_charm: { id: "lucky_charm", name: "Phúc Lộc Bùa", type: "consumable", price: 100, description: "Tăng 20% linh thạch nhận được trong 24h", duration: 24, spiritStoneBonus: 0.2, rarity: "uncommon" },
  meditation_incense: { id: "meditation_incense", name: "Thiền Định Hương", type: "consumable", price: 80, description: "Nhận ngay 100 exp", expReward: 100, rarity: "common" },
  cultivation_manual: { id: "cultivation_manual", name: "Tu Luyện Bí Kíp", type: "consumable", price: 150, description: "Nhận ngay 300 exp", expReward: 300, rarity: "uncommon" },
  heavenly_scripture: { id: "heavenly_scripture", name: "Thiên Thư", type: "consumable", price: 500, description: "Nhận ngay 1000 exp", expReward: 1000, rarity: "rare" },
  quest_refresh: { id: "quest_refresh", name: "Nhiệm Vụ Lệnh", type: "consumable", price: 150, description: "Làm mới nhiệm vụ hàng ngày", rarity: "uncommon" },
  streak_protector: { id: "streak_protector", name: "Hộ Mệnh Phù", type: "consumable", price: 300, description: "Bảo vệ streak đăng nhập 1 lần", rarity: "rare" },

  // ==================== LINH THÚ (PET) ====================
  pet_fox: { id: "pet_fox", name: "Cửu Vĩ Hồ", type: "pet", price: 800, description: "Linh thú hồ ly 9 đuôi, tăng 5% exp", expBonus: 0.05, rarity: "epic" },
  pet_dragon_baby: { id: "pet_dragon_baby", name: "Tiểu Long", type: "pet", price: 1500, description: "Rồng con đáng yêu, tăng 10% exp", expBonus: 0.1, rarity: "legendary" },
  pet_phoenix_baby: { id: "pet_phoenix_baby", name: "Tiểu Phượng", type: "pet", price: 1500, description: "Phượng hoàng con, tăng 10% linh thạch", spiritStoneBonus: 0.1, rarity: "legendary" },
  pet_turtle: { id: "pet_turtle", name: "Huyền Vũ Quy", type: "pet", price: 600, description: "Rùa thần, bảo vệ streak đăng nhập", rarity: "rare" },
  pet_crane: { id: "pet_crane", name: "Tiên Hạc", type: "pet", price: 700, description: "Hạc tiên, tăng 8% exp nhiệm vụ", questExpBonus: 0.08, rarity: "epic" },
  pet_cat: { id: "pet_cat", name: "Chiêu Tài Miêu", type: "pet", price: 400, description: "Mèo may mắn, tăng 5% linh thạch", spiritStoneBonus: 0.05, rarity: "rare" },
  pet_rabbit: { id: "pet_rabbit", name: "Ngọc Thố", type: "pet", price: 350, description: "Thỏ ngọc từ cung trăng", rarity: "rare" },

  // ==================== LINH THÚ CƯỠI (MOUNT) ====================
  mount_cloud: { id: "mount_cloud", name: "Thần Vân", type: "mount", price: 1000, description: "Đám mây thần kỳ, tăng 15% Né Tránh", rarity: "epic", stats: { dodge: 0.15 } },
  mount_sword: { id: "mount_sword", name: "Ngự Kiếm", type: "mount", price: 1200, description: "Phi kiếm hành không, tăng 20% Tốc Độ và 10% Xuyên Thấu", rarity: "epic", stats: { speed: 0.20, penetration: 0.10 } },
  mount_lotus: { id: "mount_lotus", name: "Liên Hoa Đài", type: "mount", price: 800, description: "Đài sen thần tiên, tăng 10% Hồi Phục và 10% Kháng Cự", rarity: "rare", stats: { regeneration: 0.10, resistance: 0.10 } },
  mount_tiger: { id: "mount_tiger", name: "Bạch Hổ", type: "mount", price: 1500, description: "Bạch hổ thần thú, tăng 15% Tấn Công và 10% Chí Mạng", rarity: "legendary", stats: { attack: 0.15, criticalRate: 0.10 } },
  mount_dragon: { id: "mount_dragon", name: "Thanh Long", type: "mount", price: 2000, description: "Thanh long uy nghiêm, tăng 15% Phòng Thủ và 15% Khí Huyết", rarity: "legendary", stats: { defense: 0.15, qiBlood: 0.15 } },
  mount_phoenix: { id: "mount_phoenix", name: "Chu Tước", type: "mount", price: 2000, description: "Chu tước lửa thiêng, tăng 20% Chí Mạng và 15% Hấp Huyết", rarity: "legendary", stats: { criticalRate: 0.20, lifesteal: 0.15 } },

  // ==================== CÔNG PHÁP (TECHNIQUE) ====================
  technique_basic_qi: {
    id: "technique_basic_qi", name: "Cơ Bản Tụ Khí Pháp", type: "technique", price: 500,
    description: "Công pháp cơ bản, tăng 5% Tấn Công và Phòng Thủ", rarity: "common",
    stats: { attack: 0.05, defense: 0.05 },
    skill: { name: "Tụ Khí", description: "Tăng 10% Khí Huyết trong 5 giây", cooldown: 3, manaCost: 5 }
  },
  technique_sword_heart: {
    id: "technique_sword_heart", name: "Kiếm Tâm Quyết", type: "technique", price: 1000,
    description: "Công pháp kiếm thuật, tăng 10% Tấn Công và 5% Chí Mạng", rarity: "uncommon",
    stats: { attack: 0.10, criticalRate: 0.05 },
    skill: { name: "Kiếm Khí", description: "Gây sát thương bằng 150% Tấn Công", cooldown: 2 }
  },
  technique_iron_body: {
    id: "technique_iron_body", name: "Thiết Bốc Công", type: "technique", price: 1000,
    description: "Công pháp luyện thể, tăng 10% Phòng Thủ và 5% Khí Huyết", rarity: "uncommon",
    stats: { defense: 0.10, qiBlood: 0.05 },
    skill: { name: "Thiết Bốc", description: "Giảm 30% sát thương nhận trong 5 giây", cooldown: 4 }
  },
  technique_lightning_step: {
    id: "technique_lightning_step", name: "Lôi Điện Bộ", type: "technique", price: 1500,
    description: "Công pháp thân pháp, tăng 15% Tốc Độ và 10% Né Tránh", rarity: "rare",
    stats: { speed: 0.15, dodge: 0.10 },
    skill: { name: "Lôi Điện", description: "Tăng 50% Tốc Độ trong 8 giây", cooldown: 5 }
  },
  technique_dragon_breath: {
    id: "technique_dragon_breath", name: "Long Tức Công", type: "technique", price: 2000,
    description: "Công pháp hô hấp, tăng 10% Chân Nguyên và 5% Hồi Phục", rarity: "rare",
    stats: { zhenYuan: 0.10, regeneration: 0.05 },
    skill: { name: "Long Tức", description: "Hồi 20% Chân Nguyên", cooldown: 4 }
  },
  technique_phoenix_rebirth: {
    id: "technique_phoenix_rebirth", name: "Phượng Hoàng Tái Sinh", type: "technique", price: 3000,
    description: "Công pháp huyền thoại, tăng 15% tất cả thông số", rarity: "legendary",
    stats: { attack: 0.15, defense: 0.15, qiBlood: 0.15, zhenYuan: 0.15, speed: 0.15, criticalRate: 0.15 },
    skill: { name: "Tái Sinh", description: "Hồi 20% Khí Huyết và Chân Nguyên", cooldown: 10 }
  },
  technique_void_walk: {
    id: "technique_void_walk", name: "Hư Không Bộ", type: "technique", price: 2500,
    description: "Công pháp không gian, tăng 20% Xuyên Thấu và Kháng Cự", rarity: "epic",
    stats: { penetration: 0.20, resistance: 0.20 },
    skill: { name: "Hư Không", description: "Miễn dịch sát thương trong 2 giây", cooldown: 10 }
  },
  technique_blood_drain: {
    id: "technique_blood_drain", name: "Hấp Huyết Đại Pháp", type: "technique", price: 1800,
    description: "Công pháp tà đạo, tăng 15% Hấp Huyết", rarity: "epic",
    stats: { lifesteal: 0.15 },
    skill: { name: "Hấp Huyết", description: "Gây sát thương và hồi 30% sát thương gây ra", cooldown: 5 }
  }
};

export const EQUIPMENT_SUBTYPES = {
  // Weapon
  sword: "Kiếm",
  saber: "Đao",
  spear: "Thương",
  bow: "Cung",
  fan: "Quạt",
  flute: "Sáo",
  brush: "Bút",
  dual_sword: "Song Kiếm",
  flying_sword: "Linh Kiếm",

  // Armor
  helmet: "Mũ",
  chest: "Giáp",
  shoulder: "Hộ Vai",
  gloves: "Găng",
  boots: "Giày",
  belt: "Đai",

  // Accessory
  ring: "Nhẫn",
  necklace: "Dây Chuyền",
  earring: "Bông Tai",
  bracelet: "Vòng Tay",

  // Power Item
  spirit_stone: "Linh Thạch",
  spirit_pearl: "Linh Châu",
  spirit_seal: "Linh Ấn"
};
