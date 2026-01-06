import mongoose from "mongoose";

/**
 * Equipment Schema - Hệ Thống Trang Bị Tu Tiên
 * Quản lý vũ khí, pháp bảo, giáp, trang sức, linh thạch, đan dược
 */

// ==================== EQUIPMENT TYPES ====================
const EQUIPMENT_TYPES = {
  WEAPON: 'weapon',           // Vũ khí
  MAGIC_TREASURE: 'magic_treasure', // Pháp bảo
  ARMOR: 'armor',            // Giáp - Khải
  ACCESSORY: 'accessory',    // Trang sức
  POWER_ITEM: 'power_item',  // Linh thạch - Châu - Ấn
  PILL: 'pill'               // Đan dược
};

// ==================== WEAPON SUBTYPES ====================
const WEAPON_SUBTYPES = {
  SWORD: 'sword',           // Kiếm
  SABER: 'saber',           // Đao
  SPEAR: 'spear',           // Thương
  BOW: 'bow',               // Cung
  FAN: 'fan',               // Quạt
  FLUTE: 'flute',           // Sáo / Tiêu
  BRUSH: 'brush',           // Bút Pháp / Bút Trận
  DUAL_SWORD: 'dual_sword', // Song kiếm / Song đao
  FLYING_SWORD: 'flying_sword' // Linh kiếm phi hành
};

// ==================== ARMOR SUBTYPES ====================
const ARMOR_SUBTYPES = {
  HELMET: 'helmet',         // Mũ/Trâm
  CHEST: 'chest',           // Giáp ngực
  SHOULDER: 'shoulder',     // Vai giáp
  GLOVES: 'gloves',         // Hộ thủ (Găng tay)
  BOOTS: 'boots',           // Hộ cước (Boots)
  BELT: 'belt'              // Đai lưng
};

// ==================== ACCESSORY SUBTYPES ====================
const ACCESSORY_SUBTYPES = {
  RING: 'ring',             // Nhẫn
  NECKLACE: 'necklace',     // Dây chuyền
  EARRING: 'earring',       // Bông tai
  BRACELET: 'bracelet'      // Vòng tay
};

// ==================== POWER ITEM SUBTYPES ====================
const POWER_ITEM_SUBTYPES = {
  SPIRIT_STONE: 'spirit_stone',   // Linh thạch
  SPIRIT_PEARL: 'spirit_pearl',   // Linh châu
  SPIRIT_SEAL: 'spirit_seal'      // Linh ấn
};

// ==================== RARITY ====================
const RARITY = {
  COMMON: 'common',
  UNCOMMON: 'uncommon',
  RARE: 'rare',
  EPIC: 'epic',
  LEGENDARY: 'legendary',
  MYTHIC: 'mythic'
};

// ==================== ELEMENTAL TYPES ====================
const ELEMENTAL_TYPES = {
  FIRE: 'fire',     // Hỏa
  ICE: 'ice',       // Băng
  WIND: 'wind',     // Phong
  THUNDER: 'thunder', // Lôi
  EARTH: 'earth',   // Thổ
  WATER: 'water',   // Thủy
  LIGHT: 'light',   // Quang
  DARK: 'dark'      // Ám
};

// ==================== EQUIPMENT SCHEMA ====================
const EquipmentSchema = new mongoose.Schema({
  // ==================== THÔNG TIN CƠ BẢN ====================
  name: {
    type: String,
    required: true,
    trim: true,
    index: true
  },

  type: {
    type: String,
    enum: Object.values(EQUIPMENT_TYPES),
    required: true,
    index: true
  },

  subtype: {
    type: String,
    required: false // Optional, dùng cho weapon và armor
  },

  rarity: {
    type: String,
    enum: Object.values(RARITY),
    required: true,
    default: RARITY.COMMON,
    index: true
  },

  level_required: {
    type: Number,
    required: true,
    default: 1,
    min: 1,
    index: true
  },

  price: {
    type: Number,
    required: false,
    default: 0,
    min: 0,
    index: true
  },

  img: {
    type: String,
    required: false,
    default: null
  },

  description: {
    type: String,
    required: false,
    default: ''
  },

  // ==================== THÔNG SỐ SỨC MẠNH ====================
  stats: {
    attack: { type: Number, default: 0 },
    defense: { type: Number, default: 0 },
    hp: { type: Number, default: 0 },
    crit_rate: { type: Number, default: 0 }, // 0-1 (0% - 100%)
    crit_damage: { type: Number, default: 0 }, // 0-1 (0% - 100%)
    penetration: { type: Number, default: 0 },
    speed: { type: Number, default: 0 },
    evasion: { type: Number, default: 0 }, // 0-1 (0% - 100%)
    hit_rate: { type: Number, default: 0 }, // 0-1 (0% - 100%)
    elemental_damage: {
      type: Map,
      of: Number,
      default: {}
    }
  },

  // ==================== THÔNG SỐ ĐẶC BIỆT ====================
  special_effect: {
    type: String,
    required: false,
    default: null
  },

  skill_bonus: {
    type: Number,
    default: 0
  },

  energy_regen: {
    type: Number,
    default: 0
  },

  lifesteal: {
    type: Number,
    default: 0 // 0-1 (0% - 100%)
  },

  true_damage: {
    type: Number,
    default: 0
  },

  buff_duration: {
    type: Number,
    default: 0 // Tăng thời gian buff (giây)
  },

  // ==================== SUBTYPE & ELEMENT (Luyện Khí System) ====================
  subtype: {
    type: String,
    required: false,
    default: null // e.g., 'sword', 'helmet', 'ring'
  },

  slot: {
    type: String,
    required: false,
    default: null // e.g., 'weapon', 'helmet', 'ring'
  },

  element: {
    type: String,
    enum: ['metal', 'wood', 'water', 'fire', 'earth', null],
    default: null
  },

  tier: {
    type: Number,
    min: 1,
    max: 14,
    default: 1
  },

  // ==================== REALM-LOCK ====================
  realm_required: {
    type: Number,
    min: 1,
    max: 14,
    default: 1,
    index: true
  },

  // ==================== DURABILITY SYSTEM ====================
  durability: {
    current: { type: Number, default: 100 },
    max: { type: Number, default: 100 }
  },

  // ==================== SPECIAL MODIFIERS ====================
  // Modifiers là các hiệu ứng đặc biệt, không phải flat stats
  modifiers: [{
    // Type của modifier
    type: {
      type: String,
      enum: [
        // Combat modifiers
        'crit_vs_higher_realm',    // +X% crit vs cảnh giới cao hơn
        'damage_when_low_hp',      // +X% dmg khi HP < trigger%
        'first_strike_bonus',      // +X% dmg đòn đầu
        'last_hit_bonus',          // +X% dmg khi target < trigger% HP
        'counter_attack',          // X% chance phản đòn
        'dodge_after_hit',         // +X% dodge sau khi bị đánh
        'lifesteal_on_crit',       // +X% lifesteal khi crit
        'penetration_vs_armor',    // +X% xuyên giáp vs đối thủ có def cao
        'speed_boost_combat',      // +X speed trong combat
        'mana_regen_combat',       // +X mana/turn
        // Defensive modifiers
        'damage_reduction_percent', // -X% dmg nhận vào
        'block_chance',            // X% chance block (giảm 50% dmg)
        'reflect_damage',          // Phản X% dmg
        'heal_on_kill',            // Hồi X% HP khi hạ gục
        // Elemental modifiers
        'element_damage_bonus',    // +X% dmg nguyên tố
        'element_resist_bonus',    // +X% kháng nguyên tố
        // Special
        'exp_bonus',               // +X% EXP
        'spirit_stone_bonus',      // +X% linh thạch
        'item_drop_bonus'          // +X% drop rate
      ],
      required: true
    },
    value: { type: Number, required: true }, // Giá trị modifier
    trigger: { type: Number }, // Điều kiện kích hoạt (optional)
    element: { type: String }, // Nguyên tố liên quan (optional)
    scope: {
      type: String,
      enum: ['pve', 'pvp', 'all'],
      default: 'all'
    }
  }],

  // ==================== ELEMENT SYNERGY ====================
  // Lưu synergy bonus khi user trang bị đủ set
  synergy_active: {
    type: Boolean,
    default: false
  },

  // ==================== ADMIN & METADATA ====================
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },

  is_active: {
    type: Boolean,
    default: true,
    index: true
  },

  created_at: {
    type: Date,
    default: Date.now
  },

  updated_at: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  collection: 'equipments'
});

// ==================== INDEXES ====================
EquipmentSchema.index({ type: 1, rarity: 1 });
EquipmentSchema.index({ level_required: 1, rarity: 1 });
EquipmentSchema.index({ is_active: 1, type: 1 });
EquipmentSchema.index({ name: 'text', description: 'text' }); // Text search

// ==================== METHODS ====================

/**
 * Kiểm tra equipment có bị hỏng không (durability = 0)
 */
EquipmentSchema.methods.isBroken = function () {
  return this.durability && this.durability.current <= 0;
};

/**
 * Tính tổng stats của equipment
 * Equipment bị hỏng (durability = 0) sẽ trả về stats = 0
 */
EquipmentSchema.methods.getTotalStats = function () {
  // Equipment bị hỏng không cung cấp stats
  if (this.isBroken()) {
    return {
      attack: 0,
      defense: 0,
      hp: 0,
      crit_rate: 0,
      crit_damage: 0,
      penetration: 0,
      speed: 0,
      evasion: 0,
      hit_rate: 0,
      elemental_damage: {},
      skill_bonus: 0,
      energy_regen: 0,
      lifesteal: 0,
      true_damage: 0,
      buff_duration: 0,
      isBroken: true
    };
  }

  const stats = this.stats || {};
  return {
    attack: stats.attack || 0,
    defense: stats.defense || 0,
    hp: stats.hp || 0,
    crit_rate: stats.crit_rate || 0,
    crit_damage: stats.crit_damage || 0,
    penetration: stats.penetration || 0,
    speed: stats.speed || 0,
    evasion: stats.evasion || 0,
    hit_rate: stats.hit_rate || 0,
    elemental_damage: stats.elemental_damage || {},
    skill_bonus: this.skill_bonus || 0,
    energy_regen: this.energy_regen || 0,
    lifesteal: this.lifesteal || 0,
    true_damage: this.true_damage || 0,
    buff_duration: this.buff_duration || 0
  };
};

/**
 * Format equipment cho response
 */
EquipmentSchema.methods.toJSON = function () {
  const obj = this.toObject();

  // Convert Map to Object for JSON
  if (obj.stats && obj.stats.elemental_damage instanceof Map) {
    obj.stats.elemental_damage = Object.fromEntries(obj.stats.elemental_damage);
  }

  return obj;
};

// ==================== STATIC METHODS ====================

/**
 * Tìm equipment theo filters
 */
EquipmentSchema.statics.findByFilters = function (filters = {}) {
  const query = { is_active: true };

  if (filters.type) {
    query.type = filters.type;
  }

  if (filters.rarity) {
    query.rarity = filters.rarity;
  }

  if (filters.level_required !== undefined) {
    query.level_required = { $lte: filters.level_required };
  }

  if (filters.search) {
    query.$text = { $search: filters.search };
  }

  return this.find(query);
};

const Equipment = mongoose.model('Equipment', EquipmentSchema);

export default Equipment;
export { EQUIPMENT_TYPES, WEAPON_SUBTYPES, ARMOR_SUBTYPES, ACCESSORY_SUBTYPES, POWER_ITEM_SUBTYPES, RARITY, ELEMENTAL_TYPES };

