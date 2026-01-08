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

export const PK_BOTS = [
    // ==================== CẢNH GIỚI 1: PHÀM NHÂN ====================
    {
        id: 'bot_pn_1',
        name: 'Hắc Y Đạo Sĩ',
        realmLevel: 1,
        realmName: 'Phàm Nhân',
        avatar: '/assets/tamma.jpg',
        statMultiplier: 1.0,
        rewardMultiplier: 2,
        skills: ['technique_basic_qi'],
        description: 'Một đạo sĩ bí ẩn trong áo đen, âm thầm tu luyện tà công.'
    },
    {
        id: 'bot_pn_2',
        name: 'Thanh Vân Tiểu Đạo',
        realmLevel: 1,
        realmName: 'Phàm Nhân',
        avatar: '/assets/tienthan.jpg',
        statMultiplier: 1.15,
        rewardMultiplier: 3,
        skills: ['technique_basic_qi'],
        description: 'Đệ tử trẻ của phái Thanh Vân, mới nhập môn tu tiên.'
    },

    // ==================== CẢNH GIỚI 2: LUYỆN KHÍ ====================
    {
        id: 'bot_lk_1',
        name: 'Huyết Ảnh Ma',
        realmLevel: 2,
        realmName: 'Luyện Khí',
        avatar: '/assets/tamma.jpg',
        statMultiplier: 1.05,
        rewardMultiplier: 3,
        skills: ['technique_basic_qi', 'technique_sword_heart'],
        description: 'Ma tu luyện huyết đạo, thường xuyên hút máu tu sĩ.'
    },
    {
        id: 'bot_lk_2',
        name: 'Bạch Mi Đạo Nhân',
        realmLevel: 2,
        realmName: 'Luyện Khí',
        avatar: '/assets/tienthan.jpg',
        statMultiplier: 1.2,
        rewardMultiplier: 4,
        skills: ['technique_basic_qi', 'technique_iron_body'],
        description: 'Lão đạo nhân tu luyện lâu năm, đạo pháp tinh thâm.'
    },

    // ==================== CẢNH GIỚI 3: TRÚC CƠ ====================
    {
        id: 'bot_tc_1',
        name: 'Hồng Liên Tà Sư',
        realmLevel: 3,
        realmName: 'Trúc Cơ',
        avatar: '/assets/tamma.jpg',
        statMultiplier: 1.1,
        rewardMultiplier: 4,
        skills: ['technique_sword_heart', 'technique_blood_drain'],
        description: 'Tà sư điên cuồng, luyện công trên xương cốt đồng đạo.'
    },
    {
        id: 'bot_tc_2',
        name: 'Kiếm Tông Đại Đệ Tử',
        realmLevel: 3,
        realmName: 'Trúc Cơ',
        avatar: '/assets/tienthan.jpg',
        statMultiplier: 1.25,
        rewardMultiplier: 4,
        skills: ['technique_sword_heart', 'technique_lightning_step'],
        description: 'Đại đệ tử phái Kiếm Tông, kiếm thuật siêu quần.'
    },

    // ==================== CẢNH GIỚI 4: KIM ĐAN ====================
    {
        id: 'bot_kd_1',
        name: 'Hắc Phong Trưởng Lão',
        realmLevel: 4,
        realmName: 'Kim Đan',
        avatar: '/assets/tamma.jpg',
        statMultiplier: 1.15,
        rewardMultiplier: 5,
        skills: ['technique_iron_body', 'technique_void_walk'],
        description: 'Trưởng lão tà giáo Hắc Phong, chuyên luyện độc công.'
    },
    {
        id: 'bot_kd_2',
        name: 'Thiên Vân Chân Nhân',
        realmLevel: 4,
        realmName: 'Kim Đan',
        avatar: '/assets/tienthan.jpg',
        statMultiplier: 1.3,
        rewardMultiplier: 5,
        skills: ['technique_dragon_breath', 'technique_lightning_step'],
        description: 'Chân nhân phái Thiên Vân, đạo hạnh thâm hậu.'
    },

    // ==================== CẢNH GIỚI 5: NGUYÊN ANH ====================
    {
        id: 'bot_na_1',
        name: 'Vạn Độc Ma Tôn',
        realmLevel: 5,
        realmName: 'Nguyên Anh',
        avatar: '/assets/tamma.jpg',
        statMultiplier: 1.2,
        rewardMultiplier: 5,
        skills: ['technique_blood_drain', 'technique_void_walk'],
        description: 'Ma tôn luyện vạn loại độc dược, độc công vô song.'
    },
    {
        id: 'bot_na_2',
        name: 'Thanh Liên Kiếm Tiên',
        realmLevel: 5,
        realmName: 'Nguyên Anh',
        avatar: '/assets/tienthan.jpg',
        statMultiplier: 1.35,
        rewardMultiplier: 6,
        skills: ['technique_sword_heart', 'technique_dragon_breath'],
        description: 'Kiếm tiên thanh cao, chém kiếm phóng ra kiếm quang ngàn trượng.'
    },

    // ==================== CẢNH GIỚI 6: HÓA THẦN ====================
    {
        id: 'bot_ht_1',
        name: 'Cửu U Ma Đế',
        realmLevel: 6,
        realmName: 'Hóa Thần',
        avatar: '/assets/tamma.jpg',
        statMultiplier: 1.25,
        rewardMultiplier: 6,
        skills: ['technique_blood_drain', 'technique_void_walk', 'technique_dragon_breath'],
        description: 'Ma đế cai quản cửu u, thần hồn cực kỳ mạnh mẽ.'
    },
    {
        id: 'bot_ht_2',
        name: 'Huyền Nguyệt Đạo Quân',
        realmLevel: 6,
        realmName: 'Hóa Thần',
        avatar: '/assets/tienthan.jpg',
        statMultiplier: 1.4,
        rewardMultiplier: 6,
        skills: ['technique_phoenix_rebirth', 'technique_void_walk'],
        description: 'Đạo quân tu luyện dưới ánh trăng, đắc đạo thàng tiên.'
    },

    // ==================== CẢNH GIỚI 7: LUYỆN HƯ ====================
    {
        id: 'bot_lh_1',
        name: 'Thiên Ma Tổ Sư',
        realmLevel: 7,
        realmName: 'Luyện Hư',
        avatar: '/assets/tamma.jpg',
        statMultiplier: 1.3,
        rewardMultiplier: 7,
        skills: ['technique_blood_drain', 'technique_phoenix_rebirth', 'technique_void_walk'],
        description: 'Tổ sư thiên ma đạo, sức mạnh kinh thiên động địa.'
    },
    {
        id: 'bot_lh_2',
        name: 'Kiếm Đạo Chí Tôn',
        realmLevel: 7,
        realmName: 'Luyện Hư',
        avatar: '/assets/tienthan.jpg',
        statMultiplier: 1.5,
        rewardMultiplier: 8,
        skills: ['technique_sword_heart', 'technique_phoenix_rebirth', 'technique_lightning_step'],
        description: 'Chí tôn kiếm đạo, một kiếm phá vạn pháp.'
    },

    // ==================== CẢNH GIỚI 8: HỢP THỂ ====================
    {
        id: 'bot_hth_1',
        name: 'Huyết Hải Ma Vương',
        realmLevel: 8,
        realmName: 'Hợp Thể',
        avatar: '/assets/tamma.jpg',
        statMultiplier: 1.35,
        rewardMultiplier: 8,
        skills: ['technique_blood_drain', 'technique_phoenix_rebirth', 'technique_void_walk'],
        description: 'Ma vương thống lĩnh huyết hải, giết người vô số.'
    },
    {
        id: 'bot_hth_2',
        name: 'Thái Cổ Tiên Tôn',
        realmLevel: 8,
        realmName: 'Hợp Thể',
        avatar: '/assets/tienthan.jpg',
        statMultiplier: 1.6,
        rewardMultiplier: 8,
        skills: ['technique_phoenix_rebirth', 'technique_dragon_breath', 'technique_void_walk'],
        description: 'Tiên tôn từ thái cổ, tồn tại hàng vạn năm.'
    },

    // ==================== CẢNH GIỚI 9: ĐẠI THỪA ====================
    {
        id: 'bot_dth_1',
        name: 'Cửu Thiên Ma Tổ',
        realmLevel: 9,
        realmName: 'Đại Thừa',
        avatar: '/assets/tamma.jpg',
        statMultiplier: 1.4,
        rewardMultiplier: 9,
        skills: ['technique_blood_drain', 'technique_phoenix_rebirth', 'technique_void_walk', 'technique_dragon_breath'],
        description: 'Ma tổ cửu thiên, từng đấu với Thiên Đạo.'
    },
    {
        id: 'bot_dth_2',
        name: 'Hư Không Đại Năng',
        realmLevel: 9,
        realmName: 'Đại Thừa',
        avatar: '/assets/tienthan.jpg',
        statMultiplier: 1.7,
        rewardMultiplier: 10,
        skills: ['technique_phoenix_rebirth', 'technique_void_walk', 'technique_sword_heart', 'technique_lightning_step'],
        description: 'Đại năng giả ngự trị hư không, pháp lực thông thiên.'
    },

    // ==================== CẢNH GIỚI 10: CHÂN TIÊN ====================
    {
        id: 'bot_ct_1',
        name: 'Hắc Án Thiên Ma',
        realmLevel: 10,
        realmName: 'Chân Tiên',
        avatar: '/assets/tamma.jpg',
        statMultiplier: 1.45,
        rewardMultiplier: 10,
        skills: ['technique_blood_drain', 'technique_phoenix_rebirth', 'technique_void_walk', 'technique_dragon_breath'],
        description: 'Thiên ma đến từ hắc ám, đã vượt qua thiên kiếp.'
    },
    {
        id: 'bot_ct_2',
        name: 'Thái Thượng Tiên Tổ',
        realmLevel: 10,
        realmName: 'Chân Tiên',
        avatar: '/assets/tienthan.jpg',
        statMultiplier: 1.8,
        rewardMultiplier: 12,
        skills: ['technique_phoenix_rebirth', 'technique_void_walk', 'technique_dragon_breath', 'technique_sword_heart'],
        description: 'Tiên tổ thái thượng, chính thức bước vào tiên đạo.'
    },

    // ==================== CẢNH GIỚI 11: KIM TIÊN ====================
    {
        id: 'bot_kt_1',
        name: 'Vô Tận Ma Tôn',
        realmLevel: 11,
        realmName: 'Kim Tiên',
        avatar: '/assets/tamma.jpg',
        statMultiplier: 1.5,
        rewardMultiplier: 12,
        skills: ['technique_blood_drain', 'technique_phoenix_rebirth', 'technique_void_walk', 'technique_dragon_breath'],
        description: 'Ma tôn vô tận, tiên lực ngưng luyện, bất tử bất diệt.'
    },
    {
        id: 'bot_kt_2',
        name: 'Kim Tiên Đạo Tổ',
        realmLevel: 11,
        realmName: 'Kim Tiên',
        avatar: '/assets/tienthan.jpg',
        statMultiplier: 1.9,
        rewardMultiplier: 14,
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
        statMultiplier: 1.6,
        rewardMultiplier: 14,
        skills: ['technique_blood_drain', 'technique_phoenix_rebirth', 'technique_void_walk', 'technique_dragon_breath', 'technique_sword_heart'],
        description: 'Tiên Vương từ hắc ám, thống lĩnh một phương tiên giới.'
    },
    {
        id: 'bot_tv_2',
        name: 'Đông Hoàng Tiên Vương',
        realmLevel: 12,
        realmName: 'Tiên Vương',
        avatar: '/assets/tienthan.jpg',
        statMultiplier: 2.0,
        rewardMultiplier: 16,
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
        statMultiplier: 1.7,
        rewardMultiplier: 16,
        skills: ['technique_blood_drain', 'technique_phoenix_rebirth', 'technique_void_walk', 'technique_dragon_breath', 'technique_sword_heart'],
        description: 'Ma thần sinh ra từ hỗn độn, chấp chưởng đại đạo.'
    },
    {
        id: 'bot_tde_2',
        name: 'Thái Cổ Tiên Đế',
        realmLevel: 13,
        realmName: 'Tiên Đế',
        avatar: '/assets/tienthan.jpg',
        statMultiplier: 2.2,
        rewardMultiplier: 18,
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
        statMultiplier: 1.5,
        rewardMultiplier: 18,
        skills: ['technique_blood_drain', 'technique_phoenix_rebirth', 'technique_void_walk', 'technique_dragon_breath', 'technique_sword_heart'],
        description: 'Thiên Đế từ hắc ám, sức mạnh hủy diệt thiên địa.'
    },
    {
        id: 'bot_thd_2',
        name: 'Thiên Đạo Hóa Thân',
        realmLevel: 14,
        realmName: 'Thiên Đế',
        avatar: '/assets/tienthan.jpg',
        statMultiplier: 1.8,
        rewardMultiplier: 20,
        skills: ['technique_phoenix_rebirth', 'technique_void_walk', 'technique_dragon_breath', 'technique_sword_heart', 'technique_lightning_step'],
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

export default PK_BOTS;
