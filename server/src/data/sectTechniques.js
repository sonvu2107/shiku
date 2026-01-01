// data/sectTechniques.js
// Công pháp riêng của Tông Môn - Mở khóa qua Tàng Kinh Các

/**
 * Định nghĩa công pháp Tông Môn
 * - requiredLibraryLevel: Cấp Tàng Kinh Các cần để mở khóa
 * - contributionCost: Chi phí Contribution tuần để học
 */
export const SECT_TECHNIQUES = [
    // ==================== CẤP 1 - COMMON/UNCOMMON ====================
    {
        id: "sect_basic_qi",
        name: "Tông Môn Thổ Nạp Pháp",
        description: "Công pháp cơ bản của tông môn, tăng 8% Tấn Công và Phòng Thủ",
        rarity: "common",
        requiredLibraryLevel: 1,
        contributionCost: 100,
        stats: { attack: 0.08, defense: 0.08 },
        skill: {
            name: "Tông Môn Hộ Thể",
            description: "Tạo khiên hấp thụ 15% Khí Huyết tối đa trong 5 giây",
            cooldown: 25
        }
    },
    {
        id: "sect_spirit_gathering",
        name: "Linh Khí Quy Tụ Pháp",
        description: "Công pháp thu thập linh khí, tăng 10% Chân Nguyên và 5% Hồi Phục",
        rarity: "uncommon",
        requiredLibraryLevel: 1,
        contributionCost: 150,
        stats: { zhenYuan: 0.10, regeneration: 0.05 },
        skill: {
            name: "Linh Khí Quy Tụ",
            description: "Hồi 15% Chân Nguyên tối đa",
            cooldown: 30
        }
    },

    // ==================== CẤP 2 - RARE ====================
    {
        id: "sect_unity_strike",
        name: "Đồng Tâm Quyết",
        description: "Công pháp hiệp đồng chiến đấu, tăng 12% Tấn Công và 8% Chí Mạng",
        rarity: "rare",
        requiredLibraryLevel: 2,
        contributionCost: 300,
        stats: { attack: 0.12, criticalRate: 0.08 },
        skill: {
            name: "Đồng Tâm Nhất Kích",
            description: "Gây sát thương bằng 200% Tấn Công",
            cooldown: 22
        }
    },
    {
        id: "sect_guardian_aura",
        name: "Hộ Tông Thần Công",
        description: "Công pháp bảo vệ tông môn, tăng 15% Phòng Thủ và 10% Kháng Cự",
        rarity: "rare",
        requiredLibraryLevel: 2,
        contributionCost: 350,
        stats: { defense: 0.15, resistance: 0.10 },
        skill: {
            name: "Tông Môn Hộ Khí",
            description: "Giảm 40% sát thương nhận trong 4 giây",
            cooldown: 35
        }
    },
    {
        id: "sect_swift_formation",
        name: "Tốc Chiến Trận Pháp",
        description: "Công pháp thân pháp tông môn, tăng 15% Tốc Độ và 12% Né Tránh",
        rarity: "rare",
        requiredLibraryLevel: 2,
        contributionCost: 300,
        stats: { speed: 0.15, dodge: 0.12 },
        skill: {
            name: "Trận Pháp Biến Hóa",
            description: "Tăng 60% Tốc Độ trong 6 giây",
            cooldown: 32
        }
    },

    // ==================== CẤP 3 - EPIC/LEGENDARY ====================
    {
        id: "sect_hegemon_art",
        name: "Bá Vương Tông Pháp",
        description: "Công pháp tối cao của tông môn, tăng 18% Tấn Công, 12% Chí Mạng và 10% Xuyên Thấu",
        rarity: "epic",
        requiredLibraryLevel: 3,
        contributionCost: 600,
        stats: { attack: 0.18, criticalRate: 0.12, penetration: 0.10 },
        skill: {
            name: "Bá Vương Chi Khí",
            description: "Gây sát thương bằng 250% Tấn Công, bỏ qua 30% Phòng Thủ",
            cooldown: 28
        }
    },
    {
        id: "sect_immortal_body",
        name: "Bất Tử Tông Thể",
        description: "Công pháp luyện thể tông môn, tăng 20% Khí Huyết và 15% Hồi Phục",
        rarity: "epic",
        requiredLibraryLevel: 3,
        contributionCost: 650,
        stats: { qiBlood: 0.20, regeneration: 0.15 },
        skill: {
            name: "Bất Tử Chi Thân",
            description: "Hồi 25% Khí Huyết và miễn dịch điều khiển trong 3 giây",
            cooldown: 45
        }
    },
    {
        id: "sect_ancestral_legacy",
        name: "Tổ Sư Di Huấn",
        description: "Công pháp truyền thừa của tổ sư, tăng 15% tất cả chỉ số chiến đấu",
        rarity: "legendary",
        requiredLibraryLevel: 3,
        contributionCost: 1000,
        stats: {
            attack: 0.15,
            defense: 0.15,
            qiBlood: 0.15,
            zhenYuan: 0.15,
            speed: 0.15,
            criticalRate: 0.10
        },
        skill: {
            name: "Tổ Sư Uy Linh",
            description: "Tăng 25% tất cả chỉ số trong 10 giây",
            cooldown: 60
        }
    }
];

// Map for quick lookup
export const SECT_TECHNIQUES_MAP = new Map(SECT_TECHNIQUES.map(t => [t.id, t]));

// Get techniques available at a library level
export function getTechniquesForLibraryLevel(level) {
    return SECT_TECHNIQUES.filter(t => t.requiredLibraryLevel <= level);
}

// Get rarity color
export function getRarityColor(rarity) {
    switch (rarity) {
        case 'legendary': return '#FBBF24'; // amber/gold
        case 'epic': return '#A855F7'; // purple
        case 'rare': return '#3B82F6'; // blue
        case 'uncommon': return '#22C55E'; // green
        default: return '#94A3B8'; // slate
    }
}

export default SECT_TECHNIQUES;
