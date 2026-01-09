/**
 * Shop Items Data
 * Contains all purchasable items in the cultivation system
 * Separated from Cultivation.js for better maintainability
 */

// ==================== ITEM TYPES ====================
export const ITEM_TYPES = {
    TITLE: "title",             // Danh hiệu hiển thị
    BADGE: "badge",             // Huy hiệu
    AVATAR_FRAME: "avatar_frame", // Khung avatar
    PROFILE_EFFECT: "profile_effect", // Hiệu ứng profile
    EXP_BOOST: "exp_boost",     // Đan dược tăng exp
    BREAKTHROUGH_BOOST: "breakthrough_boost", // Đan dược hỗ trợ độ kiếp
    CONSUMABLE: "consumable",   // Vật phẩm tiêu hao
    PET: "pet",                 // Linh thú
    MOUNT: "mount",             // Linh thú cưỡi
    TECHNIQUE: "technique",      // Công pháp
    LOOTBOX: "lootbox"          // Rương may mắn (Gacha)
};

// ==================== SHOP ITEMS ====================
export const SHOP_ITEMS = [
    // ==================== RƯƠNG MAY MẮN (LOOTBOX - MONEY SINK) ====================
    {
        id: "chest_basic",
        name: "Rương Nguyên Liệu (Thường)",
        type: ITEM_TYPES.LOOTBOX,
        price: 1000,
        description: "Chứa nguyên liệu Luyện Khí cơ bản (Tier 1-5) và vật phẩm tiêu hao.",
        rarity: "common",
        lootboxKey: "chest_basic",
        buyAndOpen: true,
        img: "/assets/chest_wood.jpg"
    },
    {
        id: "chest_advanced",
        name: "Rương Nguyên Liệu (Cao Cấp)",
        type: ITEM_TYPES.LOOTBOX,
        price: 5000,
        description: "Chứa nguyên liệu Luyện Khí cao cấp (Tier 6-10) và đan dược tu luyện.",
        rarity: "epic",
        lootboxKey: "chest_advanced",
        buyAndOpen: true,
        img: "/assets/chest_gold.jpg"
    },
    {
        id: "chest_master",
        name: "Rương Thần Bí (Gacha)",
        type: ITEM_TYPES.LOOTBOX,
        price: 10000,
        description: "Cơ hội nhận Công Pháp/Ngoại Trang hiếm. Nếu trùng sẽ đổi thành vật phẩm giá trị.",
        rarity: "legendary",
        lootboxKey: "chest_master",
        buyAndOpen: true,
        img: "/assets/chest_mythic.jpg"
    },
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

    // ==================== KHUNG AVATAR PHẦN THƯỞNG RANK (KHÔNG BÁN) ====================
    { id: "frame_tienton", name: "Tiên Tôn Khung", type: ITEM_TYPES.AVATAR_FRAME, price: 0, description: "Khung avatar độc quyền cho Tiên Tôn rank - Hào quang tiên giới bao phủ", color: "#FBBF24", rarity: "legendary", animated: true, exclusive: true, rankTier: 8 },
    { id: "frame_maton", name: "Ma Tôn Khung", type: ITEM_TYPES.AVATAR_FRAME, price: 0, description: "Khung avatar độc quyền cho Ma Tôn rank - Ma khí hắc ám cuồn cuộn", color: "#7C3AED", rarity: "legendary", animated: true, exclusive: true, rankTier: 8 },
    { id: "frame_truyenthuyet", name: "Huyền Thoại Khung", type: ITEM_TYPES.AVATAR_FRAME, price: 0, description: "Khung avatar tối thượng - Chỉ dành cho những bậc Truyền Thuyết", color: "#F59E0B", rarity: "legendary", animated: true, exclusive: true, rankTier: 9 },

    // ==================== HIỆU ỨNG PROFILE (PROFILE_EFFECT) ====================
    { id: "effect_sparkle", name: "Tinh Quang Hiệu Ứng", type: ITEM_TYPES.PROFILE_EFFECT, price: 400, description: "Hiệu ứng lấp lánh trên profile", rarity: "rare" },
    { id: "effect_aurora", name: "Cực Quang Hiệu Ứng", type: ITEM_TYPES.PROFILE_EFFECT, price: 500, description: "Hiệu ứng cực quang huyền ảo trên profile", rarity: "epic" },
    { id: "effect_snow", name: "Tuyết Hoa Hiệu Ứng", type: ITEM_TYPES.PROFILE_EFFECT, price: 400, description: "Hiệu ứng tuyết rơi trên profile", rarity: "rare" },
    { id: "effect_petals", name: "Hoa Vũ Hiệu Ứng", type: ITEM_TYPES.PROFILE_EFFECT, price: 350, description: "Hiệu ứng cánh hoa bay trên profile", rarity: "rare" },
    { id: "effect_lightning", name: "Lôi Điện Hiệu Ứng", type: ITEM_TYPES.PROFILE_EFFECT, price: 600, description: "Hiệu ứng sấm chớp trên profile", rarity: "epic" },
    { id: "effect_aura", name: "Linh Khí Hiệu Ứng", type: ITEM_TYPES.PROFILE_EFFECT, price: 800, description: "Hiệu ứng linh khí tỏa sáng", rarity: "epic" },
    { id: "effect_galaxy", name: "Tinh Hà Hiệu Ứng", type: ITEM_TYPES.PROFILE_EFFECT, price: 1200, description: "Hiệu ứng ngân hà huyền bí", rarity: "legendary" },

    // ==================== ĐAN DƯỢC (EXP_BOOST) ====================
    { id: "exp_boost_2x", name: "Tu Luyện Đan (2x)", type: ITEM_TYPES.EXP_BOOST, price: 200, description: "Tăng gấp đôi exp trong 24h", duration: 24, multiplier: 2, rarity: "uncommon", img: "/assets/danduoc.jpg" },
    { id: "exp_boost_3x", name: "Thiên Tài Đan (3x)", type: ITEM_TYPES.EXP_BOOST, price: 500, description: "Tăng gấp 3 exp trong 24h", duration: 24, multiplier: 3, rarity: "rare", img: "/assets/danduoc.jpg" },
    { id: "exp_boost_5x", name: "Thần Đan (5x)", type: ITEM_TYPES.EXP_BOOST, price: 1000, description: "Tăng gấp 5 exp trong 12h", duration: 12, multiplier: 5, rarity: "epic", img: "/assets/danduoc.jpg" },
    { id: "exp_boost_mini", name: "Tiểu Hoàn Đan", type: ITEM_TYPES.EXP_BOOST, price: 50, description: "Tăng 50% exp trong 6h", duration: 6, multiplier: 1.5, rarity: "common", img: "/assets/danduoc.jpg" },

    // ==================== ĐAN DƯỢC ĐỘ KIẾP (BREAKTHROUGH_BOOST) ====================
    { id: "breakthrough_pill_small", name: "Tiểu Độ Kiếp Đan", type: ITEM_TYPES.BREAKTHROUGH_BOOST, price: 300, description: "Tăng 10% tỷ lệ độ kiếp (1 lần sử dụng)", breakthroughBonus: 10, img: "/assets/danduoc.jpg", rarity: "uncommon" },
    { id: "breakthrough_pill_medium", name: "Trung Độ Kiếp Đan", type: ITEM_TYPES.BREAKTHROUGH_BOOST, price: 600, description: "Tăng 20% tỷ lệ độ kiếp (1 lần sử dụng)", breakthroughBonus: 20, img: "/assets/danduoc.jpg", rarity: "rare" },
    { id: "breakthrough_pill_large", name: "Đại Độ Kiếp Đan", type: ITEM_TYPES.BREAKTHROUGH_BOOST, price: 1200, description: "Tăng 30% tỷ lệ độ kiếp (1 lần sử dụng)", breakthroughBonus: 30, img: "/assets/danduoc.jpg", rarity: "epic" },
    { id: "breakthrough_pill_perfect", name: "Hoàn Mỹ Độ Kiếp Đan", type: ITEM_TYPES.BREAKTHROUGH_BOOST, price: 2500, description: "Tăng 50% tỷ lệ độ kiếp (1 lần sử dụng)", breakthroughBonus: 50, img: "/assets/danduoc.jpg", rarity: "legendary" },

    // ==================== VẬT PHẨM TIÊU HAO (CONSUMABLE) ====================
    { id: "spirit_stone_pack_small", name: "Tiểu Linh Thạch Túi", type: ITEM_TYPES.CONSUMABLE, price: 0, description: "Nhận 50 linh thạch (chỉ mua bằng điểm)", spiritStoneReward: 50, rarity: "common" },
    { id: "lucky_charm", name: "Phúc Lộc Bùa", type: ITEM_TYPES.CONSUMABLE, price: 100, description: "Tăng 20% linh thạch nhận được trong 24h", duration: 24, spiritStoneBonus: 0.2, rarity: "uncommon" },
    { id: "meditation_incense", name: "Thiền Định Hương", type: ITEM_TYPES.CONSUMABLE, price: 80, description: "Nhận ngay 100 exp", expReward: 100, rarity: "common" },
    { id: "cultivation_manual", name: "Tu Luyện Bí Kíp", type: ITEM_TYPES.CONSUMABLE, price: 150, description: "Nhận ngay 300 exp", expReward: 300, rarity: "uncommon" },
    { id: "heavenly_scripture", name: "Thiên Thư", type: ITEM_TYPES.CONSUMABLE, price: 500, description: "Nhận ngay 1000 exp", expReward: 1000, rarity: "rare" },
    { id: "quest_refresh", name: "Nhiệm Vụ Lệnh", type: ITEM_TYPES.CONSUMABLE, price: 150, description: "Làm mới nhiệm vụ hàng ngày", rarity: "uncommon" },
    { id: "streak_protector", name: "Hộ Mệnh Phù", type: ITEM_TYPES.CONSUMABLE, price: 300, description: "Bảo vệ streak đăng nhập 1 lần", rarity: "rare" },
    { id: "weekly_pack", name: "Tuần Lễ Bảo Rương", type: ITEM_TYPES.CONSUMABLE, price: 1000, description: "Mở ra nhận ngẫu nhiên 1 vật phẩm Rare trở lên", rarity: "epic", isLootBox: true, lootBoxConfig: { minRarity: "rare", dropTypes: ["title", "badge", "avatar_frame", "profile_effect", "pet", "mount", "technique"] } },
    { id: "craft_catalyst_luck", name: "Thiên Địa Tạo Hóa Đan", type: ITEM_TYPES.CONSUMABLE, price: 500, description: "Vật phẩm huyền bí giúp gia tăng 20% (x1.2) cơ hội ra đồ xịn nhất khi luyện khí (có giới hạn)", rarity: "epic", img: "/assets/danduoc.jpg" },

    // ==================== GÓI TÂN THỦ (MUA 1 LẦN) ====================
    {
        id: "starter_pack",
        name: "Tân Thủ Lễ Bao",
        type: ITEM_TYPES.CONSUMABLE,
        price: 0, // Miễn phí, mua 1 lần
        description: "Gói quà chào mừng tân thủ! Nhận 500 linh thạch, 3 Tiểu Hoàn Đan, 1 Tiểu Độ Kiếp Đan. Chỉ mua được 1 lần duy nhất.",
        rarity: "legendary",
        oneTimePurchase: true, // Đánh dấu chỉ mua 1 lần
        rewards: {
            spiritStones: 500,
            items: [
                { itemId: "exp_boost_mini", quantity: 3 }, // 3 Tiểu Hoàn Đan
                { itemId: "breakthrough_pill_small", quantity: 1 } // 1 Tiểu Độ Kiếp Đan
            ]
        },
        img: "/assets/danduoc.jpg"
    },

    // ==================== LINH THÚ (PET) ====================
    { id: "pet_fox", name: "Cửu Vĩ Hồ", type: ITEM_TYPES.PET, price: 800, description: "Linh thú hồ ly 9 đuôi, tăng 5% exp", expBonus: 0.05, rarity: "epic" },
    { id: "pet_dragon_baby", name: "Tiểu Long", type: ITEM_TYPES.PET, price: 1500, description: "Rồng con đáng yêu, tăng 10% exp", expBonus: 0.1, rarity: "legendary" },
    { id: "pet_phoenix_baby", name: "Tiểu Phượng", type: ITEM_TYPES.PET, price: 1500, description: "Phượng hoàng con, tăng 10% linh thạch", spiritStoneBonus: 0.1, rarity: "legendary" },
    { id: "pet_turtle", name: "Huyền Vũ Quy", type: ITEM_TYPES.PET, price: 600, description: "Rùa thần, bảo vệ streak đăng nhập", rarity: "rare" },
    { id: "pet_crane", name: "Tiên Hạc", type: ITEM_TYPES.PET, price: 700, description: "Hạc tiên, tăng 8% exp nhiệm vụ", questExpBonus: 0.08, rarity: "epic" },
    { id: "pet_cat", name: "Chiêu Tài Miêu", type: ITEM_TYPES.PET, price: 400, description: "Mèo may mắn, tăng 5% linh thạch", spiritStoneBonus: 0.05, rarity: "rare" },
    { id: "pet_rabbit", name: "Ngọc Thố", type: ITEM_TYPES.PET, price: 350, description: "Thỏ ngọc từ cung trăng", rarity: "rare" },

    // ==================== LINH THÚ PHẦN THƯỞNG RANK (KHÔNG BÁN) ====================
    { id: "pet_legendary", name: "Hồng Mông Cổ Thú", type: ITEM_TYPES.PET, price: 0, description: "Linh thú thần cấp từ Hồng Mông - Tăng 15% exp và 10% linh thạch", expBonus: 0.15, spiritStoneBonus: 0.1, rarity: "legendary", exclusive: true, rankTier: 9 },

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
        skill: { name: "Tụ Khí", description: "Tăng 10% Khí Huyết trong 5 giây", cooldown: 3, manaCost: 5 }
    },
    {
        id: "technique_sword_heart",
        name: "Kiếm Tâm Quyết",
        type: ITEM_TYPES.TECHNIQUE,
        price: 1000,
        description: "Công pháp kiếm thuật, tăng 10% Tấn Công và 5% Chí Mạng",
        rarity: "uncommon",
        stats: { attack: 0.10, criticalRate: 0.05 },
        skill: { name: "Kiếm Khí", description: "Gây sát thương bằng 150% Tấn Công", cooldown: 2 }
    },
    {
        id: "technique_iron_body",
        name: "Thiết Bốc Công",
        type: ITEM_TYPES.TECHNIQUE,
        price: 1000,
        description: "Công pháp luyện thể, tăng 10% Phòng Thủ và 5% Khí Huyết",
        rarity: "uncommon",
        stats: { defense: 0.10, qiBlood: 0.05 },
        skill: { name: "Thiết Bốc", description: "Giảm 30% sát thương nhận trong 5 giây", cooldown: 4 }
    },
    {
        id: "technique_lightning_step",
        name: "Lôi Điện Bộ",
        type: ITEM_TYPES.TECHNIQUE,
        price: 1500,
        description: "Công pháp thân pháp, tăng 15% Tốc Độ và 10% Né Tránh",
        rarity: "rare",
        stats: { speed: 0.15, dodge: 0.10 },
        skill: { name: "Lôi Điện", description: "Tăng 50% Tốc Độ trong 8 giây", cooldown: 5 }
    },
    {
        id: "technique_dragon_breath",
        name: "Long Tức Công",
        type: ITEM_TYPES.TECHNIQUE,
        price: 2000,
        description: "Công pháp hô hấp, tăng 10% Chân Nguyên và 5% Hồi Phục",
        rarity: "rare",
        stats: { zhenYuan: 0.10, regeneration: 0.05 },
        skill: { name: "Long Tức", description: "Hồi 20% Chân Nguyên", cooldown: 4 }
    },
    {
        id: "technique_phoenix_rebirth",
        name: "Phượng Hoàng Tái Sinh",
        type: ITEM_TYPES.TECHNIQUE,
        price: 3000,
        description: "Công pháp huyền thoại, tăng 15% tất cả thông số",
        rarity: "legendary",
        stats: { attack: 0.15, defense: 0.15, qiBlood: 0.15, zhenYuan: 0.15, speed: 0.15, criticalRate: 0.15 },
        skill: { name: "Tái Sinh", description: "Hồi 50% Khí Huyết và Chân Nguyên", cooldown: 10 }
    },
    {
        id: "technique_void_walk",
        name: "Hư Không Bộ",
        type: ITEM_TYPES.TECHNIQUE,
        price: 2500,
        description: "Công pháp không gian, tăng 20% Xuyên Thấu và Kháng Cự",
        rarity: "epic",
        stats: { penetration: 0.20, resistance: 0.20 },
        skill: { name: "Hư Không", description: "Miễn dịch sát thương trong 2 giây", cooldown: 10 }
    },
    {
        id: "technique_blood_drain",
        name: "Hấp Huyết Đại Pháp",
        type: ITEM_TYPES.TECHNIQUE,
        price: 1800,
        description: "Công pháp tà đạo, tăng 15% Hấp Huyết",
        rarity: "epic",
        stats: { lifesteal: 0.15 },
        skill: { name: "Hấp Huyết", description: "Gây sát thương và hồi 30% sát thương gây ra", cooldown: 5 }
    },
    {
        id: "technique_ice_soul",
        name: "Băng Hồn Quyết",
        type: ITEM_TYPES.TECHNIQUE,
        price: 1200,
        description: "Công pháp băng giá, tăng 10% Phòng Thủ và 10% Kháng Cự",
        rarity: "rare",
        stats: { defense: 0.10, resistance: 0.10 },
        skill: { name: "Băng Phong", description: "Gây sát thương băng bằng 180% Tấn Công", cooldown: 3 }
    },
    {
        id: "technique_flame_emperor",
        name: "Viêm Đế Công",
        type: ITEM_TYPES.TECHNIQUE,
        price: 2200,
        description: "Công pháp lửa mạnh mẽ, tăng 15% Tấn Công và 10% Xuyên Thấu",
        rarity: "epic",
        stats: { attack: 0.15, penetration: 0.10 },
        skill: { name: "Viêm Hoàng Nộ", description: "Gây sát thương lửa bằng 220% Tấn Công", cooldown: 4 }
    },
    {
        id: "technique_shadow_step",
        name: "Ám Ảnh Bộ",
        type: ITEM_TYPES.TECHNIQUE,
        price: 1600,
        description: "Công pháp ám sát, tăng 12% Né Tránh và 8% Chí Mạng",
        rarity: "rare",
        stats: { dodge: 0.12, criticalRate: 0.08 },
        skill: { name: "Bóng Ma", description: "Tăng 100% Chí Mạng cho đòn tiếp theo", cooldown: 5 }
    },
    {
        id: "technique_wind_blade",
        name: "Phong Nhẫn Thuật",
        type: ITEM_TYPES.TECHNIQUE,
        price: 1400,
        description: "Công pháp gió, tăng 12% Tốc Độ và 8% Tấn Công",
        rarity: "rare",
        stats: { speed: 0.12, attack: 0.08 },
        skill: { name: "Cuồng Phong Trảm", description: "Gây 2 đòn liên tiếp, mỗi đòn 100% Tấn Công", cooldown: 3 }
    },
    {
        id: "technique_earth_shield",
        name: "Địa Giáp Thuật",
        type: ITEM_TYPES.TECHNIQUE,
        price: 1100,
        description: "Công pháp phòng thủ, tăng 15% Phòng Thủ và 10% Khí Huyết",
        rarity: "uncommon",
        stats: { defense: 0.15, qiBlood: 0.10 },
        skill: { name: "Đại Địa Hộ", description: "Giảm 50% sát thương nhận trong 3 giây", cooldown: 6 }
    },
    {
        id: "technique_thunder_god",
        name: "Lôi Thần Công",
        type: ITEM_TYPES.TECHNIQUE,
        price: 2800,
        description: "Công pháp sấm sét tối cao, tăng 20% Tấn Công và 15% Chí Mạng",
        rarity: "legendary",
        stats: { attack: 0.20, criticalRate: 0.15 },
        skill: { name: "Thiên Lôi", description: "Gây sát thương sấm bằng 280% Tấn Công", cooldown: 5 }
    },
    {
        id: "technique_healing_spring",
        name: "Linh Tuyền Quyết",
        type: ITEM_TYPES.TECHNIQUE,
        price: 1500,
        description: "Công pháp hồi phục, tăng 10% Hồi Phục và 10% Chân Nguyên",
        rarity: "rare",
        stats: { regeneration: 0.10, zhenYuan: 0.10 },
        skill: { name: "Tuyền Nguyên", description: "Hồi 30% Khí Huyết tối đa", cooldown: 8 }
    },
    {
        id: "technique_armor_break",
        name: "Phá Giáp Quyết",
        type: ITEM_TYPES.TECHNIQUE,
        price: 1700,
        description: "Công pháp phá phòng, tăng 18% Xuyên Thấu",
        rarity: "epic",
        stats: { penetration: 0.18 },
        skill: { name: "Phá Giáp", description: "Bỏ qua 50% Phòng Thủ của đối thủ trong 5 giây", cooldown: 5 }
    },
    {
        id: "technique_counter_stance",
        name: "Phản Kích Thế",
        type: ITEM_TYPES.TECHNIQUE,
        price: 1900,
        description: "Công pháp phản đòn, tăng 10% Phòng Thủ và 10% Tấn Công",
        rarity: "epic",
        stats: { defense: 0.10, attack: 0.10 },
        skill: { name: "Phản Đòn", description: "Phản 40% sát thương nhận về đối thủ", cooldown: 5 }
    },
    {
        id: "technique_chaos_origin",
        name: "Hỗn Độn Nguyên Công",
        type: ITEM_TYPES.TECHNIQUE,
        price: 5000,
        description: "Công pháp thượng cổ, tăng 20% tất cả chỉ số chiến đấu",
        rarity: "legendary",
        stats: { attack: 0.20, defense: 0.20, qiBlood: 0.20, zhenYuan: 0.20, speed: 0.20, criticalRate: 0.10, dodge: 0.10 },
        skill: { name: "Hỗn Độn Nhất Kích", description: "Gây sát thương bằng 350% Tấn Công, bỏ qua kháng cự", cooldown: 8 }
    },

    // ==================== MYTHIC TIER (New - Ultra Powerful) ====================
    {
        id: "technique_myriad_return",
        name: "Vạn Pháp Qui Tông",
        type: ITEM_TYPES.TECHNIQUE,
        price: 0,
        description: "Công pháp tối thượng, tăng 25% mọi chỉ số, bùng nổ 500% Tấn Công + hồi 50% sát thương",
        rarity: "mythic",
        stats: { attack: 0.25, defense: 0.25, qiBlood: 0.25, zhenYuan: 0.25, speed: 0.25, criticalRate: 0.20 },
        skill: { name: "Quy Tông", description: "Bùng nổ 500% Tấn Công, hồi 50% sát thương gây ra", cooldown: 12 },
        unlockCondition: { type: "realm", minLevel: 8 }
    },
    {
        id: "technique_immortal_demon",
        name: "Bất Diệt Ma Công",
        type: ITEM_TYPES.TECHNIQUE,
        price: 0,
        description: "Ma công tối cường, tăng 30% Khí Huyết + 20% Hút Máu + 15% Phòng Thủ, bất tử 4 giây",
        rarity: "mythic",
        stats: { qiBlood: 0.30, lifesteal: 0.20, defense: 0.15, regeneration: 0.10 },
        skill: { name: "Ma Hoá", description: "Miễn dịch mọi sát thương 4 giây, hồi 5% Khí Huyết mỗi giây", cooldown: 15 },
        unlockCondition: { type: "dungeon", minFloor: 12 }
    },
    {
        id: "technique_poison_sovereign",
        name: "Thiên Địch Độc Tôn",
        type: ITEM_TYPES.TECHNIQUE,
        price: 0,
        description: "Độc công tuyệt đỉnh, tăng 35% Tấn Công + 30% Xuyên Thấu, độc tố 10% Khí Huyết tối đa",
        rarity: "mythic",
        stats: { attack: 0.35, penetration: 0.30, criticalRate: 0.15 },
        skill: { name: "Độc Sát", description: "400% Tấn Công + độc tố (10% Khí Huyết tối đa trong 10 giây)", cooldown: 8 },
        unlockCondition: { type: "realm", minLevel: 9 }
    },

    // ==================== LEGENDARY TIER (New - Endgame) ====================
    {
        id: "technique_taiji_profound",
        name: "Thái Cực Huyền Công",
        type: ITEM_TYPES.TECHNIQUE,
        price: 0,
        description: "Âm dương hòa hợp, tăng 18% mọi chỉ số chiến đấu, phạm vi 250% Tấn Công + hồi 30% sát thương",
        rarity: "legendary",
        stats: { attack: 0.18, defense: 0.18, qiBlood: 0.18, speed: 0.18, criticalRate: 0.12 },
        skill: { name: "Âm Dương Hóa", description: "Sát thương phạm vi 250% Tấn Công, hồi 30% sát thương gây ra", cooldown: 7 },
        unlockCondition: { type: "realm", minLevel: 6 }
    },
    {
        id: "technique_blade_mastery",
        name: "Bạt Đao Thuật",
        type: ITEM_TYPES.TECHNIQUE,
        price: 0,
        description: "Đao pháp tuyệt học, tăng 25% Tấn Công + 15% Sát Thương Chí Mạng, 3 chém liên hoàn",
        rarity: "legendary",
        stats: { attack: 0.25, criticalDamage: 15, criticalRate: 0.10 },
        skill: { name: "Bạt Đao", description: "3 đòn liên tiếp, mỗi đòn 120% Tấn Công", cooldown: 5 },
        unlockCondition: { type: "dungeon", minFloor: 8 }
    },
    {
        id: "technique_diamond_body",
        name: "Kim Cang Bất Hoại",
        type: ITEM_TYPES.TECHNIQUE,
        price: 0,
        description: "Phòng thủ tuyệt đối, tăng 25% Phòng Thủ + 20% Khí Huyết + 15% Kháng Cự, lá chắn 40% Khí Huyết tối đa",
        rarity: "legendary",
        stats: { defense: 0.25, qiBlood: 0.20, resistance: 0.15 },
        skill: { name: "Kim Cang", description: "Lá chắn 40% Khí Huyết tối đa trong 8 giây", cooldown: 9 },
        unlockCondition: { type: "realm", minLevel: 7 }
    },
    {
        id: "technique_demon_disintegration",
        name: "Thiên Ma Giải Thể",
        type: ITEM_TYPES.TECHNIQUE,
        price: 0,
        description: "Bạo tẩu hóa ma, tăng 20% Tấn Công + 20% Tốc Độ, đánh đổi -15% Phòng Thủ, chế độ cuồng nộ",
        rarity: "legendary",
        stats: { attack: 0.20, speed: 0.20, defense: -0.15 },
        skill: { name: "Bạo Tẩu", description: "+100% Tấn Công, -50% Phòng Thủ trong 10 giây", cooldown: 8 },
        unlockCondition: { type: "dungeon", minFloor: 9 }
    },
    {
        id: "technique_peerless_healing",
        name: "Vô Song Trị Liệu",
        type: ITEM_TYPES.TECHNIQUE,
        price: 0,
        description: "Y đạo tối cao, tăng 15% Hồi Phục + 15% Chân Nguyên + 10% mọi chỉ số, hồi phục phạm vi 50% Khí Huyết",
        rarity: "legendary",
        stats: { regeneration: 0.15, zhenYuan: 0.15, attack: 0.10, defense: 0.10, qiBlood: 0.10 },
        skill: { name: "Hồi Linh", description: "Hồi 50% Khí Huyết tối đa (phạm vi đồng minh)", cooldown: 10 },
        unlockCondition: { type: "realm", minLevel: 6 }
    },

    // ==================== EPIC TIER (New - Specialized) ====================
    {
        id: "technique_phantom_step",
        name: "Quỷ Mị Bộ Pháp",
        type: ITEM_TYPES.TECHNIQUE,
        price: 0,
        description: "Thân pháp tuyệt diệu, tăng 20% Né Tránh + 15% Tốc Độ, né tránh toàn bộ trong 2 giây",
        rarity: "epic",
        stats: { dodge: 0.20, speed: 0.15, criticalRate: 0.10 },
        skill: { name: "Mị Ảnh", description: "Né tránh hoàn toàn mọi đòn tấn công trong 2 giây", cooldown: 8 },
        unlockCondition: { type: "dungeon", minFloor: 6 }
    },
    {
        id: "technique_heaven_breaker",
        name: "Hỗn Thiên Thủ",
        type: ITEM_TYPES.TECHNIQUE,
        price: 0,
        description: "Phá giáp tuyệt kỹ, tăng 20% Xuyên Thấu + 10% Tỷ Lệ Chí Mạng, bỏ qua toàn bộ giáp",
        rarity: "epic",
        stats: { penetration: 0.20, criticalRate: 0.10, attack: 0.12 },
        skill: { name: "Thủ Phá", description: "Bỏ qua mọi giáp trong một đòn tấn công", cooldown: 6 },
        unlockCondition: { type: "realm", minLevel: 5 }
    },
    {
        id: "technique_blood_burning",
        name: "Nhiên Huyết Quyết",
        type: ITEM_TYPES.TECHNIQUE,
        price: 0,
        description: "Đốt máu tăng sức, tăng 20% Hút Máu + 10% Tấn Công, đánh đổi 20% Khí Huyết lấy +60% Tấn Công",
        rarity: "epic",
        stats: { lifesteal: 0.20, attack: 0.10, criticalRate: 0.08 },
        skill: { name: "Nhiên Huyết", description: "Đốt 20% Khí Huyết → +60% Tấn Công trong 15 giây", cooldown: 7 },
        unlockCondition: { type: "dungeon", minFloor: 7 }
    },
    {
        id: "technique_frost_domain",
        name: "Băng Phong Lĩnh Vực",
        type: ITEM_TYPES.TECHNIQUE,
        price: 0,
        description: "Lĩnh vực băng giá, tăng 15% Phòng Thủ + 15% Kháng Cự, phạm vi giảm 50% Tốc Độ + 30% Tấn Công",
        rarity: "epic",
        stats: { defense: 0.15, resistance: 0.15, qiBlood: 0.10 },
        skill: { name: "Băng Vực", description: "Phạm vi giảm 50% Tốc Độ + 30% Tấn Công trong 8 giây", cooldown: 7 },
        unlockCondition: { type: "realm", minLevel: 5 }
    },

    // ==================== RARE TIER (New - Mid-game) ====================
    {
        id: "technique_sword_dance",
        name: "Kiếm Vũ",
        type: ITEM_TYPES.TECHNIQUE,
        price: 1800,
        description: "Kiếm múa loạn vũ, tăng 15% Tấn Công + 10% Tốc Độ, 4 chém nhanh liên tiếp",
        rarity: "rare",
        stats: { attack: 0.15, speed: 0.10, criticalRate: 0.08 },
        skill: { name: "Kiếm Trận", description: "4 đòn liên tiếp, mỗi đòn 80% Tấn Công", cooldown: 4 },
        unlockCondition: { type: "dungeon", minFloor: 4 }
    },
    {
        id: "technique_guardian_bell",
        name: "Hộ Tâm Chung",
        type: ITEM_TYPES.TECHNIQUE,
        price: 2000,
        description: "Hộ mệnh kỳ bảo, tăng 15% Khí Huyết + 10% Hồi Phục, tái sinh khi chết",
        rarity: "rare",
        stats: { qiBlood: 0.15, regeneration: 0.10, defense: 0.08 },
        skill: { name: "Chung Hộ", description: "Chặn đòn chí mạng, hồi về 30% Khí Huyết (1 lần)", cooldown: 12 },
        unlockCondition: { type: "realm", minLevel: 4 }
    },
    {
        id: "technique_void_palm",
        name: "Phá Không Chưởng",
        type: ITEM_TYPES.TECHNIQUE,
        price: 1600,
        description: "Chưởng pháp hư không, tăng 12% Tấn Công + 12% Tỷ Lệ Chí Mạng, gây choáng 2 giây",
        rarity: "rare",
        stats: { attack: 0.12, criticalRate: 0.12, penetration: 0.08 },
        skill: { name: "Không Chưởng", description: "200% Tấn Công + choáng 2 giây", cooldown: 5 },
        unlockCondition: { type: "dungeon", minFloor: 5 }
    },

    // ==================== DUNGEON EXCLUSIVE TECHNIQUES (DROP ONLY) ====================
    // Các công pháp này CHỈ rơi từ boss bí cảnh, KHÔNG MUA ĐƯỢC trong shop

    // === VÂN VŨ CỐC (Easy) - Không rơi công pháp ===

    // === HỎA DIỄM ĐỘNG (Normal) ===
    {
        id: "technique_fire_cave_flame_burst",
        name: "Hỏa Diễm Bạo Phát",
        type: ITEM_TYPES.TECHNIQUE,
        price: 0,
        description: "Công pháp độc quyền từ Hỏa Diễm Động. Tăng 12% Tấn Công, 8% Xuyên Thấu. Kích hoạt bùng lửa 180% Tấn Công.",
        rarity: "uncommon",
        stats: { attack: 0.12, penetration: 0.08 },
        skill: { name: "Bạo Hỏa", description: "Bùng lửa gây 180% Tấn Công", cooldown: 4 },
        dungeonDrop: true,
        dungeonSource: "fire_cave"
    },

    // === HÀN BĂNG PHONG (Hard) ===
    {
        id: "technique_frost_peak_glacial_heart",
        name: "Băng Tâm Quyết",
        type: ITEM_TYPES.TECHNIQUE,
        price: 0,
        description: "Công pháp độc quyền từ Hàn Băng Phong. Tăng 15% Phòng Thủ, 10% Kháng Cự. Đóng băng kẻ địch 2 giây.",
        rarity: "rare",
        stats: { defense: 0.15, resistance: 0.10 },
        skill: { name: "Băng Tâm", description: "Đóng băng mục tiêu 2 giây, gây 150% Tấn Công", cooldown: 5 },
        dungeonDrop: true,
        dungeonSource: "frost_peak"
    },
    {
        id: "technique_frost_peak_blizzard",
        name: "Bão Tuyết Thuật",
        type: ITEM_TYPES.TECHNIQUE,
        price: 0,
        description: "Công pháp độc quyền từ Hàn Băng Phong. Tăng 10% Tốc Độ, 10% Né Tránh. Triệu hồi bão tuyết phạm vi.",
        rarity: "rare",
        stats: { speed: 0.10, dodge: 0.10 },
        skill: { name: "Bão Tuyết", description: "Phạm vi 120% Tấn Công, giảm 30% Tốc Độ địch", cooldown: 6 },
        dungeonDrop: true,
        dungeonSource: "frost_peak"
    },

    // === U MINH THÂM UYÊN (Nightmare) ===
    {
        id: "technique_dark_abyss_soul_reaper",
        name: "Nhiếp Hồn Đại Pháp",
        type: ITEM_TYPES.TECHNIQUE,
        price: 0,
        description: "Công pháp độc quyền từ U Minh Thâm Uyên. Tăng 18% Tấn Công, 12% Hút Máu. Hấp thu linh hồn để hồi phục.",
        rarity: "epic",
        stats: { attack: 0.18, lifesteal: 0.12 },
        skill: { name: "Nhiếp Hồn", description: "250% Tấn Công, hồi 40% sát thương gây ra", cooldown: 5 },
        dungeonDrop: true,
        dungeonSource: "dark_abyss"
    },
    {
        id: "technique_dark_abyss_void_embrace",
        name: "Hư Vô Ám Mang",
        type: ITEM_TYPES.TECHNIQUE,
        price: 0,
        description: "Công pháp độc quyền từ U Minh Thâm Uyên. Tăng 15% Né Tránh, 15% Kháng Cự. Dịch chuyển vào bóng tối.",
        rarity: "epic",
        stats: { dodge: 0.15, resistance: 0.15 },
        skill: { name: "Ám Mang", description: "Né tránh hoàn toàn 2 đòn tiếp theo", cooldown: 7 },
        dungeonDrop: true,
        dungeonSource: "dark_abyss"
    },

    // === LONG HUYỆT CẤM ĐỊA (Hell) ===
    {
        id: "technique_dragon_nest_dragon_might",
        name: "Long Uy Chấn Thiên",
        type: ITEM_TYPES.TECHNIQUE,
        price: 0,
        description: "Công pháp độc quyền từ Long Huyệt Cấm Địa. Tăng 20% Tấn Công, 15% Chí Mạng. Uy áp của rồng.",
        rarity: "legendary",
        stats: { attack: 0.20, criticalRate: 0.15 },
        skill: { name: "Long Uy", description: "300% Tấn Công, giảm 30% Phòng Thủ địch 5 giây", cooldown: 6 },
        dungeonDrop: true,
        dungeonSource: "dragon_nest"
    },
    {
        id: "technique_dragon_nest_scales",
        name: "Long Lân Hộ Thể",
        type: ITEM_TYPES.TECHNIQUE,
        price: 0,
        description: "Công pháp độc quyền từ Long Huyệt Cấm Địa. Tăng 20% Phòng Thủ, 15% Khí Huyết. Vảy rồng bất hoại.",
        rarity: "legendary",
        stats: { defense: 0.20, qiBlood: 0.15 },
        skill: { name: "Long Lân", description: "Lá chắn 35% Khí Huyết tối đa trong 8 giây", cooldown: 8 },
        dungeonDrop: true,
        dungeonSource: "dragon_nest"
    },

    // === HỖN ĐỘN VỰC (Chaos) ===
    {
        id: "technique_chaos_realm_entropy",
        name: "Hỗn Nguyên Diệt Thế",
        type: ITEM_TYPES.TECHNIQUE,
        price: 0,
        description: "Công pháp độc quyền từ Hỗn Độn Vực. Tăng 22% mọi chỉ số chiến đấu. Phá hủy trật tự.",
        rarity: "mythic",
        stats: { attack: 0.22, defense: 0.22, qiBlood: 0.22, speed: 0.22, criticalRate: 0.15 },
        skill: { name: "Diệt Thế", description: "400% Tấn Công, bỏ qua 50% Phòng Thủ và Kháng Cự", cooldown: 8 },
        dungeonDrop: true,
        dungeonSource: "chaos_realm"
    },
    {
        id: "technique_chaos_realm_primordial",
        name: "Hồng Mông Sơ Khai",
        type: ITEM_TYPES.TECHNIQUE,
        price: 0,
        description: "Công pháp độc quyền từ Hỗn Độn Vực. Tăng 25% Hút Máu, 20% Hồi Phục. Nguồn năng lượng nguyên thủy.",
        rarity: "mythic",
        stats: { lifesteal: 0.25, regeneration: 0.20, qiBlood: 0.15 },
        skill: { name: "Hồng Mông", description: "Hồi 40% Khí Huyết và Chân Nguyên, tăng 50% Hút Máu 10 giây", cooldown: 12 },
        dungeonDrop: true,
        dungeonSource: "chaos_realm"
    },

    // ==================== CÔNG PHÁP ĐỘC QUYỀN RƯƠNG BÁU (LOOTBOX EXCLUSIVE) ====================
    // Các công pháp này CHỈ rơi từ rương báu, KHÔNG BÁN trong shop, KHÔNG rơi từ dungeon

    // === UNCOMMON TIER (Rương Thường - chest_basic) ===
    {
        id: "loot_technique_spirit_sense",
        name: "Linh Giác Thuật",
        type: ITEM_TYPES.TECHNIQUE,
        price: 0,
        description: "Công pháp bí truyền từ rương báu. Tăng 12% Né Tránh và 10% Tốc Độ. Cảm nhận sát khí từ xa.",
        rarity: "uncommon",
        stats: { dodge: 0.12, speed: 0.10 },
        skill: { name: "Linh Giác", description: "Né tránh 2 đòn tiếp theo, +50% Tốc Độ trong 4 giây", cooldown: 4 },
        lootboxExclusive: true
    },
    {
        id: "loot_technique_fortune_palm",
        name: "Phúc Vận Chưởng",
        type: ITEM_TYPES.TECHNIQUE,
        price: 0,
        description: "Công pháp bí truyền từ rương báu. Tăng 15% Tấn Công, 8% Chí Mạng. May mắn luôn đến.",
        rarity: "uncommon",
        stats: { attack: 0.15, criticalRate: 0.08 },
        skill: { name: "Phúc Vận", description: "Đòn tiếp theo chắc chắn gây 250% Tấn Công", cooldown: 3 },
        lootboxExclusive: true
    },
    {
        id: "loot_technique_jade_barrier",
        name: "Ngọc Bích Kết Giới",
        type: ITEM_TYPES.TECHNIQUE,
        price: 0,
        description: "Công pháp bí truyền từ rương báu. Tăng 15% Phòng Thủ và 10% Kháng Cự.",
        rarity: "uncommon",
        stats: { defense: 0.15, resistance: 0.10 },
        skill: { name: "Ngọc Kết", description: "Tạo lá chắn 25% Khí Huyết tối đa trong 5 giây", cooldown: 4 },
        lootboxExclusive: true
    },

    // === RARE TIER (Rương Cao Cấp - chest_advanced) ===
    {
        id: "loot_technique_starfall_strike",
        name: "Lạc Tinh Kích",
        type: ITEM_TYPES.TECHNIQUE,
        price: 0,
        description: "Công pháp bí truyền từ rương báu. Tăng 20% Tấn Công, 12% Chí Mạng. Triệu hồi sao băng.",
        rarity: "rare",
        stats: { attack: 0.20, criticalRate: 0.12 },
        skill: { name: "Lạc Tinh", description: "Gây 280% Tấn Công, 50% cơ hội choáng 2 giây", cooldown: 5 },
        lootboxExclusive: true
    },
    {
        id: "loot_technique_moonlight_veil",
        name: "Nguyệt Ảnh Hóa Thân",
        type: ITEM_TYPES.TECHNIQUE,
        price: 0,
        description: "Công pháp bí truyền từ rương báu. Tăng 18% Né Tránh, 15% Tốc Độ. Hóa thành ánh trăng.",
        rarity: "rare",
        stats: { dodge: 0.18, speed: 0.15 },
        skill: { name: "Nguyệt Ảnh", description: "Bất khả xâm phạm 2.5 giây, hồi 20% Khí Huyết", cooldown: 5 },
        lootboxExclusive: true
    },
    {
        id: "loot_technique_golden_body",
        name: "Kim Thân Bất Động",
        type: ITEM_TYPES.TECHNIQUE,
        price: 0,
        description: "Công pháp bí truyền từ rương báu. Tăng 20% Phòng Thủ, 15% Khí Huyết. Thân kim cương.",
        rarity: "rare",
        stats: { defense: 0.20, qiBlood: 0.15 },
        skill: { name: "Kim Thân", description: "Giảm 70% sát thương nhận trong 5 giây", cooldown: 5 },
        lootboxExclusive: true
    },
    {
        id: "loot_technique_spirit_echo",
        name: "Linh Hồn Hồi Âm",
        type: ITEM_TYPES.TECHNIQUE,
        price: 0,
        description: "Công pháp bí truyền từ rương báu. Tăng 15% Hồi Phục, 15% Chân Nguyên. Hồi máu mạnh.",
        rarity: "rare",
        stats: { regeneration: 0.15, zhenYuan: 0.15 },
        skill: { name: "Hồi Âm", description: "15 giây tiếp theo, hồi 8% sát thương gây ra thành Khí Huyết", cooldown: 5 },
        lootboxExclusive: true
    },

    // === EPIC TIER (Rương Thần Bí - chest_master) ===
    {
        id: "loot_technique_celestial_fury",
        name: "Thiên Nộ Cuồng Kích",
        type: ITEM_TYPES.TECHNIQUE,
        price: 0,
        description: "Công pháp bí truyền từ rương báu. Tăng 25% Tấn Công, 18% Xuyên Thấu. Cuồng nộ thiên đình.",
        rarity: "epic",
        stats: { attack: 0.25, penetration: 0.18 },
        skill: { name: "Thiên Nộ", description: "5 đòn liên tiếp, mỗi đòn 120% Tấn Công, bỏ qua 50% giáp", cooldown: 4 },
        lootboxExclusive: true
    },
    {
        id: "loot_technique_azure_dragon_roar",
        name: "Thanh Long Hống",
        type: ITEM_TYPES.TECHNIQUE,
        price: 0,
        description: "Công pháp bí truyền từ rương báu. Tăng 22% Tấn Công, 22% Khí Huyết. Tiếng gầm Long Thần.",
        rarity: "epic",
        stats: { attack: 0.22, qiBlood: 0.22 },
        skill: { name: "Long Hống", description: "Gây 320% Tấn Công phạm vi, giảm 35% Phòng Thủ địch 6 giây", cooldown: 5 },
        lootboxExclusive: true
    },
    {
        id: "loot_technique_vermillion_shield",
        name: "Chu Tước Hộ Thể",
        type: ITEM_TYPES.TECHNIQUE,
        price: 0,
        description: "Công pháp bí truyền từ rương báu. Tăng 25% Phòng Thủ, 18% Kháng Cự. Lửa Chu Tước.",
        rarity: "epic",
        stats: { defense: 0.25, resistance: 0.18 },
        skill: { name: "Tước Thuẫn", description: "Lá chắn 40% Khí Huyết tối đa, phản 25% sát thương nhận", cooldown: 5 },
        lootboxExclusive: true
    },
    {
        id: "loot_technique_soul_harvest",
        name: "Linh Hồn Thu Hoạch",
        type: ITEM_TYPES.TECHNIQUE,
        price: 0,
        description: "Công pháp bí truyền từ rương báu. Tăng 22% Hút Máu, 15% Chí Mạng. Thu hoạch linh hồn.",
        rarity: "epic",
        stats: { lifesteal: 0.22, criticalRate: 0.15 },
        skill: { name: "Thu Hoạch", description: "Gây 300% Tấn Công, hồi 70% sát thương gây ra", cooldown: 6 },
        lootboxExclusive: true
    },

    // === LEGENDARY TIER (Rương Thần Bí - chest_master, rate thấp) ===
    {
        id: "loot_technique_nine_heavens",
        name: "Cửu Thiên Thần Công",
        type: ITEM_TYPES.TECHNIQUE,
        price: 0,
        description: "Công pháp thượng cổ từ rương báu. Tăng 30% chỉ số tấn công. Sức mạnh 9 tầng trời.",
        rarity: "legendary",
        stats: { attack: 0.30, criticalRate: 0.25, penetration: 0.25, criticalDamage: 0.30 },
        skill: { name: "Cửu Thiên", description: "Gây 450% Tấn Công, bỏ qua toàn bộ giáp và kháng cự", cooldown: 6 },
        lootboxExclusive: true
    },
    {
        id: "loot_technique_eternal_guardian",
        name: "Vĩnh Hằng Hộ Vệ",
        type: ITEM_TYPES.TECHNIQUE,
        price: 0,
        description: "Công pháp thượng cổ từ rương báu. Tăng 28% Phòng Thủ, 28% Khí Huyết, 22% Hồi Phục.",
        rarity: "legendary",
        stats: { defense: 0.28, qiBlood: 0.28, regeneration: 0.22 },
        skill: { name: "Vĩnh Hằng", description: "Miễn dịch sát thương 3 giây, hồi 40% Khí Huyết tối đa", cooldown: 8 },
        lootboxExclusive: true
    },
    {
        id: "loot_technique_yin_yang_fusion",
        name: "Âm Dương Hợp Nhất",
        type: ITEM_TYPES.TECHNIQUE,
        price: 0,
        description: "Công pháp thượng cổ từ rương báu. Tăng 25% mọi chỉ số. Cân bằng âm dương hoàn hảo.",
        rarity: "legendary",
        stats: { attack: 0.25, defense: 0.25, qiBlood: 0.25, speed: 0.25, criticalRate: 0.18, dodge: 0.18 },
        skill: { name: "Hợp Nhất", description: "Chuyển đổi 25% sát thương thành hồi phục, +50% mọi chỉ số 8 giây", cooldown: 8 },
        lootboxExclusive: true
    },

    // === MYTHIC TIER (Rương Thần Bí - chest_master, rate cực thấp) ===
    {
        id: "loot_technique_primordial_chaos",
        name: "Hỗn Nguyên Thái Sơ",
        type: ITEM_TYPES.TECHNIQUE,
        price: 0,
        description: "Công pháp tối thượng từ rương báu. Tăng 35% mọi chỉ số. Sức mạnh hồng hoang.",
        rarity: "mythic",
        stats: { attack: 0.35, defense: 0.35, qiBlood: 0.35, speed: 0.35, criticalRate: 0.30, lifesteal: 0.25 },
        skill: { name: "Thái Sơ", description: "Gây 600% Tấn Công, hồi 50% sát thương, bất khả xâm phạm 3 giây", cooldown: 10 },
        lootboxExclusive: true
    }
];

// ==================== LOOKUP MAPS (O(1) performance) ====================
// Pre-computed lookup tables for fast item access
export const SHOP_ITEMS_MAP = new Map(SHOP_ITEMS.map(item => [item.id, item]));

// Group items by type for quick filtering
export const SHOP_ITEMS_BY_TYPE = SHOP_ITEMS.reduce((acc, item) => {
    (acc[item.type] = acc[item.type] || []).push(item);
    return acc;
}, {});

// Techniques only map for combat calculations
export const TECHNIQUES_MAP = new Map(
    SHOP_ITEMS
        .filter(item => item.type === ITEM_TYPES.TECHNIQUE)
        .map(item => [item.id, item])
);

export default SHOP_ITEMS;
