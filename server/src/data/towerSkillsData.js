
// towerSkillsData.js
// Only use effects available in combatSkillService.js (or newly added ones)

export const TOWER_MOB_SKILLS = {
    // =========================
    // TIER 1 (Floors 1-20): Phàm Thú
    // =========================
    MANH_KICH: {
        id: "MANH_KICH",
        name: "Mãnh Kích",
        type: "attack",
        weight: 100,
        cooldown: 0,
        damage: { multiplier: 1.20 },
        tags: ["basic"],
    },

    THIET_BI: {
        id: "THIET_BI",
        name: "Thiết Bì",
        type: "buff",
        weight: 70,
        cooldown: 3,
        effects: [
            { kind: "defense", valuePct: 0.20, duration: 3 }, // +20% DEF, 3 turns
        ],
        tags: ["tank"],
    },

    HOI_SUC: {
        id: "HOI_SUC",
        name: "Hồi Sức",
        type: "heal",
        weight: 60,
        cooldown: 4,
        heal: { pctMaxHp: 0.10 },
        tags: ["sustain"],
    },

    // =========================
    // TIER 2 (Floors 21-50): Yêu Linh
    // =========================
    HOA_CAU_THUAT: {
        id: "HOA_CAU_THUAT",
        name: "Hỏa Cầu Thuật",
        type: "attack",
        weight: 85,
        cooldown: 2,
        damage: { multiplier: 1.10 },
        effects: [
            { kind: "poison", chance: 0.55, duration: 3, dotPctMaxHp: 0.03, label: "Thiêu Đốt" },
        ],
        tags: ["element", "dot"],
    },

    BANG_TIEN: {
        id: "BANG_TIEN",
        name: "Băng Tiễn",
        type: "attack",
        weight: 85,
        cooldown: 2,
        damage: { multiplier: 1.05 },
        effects: [
            { kind: "slow", chance: 0.65, duration: 2, slowPct: 0.25 },
        ],
        tags: ["element", "control"],
    },

    DOC_VU: {
        id: "DOC_VU",
        name: "Độc Vụ",
        type: "attack",
        weight: 80,
        cooldown: 3,
        damage: { multiplier: 0.95 },
        effects: [
            { kind: "poison", chance: 0.70, duration: 4, dotPctMaxHp: 0.025 },
        ],
        tags: ["dot"],
    },

    CUONG_BAO: {
        id: "CUONG_BAO",
        name: "Cuồng Bạo",
        type: "buff",
        weight: 60,
        cooldown: 5,
        condition: { hpBelowPct: 0.50 },
        effects: [
            { kind: "attack", valuePct: 0.30, duration: 3 },
            { kind: "criticalRate", valuePct: 0.10, duration: 3 },
        ],
        tags: ["enrage"],
    },

    // =========================
    // TIER 3 (Floors 51-80): Ma Tướng
    // =========================
    LOI_DINH_NHAT_KICH: {
        id: "LOI_DINH_NHAT_KICH",
        name: "Lôi Đình Nhất Kích",
        type: "attack",
        weight: 75,
        cooldown: 4,
        damage: { multiplier: 1.60 },
        effects: [
            { kind: "stun", chance: 0.35, duration: 1 },
        ],
        tags: ["burst", "hardCC"],
    },

    HAP_TINH_DAI_PHAP: {
        id: "HAP_TINH_DAI_PHAP",
        name: "Hấp Tinh Đại Pháp",
        type: "attack",
        weight: 80,
        cooldown: 3,
        damage: { multiplier: 1.25 },
        effects: [
            { kind: "lifesteal", valuePct: 0.30, duration: 1 },
        ],
        tags: ["sustain", "lifesteal"],
    },

    PHAN_CHAN: {
        id: "PHAN_CHAN",
        name: "Phản Chấn",
        type: "buff",
        weight: 55,
        cooldown: 5,
        effects: [
            { kind: "reflectDamage", valuePct: 0.25, duration: 2 },
        ],
        tags: ["mechanic"],
    },

    PHONG_AN: {
        id: "PHONG_AN",
        name: "Phong Ấn",
        type: "debuff",
        weight: 55,
        cooldown: 5,
        effects: [
            { kind: "silence", chance: 0.60, duration: 2, label: "Phong Ấn" },
        ],
        tags: ["anti-skill-proxy"],
    },

    // =========================
    // TIER 4 (Floors 81-100): Yêu Vương / Cổ Ma
    // =========================
    THIEN_MA_GIAI_THE: {
        id: "THIEN_MA_GIAI_THE",
        name: "Thiên Ma Giải Thể",
        type: "attack",
        weight: 45,
        cooldown: 6,
        damage: { multiplier: 3.00 },
        selfCost: { hpPctMaxHp: 0.20 },
        tags: ["ultimate", "risk"],
    },

    BAT_DIET_KIM_THAN: {
        id: "BAT_DIET_KIM_THAN",
        name: "Bất Diệt Kim Thân",
        type: "buff",
        weight: 35,
        cooldown: 7,
        effects: [
            { kind: "invulnerable", duration: 1 },
        ],
        tags: ["ultimate", "defense"],
    },

    VAN_KIEP_BAT_PHUC: {
        id: "VAN_KIEP_BAT_PHUC",
        name: "Vạn Kiếp Bất Phục",
        type: "passive",
        weight: 25,
        cooldown: 0,
        passive: { kind: "fatalProtection", once: true, revivePctMaxHp: 0.30 },
        tags: ["revive"],
    },

    QUY_NGUYEN: {
        id: "QUY_NGUYEN",
        name: "Quy Nguyên",
        type: "utility",
        weight: 40,
        cooldown: 6,
        effects: [
            { kind: "dispel", chance: 1.0, label: "Quy Nguyên" },
            { kind: "defenseReduction", chance: 1.0, duration: 2, valuePct: 0.30, label: "Tán Công" },
        ],
        tags: ["anti-buff-proxy"],
    },

    // =========================
    // BOSS SIGNATURE SKILLS (hardcode)
    // =========================
    HUYET_NGUYET_TRAN: {
        id: "HUYET_NGUYET_TRAN",
        name: "Huyết Nguyệt Trảm",
        type: "attack",
        weight: 999,
        cooldown: 5,
        damage: { multiplier: 1.80 },
        effects: [
            { kind: "poison", chance: 0.80, duration: 4, dotPctMaxHp: 0.03, label: "Huyết Sát" },
            { kind: "criticalRate", valuePct: 0.20, duration: 2 },
        ],
        tags: ["signature", "dot", "crit"],
    },

    COT_GIAP: {
        id: "COT_GIAP",
        name: "Cốt Giáp",
        type: "buff",
        weight: 999,
        cooldown: 6,
        effects: [
            { kind: "shield", valuePctMaxHp: 0.35, duration: 3 },
            { kind: "defense", valuePct: 0.25, duration: 3 },
        ],
        tags: ["signature", "shield"],
    },

    KINH_HOA_THUY_NGUYET: {
        id: "KINH_HOA_THUY_NGUYET",
        name: "Kính Hoa Thủy Nguyệt",
        type: "utility",
        weight: 999,
        cooldown: 7,
        effects: [
            { kind: "speed", valuePct: 0.35, duration: 2 },
            { kind: "attack", valuePct: 0.25, duration: 2 },
            { kind: "criticalRate", valuePct: 0.15, duration: 2 },
        ],
        tags: ["signature", "tempo"],
    },

    HU_VO: {
        id: "HU_VO",
        name: "Hư Vô",
        type: "attack",
        weight: 999,
        cooldown: 6,
        damage: { multiplier: 2.20 },
        condition: { targetHpBelowPct: 0.30, bonusMultiplier: 1.40 },
        effects: [
            { kind: "defenseReduction", chance: 1.0, duration: 2, valuePct: 0.35 },
        ],
        tags: ["signature", "execute"],
    },
};

export const TOWER_TIER_POOLS = [
    { tier: 1, floors: [1, 20], skills: ["MANH_KICH", "THIET_BI", "HOI_SUC"] },
    { tier: 2, floors: [21, 50], skills: ["HOA_CAU_THUAT", "BANG_TIEN", "DOC_VU", "CUONG_BAO"] },
    { tier: 3, floors: [51, 80], skills: ["LOI_DINH_NHAT_KICH", "HAP_TINH_DAI_PHAP", "PHAN_CHAN", "PHONG_AN"] },
    { tier: 4, floors: [81, 100], skills: ["THIEN_MA_GIAI_THE", "BAT_DIET_KIM_THAN", "VAN_KIEP_BAT_PHUC", "QUY_NGUYEN"] },
];

export const TOWER_BOSS_MAP = {
    10: { name: "Huyết Lang Vương", signature: "HUYET_NGUYET_TRAN", extrasFromTier: 1 },
    20: { name: "Bạch Cốt Tinh", signature: "COT_GIAP", extrasFromTier: 1 },

    30: { name: "Xích Viêm Ma Sư", signature: "HOA_CAU_THUAT", extrasFromTier: 2 },
    40: { name: "Hàn U Quỷ Chủ", signature: "BANG_TIEN", extrasFromTier: 2 },
    50: { name: "Vạn Độc La Sát", signature: "DOC_VU", extrasFromTier: 2 },

    60: { name: "Tâm Ma", signature: "KINH_HOA_THUY_NGUYET", extrasFromTier: 2 },

    70: { name: "Lôi Sát Ma Tôn", signature: "LOI_DINH_NHAT_KICH", extrasFromTier: 2 },
    80: { name: "Huyết U Ma Tướng", signature: "HAP_TINH_DAI_PHAP", extrasFromTier: 2 },

    90: { name: "Cổ Ma Bất Diệt", signature: "BAT_DIET_KIM_THAN", extrasFromTier: 2 },
    100: { name: "Hỗn Thế Ma Vương", signature: "HU_VO", extrasFromTier: 3 },
};
