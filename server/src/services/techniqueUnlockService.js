/**
 * Technique Unlock Service
 * 
 * Handles unlock condition checking for techniques based on:
 * - Realm level (cultivation realm)
 * - Dungeon progress (max floor cleared)
 */

/**
 * Check if a technique is unlocked for a player
 * @param {Object} technique - Technique data from SHOP_ITEMS
 * @param {Object} cultivation - User's cultivation data
 * @returns {boolean} - True if unlocked, false otherwise
 */
export const isTechniqueUnlocked = (technique, cultivation) => {
    // No unlock condition = always available
    if (!technique.unlockCondition) {
        return true;
    }

    const { type, minLevel, minFloor } = technique.unlockCondition;

    // Realm-based unlock
    if (type === 'realm') {
        const currentRealm = cultivation.realmLevel || 1;
        return currentRealm >= minLevel;
    }

    // Dungeon floor-based unlock
    if (type === 'dungeon') {
        // Get max floor cleared across ALL dungeons
        const dungeonProgress = cultivation.dungeonProgress || {};

        const maxFloorCleared = Math.max(
            dungeonProgress.mist_valley?.maxFloorCleared || 0,
            dungeonProgress.fire_cave?.maxFloorCleared || 0,
            dungeonProgress.frost_peak?.maxFloorCleared || 0,
            dungeonProgress.dark_abyss?.maxFloorCleared || 0,
            dungeonProgress.dragon_nest?.maxFloorCleared || 0,
            dungeonProgress.chaos_realm?.maxFloorCleared || 0
        );

        return maxFloorCleared >= minFloor;
    }

    // Unknown unlock type - default to locked
    return false;
};

/**
 * Get unlock requirement description for display
 * @param {Object} unlockCondition - Unlock condition object
 * @returns {string} - Human-readable unlock requirement
 */
export const getUnlockRequirementText = (unlockCondition) => {
    if (!unlockCondition) return null;

    const { type, minLevel, minFloor } = unlockCondition;

    if (type === 'realm') {
        // Map realm level to name
        const realmNames = {
            1: 'Phàm Nhân',
            2: 'Luyện Khí',
            3: 'Trúc Cơ',
            4: 'Kim Đan',
            5: 'Nguyên Anh',
            6: 'Hóa Thần',
            7: 'Luyện Hư',
            8: 'Hợp Thể',
            9: 'Đại Thừa',
            10: 'Chân Tiên',
            11: 'Kim Tiên',
            12: 'Tiên Vương',
            13: 'Tiên Đế',
            14: 'Thiên Đế'
        };
        const realmName = realmNames[minLevel] || `Cảnh Giới ${minLevel}`;
        return `Cần đạt ${realmName}`;
    }

    if (type === 'dungeon') {
        // Map floor to dungeon name based on difficulty floors
        let dungeonName = 'Bí Cảnh';
        if (minFloor <= 5) {
            dungeonName = 'Vân Vũ Cốc'; // Easy: 5 floors
        } else if (minFloor <= 7) {
            dungeonName = 'Hỏa Diễm Động'; // Normal: 7 floors
        } else if (minFloor <= 10) {
            dungeonName = 'Hàn Băng Phong'; // Hard: 10 floors
        } else if (minFloor <= 12) {
            dungeonName = 'U Minh Thâm Uyên'; // Nightmare: 12 floors
        } else if (minFloor <= 15) {
            dungeonName = 'Long Huyệt Cấm Địa'; // Hell: 15 floors
        } else {
            dungeonName = 'Hỗn Độn Vực'; // Chaos: 20 floors
        }
        return `Cần vượt qua ${dungeonName} tầng ${minFloor}`;
    }

    return 'Chưa mở khóa';
};

export default {
    isTechniqueUnlocked,
    getUnlockRequirementText
};
