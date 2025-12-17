/**
 * Dungeon helpers - Tiện ích cho hệ thống Bí Cảnh
 */

// Difficulty colors
export const DIFFICULTY_COLORS = {
    easy: {
        primary: '#10B981',
        secondary: '#34D399',
        bg: 'linear-gradient(135deg, #10B981 0%, #34D399 100%)'
    },
    normal: {
        primary: '#F59E0B',
        secondary: '#FBBF24',
        bg: 'linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%)'
    },
    hard: {
        primary: '#3B82F6',
        secondary: '#60A5FA',
        bg: 'linear-gradient(135deg, #3B82F6 0%, #60A5FA 100%)'
    },
    nightmare: {
        primary: '#8B5CF6',
        secondary: '#A78BFA',
        bg: 'linear-gradient(135deg, #8B5CF6 0%, #A78BFA 100%)'
    },
    hell: {
        primary: '#EF4444',
        secondary: '#F87171',
        bg: 'linear-gradient(135deg, #EF4444 0%, #F87171 100%)'
    }
};

// Difficulty labels in Vietnamese
export const DIFFICULTY_LABELS = {
    easy: 'Sơ Cấp',
    normal: 'Trung Cấp',
    hard: 'Cao Cấp',
    nightmare: 'Ác Mộng',
    hell: 'Địa Ngục'
};

/**
 * Get status color based on dungeon state
 */
export const getDungeonStatusColor = (dungeon) => {
    if (dungeon.progress?.inProgress) return '#3B82F6'; // Blue - in progress
    if (dungeon.progress?.isOnCooldown) return '#6B7280'; // Gray - cooldown
    if (!dungeon.meetsRequirement) return '#EF4444'; // Red - requirement not met
    if (!dungeon.hasEnoughStones) return '#F59E0B'; // Orange - not enough stones
    return '#10B981'; // Green - available
};

/**
 * Format cooldown time remaining
 */
export const formatCooldownTime = (cooldownUntil) => {
    if (!cooldownUntil) return '';

    const now = new Date();
    const target = new Date(cooldownUntil);
    const diff = target - now;

    if (diff <= 0) return 'Sẵn sàng';

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    if (hours > 0) {
        return `${hours}h ${minutes}m`;
    }
    if (minutes > 0) {
        return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
};

/**
 * Get monster type label
 */
export const getMonsterTypeLabel = (type) => {
    switch (type) {
        case 'boss': return 'BOSS';
        case 'elite': return 'Tinh Anh';
        default: return 'Thường';
    }
};

/**
 * Get monster type color
 */
export const getMonsterTypeColor = (type) => {
    switch (type) {
        case 'boss': return '#EF4444';
        case 'elite': return '#8B5CF6';
        default: return '#6B7280';
    }
};

/**
 * Format number with commas
 */
export const formatNumber = (num) => {
    if (num === undefined || num === null) return '0';
    return num.toLocaleString('vi-VN');
};

/**
 * Calculate floor progress percentage
 */
export const calculateProgressPercent = (currentFloor, totalFloors) => {
    if (!totalFloors || totalFloors === 0) return 0;
    return Math.round((currentFloor / totalFloors) * 100);
};

/**
 * Get floor type for visual styling
 */
export const getFloorType = (floor, totalFloors, dungeonId) => {
    if (floor === totalFloors) return 'boss';

    // Elite floors based on total floors
    const eliteFloors = totalFloors <= 5 ? [3] :
        totalFloors <= 7 ? [3, 6] :
            totalFloors <= 10 ? [3, 6, 9] :
                totalFloors <= 12 ? [4, 8, 11] :
                    [3, 6, 9, 12, 14];

    if (eliteFloors.includes(floor)) return 'elite';
    return 'normal';
};

/**
 * Get rarity color for items
 */
export const getRarityColor = (rarity) => {
    switch (rarity) {
        case 'legendary': return '#FFD700';
        case 'epic': return '#A855F7';
        case 'rare': return '#3B82F6';
        case 'uncommon': return '#10B981';
        default: return '#9CA3AF';
    }
};

export default {
    DIFFICULTY_COLORS,
    DIFFICULTY_LABELS,
    getDungeonStatusColor,
    formatCooldownTime,
    getMonsterTypeLabel,
    getMonsterTypeColor,
    formatNumber,
    calculateProgressPercent,
    getFloorType,
    getRarityColor
};
