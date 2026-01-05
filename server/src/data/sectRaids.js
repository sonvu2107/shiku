// data/sectRaids.js

/**
 * Định nghĩa các Bí Cảnh Tông Môn (Raid theo tuần)
 */
export const SECT_RAIDS = {
    weekly_beast: {
        id: "weekly_beast",
        name: "Yêu Thú Hỗn Mang",
        description: "Tiêu diệt yêu thú trong rừng hoang",
        baseHPByLevel: {
            1: 5000,
            2: 8000,
            3: 12000,
            4: 17000,
            5: 23000,
        },
        rewards: {
            exp: 2000,
            spiritStones: 800,
            sectEnergy: 3000,
        },
    },
    ancient_tomb: {
        id: "ancient_tomb",
        name: "Cổ Mộ Bí Cảnh",
        description: "Thám hiểm cổ mộ huyền bí",
        minSectLevel: 2,
        baseHPByLevel: {
            1: 8000,
            2: 15000,
            3: 25000,
            4: 40000,
            5: 60000,
        },
        rewards: {
            exp: 8000,
            spiritStones: 3000,
            sectEnergy: 15000,
        },
    },
    demon_invasion: {
        id: "demon_invasion",
        name: "Ma Tộc Tấn Công",
        description: "Chống lại cuộc tấn công của Ma Tộc",
        minSectLevel: 3,
        baseHPByLevel: {
            1: 20000,
            2: 40000,
            3: 70000,
            4: 110000,
            5: 160000,
        },
        rewards: {
            exp: 30000,
            spiritStones: 12000,
            sectEnergy: 50000,
        },
    },
};
