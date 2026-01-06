import mongoose from "mongoose";

/**
 * Dungeon System - Hệ Thống Bí Cảnh
 * 
 * File này chứa:
 * - DUNGEON_TEMPLATES: Định nghĩa các bí cảnh có sẵn
 * - DUNGEON_MONSTERS: Quái vật trong từng bí cảnh
 * - FLOOR_REWARDS: Phần thưởng theo tầng
 * - DungeonRun Schema: Lưu lịch sử mỗi lần chạy dungeon
 */

// ==================== DIFFICULTY CONFIG ====================
export const DIFFICULTY_CONFIG = {
    easy: {
        floors: 5,
        baseSpiritStoneCost: 30,
        cooldownHours: 0.33, // 20 phút (giảm 67% từ 1 giờ)
        expMultiplier: 1,
        rewardMultiplier: 1,
        monsterStatMultiplier: 0.6
    },
    normal: {
        floors: 7,
        baseSpiritStoneCost: 60,
        cooldownHours: 0.67, // 40 phút (giảm 67% từ 2 giờ)
        expMultiplier: 1.5,
        rewardMultiplier: 1.3,
        monsterStatMultiplier: 0.8
    },
    hard: {
        floors: 10,
        baseSpiritStoneCost: 100,
        cooldownHours: 1, // 1 giờ (giảm 67% từ 3 giờ)
        expMultiplier: 2,
        rewardMultiplier: 1.6,
        monsterStatMultiplier: 1.0
    },
    nightmare: {
        floors: 12,
        baseSpiritStoneCost: 150,
        cooldownHours: 1.5, // 1.5 giờ (giảm 70% từ 5 giờ)
        expMultiplier: 3,
        rewardMultiplier: 2,
        monsterStatMultiplier: 1.3
    },
    hell: {
        floors: 15,
        baseSpiritStoneCost: 250,
        cooldownHours: 2, // 2 giờ (giảm 67% từ 6 giờ)
        expMultiplier: 5,
        rewardMultiplier: 3,
        monsterStatMultiplier: 1.6
    },
    chaos: {
        floors: 20,
        baseSpiritStoneCost: 500,
        cooldownHours: 2.5, // 2.5 giờ (giảm 69% từ 8 giờ)
        expMultiplier: 10,
        rewardMultiplier: 5,
        monsterStatMultiplier: 2.0 // Will be overridden by player-based scaling
    }
};

// ==================== MONSTER SKILLS DEFINITIONS ====================
// Skills are auto-used by monsters when off cooldown and have enough mana
// damageMultiplier is applied to monster's ATTACK stat for scaling
// Higher difficulty = stronger multipliers
export const MONSTER_SKILLS = {
    // Easy dungeon skills (basic, low multipliers)
    mist_valley: {
        normal: [], // Normal mobs don't have skills in easy dungeon
        elite: [
            { name: 'Vân Vũ Kích', damageMultiplier: 0.5, cooldown: 4, manaCost: 15, description: 'Tấn công bằng sương mù' }
        ],
        boss: [
            { name: 'Vân Vũ Trận', damageMultiplier: 0.8, cooldown: 3, manaCost: 20, description: 'Triệu hồi trận pháp sương mù' },
            { name: 'Mê Ảnh Thuật', damageMultiplier: 0.6, cooldown: 4, manaCost: 25, description: 'Ảo ảnh gây rối loạn' }
        ]
    },
    // Normal dungeon skills
    fire_cave: {
        normal: [
            { name: 'Hỏa Diễm Phún', damageMultiplier: 0.4, cooldown: 5, manaCost: 10, description: 'Phun lửa cơ bản' }
        ],
        elite: [
            { name: 'Hỏa Ngục Trận', damageMultiplier: 0.7, cooldown: 3, manaCost: 25, description: 'Trận pháp lửa địa ngục' }
        ],
        boss: [
            { name: 'Long Viêm', damageMultiplier: 1.0, cooldown: 3, manaCost: 30, description: 'Ngọn lửa của rồng' },
            { name: 'Địa Ngục Hỏa', damageMultiplier: 1.5, cooldown: 5, manaCost: 50, description: 'Thiêu đốt địa ngục' }
        ]
    },
    // Hard dungeon skills
    frost_peak: {
        normal: [
            { name: 'Băng Tiễn', damageMultiplier: 0.5, cooldown: 4, manaCost: 15, description: 'Mũi tên băng' }
        ],
        elite: [
            { name: 'Băng Phong Bạo', damageMultiplier: 0.8, cooldown: 3, manaCost: 30, description: 'Bão tuyết hung hãn' },
            { name: 'Đóng Băng', damageMultiplier: 0.6, cooldown: 4, manaCost: 25, description: 'Đóng băng đối thủ' }
        ],
        boss: [
            { name: 'Vĩnh Đông', damageMultiplier: 1.2, cooldown: 3, manaCost: 40, description: 'Mùa đông vĩnh cửu' },
            { name: 'Băng Phong Bạo', damageMultiplier: 1.0, cooldown: 3, manaCost: 35, description: 'Bão tuyết tàn khốc' },
            { name: 'Đóng Băng', damageMultiplier: 0.8, cooldown: 4, manaCost: 30, description: 'Đóng băng hoàn toàn' }
        ]
    },
    // Nightmare dungeon skills
    dark_abyss: {
        normal: [
            { name: 'Hắc Ám Kích', damageMultiplier: 0.6, cooldown: 4, manaCost: 20, description: 'Đòn tấn công bóng tối' },
            { name: 'Thực Hồn', damageMultiplier: 0.5, cooldown: 5, manaCost: 25, description: 'Nuốt linh hồn' }
        ],
        elite: [
            { name: 'Tử Vong Ấn', damageMultiplier: 1.0, cooldown: 3, manaCost: 40, description: 'Ấn ký tử thần' },
            { name: 'Âm Hồn Triệu Hoán', damageMultiplier: 0.8, cooldown: 4, manaCost: 35, description: 'Triệu hồi âm hồn' }
        ],
        boss: [
            { name: 'U Minh Hắc Ám', damageMultiplier: 1.5, cooldown: 3, manaCost: 50, description: 'Bóng tối u minh' },
            { name: 'Linh Hồn Thu Hoạch', damageMultiplier: 1.2, cooldown: 3, manaCost: 45, description: 'Thu hoạch linh hồn' },
            { name: 'Tử Vong Ngưng Tụ', damageMultiplier: 1.8, cooldown: 5, manaCost: 60, description: 'Tích tụ sức mạnh tử vong' }
        ]
    },
    // Hell dungeon skills
    dragon_nest: {
        normal: [
            { name: 'Long Tức', damageMultiplier: 0.7, cooldown: 4, manaCost: 25, description: 'Hơi thở của rồng' },
            { name: 'Long Trảo', damageMultiplier: 0.6, cooldown: 3, manaCost: 20, description: 'Móng vuốt rồng' }
        ],
        elite: [
            { name: 'Cổ Long Chi Nộ', damageMultiplier: 1.2, cooldown: 3, manaCost: 50, description: 'Cơn thịnh nộ cổ long' },
            { name: 'Long Lân Hộ Thể', damageMultiplier: 0.8, cooldown: 4, manaCost: 40, description: 'Vảy rồng bảo vệ' }
        ],
        boss: [
            { name: 'Long Hoàng Chi Nộ', damageMultiplier: 2.0, cooldown: 3, manaCost: 60, description: 'Cơn thịnh nộ của Long Hoàng' },
            { name: 'Cửu Long Phệ Nhật', damageMultiplier: 1.8, cooldown: 4, manaCost: 70, description: 'Chín rồng nuốt mặt trời' },
            { name: 'Thần Long Bảo Hộ', damageMultiplier: 1.0, cooldown: 4, manaCost: 50, description: 'Thần long bảo vệ' },
            { name: 'Phá Thiên Nhất Kích', damageMultiplier: 2.5, cooldown: 6, manaCost: 100, description: 'Đòn phá thiên' }
        ]
    }
};

// Helper function to get monster skills based on dungeon and monster type
export const getMonsterSkills = (dungeonId, monsterType) => {
    // Handle chaos realm - random skills from all dungeons
    if (dungeonId === 'chaos_realm') {
        const allSkills = [];
        Object.keys(MONSTER_SKILLS).forEach(id => {
            const dungeonSkills = MONSTER_SKILLS[id][monsterType];
            if (dungeonSkills && dungeonSkills.length > 0) {
                allSkills.push(...dungeonSkills);
            }
        });
        // Return 1-3 random skills for chaos realm monsters
        if (allSkills.length === 0) return [];
        const numSkills = Math.min(allSkills.length, monsterType === 'boss' ? 4 : monsterType === 'elite' ? 2 : 1);
        const shuffled = [...allSkills].sort(() => Math.random() - 0.5);
        return shuffled.slice(0, numSkills);
    }

    const dungeonSkills = MONSTER_SKILLS[dungeonId];
    if (!dungeonSkills) return [];

    return dungeonSkills[monsterType] || [];
};

// ==================== DUNGEON TEMPLATES ====================
export const DUNGEON_TEMPLATES = [
    {
        id: "mist_valley",
        name: "Vân Vũ Cốc",
        description: "Thung lũng sương mù đầy yêu thú sơ cấp. Thích hợp cho người mới bắt đầu tu luyện.",
        difficulty: "easy",
        requiredRealm: 1, // Phàm Nhân
        icon: "🌫️",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        element: "wind"
    },
    {
        id: "fire_cave",
        name: "Hỏa Diễm Động",
        description: "Hang động nham thạch nóng bỏng với quái vật lửa. Cần có nền tảng tu luyện vững chắc.",
        difficulty: "normal",
        requiredRealm: 2, // Luyện Khí
        icon: "🔥",
        background: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
        element: "fire"
    },
    {
        id: "frost_peak",
        name: "Hàn Băng Phong",
        description: "Đỉnh núi băng giá vĩnh cửu, nơi trú ngụ của yêu thú băng tuyết hung dữ.",
        difficulty: "hard",
        requiredRealm: 3, // Trúc Cơ
        icon: "❄️",
        background: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
        element: "ice"
    },
    {
        id: "dark_abyss",
        name: "U Minh Thâm Uyên",
        description: "Vực sâu tối tăm không thấy đáy, ma vật và âm hồn lẩn khuất trong bóng đêm.",
        difficulty: "nightmare",
        requiredRealm: 7, // Luyện Hư
        icon: "🕳️",
        background: "linear-gradient(135deg, #434343 0%, #000000 100%)",
        element: "dark"
    },
    {
        id: "dragon_nest",
        name: "Long Huyệt Cấm Địa",
        description: "Hang ổ của long tộc cổ đại. Chỉ những tu sĩ mạnh nhất mới dám mạo hiểm vào đây.",
        difficulty: "hell",
        requiredRealm: 9, // Độ Kiếp
        icon: "🐉",
        background: "linear-gradient(135deg, #ff0844 0%, #ffb199 100%)",
        element: "dragon"
    },
    {
        id: "chaos_realm",
        name: "Hỗn Độn Vực",
        description: "Vực sâu hỗn độn nơi tất cả quái vật từ các bí cảnh hội tụ. Chỉ số quái vật được điều chỉnh theo sức mạnh của người chơi. Thử thách tối cao!",
        difficulty: "chaos",
        requiredRealm: 10, // Tiên Nhân
        icon: "🌀",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)",
        element: "chaos"
    }
];

// ==================== MONSTER TEMPLATES BY DUNGEON ====================
export const DUNGEON_MONSTERS = {
    // ========== VÂN VŨ CỐC (Easy - 5 floors) ==========
    mist_valley: {
        normal: [
            { id: "mist_rabbit", name: "Vân Thố", icon: "🐰", image: "/assets/dungeon/mist_valley/vantho.png", baseStats: { attack: 8, defense: 4, qiBlood: 80 } },
            { id: "mist_fox", name: "Vân Hồ", icon: "🦊", image: "/assets/dungeon/mist_valley/vanho.png", baseStats: { attack: 12, defense: 5, qiBlood: 100 } },
            { id: "mist_wolf", name: "Vân Lang", icon: "🐺", image: "/assets/dungeon/mist_valley/vanlang.png", baseStats: { attack: 15, defense: 6, qiBlood: 120 } }
        ],
        elite: [
            { id: "mist_fox_elite", name: "Vân Hồ Vương", icon: "🦊", image: "/assets/dungeon/mist_valley/vanho.png", baseStats: { attack: 25, defense: 12, qiBlood: 250 }, isElite: true }
        ],
        boss: {
            id: "mist_king", name: "Vân Vũ Yêu Vương", icon: "👑🌫️", image: "/assets/dungeon/mist_valley/vanvuyeuvuong.png",
            baseStats: { attack: 40, defense: 20, qiBlood: 500 },
            isBoss: true,
            skills: ["Vân Vũ Trận", "Mê Ảnh Thuật"]
        }
    },

    // ========== HỎA DIỄM ĐỘNG (Normal - 7 floors) ==========
    fire_cave: {
        normal: [
            { id: "fire_bat", name: "Hỏa Biên Bức", icon: "🦇", image: "/assets/dungeon/fire_cave/hoabienbuc.png", baseStats: { attack: 20, defense: 8, qiBlood: 150 } },
            { id: "fire_snake", name: "Hỏa Xà", icon: "🐍", image: "/assets/dungeon/fire_cave/hoaxa.png", baseStats: { attack: 28, defense: 10, qiBlood: 180 } }
        ],
        elite: [
            { id: "fire_bat_elite", name: "Hỏa Biên Bức Vương", icon: "�", image: "/assets/dungeon/fire_cave/hoabienbuc.png", baseStats: { attack: 50, defense: 25, qiBlood: 500 }, isElite: true }
        ],
        boss: {
            id: "fire_dragon", name: "Hỏa Diễm Long Vương", icon: "🔥🐲", image: "/assets/dungeon/fire_cave/hoadiemlongvuong.png",
            baseStats: { attack: 80, defense: 40, qiBlood: 1000 },
            isBoss: true,
            skills: ["Long Viêm", "Địa Ngục Hỏa"]
        }
    },

    // ========== HÀN BĂNG PHONG (Hard - 10 floors) ==========
    frost_peak: {
        normal: [
            { id: "frost_hawk", name: "Băng Ưng", icon: "🦅", image: "/assets/dungeon/frost_peak/bangung.png", baseStats: { attack: 45, defense: 20, qiBlood: 300 } },
            { id: "frost_yeti", name: "Tuyết Nhân", icon: "🦍", image: "/assets/dungeon/frost_peak/tuyetnhan.png", baseStats: { attack: 50, defense: 50, qiBlood: 600 } }
        ],
        elite: [
            { id: "frost_hawk_elite", name: "Băng Ưng Vương", icon: "🦅", image: "/assets/dungeon/frost_peak/bangung.png", baseStats: { attack: 100, defense: 60, qiBlood: 1200 }, isElite: true }
        ],
        boss: {
            id: "frost_queen", name: "Băng Phong Nữ Hoàng", icon: "👸❄️", image: "/assets/dungeon/frost_peak/bangphongnuhoang.png",
            baseStats: { attack: 150, defense: 80, qiBlood: 2500 },
            isBoss: true,
            skills: ["Vĩnh Đông", "Băng Phong Bạo", "Đóng Băng"]
        }
    },

    // ========== U MINH THÂM UYÊN (Nightmare - 12 floors) ==========
    dark_abyss: {
        normal: [
            { id: "soul_eater", name: "Thực Hồn Quái", icon: "👁️", image: "/assets/dungeon/dark_abyss/thuchonquai.png", baseStats: { attack: 120, defense: 35, qiBlood: 550 } },
            { id: "bone_warrior", name: "Khô Cốt Chiến Binh", icon: "💀", image: "/assets/dungeon/dark_abyss/khocotchienbinh.png", baseStats: { attack: 110, defense: 70, qiBlood: 900 } }
        ],
        elite: [
            { id: "bone_warrior_elite", name: "Khô Cốt Tướng Quân", icon: "💀", image: "/assets/dungeon/dark_abyss/khocotchienbinh.png", baseStats: { attack: 250, defense: 150, qiBlood: 3000 }, isElite: true }
        ],
        boss: {
            id: "abyss_lord", name: "U Minh Ma Vương", icon: "😈👑", image: "/assets/dungeon/dark_abyss/uminhmavuong.png",
            baseStats: { attack: 400, defense: 200, qiBlood: 8000 },
            isBoss: true,
            skills: ["U Minh Hắc Ám", "Linh Hồn Thu Hoạch", "Tử Vong Ngưng Tụ"]
        }
    },

    // ========== LONG HUYỆT CẤM ĐỊA (Hell - 15 floors) ==========
    dragon_nest: {
        normal: [
            { id: "baby_dragon", name: "Tiểu Long", icon: "🐲", image: "/assets/dungeon/dragon_nest/tieulong.png", baseStats: { attack: 200, defense: 100, qiBlood: 1500 } }
        ],
        elite: [
            { id: "elder_dragon", name: "Thượng Cổ Long", icon: "🐉✨", image: "/assets/dungeon/dragon_nest/thuongcolong.png", baseStats: { attack: 500, defense: 300, qiBlood: 8000 }, isElite: true }
        ],
        boss: {
            id: "dragon_emperor", name: "Long Hoàng", icon: "👑🐲", image: "/assets/dungeon/dragon_nest/longhoang.png",
            baseStats: { attack: 1000, defense: 500, qiBlood: 25000 },
            isBoss: true,
            skills: ["Long Hoàng Chi Nộ", "Cửu Long Phệ Nhật", "Thần Long Bảo Hộ", "Phá Thiên Nhất Kích"]
        }
    }
};

// ==================== FLOOR REWARDS CONFIG ====================
export const FLOOR_REWARDS = {
    // Reward per normal floor (TĂNG 100%)
    normalFloor: {
        baseExp: 100,           // 50 → 100 (+100%)
        baseSpiritStones: 20,   // 10 → 20 (+100%)
        itemDropRate: 0.25      // 15% → 25% (+10%)
    },
    // Reward for elite monster
    eliteFloor: {
        expMultiplier: 2,
        spiritStoneMultiplier: 2,
        itemDropRate: 0.6       // 40% → 60% (+20%)
    },
    // Reward for boss
    bossFloor: {
        expMultiplier: 5,
        spiritStoneMultiplier: 5,
        itemDropRate: 1.0,      // 80% → 100% (đảm bảo có item)
        guaranteedReward: true
    }
};

// ==================== POSSIBLE ITEM DROPS ====================
export const DUNGEON_ITEM_DROPS = {
    easy: [
        { itemId: "exp_boost_mini", weight: 40 },
        { itemId: "meditation_incense", weight: 35 },
        { itemId: "breakthrough_pill_small", weight: 15 },
        { itemId: "lucky_charm", weight: 10 }
    ],
    normal: [
        { itemId: "exp_boost_mini", weight: 25 },
        { itemId: "exp_boost_2x", weight: 25 },
        { itemId: "breakthrough_pill_small", weight: 25 },
        { itemId: "cultivation_manual", weight: 15 },
        { itemId: "streak_protector", weight: 10 }
    ],
    hard: [
        { itemId: "exp_boost_2x", weight: 30 },
        { itemId: "breakthrough_pill_small", weight: 25 },
        { itemId: "breakthrough_pill_medium", weight: 20 },
        { itemId: "cultivation_manual", weight: 15 },
        { itemId: "heavenly_scripture", weight: 10 }
    ],
    nightmare: [
        { itemId: "exp_boost_3x", weight: 25 },
        { itemId: "breakthrough_pill_medium", weight: 30 },
        { itemId: "breakthrough_pill_large", weight: 20 },
        { itemId: "heavenly_scripture", weight: 15 },
        { itemId: "streak_protector", weight: 10 }
    ],
    hell: [
        { itemId: "exp_boost_5x", weight: 20 },
        { itemId: "breakthrough_pill_large", weight: 30 },
        { itemId: "breakthrough_pill_perfect", weight: 15 },
        { itemId: "heavenly_scripture", weight: 20 },
        { itemId: "exp_boost_3x", weight: 15 }
    ],
    chaos: [
        { itemId: "exp_boost_5x", weight: 25 },
        { itemId: "breakthrough_pill_perfect", weight: 35 },
        { itemId: "heavenly_scripture", weight: 25 },
        { itemId: "exp_boost_3x", weight: 15 }
    ]
};

// ==================== HELPER FUNCTIONS ====================

// Base stats by realm level (matching player stats for balanced combat) - 14 LEVELS
const REALM_BASE_STATS = {
    1: { attack: 10, defense: 5, qiBlood: 100 },        // Phàm Nhân
    2: { attack: 25, defense: 12, qiBlood: 250 },       // Luyện Khí
    3: { attack: 50, defense: 25, qiBlood: 500 },       // Trúc Cơ
    4: { attack: 100, defense: 50, qiBlood: 1000 },     // Kim Đan
    5: { attack: 200, defense: 100, qiBlood: 2000 },    // Nguyên Anh
    6: { attack: 400, defense: 200, qiBlood: 4000 },    // Hóa Thần
    7: { attack: 800, defense: 400, qiBlood: 8000 },    // Luyện Hư
    8: { attack: 1600, defense: 800, qiBlood: 16000 },  // Hợp Thể
    9: { attack: 3200, defense: 1600, qiBlood: 32000 }, // Đại Thừa
    10: { attack: 6400, defense: 3200, qiBlood: 64000 }, // Chân Tiên
    11: { attack: 12800, defense: 6400, qiBlood: 128000 }, // Kim Tiên
    12: { attack: 25600, defense: 12800, qiBlood: 256000 }, // Tiên Vương
    13: { attack: 51200, defense: 25600, qiBlood: 512000 }, // Tiên Đế
    14: { attack: 102400, defense: 51200, qiBlood: 1024000 } // Thiên Đế
};

// Get required realm for a dungeon
const getDungeonRequiredRealm = (dungeonId) => {
    const dungeon = DUNGEON_TEMPLATES.find(d => d.id === dungeonId);
    return dungeon?.requiredRealm || 1;
};

/**
 * Tính toán thông số quái vật theo tầng và cảnh giới
 * @param {Object} monster - Monster template
 * @param {number} floor - Current floor (1-indexed)
 * @param {string} difficulty - Dungeon difficulty
 * @param {string} dungeonId - Dungeon ID (optional, for realm-based scaling)
 * @param {Object} playerStats - Player combat stats (optional, for chaos realm scaling)
 * @returns {Object} Scaled monster stats
 */
export const calculateMonsterStats = (monster, floor, difficulty, dungeonId = null, playerStats = null) => {
    const config = DIFFICULTY_CONFIG[difficulty];
    const floorMultiplier = 1 + (floor - 1) * 0.12; // +12% per floor

    // Special handling for chaos realm - THE HARDEST DUNGEON
    // Monsters scale based on player stats, ALWAYS stronger than player
    // But player has advantages: lifesteal, speed priority, higher crit rate
    if (dungeonId === 'chaos_realm' && playerStats) {
        // Random multiplier between 1.1x and 1.5x (always stronger than player)
        const randomMultiplier = 1.1 + Math.random() * 0.4; // 1.1 to 1.5

        // Type multipliers - elite and boss are significantly harder
        let typeMultiplier = 1.0;
        if (monster.isElite || monster.type === 'elite') {
            typeMultiplier = 1.3; // Elite: 1.3x base → total 143% - 195%
        } else if (monster.isBoss || monster.type === 'boss') {
            typeMultiplier = 1.6; // Boss: 1.6x base → total 176% - 240%
        }

        // Floor scaling - gets harder each floor (+5% per floor)
        const floorScale = 1 + (floor - 1) * 0.05; // Floor 20 = +95% = 1.95x

        // Calculate stats based on player stats
        const baseAttack = playerStats.attack || 100;
        const baseDefense = playerStats.defense || 50;
        const baseQiBlood = playerStats.qiBlood || 1000;

        // Defense reduction to compensate for higher attack (player can still deal damage)
        // This is the KEY BALANCE: high ATK/HP but lower DEF = risky but beatable
        const defenseReduction = 0.75; // Monsters have 25% less defense ratio

        // HP reduction for faster fights (prevents timeout at 50 rounds)
        const hpReduction = 0.85; // 15% less HP to make fights faster

        return {
            ...monster,
            stats: {
                attack: Math.floor(baseAttack * randomMultiplier * typeMultiplier * floorScale),
                defense: Math.floor(baseDefense * randomMultiplier * typeMultiplier * floorScale * defenseReduction),
                qiBlood: Math.floor(baseQiBlood * randomMultiplier * typeMultiplier * floorScale * hpReduction),
                maxQiBlood: Math.floor(baseQiBlood * randomMultiplier * typeMultiplier * floorScale * hpReduction),
                // Speed: 85-105% of player - sometimes monster attacks first!
                speed: Math.floor((playerStats.speed || 50) * (0.85 + Math.random() * 0.2)),
                // Higher crit rate than before, but still capped below typical player crit
                criticalRate: Math.min(35, (playerStats.criticalRate || 10) * 0.9 + floor * 0.5),
                // Good crit damage but not overwhelming
                criticalDamage: Math.min(280, (playerStats.criticalDamage || 150) * 0.95 + floor * 2),
                // Moderate dodge - player should land most hits
                dodge: Math.min(25, (playerStats.dodge || 10) * 0.8 + floor * 0.3)
            }
        };
    }

    // Normal scaling for other dungeons
    const difficultyMultiplier = config.monsterStatMultiplier;

    // Get realm-based stats for the dungeon's required realm
    let realmLevel = 1;
    if (dungeonId) {
        realmLevel = getDungeonRequiredRealm(dungeonId);
    } else {
        // Fallback: estimate realm from difficulty
        const difficultyToRealm = { easy: 1, normal: 2, hard: 3, nightmare: 7, hell: 9, chaos: 10 };
        realmLevel = difficultyToRealm[difficulty] || 1;
    }

    const realmStats = REALM_BASE_STATS[realmLevel] || REALM_BASE_STATS[1];
    const monsterBaseStats = monster.baseStats;

    // Monster stats = realm base * monster type multiplier * floor * difficulty
    // Normal mob: 80-100% of realm stats
    // Elite mob: 120-150% of realm stats  
    // Boss: 200-300% of realm stats
    let typeMultiplier = 1.0;
    if (monster.isElite || monster.type === 'elite') {
        typeMultiplier = 1.4;
    } else if (monster.isBoss || monster.type === 'boss') {
        typeMultiplier = 2.5;
    }

    // Calculate final stats using realm base with monster-specific variance
    const monsterVariance = {
        attack: monsterBaseStats.attack / 10, // Use baseStats as variance factor
        defense: monsterBaseStats.defense / 5,
        qiBlood: monsterBaseStats.qiBlood / 100
    };

    return {
        ...monster,
        stats: {
            attack: Math.floor(realmStats.attack * monsterVariance.attack * typeMultiplier * floorMultiplier * difficultyMultiplier),
            defense: Math.floor(realmStats.defense * monsterVariance.defense * typeMultiplier * floorMultiplier * difficultyMultiplier),
            qiBlood: Math.floor(realmStats.qiBlood * monsterVariance.qiBlood * typeMultiplier * floorMultiplier * difficultyMultiplier),
            maxQiBlood: Math.floor(realmStats.qiBlood * monsterVariance.qiBlood * typeMultiplier * floorMultiplier * difficultyMultiplier),
            speed: 10 + realmLevel * 3 + floor * 2,
            criticalRate: 5 + realmLevel + floor,
            criticalDamage: 150 + realmLevel * 10 + floor * 5,
            dodge: 5 + realmLevel + Math.floor(floor / 2)
        }
    };
};

/**
 * Collect all monsters from previous dungeons (for chaos realm)
 */
const getAllPreviousMonsters = () => {
    const allNormal = [];
    const allElite = [];
    const allBosses = [];

    // Collect from all dungeons except chaos_realm
    Object.keys(DUNGEON_MONSTERS).forEach(dungeonId => {
        if (dungeonId === 'chaos_realm') return;

        const monsters = DUNGEON_MONSTERS[dungeonId];
        if (monsters.normal) {
            allNormal.push(...monsters.normal.map(m => ({ ...m, sourceDungeon: dungeonId })));
        }
        if (monsters.elite) {
            allElite.push(...monsters.elite.map(m => ({ ...m, sourceDungeon: dungeonId })));
        }
        if (monsters.boss) {
            allBosses.push({ ...monsters.boss, sourceDungeon: dungeonId });
        }
    });

    return { allNormal, allElite, allBosses };
};

/**
 * Chọn ngẫu nhiên quái vật cho tầng
 * @param {string} dungeonId
 * @param {number} floor
 * @param {number} totalFloors
 * @returns {Object} Selected monster
 */
export const selectMonsterForFloor = (dungeonId, floor, totalFloors) => {
    // Special handling for chaos realm - random from all previous dungeons
    if (dungeonId === 'chaos_realm') {
        const { allNormal, allElite, allBosses } = getAllPreviousMonsters();

        // Boss ở tầng cuối - random từ tất cả bosses
        if (floor === totalFloors) {
            if (allBosses.length > 0) {
                const randomBoss = allBosses[Math.floor(Math.random() * allBosses.length)];
                return { ...randomBoss, type: 'boss' };
            }
        }

        // Elite ở các tầng milestone (mỗi 4-5 tầng cho 20 floors)
        const eliteFloors = [5, 10, 15, 19];
        if (eliteFloors.includes(floor) && allElite.length > 0) {
            const randomElite = allElite[Math.floor(Math.random() * allElite.length)];
            return { ...randomElite, type: 'elite' };
        }

        // Normal monster cho các tầng còn lại
        if (allNormal.length > 0) {
            const randomNormal = allNormal[Math.floor(Math.random() * allNormal.length)];
            return { ...randomNormal, type: 'normal' };
        }
    }

    const monsters = DUNGEON_MONSTERS[dungeonId];
    if (!monsters) return null;

    // Boss ở tầng cuối
    if (floor === totalFloors) {
        return { ...monsters.boss, type: 'boss' };
    }

    // Elite ở các tầng milestone (mỗi 3-4 tầng)
    const eliteFloors = totalFloors <= 5 ? [3] :
        totalFloors <= 7 ? [3, 6] :
            totalFloors <= 10 ? [3, 6, 9] :
                totalFloors <= 12 ? [4, 8, 11] :
                    [3, 6, 9, 12, 14]; // 15 floors

    if (eliteFloors.includes(floor) && monsters.elite?.length > 0) {
        const randomElite = monsters.elite[Math.floor(Math.random() * monsters.elite.length)];
        return { ...randomElite, type: 'elite' };
    }

    // Normal monster cho các tầng còn lại
    const normalMonsters = monsters.normal;
    const randomNormal = normalMonsters[Math.floor(Math.random() * normalMonsters.length)];
    return { ...randomNormal, type: 'normal' };
};

/**
 * Tính phần thưởng cho tầng
 * @param {string} difficulty
 * @param {number} floor
 * @param {string} monsterType - 'normal', 'elite', 'boss'
 * @returns {Object} Rewards
 */
export const calculateFloorRewards = (difficulty, floor, monsterType) => {
    const config = DIFFICULTY_CONFIG[difficulty];
    const baseReward = FLOOR_REWARDS.normalFloor;

    let expMultiplier = config.expMultiplier;
    let stoneMultiplier = config.rewardMultiplier;
    let itemDropRate = baseReward.itemDropRate;

    if (monsterType === 'elite') {
        expMultiplier *= FLOOR_REWARDS.eliteFloor.expMultiplier;
        stoneMultiplier *= FLOOR_REWARDS.eliteFloor.spiritStoneMultiplier;
        itemDropRate = FLOOR_REWARDS.eliteFloor.itemDropRate;
    } else if (monsterType === 'boss') {
        expMultiplier *= FLOOR_REWARDS.bossFloor.expMultiplier;
        stoneMultiplier *= FLOOR_REWARDS.bossFloor.spiritStoneMultiplier;
        itemDropRate = FLOOR_REWARDS.bossFloor.itemDropRate;
    }

    // Scale by floor number (TĂNG từ 10% → 15%/tầng)
    const floorBonus = 1 + (floor - 1) * 0.15;

    return {
        exp: Math.floor(baseReward.baseExp * expMultiplier * floorBonus),
        spiritStones: Math.floor(baseReward.baseSpiritStones * stoneMultiplier * floorBonus),
        itemDropRate
    };
};

/**
 * Random item drop based on difficulty
 * @param {string} difficulty
 * @returns {string|null} Item ID or null
 */
export const rollItemDrop = (difficulty) => {
    const drops = DUNGEON_ITEM_DROPS[difficulty];
    if (!drops) return null;

    const totalWeight = drops.reduce((sum, d) => sum + d.weight, 0);
    let random = Math.random() * totalWeight;

    for (const drop of drops) {
        random -= drop.weight;
        if (random <= 0) return drop.itemId;
    }
    return drops[0].itemId;
};

// ==================== DUNGEON RUN SCHEMA ====================
// Lưu lịch sử mỗi lần chạy dungeon
const DungeonRunSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true
    },
    dungeonId: {
        type: String,
        required: true,
        index: true
    },
    startedAt: {
        type: Date,
        default: Date.now
    },
    completedAt: {
        type: Date
    },
    floorsCleared: {
        type: Number,
        default: 0
    },
    totalFloors: {
        type: Number,
        required: true
    },
    isCompleted: {
        type: Boolean,
        default: false
    },
    isAbandoned: {
        type: Boolean,
        default: false
    },
    // Rewards earned
    totalExpEarned: {
        type: Number,
        default: 0
    },
    totalSpiritStonesEarned: {
        type: Number,
        default: 0
    },
    itemsEarned: [{
        itemId: String,
        name: String,
        quantity: { type: Number, default: 1 }
    }],
    // Battle logs for each floor
    floorLogs: [{
        floor: Number,
        monsterId: String,
        monsterName: String,
        monsterType: String, // 'normal', 'elite', 'boss'
        won: Boolean,
        expEarned: Number,
        spiritStonesEarned: Number,
        itemDropped: String,
        timestamp: { type: Date, default: Date.now }
    }]
}, {
    timestamps: true
});

// Indexes for efficient queries
DungeonRunSchema.index({ user: 1, dungeonId: 1, isCompleted: 1 });
DungeonRunSchema.index({ user: 1, createdAt: -1 });

export const DungeonRun = mongoose.model("DungeonRun", DungeonRunSchema);

export default {
    DUNGEON_TEMPLATES,
    DUNGEON_MONSTERS,
    DIFFICULTY_CONFIG,
    FLOOR_REWARDS,
    DUNGEON_ITEM_DROPS,
    calculateMonsterStats,
    selectMonsterForFloor,
    calculateFloorRewards,
    rollItemDrop,
    DungeonRun
};
