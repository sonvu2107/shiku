/**
 * Cultivation Techniques Definitions
 * Công pháp tu luyện - giúp giảm click mỏi tay
 */

// ============================================================
// TECHNIQUE TYPES
// ============================================================

export const TECHNIQUE_TYPES = {
    EFFICIENCY: 'efficiency',   // Tăng % EXP/click
    SEMI_AUTO: 'semi_auto'      // Vận công tự động X giây
};

// ============================================================
// UNLOCK CONDITION TYPES
// ============================================================

export const UNLOCK_TYPES = {
    REALM: 'realm',       // Đạt cảnh giới X
    QUEST: 'quest',       // Hoàn thành quest
    DUNGEON: 'dungeon'    // Hoàn thành dungeon tầng X
};

// ============================================================
// TECHNIQUE DEFINITIONS
// ============================================================

export const CULTIVATION_TECHNIQUES = {
    // ==================== EFFICIENCY TECHNIQUES ====================
    tu_linh_quyet: {
        id: 'tu_linh_quyet',
        name: 'Tụ Linh Quyết',
        description: 'Vận chuyển chân khí, ngưng tụ linh lực thiên địa vào mỗi lần hấp thu, gia tăng hiệu suất tu luyện.',
        shortDesc: 'Mỗi lần hấp thu linh khí tăng 30% tu vi',
        type: TECHNIQUE_TYPES.EFFICIENCY,
        tier: 1,

        // Efficiency params
        bonusPercent: 30,           // +30% EXP/click
        cooldownBonusMs: 100,       // +100ms cooldown (tổng 300ms)

        // Unlock condition
        unlockCondition: {
            type: UNLOCK_TYPES.REALM,
            minLevel: 2               // Cảnh giới 2+
        },

        // Lore
        lore: 'Đây là pháp quyết căn bản mà mọi tu sĩ phải lĩnh ngộ. Khi linh khí thiên địa được dẫn nhập cơ thể, pháp quyết này giúp ngưng tụ và tinh luyện, không để thất tán một tơ hào nào.'
    },

    // ==================== SEMI-AUTO TECHNIQUES ====================
    tinh_tam_van_cong: {
        id: 'tinh_tam_van_cong',
        name: 'Tĩnh Tâm Vận Công',
        description: 'Nhập định thiền tọa, dẫn linh khí tự nhiên lưu chuyển trong kinh mạch, tích lũy tu vi không cần can thiệp.',
        shortDesc: 'Nhập định 30 giây, tự động tích lũy tu vi',
        type: TECHNIQUE_TYPES.SEMI_AUTO,
        tier: 2,

        // Semi-auto params
        durationSec: 30,            // 30 giây vận công
        techniqueMultiplier: 1.0,   // 1x passive exp

        // Unlock condition - Auto unlock cảnh giới 3 (onboarding mượt)
        unlockCondition: {
            type: UNLOCK_TYPES.REALM,
            minLevel: 3
        },

        lore: 'Tu tâm dưỡng tính, loại bỏ tạp niệm. Khi tâm hồn tĩnh lặng như mặt hồ không gợn sóng, linh khí thiên địa sẽ tự nhiên ngưng tụ vào đan điền mà không cần chủ động hấp thu.'
    },

    chu_thien_luan_chuyen: {
        id: 'chu_thien_luan_chuyen',
        name: 'Chu Thiên Luân Chuyển',
        description: 'Vận khí Đại Chu Thiên, linh lực xoay chuyển khắp 365 huyệt đạo, đột phá giới hạn thường nhật.',
        shortDesc: 'Đại Chu Thiên 60 giây, tu vi x1.2',
        type: TECHNIQUE_TYPES.SEMI_AUTO,
        tier: 3,

        // Semi-auto params
        durationSec: 60,            // 60 giây vận công
        techniqueMultiplier: 1.2,   // 1.2x passive exp

        // Unlock condition
        unlockCondition: {
            type: UNLOCK_TYPES.DUNGEON,
            minFloor: 3               // Hoàn thành dungeon tầng 3
        },

        lore: 'Khi đã thông suốt kinh mạch, tu sĩ có thể vận chuyển chân khí theo vòng Đại Chu Thiên - đi qua tất cả 365 huyệt đạo trong cơ thể. Hiệu quả tu luyện vượt xa phương pháp thường.'
    },

    // ==================== MYTHIC COMBAT TECHNIQUES ====================
    technique_myriad_return: {
        id: 'technique_myriad_return',
        name: 'Vạn Pháp Qui Tông',
        description: 'Công pháp tối thượng, tăng 25% mọi chỉ số, burst 500% ATK + hồi 50% sát thương',
        shortDesc: 'Tối thượng công pháp - tăng 25% mọi chỉ số',
        type: 'combat',
        tier: 10,
        unlockCondition: { type: UNLOCK_TYPES.REALM, minLevel: 8 },
        lore: 'Vạn pháp qui về một tông. Khi đã thấu triệt được đạo lý tối cao, mọi kỹ năng chiến đấu đều trở nên hoàn hảo tuyệt luân.'
    },

    technique_immortal_demon: {
        id: 'technique_immortal_demon',
        name: 'Bất Diệt Ma Công',
        description: 'Ma công tối cường, tăng 30% HP + 20% Lifesteal + 15% DEF, bất tử 4 giây',
        shortDesc: 'Ma công bất tử - tăng sinh lực và hồi phục',
        type: 'combat',
        tier: 10,
        unlockCondition: { type: UNLOCK_TYPES.DUNGEON, minFloor: 12 },
        lore: 'Tu luyện ma đạo đến cực hạn, thân thể sẽ đạt đến cảnh giới bất diệt bất tử, dù bị trọng thương cũng có thể hồi phục trong tích tắc.'
    },

    technique_poison_sovereign: {
        id: 'technique_poison_sovereign',
        name: 'Thiên Địch Độc Tôn',
        description: 'Độc công tuyệt đỉnh, tăng 35% ATK + 30% Penetration, poison DOT 10% max HP',
        shortDesc: 'Độc tôn - sát thương xuyên thấu cực mạnh',
        type: 'combat',
        tier: 10,
        unlockCondition: { type: UNLOCK_TYPES.REALM, minLevel: 9 },
        lore: 'Độc công thiên hạ vô song. Một khi trúng độc, dù là Kim Cang bất hoại cũng sẽ từ từ rã rời theo thời gian.'
    },

    // ==================== LEGENDARY COMBAT TECHNIQUES ====================
    technique_taiji_profound: {
        id: 'technique_taiji_profound',
        name: 'Thái Cực Huyền Công',
        description: 'Âm dương hòa hợp, tăng 18% mọi chỉ số chiến đấu, AOE 250% ATK + heal 30%',
        shortDesc: 'Âm dương hòa hợp - cân bằng hoàn hảo',
        type: 'combat',
        tier: 8,
        unlockCondition: { type: UNLOCK_TYPES.REALM, minLevel: 6 },
        lore: 'Âm dương tương sinh tương khắc. Thông suốt được lý này, tu sĩ có thể vừa công vừa thủ, cân bằng hoàn hảo.'
    },

    technique_blade_mastery: {
        id: 'technique_blade_mastery',
        name: 'Bạt Đao Thuật',
        description: 'Đao pháp tuyệt học, tăng 25% ATK + 15% Crit Dmg, 3 chém liên hoàn',
        shortDesc: 'Đao pháp tuyệt học - ba đòn liên chém',
        type: 'combat',
        tier: 8,
        unlockCondition: { type: UNLOCK_TYPES.DUNGEON, minFloor: 8 },
        lore: 'Một đao chém ra, thiên địa đổi sắc. Ba đòn liên tiếp, địch thủ không kịp trở tay.'
    },

    technique_diamond_body: {
        id: 'technique_diamond_body',
        name: 'Kim Cang Bất Hoại',
        description: 'Phòng thủ tuyệt đối, tăng 25% DEF + 20% HP + 15% Resist, shield 40% max HP',
        shortDesc: 'Kim cang thân - phòng thủ tuyệt đối',
        type: 'combat',
        tier: 8,
        unlockCondition: { type: UNLOCK_TYPES.REALM, minLevel: 7 },
        lore: 'Luyện thể đến cực hạn, thân như kim cang, vạn kiếm không xuyên, vạn pháp khó xâm.'
    },

    technique_demon_disintegration: {
        id: 'technique_demon_disintegration',
        name: 'Thiên Ma Giải Thể',
        description: 'Bạo tẩu hóa ma, tăng 20% ATK + 20% Speed, đánh đổi -15% DEF, berserk mode',
        shortDesc: 'Hóa ma bạo tẩu - đổi phòng thủ lấy tấn công',
        type: 'combat',
        tier: 8,
        unlockCondition: { type: UNLOCK_TYPES.DUNGEON, minFloor: 9 },
        lore: 'Giải phóng ma tính, tấn công như cuồng phong bão táp, đánh đổi phòng thủ để đạt sát thương tối đa.'
    },

    technique_peerless_healing: {
        id: 'technique_peerless_healing',
        name: 'Vô Song Trị Liệu',
        description: 'Y đạo tối cao, tăng 15% Regen + 15% ZhenYuan + 10% mọi chỉ số, AOE heal 50%',
        shortDesc: 'Y đạo tối cao - hồi phục mạnh mẽ',
        type: 'combat',
        tier: 8,
        unlockCondition: { type: UNLOCK_TYPES.REALM, minLevel: 6 },
        lore: 'Y đạo tu đến chí cao có thể sinh tử nhục cốt, hồi phục thương tích nặng nề chỉ trong chớp mắt.'
    },

    // ==================== EPIC COMBAT TECHNIQUES ====================
    technique_phantom_step: {
        id: 'technique_phantom_step',
        name: 'Quỷ Mị Bộ Pháp',
        description: 'Thân pháp tuyệt diệu, tăng 20% Dodge + 15% Speed, evade all 2 giây',
        shortDesc: 'Thân pháp quỷ mị - né tránh hoàn hảo',
        type: 'combat',
        tier: 6,
        unlockCondition: { type: UNLOCK_TYPES.DUNGEON, minFloor: 6 },
        lore: 'Thân pháp như bóng ma, đi lại vô hình vô tích, địch thủ dù có ngàn tay vạn thủ cũng không chạm được.'
    },

    technique_heaven_breaker: {
        id: 'technique_heaven_breaker',
        name: 'Hỗn Thiên Thủ',
        description: 'Phá giáp tuyệt kỹ, tăng 20% Penetration + 10% Crit Rate, ignore all armor',
        shortDesc: 'Phá giáp tuyệt kỹ - xuyên thấu mọi phòng thủ',
        type: 'combat',
        tier: 6,
        unlockCondition: { type: UNLOCK_TYPES.REALM, minLevel: 5 },
        lore: 'Một thủ đập ra có thể phá vỡ mọi giáp trụ, xuyên thấu mọi phòng thủ.'
    },

    technique_blood_burning: {
        id: 'technique_blood_burning',
        name: 'Nhiên Huyết Quyết',
        description: 'Đốt máu tăng sức, tăng 20% Lifesteal + 10% ATK, đánh đổi 20% HP lấy +60% ATK',
        shortDesc: 'Nhiên huyết - đốt máu lấy sức mạnh',
        type: 'combat',
        tier: 6,
        unlockCondition: { type: UNLOCK_TYPES.DUNGEON, minFloor: 7 },
        lore: 'Đốt cháy tinh huyết để đổi lấy sức mạnh bùng nổ trong thời gian ngắn.'
    },

    technique_frost_domain: {
        id: 'technique_frost_domain',
        name: 'Băng Phong Lĩnh Vực',
        description: 'Lĩnh vực băng giá, tăng 15% DEF + 15% Resist, AOE slow 50% + giảm 30% ATK',
        shortDesc: 'Lĩnh vực băng - làm chậm địch thủ',
        type: 'combat',
        tier: 6,
        unlockCondition: { type: UNLOCK_TYPES.REALM, minLevel: 5 },
        lore: 'Triển khai lĩnh vực băng tuyết, trong phạm vi này mọi địch thủ đều bị làm chậm và suy yếu.'
    },

    // ==================== RARE COMBAT TECHNIQUES ====================
    technique_sword_dance: {
        id: 'technique_sword_dance',
        name: 'Kiếm Vũ',
        description: 'Kiếm múa loạn vũ, tăng 15% ATK + 10% Speed, 4 chém nhanh',
        shortDesc: 'Kiếm vũ - liên chém tốc độ cao',
        type: 'combat',
        tier: 4,
        unlockCondition: { type: UNLOCK_TYPES.DUNGEON, minFloor: 4 },
        lore: 'Kiếm pháp nhanh như chớp, một thoáng mắt đã có bốn đòn chém lướt qua.'
    },

    technique_guardian_bell: {
        id: 'technique_guardian_bell',
        name: 'Hộ Tâm Chung',
        description: 'Hộ mệnh kỳ bảo, tăng 15% HP + 10% Regen, tái sinh khi chết',
        shortDesc: 'Hộ mệnh - bảo vệ mạng sống',
        type: 'combat',
        tier: 4,
        unlockCondition: { type: UNLOCK_TYPES.REALM, minLevel: 4 },
        lore: 'Có Hộ Tâm Chung bảo vệ, dù gặp nguy hiểm chết người cũng có một lần cơ hội tái sinh.'
    },

    technique_void_palm: {
        id: 'technique_void_palm',
        name: 'Phá Không Chưởng',
        description: 'Chưởng pháp hư không, tăng 12% ATK + 12% Crit Rate, stun 2 giây',
        shortDesc: 'Phá không chưởng - choáng địch',
        type: 'combat',
        tier: 4,
        unlockCondition: { type: UNLOCK_TYPES.DUNGEON, minFloor: 5 },
        lore: 'Chưởng lực đánh vào hư không rồi bùng nổ đột ngột, khiến địch thủ choáng váng mất khả năng phản kháng.'
    }
};

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Lấy technique by ID
 */
export function getTechniqueById(techniqueId) {
    return CULTIVATION_TECHNIQUES[techniqueId] || null;
}

/**
 * Lấy tất cả techniques theo type
 */
export function getTechniquesByType(type) {
    return Object.values(CULTIVATION_TECHNIQUES).filter(t => t.type === type);
}

/**
 * Kiểm tra user có đủ điều kiện unlock technique không
 * @param {Object} technique - Technique definition
 * @param {Object} cultivation - User cultivation doc
 * @param {Object} userProgress - Optional: { completedQuests, dungeonFloors }
 * @returns {{ canUnlock: boolean, reason?: string }}
 */
export function checkUnlockCondition(technique, cultivation, userProgress = {}) {
    const { unlockCondition } = technique;

    switch (unlockCondition.type) {
        case UNLOCK_TYPES.REALM:
            if (cultivation.realmLevel >= unlockCondition.minLevel) {
                return { canUnlock: true };
            }
            return {
                canUnlock: false,
                reason: `Cần đạt cảnh giới ${unlockCondition.minLevel}`
            };

        case UNLOCK_TYPES.QUEST:
            const completedQuests = userProgress.completedQuests || [];
            if (completedQuests.includes(unlockCondition.questId)) {
                return { canUnlock: true };
            }
            return {
                canUnlock: false,
                reason: `Cần hoàn thành nhiệm vụ đặc biệt`
            };

        case UNLOCK_TYPES.DUNGEON:
            const maxFloor = userProgress.maxDungeonFloor || 0;
            if (maxFloor >= unlockCondition.minFloor) {
                return { canUnlock: true };
            }
            return {
                canUnlock: false,
                reason: `Cần vượt qua bí cảnh tầng ${unlockCondition.minFloor}`
            };

        default:
            return { canUnlock: false, reason: 'Điều kiện không xác định' };
    }
}

/**
 * Lấy danh sách techniques có thể unlock
 */
export function getAvailableTechniques(cultivation, userProgress = {}) {
    const techniques = Object.values(CULTIVATION_TECHNIQUES);
    const learnedIds = (cultivation.learnedTechniques || []).map(t => t.techniqueId);

    return techniques.map(technique => {
        const learned = learnedIds.includes(technique.id);
        const { canUnlock, reason } = checkUnlockCondition(technique, cultivation, userProgress);

        return {
            ...technique,
            learned,
            canUnlock: learned || canUnlock,
            unlockReason: learned ? null : reason
        };
    });
}

export default {
    CULTIVATION_TECHNIQUES,
    TECHNIQUE_TYPES,
    UNLOCK_TYPES,
    getTechniqueById,
    getTechniquesByType,
    checkUnlockCondition,
    getAvailableTechniques
};
