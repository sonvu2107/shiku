/**
 * PK Bots - Danh sách bot NPC cho hệ thống Luận Võ
 * 
 * Mỗi cảnh giới có 2 bots với:
 * - statMultiplier: Nhân chỉ số base của cảnh giới
 * - rewardMultiplier: Nhân phần thưởng khi thắng
 * - skills: Danh sách technique IDs bot sở hữu
 * 
 * 14 Cảnh Giới:
 * 1-Phàm Nhân, 2-Luyện Khí, 3-Trúc Cơ, 4-Kim Đan, 5-Nguyên Anh,
 * 6-Hóa Thần, 7-Luyện Hư, 8-Hợp Thể, 9-Đại Thừa, 10-Chân Tiên,
 * 11-Kim Tiên, 12-Tiên Vương, 13-Tiên Đế, 14-Thiên Đế
 */

// Base stats by realm level (SCALED FOR COMBAT - ~4x to 8x Naked Stats)
// Stats này đã bao gồm giả định về kỹ năng/trang bị cơ bản của NPC
// Stats này đã bao gồm giả định về kỹ năng/trang bị cơ bản của NPC
export const REALM_BASE_STATS = {
    1: { attack: 40, defense: 20, qiBlood: 400 },           // Phàm Nhân (x4)
    2: { attack: 110, defense: 55, qiBlood: 1200 },         // Luyện Khí (x4.8)
    3: { attack: 250, defense: 125, qiBlood: 2800 },        // Trúc Cơ (x5.6)
    4: { attack: 600, defense: 300, qiBlood: 6500 },        // Kim Đan (x6.5)
    5: { attack: 1400, defense: 700, qiBlood: 15000 },      // Nguyên Anh (x7.5)
    6: { attack: 3000, defense: 1500, qiBlood: 32000 },     // Hóa Thần (x8)
    7: { attack: 6400, defense: 3200, qiBlood: 68000 },     // Luyện Hư (x8.5)
    8: { attack: 13000, defense: 6500, qiBlood: 140000 },   // Hợp Thể (x8.75)
    9: { attack: 28000, defense: 14000, qiBlood: 300000 },  // Đại Thừa (x9)
    10: { attack: 60000, defense: 30000, qiBlood: 650000 }, // Chân Tiên (~x10)
    11: { attack: 130000, defense: 65000, qiBlood: 1400000 }, // Kim Tiên (~x11)
    12: { attack: 280000, defense: 140000, qiBlood: 3000000 }, // Tiên Vương (~x11.7)
    13: { attack: 600000, defense: 300000, qiBlood: 6500000 }, // Tiên Đế (~x12.7)
    14: { attack: 1300000, defense: 650000, qiBlood: 14000000 } // Thiên Đế (~x13.6 - Max ~36m HP with 2.6x mult)
};

// Skill pool for random assignment if needed, or specific bot skills
const SKILL_POOL = [
    'technique_basic_qi', 'technique_sword_heart', 'technique_iron_body',
    'technique_lightning_step', 'technique_fire_ball', 'technique_ice_sherd',
    'technique_blood_drain', 'technique_void_walk', 'technique_dragon_breath',
    'technique_phoenix_rebirth', 'technique_cursed_seal'
];

export const PK_BOTS = [
    // ... (Keep existing bot definitions, their multipliers will now apply to these HIGHER base stats)
    // ==================== CẢNH GIỚI 1: PHÀM NHÂN ====================
    {
        id: 'bot_pn_1',
        name: 'Hắc Y Đạo Sĩ',
        realmLevel: 1,
        realmName: 'Phàm Nhân',
        avatar: '/assets/tamma.jpg',
        statMultiplier: 1.0, // Reduced slightly as base is higher
        rewardMultiplier: 3,
        skills: ['technique_basic_qi', 'technique_fire_ball'],
        description: 'Một đạo sĩ bí ẩn trong áo đen, âm thầm tu luyện tà công.'
    },
    {
        id: 'bot_pn_2',
        name: 'Thanh Vân Tiểu Đạo',
        realmLevel: 1,
        realmName: 'Phàm Nhân',
        avatar: '/assets/tienthan.jpg',
        statMultiplier: 1.2,
        rewardMultiplier: 4,
        skills: ['technique_basic_qi', 'technique_sword_heart'],
        description: 'Đệ tử trẻ của phái Thanh Vân, mới nhập môn tu tiên.'
    },

    // ==================== CẢNH GIỚI 2: LUYỆN KHÍ ====================
    {
        id: 'bot_lk_1',
        name: 'Huyết Ảnh Ma',
        realmLevel: 2,
        realmName: 'Luyện Khí',
        avatar: '/assets/tamma.jpg',
        statMultiplier: 1.0,
        rewardMultiplier: 4,
        skills: ['technique_basic_qi', 'technique_sword_heart', 'technique_blood_drain'],
        description: 'Ma tu luyện huyết đạo, thường xuyên hút máu tu sĩ.'
    },
    {
        id: 'bot_lk_2',
        name: 'Bạch Mi Đạo Nhân',
        realmLevel: 2,
        realmName: 'Luyện Khí',
        avatar: '/assets/tienthan.jpg',
        statMultiplier: 1.25,
        rewardMultiplier: 5,
        skills: ['technique_basic_qi', 'technique_iron_body', 'technique_lightning_step'],
        description: 'Lão đạo nhân tu luyện lâu năm, đạo pháp tinh thâm.'
    },

    // ==================== CẢNH GIỚI 3: TRÚC CƠ ====================
    {
        id: 'bot_tc_1',
        name: 'Hồng Liên Tà Sư',
        realmLevel: 3,
        realmName: 'Trúc Cơ',
        avatar: '/assets/tamma.jpg',
        statMultiplier: 1.05,
        rewardMultiplier: 5,
        skills: ['technique_sword_heart', 'technique_blood_drain', 'technique_fire_ball'],
        description: 'Tà sư điên cuồng, luyện công trên xương cốt đồng đạo.'
    },
    {
        id: 'bot_tc_2',
        name: 'Kiếm Tông Đại Đệ Tử',
        realmLevel: 3,
        realmName: 'Trúc Cơ',
        avatar: '/assets/tienthan.jpg',
        statMultiplier: 1.3,
        rewardMultiplier: 6,
        skills: ['technique_sword_heart', 'technique_lightning_step', 'technique_ice_sherd'],
        description: 'Đại đệ tử phái Kiếm Tông, kiếm thuật siêu quần.'
    },

    // ==================== CẢNH GIỚI 4: KIM ĐAN ====================
    {
        id: 'bot_kd_1',
        name: 'Hắc Phong Trưởng Lão',
        realmLevel: 4,
        realmName: 'Kim Đan',
        avatar: '/assets/tamma.jpg',
        statMultiplier: 1.1,
        rewardMultiplier: 6,
        skills: ['technique_iron_body', 'technique_void_walk', 'technique_blood_drain'],
        description: 'Trưởng lão tà giáo Hắc Phong, chuyên luyện độc công.'
    },
    {
        id: 'bot_kd_2',
        name: 'Thiên Vân Chân Nhân',
        realmLevel: 4,
        realmName: 'Kim Đan',
        avatar: '/assets/tienthan.jpg',
        statMultiplier: 1.35,
        rewardMultiplier: 7,
        skills: ['technique_dragon_breath', 'technique_lightning_step', 'technique_sword_heart'],
        description: 'Chân nhân phái Thiên Vân, đạo hạnh thâm hậu.'
    },

    // ==================== CẢNH GIỚI 5: NGUYÊN ANH ====================
    {
        id: 'bot_na_1',
        name: 'Vạn Độc Ma Tôn',
        realmLevel: 5,
        realmName: 'Nguyên Anh',
        avatar: '/assets/tamma.jpg',
        statMultiplier: 1.15,
        rewardMultiplier: 8,
        skills: ['technique_blood_drain', 'technique_void_walk', 'technique_fire_ball'],
        description: 'Ma tôn luyện vạn loại độc dược, độc công vô song.'
    },
    {
        id: 'bot_na_2',
        name: 'Thanh Liên Kiếm Tiên',
        realmLevel: 5,
        realmName: 'Nguyên Anh',
        avatar: '/assets/tienthan.jpg',
        statMultiplier: 1.4,
        rewardMultiplier: 10,
        skills: ['technique_sword_heart', 'technique_dragon_breath', 'technique_ice_sherd'],
        description: 'Kiếm tiên thanh cao, chém kiếm phóng ra kiếm quang ngàn trượng.'
    },

    // ==================== CẢNH GIỚI 6: HÓA THẦN ====================
    {
        id: 'bot_ht_1',
        name: 'Cửu U Ma Đế',
        realmLevel: 6,
        realmName: 'Hóa Thần',
        avatar: '/assets/tamma.jpg',
        statMultiplier: 1.2,
        rewardMultiplier: 10,
        skills: ['technique_blood_drain', 'technique_void_walk', 'technique_dragon_breath', 'technique_phoenix_rebirth'],
        description: 'Ma đế cai quản cửu u, thần hồn cực kỳ mạnh mẽ.'
    },
    {
        id: 'bot_ht_2',
        name: 'Huyền Nguyệt Đạo Quân',
        realmLevel: 6,
        realmName: 'Hóa Thần',
        avatar: '/assets/tienthan.jpg',
        statMultiplier: 1.5,
        rewardMultiplier: 12,
        skills: ['technique_phoenix_rebirth', 'technique_void_walk', 'technique_sword_heart', 'technique_lightning_step'],
        description: 'Đạo quân tu luyện dưới ánh trăng, đắc đạo thàng tiên.'
    },

    // ==================== CẢNH GIỚI 7: LUYỆN HƯ ====================
    {
        id: 'bot_lh_1',
        name: 'Thiên Ma Tổ Sư',
        realmLevel: 7,
        realmName: 'Luyện Hư',
        avatar: '/assets/tamma.jpg',
        statMultiplier: 1.25,
        rewardMultiplier: 12,
        skills: ['technique_blood_drain', 'technique_phoenix_rebirth', 'technique_void_walk', 'technique_fire_ball'],
        description: 'Tổ sư thiên ma đạo, sức mạnh kinh thiên động địa.'
    },
    {
        id: 'bot_lh_2',
        name: 'Kiếm Đạo Chí Tôn',
        realmLevel: 7,
        realmName: 'Luyện Hư',
        avatar: '/assets/tienthan.jpg',
        statMultiplier: 1.6,
        rewardMultiplier: 15,
        skills: ['technique_sword_heart', 'technique_phoenix_rebirth', 'technique_lightning_step', 'technique_dragon_breath'],
        description: 'Chí tôn kiếm đạo, một kiếm phá vạn pháp.'
    },

    // ==================== CẢNH GIỚI 8: HỢP THỂ ====================
    {
        id: 'bot_hth_1',
        name: 'Huyết Hải Ma Vương',
        realmLevel: 8,
        realmName: 'Hợp Thể',
        avatar: '/assets/tamma.jpg',
        statMultiplier: 1.3,
        rewardMultiplier: 15,
        skills: ['technique_blood_drain', 'technique_phoenix_rebirth', 'technique_void_walk', 'technique_dragon_breath', 'technique_ice_sherd'],
        description: 'Ma vương thống lĩnh huyết hải, giết người vô số.'
    },
    {
        id: 'bot_hth_2',
        name: 'Thái Cổ Tiên Tôn',
        realmLevel: 8,
        realmName: 'Hợp Thể',
        avatar: '/assets/tienthan.jpg',
        statMultiplier: 1.7,
        rewardMultiplier: 18,
        skills: ['technique_phoenix_rebirth', 'technique_dragon_breath', 'technique_void_walk', 'technique_lightning_step', 'technique_sword_heart'],
        description: 'Tiên tôn từ thái cổ, tồn tại hàng vạn năm.'
    },

    // ==================== CẢNH GIỚI 9: ĐẠI THỪA ====================
    {
        id: 'bot_dth_1',
        name: 'Cửu Thiên Ma Tổ',
        realmLevel: 9,
        realmName: 'Đại Thừa',
        avatar: '/assets/tamma.jpg',
        statMultiplier: 1.35,
        rewardMultiplier: 18,
        skills: ['technique_blood_drain', 'technique_phoenix_rebirth', 'technique_void_walk', 'technique_dragon_breath', 'technique_fire_ball'],
        description: 'Ma tổ cửu thiên, từng đấu với Thiên Đạo.'
    },
    {
        id: 'bot_dth_2',
        name: 'Hư Không Đại Năng',
        realmLevel: 9,
        realmName: 'Đại Thừa',
        avatar: '/assets/tienthan.jpg',
        statMultiplier: 1.8,
        rewardMultiplier: 20,
        skills: ['technique_phoenix_rebirth', 'technique_void_walk', 'technique_sword_heart', 'technique_lightning_step', 'technique_ice_sherd'],
        description: 'Đại năng giả ngự trị hư không, pháp lực thông thiên.'
    },

    // ==================== CẢNH GIỚI 10: CHÂN TIÊN ====================
    {
        id: 'bot_ct_1',
        name: 'Hắc Án Thiên Ma',
        realmLevel: 10,
        realmName: 'Chân Tiên',
        avatar: '/assets/tamma.jpg',
        statMultiplier: 1.4,
        rewardMultiplier: 20,
        skills: ['technique_blood_drain', 'technique_phoenix_rebirth', 'technique_void_walk', 'technique_dragon_breath', 'technique_sword_heart'],
        description: 'Thiên ma đến từ hắc ám, đã vượt qua thiên kiếp.'
    },
    {
        id: 'bot_ct_2',
        name: 'Thái Thượng Tiên Tổ',
        realmLevel: 10,
        realmName: 'Chân Tiên',
        avatar: '/assets/tienthan.jpg',
        statMultiplier: 1.9,
        rewardMultiplier: 25,
        skills: ['technique_phoenix_rebirth', 'technique_void_walk', 'technique_dragon_breath', 'technique_sword_heart', 'technique_lightning_step'],
        description: 'Tiên tổ thái thượng, chính thức bước vào tiên đạo.'
    },

    // ==================== CẢNH GIỚI 11: KIM TIÊN ====================
    {
        id: 'bot_kt_1',
        name: 'Vô Tận Ma Tôn',
        realmLevel: 11,
        realmName: 'Kim Tiên',
        avatar: '/assets/tamma.jpg',
        statMultiplier: 1.45,
        rewardMultiplier: 25,
        skills: ['technique_blood_drain', 'technique_phoenix_rebirth', 'technique_void_walk', 'technique_dragon_breath', 'technique_ice_sherd'],
        description: 'Ma tôn vô tận, tiên lực ngưng luyện, bất tử bất diệt.'
    },
    {
        id: 'bot_kt_2',
        name: 'Kim Tiên Đạo Tổ',
        realmLevel: 11,
        realmName: 'Kim Tiên',
        avatar: '/assets/tienthan.jpg',
        statMultiplier: 2.0,
        rewardMultiplier: 30,
        skills: ['technique_phoenix_rebirth', 'technique_void_walk', 'technique_dragon_breath', 'technique_sword_heart', 'technique_lightning_step'],
        description: 'Đạo tổ Kim Tiên, tiên lực viên mãn.'
    },

    // ==================== CẢNH GIỚI 12: TIÊN VƯƠNG ====================
    {
        id: 'bot_tv_1',
        name: 'Hắc Tiên Vương',
        realmLevel: 12,
        realmName: 'Tiên Vương',
        avatar: '/assets/tamma.jpg',
        statMultiplier: 1.5,
        rewardMultiplier: 30,
        skills: ['technique_blood_drain', 'technique_phoenix_rebirth', 'technique_void_walk', 'technique_dragon_breath', 'technique_sword_heart'],
        description: 'Tiên Vương từ hắc ám, thống lĩnh một phương tiên giới.'
    },
    {
        id: 'bot_tv_2',
        name: 'Đông Hoàng Tiên Vương',
        realmLevel: 12,
        realmName: 'Tiên Vương',
        avatar: '/assets/tienthan.jpg',
        statMultiplier: 2.1,
        rewardMultiplier: 35,
        skills: ['technique_phoenix_rebirth', 'technique_void_walk', 'technique_dragon_breath', 'technique_sword_heart', 'technique_lightning_step'],
        description: 'Đông Hoàng Tiên Vương, thống lĩnh Đông Thiên Tiên Giới.'
    },

    // ==================== CẢNH GIỚI 13: TIÊN ĐẾ ====================
    {
        id: 'bot_tde_1',
        name: 'Hỗn Độn Ma Thần',
        realmLevel: 13,
        realmName: 'Tiên Đế',
        avatar: '/assets/tamma.jpg',
        statMultiplier: 1.55,
        rewardMultiplier: 35,
        skills: ['technique_blood_drain', 'technique_phoenix_rebirth', 'technique_void_walk', 'technique_cursed_seal', 'technique_sword_heart'],
        description: 'Ma thần sinh ra từ hỗn độn, chấp chưởng đại đạo.'
    },
    {
        id: 'bot_tde_2',
        name: 'Thái Cổ Tiên Đế',
        realmLevel: 13,
        realmName: 'Tiên Đế',
        avatar: '/assets/tienthan.jpg',
        statMultiplier: 2.2,
        rewardMultiplier: 40,
        skills: ['technique_phoenix_rebirth', 'technique_void_walk', 'technique_dragon_breath', 'technique_sword_heart', 'technique_lightning_step'],
        description: 'Tiên Đế thái cổ, hiệu lệnh tiên giới.'
    },

    // ==================== CẢNH GIỚI 14: THIÊN ĐẾ ====================
    {
        id: 'bot_thd_1',
        name: 'Hắc Ám Thiên Đế',
        realmLevel: 14,
        realmName: 'Thiên Đế',
        avatar: '/assets/tamma.jpg',
        statMultiplier: 1.6,
        rewardMultiplier: 30,
        skills: ['technique_blood_drain', 'technique_phoenix_rebirth', 'technique_void_walk', 'technique_cursed_seal', 'technique_dragon_breath'],
        description: 'Thiên Đế từ hắc ám, sức mạnh hủy diệt thiên địa.'
    },
    {
        id: 'bot_thd_2',
        name: 'Thiên Đạo Hóa Thân',
        realmLevel: 14,
        realmName: 'Thiên Đế',
        avatar: '/assets/tienthan.jpg',
        statMultiplier: 2.4, // Buffed to reach ~33m HP
        rewardMultiplier: 40,
        skills: ['technique_phoenix_rebirth', 'technique_void_walk', 'technique_cursed_seal', 'technique_sword_heart', 'technique_lightning_step'],
        description: 'Hóa thân của Thiên Đạo, thiên địa đồng thọ.'
    }
];

// Cooldown khi đánh bot (30 giây)
export const BOT_BATTLE_COOLDOWN = 30 * 1000; // 30 seconds in ms

/**
 * Lấy danh sách bots theo realm level
 * @param {number} realmLevel - Cảnh giới của user
 * @returns {Array} Danh sách bots trong khoảng ±1 cảnh giới
 */
export const getBotsByRealmLevel = (realmLevel) => {
    return PK_BOTS.filter(bot =>
        bot.realmLevel >= Math.max(1, realmLevel - 1) &&
        bot.realmLevel <= Math.min(14, realmLevel + 1)
    );
};

/**
 * Lấy một bot theo ID
 * @param {string} botId - ID của bot
 * @returns {Object|null} Bot object hoặc null
 */
export const getBotById = (botId) => {
    return PK_BOTS.find(bot => bot.id === botId) || null;
};

/**
 * Tính stats cho bot dựa trên base stats realm và multiplier
 * @param {Object} bot - Bot object template
 * @returns {Object} Final combat stats
 */
export const calculateBotStats = (bot) => {
    const base = REALM_BASE_STATS[bot.realmLevel] || REALM_BASE_STATS[1];
    const multiplier = bot.statMultiplier || 1.0;

    // Base Calculation
    const stats = {
        attack: Math.floor(base.attack * multiplier),
        defense: Math.floor(base.defense * multiplier),
        qiBlood: Math.floor(base.qiBlood * multiplier),
        maxQiBlood: Math.floor(base.qiBlood * multiplier),
        // Boost ZhenYuan ratio to 0.7 (was 0.5) because players often have high MP
        zhenYuan: Math.floor(base.qiBlood * multiplier * 0.7),
        maxZhenYuan: Math.floor(base.qiBlood * multiplier * 0.7),

        // Scaled Secondary Stats
        speed: 10 + bot.realmLevel * 5, // Faster with realm
        criticalRate: Math.min(50, 10 + bot.realmLevel * 2), // Cap 50
        criticalDamage: 150 + bot.realmLevel * 10,
        dodge: Math.min(40, 5 + bot.realmLevel * 1.5),
        lifesteal: bot.realmLevel >= 10 ? 15 : (bot.realmLevel >= 5 ? 10 : 0),

        realmLevel: bot.realmLevel,
        realmName: bot.realmName
    };

    return stats;
};

export default PK_BOTS;
