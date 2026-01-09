/**
 * Tower 100 Config
 * Time-gate progression system: 5 attempts/day, weekly contract from boss 60
 */

// ==================== TOWER CONFIG ====================
export const TOWER_CONFIG = {
    TOTAL_FLOORS: 100,
    DAILY_ATTEMPTS: 5,

    BOSS_FLOORS: [10, 20, 30, 40, 50, 60, 70, 80, 90, 100],
    WEEKLY_CHEST_FLOOR: 60,

    // Realm requirements (14 realms - từ tầng 50 độ khó tăng mạnh)
    REALM_GATES: {
        1: { floor: 1, realmId: 1, realmName: 'Phàm Nhân' },
        2: { floor: 8, realmId: 2, realmName: 'Luyện Khí' },
        3: { floor: 15, realmId: 3, realmName: 'Trúc Cơ' },
        4: { floor: 22, realmId: 4, realmName: 'Kim Đan' },
        5: { floor: 29, realmId: 5, realmName: 'Nguyên Anh' },
        6: { floor: 36, realmId: 6, realmName: 'Hóa Thần' },
        7: { floor: 43, realmId: 7, realmName: 'Luyện Hư' },
        // === ENDGAME SPIKE ===
        8: { floor: 50, realmId: 8, realmName: 'Hợp Thể' },
        9: { floor: 56, realmId: 9, realmName: 'Đại Thừa' },
        10: { floor: 62, realmId: 10, realmName: 'Chân Tiên' },
        11: { floor: 68, realmId: 11, realmName: 'Kim Tiên' },
        12: { floor: 74, realmId: 12, realmName: 'Tiên Vương' },
        13: { floor: 80, realmId: 13, realmName: 'Tiên Đế' },
        14: { floor: 86, realmId: 14, realmName: 'Thiên Đế' },
    },

    getDifficulty: (floor) => {
        if (floor <= 10) return 'easy';
        if (floor <= 25) return 'normal';
        if (floor <= 50) return 'hard';
        if (floor <= 75) return 'nightmare';
        if (floor <= 85) return 'hell';
        return 'chaos';
    },

    isBossFloor: (floor) => TOWER_CONFIG.BOSS_FLOORS.includes(floor),

    getRequiredRealm: (floor) => {
        let req = 1;
        for (const k of Object.keys(TOWER_CONFIG.REALM_GATES)) {
            const g = TOWER_CONFIG.REALM_GATES[k];
            if (floor >= g.floor) req = g.realmId;
        }
        return req;
    },

    getRealmGate: (floor) => {
        let gate = TOWER_CONFIG.REALM_GATES[1];
        for (const k of Object.keys(TOWER_CONFIG.REALM_GATES)) {
            const g = TOWER_CONFIG.REALM_GATES[k];
            if (floor >= g.floor) gate = g;
        }
        return gate;
    }
};

// ==================== 14→15 PROGRESSION ====================
export const ASCENSION_14_TO_15 = {
    required: {
        mat_contract: 4,        // 4 weeks minimum
        mat_heaven_shard: 1200,
        mat_root_crystal: 2000
    }
};

// ==================== MATERIAL DROPS ====================
// Tuned for 5 attempts/day, ~1200 shard & ~2000 crystal in 1 month
export const TOWER_MATERIAL_DROPS = {
    // Tầng 1-30: Crystal cao, Shard thấp
    tier1: {
        floors: [1, 30],
        drops: { crystal: { min: 15, max: 20 }, shard: { min: 4, max: 6 } }  // avg: crystal 17.5, shard 5
    },
    // Tầng 31-60: Cân bằng
    tier2: {
        floors: [31, 60],
        drops: { crystal: { min: 10, max: 15 }, shard: { min: 6, max: 10 } }  // avg: crystal 12.5, shard 8
    },
    // Tầng 61-100: Shard cao (endgame)
    tier3: {
        floors: [61, 100],
        drops: { crystal: { min: 5, max: 10 }, shard: { min: 12, max: 18 } }  // avg: crystal 7.5, shard 15
    },

    // Boss bonus (mỗi 10 tầng)
    bossBonus: {
        10: { shard: 20, crystal: 50 },
        20: { shard: 35, crystal: 75 },
        30: { shard: 50, crystal: 100 },
        40: { shard: 75, crystal: 125 },
        50: { shard: 100, crystal: 150 },
        60: { shard: 100, crystal: 200 },
        70: { shard: 120, crystal: 180 },
        80: { shard: 150, crystal: 200 },
        90: { shard: 200, crystal: 250 },
        100: { shard: 300, crystal: 400 }
    }
};

// ==================== SWEEP CONFIG ====================
export const SWEEP_CONFIG = {
    enabled: true,
    rewardMultiplier: 0.7,  // 70% of climb rewards
    requireCleared: true,    // Chỉ sweep tầng đã clear
    noBossSweep: true,       // Không sweep tầng boss
    noContractDrop: true     // NEVER drop contract from sweep
};

// ==================== MONSTER SCALING ====================
export const TOWER_MONSTER_CONFIG = {
    difficultyMultipliers: {
        easy: 0.6,
        normal: 0.8,
        hard: 1.0,
        nightmare: 1.25,
        hell: 1.5,
        chaos: 1.8
    },
    bossMultiplier: 1.6
};

export default {
    TOWER_CONFIG,
    ASCENSION_14_TO_15,
    TOWER_MATERIAL_DROPS,
    SWEEP_CONFIG,
    TOWER_MONSTER_CONFIG
};
