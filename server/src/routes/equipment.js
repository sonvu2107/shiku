import express from "express";
import Equipment, { EQUIPMENT_TYPES, WEAPON_SUBTYPES, ARMOR_SUBTYPES, ACCESSORY_SUBTYPES, POWER_ITEM_SUBTYPES, RARITY, ELEMENTAL_TYPES } from "../models/Equipment.js";
import { authRequired } from "../middleware/auth.js";
import { adminRateLimit, strictAdminRateLimit } from "../middleware/adminSecurity.js";
import AuditLog from "../models/AuditLog.js";
import { getClientAgent } from "../utils/clientAgent.js";

import mongoose from "mongoose";

const router = express.Router();

// ==================== MIDDLEWARE ====================
const adminRequired = async (req, res, next) => {
  try {
    let hasAdminAccess = false;

    if (req.user.role === "admin") {
      hasAdminAccess = true;
    }

    if (!hasAdminAccess && req.user.role && req.user.role !== 'user') {
      const Role = mongoose.model('Role');
      const roleDoc = await Role.findOne({ name: req.user.role, isActive: true }).lean();
      if (roleDoc && roleDoc.permissions) {
        hasAdminAccess = Object.keys(roleDoc.permissions).some(
          key => key.startsWith('admin.') && roleDoc.permissions[key] === true
        );
      }
    }

    if (!hasAdminAccess) {
      await AuditLog.logAction(req.user._id, 'access_equipment_admin', {
        result: 'failed',
        ipAddress: req.ip,
        clientAgent: getClientAgent(req),
        reason: 'Insufficient permissions'
      });
      return res.status(403).json({ error: "Chỉ admin mới có quyền truy cập" });
    }
    next();
  } catch (error) {
    console.error('[ERROR][EQUIPMENT] Admin middleware error:', error);
    res.status(500).json({ error: "Lỗi server" });
  }
};

// ==================== PUBLIC ROUTES (Get equipment list) ====================

/**
 * GET /api/equipment
 * Lấy danh sách equipment
 */
router.get("/", authRequired, async (req, res, next) => {
  try {
    const { type, rarity, level_required, search, page = 1, limit = 50 } = req.query;

    const filters = {};

    if (type && Object.values(EQUIPMENT_TYPES).includes(type)) {
      filters.type = type;
    }

    if (rarity && Object.values(RARITY).includes(rarity)) {
      filters.rarity = rarity;
    }

    if (level_required) {
      filters.level_required = { $lte: parseInt(level_required) };
    }

    if (search) {
      filters.$text = { $search: search };
    }

    filters.is_active = true;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const equipments = await Equipment.find(filters)
      .sort({ rarity: 1, level_required: 1, name: 1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await Equipment.countDocuments(filters);

    res.json({
      success: true,
      data: equipments,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error("[EQUIPMENT] Error fetching equipment list:", error);
    next(error);
  }
});

/**
 * GET /api/equipment/:id
 * Lấy thông tin chi tiết equipment
 */
router.get("/:id", authRequired, async (req, res, next) => {
  try {
    const equipment = await Equipment.findById(req.params.id);

    if (!equipment || !equipment.is_active) {
      return res.status(404).json({ error: "Equipment không tồn tại" });
    }

    res.json({
      success: true,
      data: equipment
    });
  } catch (error) {
    console.error("[EQUIPMENT] Error fetching equipment:", error);
    next(error);
  }
});

// ==================== ADMIN ROUTES ====================

/**
 * POST /api/equipment/admin/create
 * Tạo equipment mới
 */
router.post("/admin/create", strictAdminRateLimit, authRequired, adminRequired, async (req, res, next) => {
  try {
    const {
      name,
      type,
      subtype,
      rarity,
      level_required,
      price,
      img,
      description,
      stats,
      special_effect,
      skill_bonus,
      energy_regen,
      lifesteal,
      true_damage,
      buff_duration
    } = req.body;

    // Validation
    if (!name || !type || !rarity) {
      return res.status(400).json({ error: "Thiếu thông tin bắt buộc: name, type, rarity" });
    }

    if (!Object.values(EQUIPMENT_TYPES).includes(type)) {
      return res.status(400).json({ error: "Type không hợp lệ" });
    }

    if (!Object.values(RARITY).includes(rarity)) {
      return res.status(400).json({ error: "Rarity không hợp lệ" });
    }

    // Validate subtype nếu có
    if (subtype) {
      if (type === EQUIPMENT_TYPES.WEAPON && !Object.values(WEAPON_SUBTYPES).includes(subtype)) {
        return res.status(400).json({ error: "Weapon subtype không hợp lệ" });
      }
      if (type === EQUIPMENT_TYPES.ARMOR && !Object.values(ARMOR_SUBTYPES).includes(subtype)) {
        return res.status(400).json({ error: "Armor subtype không hợp lệ" });
      }
      if (type === EQUIPMENT_TYPES.ACCESSORY && !Object.values(ACCESSORY_SUBTYPES).includes(subtype)) {
        return res.status(400).json({ error: "Accessory subtype không hợp lệ" });
      }
      if (type === EQUIPMENT_TYPES.POWER_ITEM && !Object.values(POWER_ITEM_SUBTYPES).includes(subtype)) {
        return res.status(400).json({ error: "Power Item subtype không hợp lệ" });
      }
    }

    // Convert elemental_damage object to Map if provided
    let statsData = stats || {};
    if (statsData.elemental_damage && typeof statsData.elemental_damage === 'object' && !(statsData.elemental_damage instanceof Map)) {
      const elementalMap = new Map();
      Object.entries(statsData.elemental_damage).forEach(([key, value]) => {
        if (Object.values(ELEMENTAL_TYPES).includes(key)) {
          elementalMap.set(key, parseFloat(value) || 0);
        }
      });
      statsData.elemental_damage = elementalMap;
    }

    const equipment = new Equipment({
      name,
      type,
      subtype: subtype || null,
      rarity,
      level_required: parseInt(level_required) || 1,
      price: parseInt(price) || 0,
      img: img || null,
      description: description || '',
      stats: {
        attack: parseFloat(statsData.attack) || 0,
        defense: parseFloat(statsData.defense) || 0,
        hp: parseFloat(statsData.hp) || 0,
        crit_rate: parseFloat(statsData.crit_rate) || 0,
        crit_damage: parseFloat(statsData.crit_damage) || 0,
        penetration: parseFloat(statsData.penetration) || 0,
        speed: parseFloat(statsData.speed) || 0,
        evasion: parseFloat(statsData.evasion) || 0,
        hit_rate: parseFloat(statsData.hit_rate) || 0,
        elemental_damage: statsData.elemental_damage || new Map()
      },
      special_effect: special_effect || null,
      skill_bonus: parseFloat(skill_bonus) || 0,
      energy_regen: parseFloat(energy_regen) || 0,
      lifesteal: parseFloat(lifesteal) || 0,
      true_damage: parseFloat(true_damage) || 0,
      buff_duration: parseFloat(buff_duration) || 0,
      created_by: req.user._id,
      is_active: true
    });

    await equipment.save();

    await AuditLog.logAction(req.user._id, 'create_equipment', {
      targetId: equipment._id,
      targetType: 'equipment',
      result: 'success',
      ipAddress: req.ip,
      clientAgent: getClientAgent(req),
      details: { name, type, rarity }
    });

    res.status(201).json({
      success: true,
      message: "Tạo equipment thành công",
      data: equipment
    });
  } catch (error) {
    console.error("[EQUIPMENT] Error creating equipment:", error);
    await AuditLog.logAction(req.user._id, 'create_equipment', {
      result: 'failed',
      ipAddress: req.ip,
      clientAgent: getClientAgent(req),
      error: error.message
    });
    next(error);
  }
});

/**
 * PUT /api/equipment/admin/:id
 * Cập nhật equipment
 */
router.put("/admin/:id", strictAdminRateLimit, authRequired, adminRequired, async (req, res, next) => {
  try {
    const equipment = await Equipment.findById(req.params.id);

    if (!equipment) {
      return res.status(404).json({ error: "Equipment không tồn tại" });
    }

    const {
      name,
      type,
      subtype,
      rarity,
      level_required,
      price,
      img,
      description,
      stats,
      special_effect,
      skill_bonus,
      energy_regen,
      lifesteal,
      true_damage,
      buff_duration,
      is_active
    } = req.body;

    // Update fields
    if (name !== undefined) equipment.name = name;
    if (type !== undefined) {
      if (!Object.values(EQUIPMENT_TYPES).includes(type)) {
        return res.status(400).json({ error: "Type không hợp lệ" });
      }
      equipment.type = type;
    }
    if (subtype !== undefined) equipment.subtype = subtype || null;
    if (rarity !== undefined) {
      if (!Object.values(RARITY).includes(rarity)) {
        return res.status(400).json({ error: "Rarity không hợp lệ" });
      }
      equipment.rarity = rarity;
    }
    if (level_required !== undefined) equipment.level_required = parseInt(level_required) || 1;
    if (price !== undefined) equipment.price = parseInt(price) || 0;
    if (img !== undefined) equipment.img = img || null;
    if (description !== undefined) equipment.description = description || '';
    if (special_effect !== undefined) equipment.special_effect = special_effect || null;
    if (skill_bonus !== undefined) equipment.skill_bonus = parseFloat(skill_bonus) || 0;
    if (energy_regen !== undefined) equipment.energy_regen = parseFloat(energy_regen) || 0;
    if (lifesteal !== undefined) equipment.lifesteal = parseFloat(lifesteal) || 0;
    if (true_damage !== undefined) equipment.true_damage = parseFloat(true_damage) || 0;
    if (buff_duration !== undefined) equipment.buff_duration = parseFloat(buff_duration) || 0;
    if (is_active !== undefined) equipment.is_active = is_active;

    // Update stats
    if (stats) {
      if (stats.attack !== undefined) equipment.stats.attack = parseFloat(stats.attack) || 0;
      if (stats.defense !== undefined) equipment.stats.defense = parseFloat(stats.defense) || 0;
      if (stats.hp !== undefined) equipment.stats.hp = parseFloat(stats.hp) || 0;
      if (stats.crit_rate !== undefined) equipment.stats.crit_rate = parseFloat(stats.crit_rate) || 0;
      if (stats.crit_damage !== undefined) equipment.stats.crit_damage = parseFloat(stats.crit_damage) || 0;
      if (stats.penetration !== undefined) equipment.stats.penetration = parseFloat(stats.penetration) || 0;
      if (stats.speed !== undefined) equipment.stats.speed = parseFloat(stats.speed) || 0;
      if (stats.evasion !== undefined) equipment.stats.evasion = parseFloat(stats.evasion) || 0;
      if (stats.hit_rate !== undefined) equipment.stats.hit_rate = parseFloat(stats.hit_rate) || 0;

      // Update elemental_damage
      if (stats.elemental_damage && typeof stats.elemental_damage === 'object') {
        const elementalMap = new Map();
        Object.entries(stats.elemental_damage).forEach(([key, value]) => {
          if (Object.values(ELEMENTAL_TYPES).includes(key)) {
            elementalMap.set(key, parseFloat(value) || 0);
          }
        });
        equipment.stats.elemental_damage = elementalMap;
      }
    }

    equipment.updated_at = new Date();
    await equipment.save();

    await AuditLog.logAction(req.user._id, 'update_equipment', {
      targetId: equipment._id,
      targetType: 'equipment',
      result: 'success',
      ipAddress: req.ip,
      clientAgent: getClientAgent(req)
    });

    res.json({
      success: true,
      message: "Cập nhật equipment thành công",
      data: equipment
    });
  } catch (error) {
    console.error("[EQUIPMENT] Error updating equipment:", error);
    await AuditLog.logAction(req.user._id, 'update_equipment', {
      targetId: req.params.id,
      targetType: 'equipment',
      result: 'failed',
      ipAddress: req.ip,
      clientAgent: getClientAgent(req),
      error: error.message
    });
    next(error);
  }
});

/**
 * DELETE /api/equipment/admin/:id
 * Xóa equipment (soft delete - set is_active = false)
 * Cũng xóa khỏi inventory và unequip của tất cả người dùng
 */
router.delete("/admin/:id", strictAdminRateLimit, authRequired, adminRequired, async (req, res, next) => {
  try {
    const equipment = await Equipment.findById(req.params.id);

    if (!equipment) {
      return res.status(404).json({ error: "Equipment không tồn tại" });
    }

    const equipmentId = equipment._id;
    const equipmentIdStr = equipmentId.toString();

    // Soft delete equipment
    equipment.is_active = false;
    equipment.updated_at = new Date();
    await equipment.save();

    // Import Cultivation model
    const Cultivation = mongoose.model('Cultivation');

    // 1. Remove from all users' inventories
    const inventoryResult = await Cultivation.updateMany(
      {
        $or: [
          { 'inventory.itemId': equipmentIdStr },
          { 'inventory.metadata._id': equipmentId }
        ]
      },
      {
        $pull: {
          inventory: {
            $or: [
              { itemId: equipmentIdStr },
              { 'metadata._id': equipmentId }
            ]
          }
        }
      }
    );

    // 2. Unequip from all users' equipped slots
    // Build update for all possible equipment slots
    const equipmentSlots = [
      'weapon', 'magicTreasure', 'helmet', 'chest', 'shoulder',
      'gloves', 'boots', 'belt', 'ring', 'necklace', 'earring', 'bracelet', 'powerItem'
    ];

    const unequipQuery = {};
    equipmentSlots.forEach(slot => {
      unequipQuery[`equipped.${slot}`] = equipmentId;
    });

    const unequipUpdate = {};
    equipmentSlots.forEach(slot => {
      unequipUpdate[`equipped.${slot}`] = null;
    });

    const equippedResult = await Cultivation.updateMany(
      { $or: equipmentSlots.map(slot => ({ [`equipped.${slot}`]: equipmentId })) },
      { $set: unequipUpdate }
    );

    await AuditLog.logAction(req.user._id, 'delete_equipment', {
      targetId: equipment._id,
      targetType: 'equipment',
      result: 'success',
      ipAddress: req.ip,
      clientAgent: getClientAgent(req),
      details: {
        name: equipment.name,
        usersInventoryCleared: inventoryResult.modifiedCount || 0,
        usersUnequipped: equippedResult.modifiedCount || 0
      }
    });

    res.json({
      success: true,
      message: `Xóa equipment thành công. Đã xóa khỏi ${inventoryResult.modifiedCount || 0} túi đồ và tháo khỏi ${equippedResult.modifiedCount || 0} người dùng.`
    });
  } catch (error) {
    console.error("[EQUIPMENT] Error deleting equipment:", error);
    await AuditLog.logAction(req.user._id, 'delete_equipment', {
      targetId: req.params.id,
      targetType: 'equipment',
      result: 'failed',
      ipAddress: req.ip,
      clientAgent: getClientAgent(req),
      error: error.message
    });
    next(error);
  }
});

/**
 * GET /api/equipment/admin/list
 * Lấy danh sách equipment (admin - bao gồm cả inactive)
 */
router.get("/admin/list", adminRateLimit, authRequired, adminRequired, async (req, res, next) => {
  try {
    const { type, rarity, level_required, search, is_active, page = 1, limit = 50 } = req.query;

    const filters = {};

    if (type && Object.values(EQUIPMENT_TYPES).includes(type)) {
      filters.type = type;
    }

    if (rarity && Object.values(RARITY).includes(rarity)) {
      filters.rarity = rarity;
    }

    if (level_required) {
      filters.level_required = { $lte: parseInt(level_required) };
    }

    if (search) {
      filters.$text = { $search: search };
    }

    if (is_active !== undefined) {
      filters.is_active = is_active === 'true';
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const equipments = await Equipment.find(filters)
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await Equipment.countDocuments(filters);

    res.json({
      success: true,
      data: equipments,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error("[EQUIPMENT] Error fetching admin equipment list:", error);
    next(error);
  }
});

/**
 * POST /api/equipment/admin/cleanup
 * Dọn dẹp tất cả equipment đã bị xóa (is_active = false) khỏi inventory và equipped của tất cả người dùng
 */
router.post("/admin/cleanup", strictAdminRateLimit, authRequired, adminRequired, async (req, res, next) => {
  try {
    // Lấy tất cả equipment đã bị vô hiệu hóa
    const inactiveEquipments = await Equipment.find({ is_active: false }).select('_id name').lean();

    if (inactiveEquipments.length === 0) {
      return res.json({
        success: true,
        message: "Không có equipment nào cần dọn dẹp",
        data: { inactiveCount: 0, inventoryCleared: 0, unequipped: 0 }
      });
    }

    const inactiveIds = inactiveEquipments.map(eq => eq._id);
    const inactiveIdStrs = inactiveEquipments.map(eq => eq._id.toString());

    const Cultivation = mongoose.model('Cultivation');

    // 1. Remove from all users' inventories
    const inventoryResult = await Cultivation.updateMany(
      {
        $or: [
          { 'inventory.itemId': { $in: inactiveIdStrs } },
          { 'inventory.metadata._id': { $in: inactiveIds } }
        ]
      },
      {
        $pull: {
          inventory: {
            $or: [
              { itemId: { $in: inactiveIdStrs } },
              { 'metadata._id': { $in: inactiveIds } }
            ]
          }
        }
      }
    );

    // 2. Unequip from all users' equipped slots
    const equipmentSlots = [
      'weapon', 'magicTreasure', 'helmet', 'chest', 'shoulder',
      'gloves', 'boots', 'belt', 'ring', 'necklace', 'earring', 'bracelet', 'powerItem'
    ];

    const unequipUpdate = {};
    equipmentSlots.forEach(slot => {
      unequipUpdate[`equipped.${slot}`] = null;
    });

    const equippedResult = await Cultivation.updateMany(
      { $or: equipmentSlots.map(slot => ({ [`equipped.${slot}`]: { $in: inactiveIds } })) },
      { $set: unequipUpdate }
    );

    await AuditLog.logAction(req.user._id, 'cleanup_inactive_equipment', {
      result: 'success',
      ipAddress: req.ip,
      clientAgent: getClientAgent(req),
      details: {
        inactiveEquipmentCount: inactiveEquipments.length,
        equipmentNames: inactiveEquipments.map(eq => eq.name),
        usersInventoryCleared: inventoryResult.modifiedCount || 0,
        usersUnequipped: equippedResult.modifiedCount || 0
      }
    });

    res.json({
      success: true,
      message: `Dọn dẹp thành công! Đã xóa ${inactiveEquipments.length} equipment khỏi ${inventoryResult.modifiedCount || 0} túi đồ và tháo khỏi ${equippedResult.modifiedCount || 0} người dùng.`,
      data: {
        inactiveCount: inactiveEquipments.length,
        equipmentNames: inactiveEquipments.map(eq => eq.name),
        inventoryCleared: inventoryResult.modifiedCount || 0,
        unequipped: equippedResult.modifiedCount || 0
      }
    });
  } catch (error) {
    console.error("[EQUIPMENT] Error cleaning up inactive equipment:", error);
    await AuditLog.logAction(req.user._id, 'cleanup_inactive_equipment', {
      result: 'failed',
      ipAddress: req.ip,
      clientAgent: getClientAgent(req),
      error: error.message
    });
    next(error);
  }
});

/**
 * POST /api/equipment/admin/bulk-rebalance
 * Tự động cân bằng lại stats của tất cả equipment dựa trên type và rarity
 */
router.post("/admin/bulk-rebalance", strictAdminRateLimit, authRequired, adminRequired, async (req, res, next) => {
  try {
    // Hệ số nhân theo phẩm chất - TĂNG GAP giữa các tier
    // Đảm bảo rarity cao hơn luôn mạnh hơn rarity thấp (ở cùng level range hợp lý)
    const RARITY_MULTIPLIERS = {
      common: 1.0,       // Base
      uncommon: 1.5,     // +50%
      rare: 2.5,         // +67% từ uncommon
      epic: 4.0,         // +60% từ rare
      legendary: 6.5,    // +62.5% từ epic
      mythic: 10.0       // +54% từ legendary
    };

    // Bonus Crit Rate theo phẩm chất (flat, không nhân)
    const CRIT_RATE_BONUS = {
      common: 0,
      uncommon: 0.01,
      rare: 0.02,
      epic: 0.04,
      legendary: 0.06,
      mythic: 0.08
    };

    // Chỉ số cơ bản theo loại trang bị (fallback)
    const BASE_STATS = {
      weapon: { attack: 50, defense: 0, hp: 0, crit_rate: 0.02, crit_damage: 0.1, speed: 5, price: 500 },
      magic_treasure: { attack: 30, defense: 10, hp: 100, crit_rate: 0.03, crit_damage: 0.15, speed: 0, price: 800 },
      armor: { attack: 0, defense: 40, hp: 200, crit_rate: 0, crit_damage: 0, speed: 0, price: 600 },
      accessory: { attack: 15, defense: 15, hp: 50, crit_rate: 0.05, crit_damage: 0.2, speed: 3, price: 400 },
      power_item: { attack: 25, defense: 5, hp: 80, crit_rate: 0.02, crit_damage: 0.1, speed: 2, price: 350 },
      pill: { attack: 10, defense: 10, hp: 150, crit_rate: 0.01, crit_damage: 0.05, speed: 5, price: 200 }
    };

    // Chỉ số chi tiết theo SUBTYPE
    const SUBTYPE_STATS = {
      // Vũ khí
      sword: { attack: 50, defense: 5, hp: 0, crit_rate: 0.03, crit_damage: 0.12, speed: 5, price: 500 },
      saber: { attack: 65, defense: 0, hp: 0, crit_rate: 0.02, crit_damage: 0.15, speed: 3, price: 550 },
      spear: { attack: 55, defense: 0, hp: 0, crit_rate: 0.02, crit_damage: 0.10, speed: 6, price: 480 },
      bow: { attack: 45, defense: 0, hp: 0, crit_rate: 0.06, crit_damage: 0.20, speed: 4, price: 520 },
      fan: { attack: 35, defense: 10, hp: 50, crit_rate: 0.04, crit_damage: 0.15, speed: 7, price: 600 },
      flute: { attack: 30, defense: 5, hp: 80, crit_rate: 0.03, crit_damage: 0.12, speed: 8, price: 650 },
      brush: { attack: 40, defense: 15, hp: 60, crit_rate: 0.04, crit_damage: 0.18, speed: 5, price: 700 },
      dual_sword: { attack: 70, defense: 0, hp: 0, crit_rate: 0.05, crit_damage: 0.18, speed: 8, price: 650 },
      flying_sword: { attack: 60, defense: 0, hp: 0, crit_rate: 0.04, crit_damage: 0.15, speed: 10, price: 800 },
      // Giáp
      helmet: { attack: 0, defense: 25, hp: 150, crit_rate: 0, crit_damage: 0, speed: 0, price: 400 },
      chest: { attack: 0, defense: 60, hp: 250, crit_rate: 0, crit_damage: 0, speed: 0, price: 700 },
      shoulder: { attack: 5, defense: 35, hp: 100, crit_rate: 0, crit_damage: 0, speed: 2, price: 500 },
      gloves: { attack: 10, defense: 20, hp: 50, crit_rate: 0.02, crit_damage: 0.08, speed: 3, price: 450 },
      boots: { attack: 0, defense: 30, hp: 80, crit_rate: 0, crit_damage: 0, speed: 8, price: 550 },
      belt: { attack: 5, defense: 25, hp: 120, crit_rate: 0.01, crit_damage: 0.05, speed: 2, price: 400 },
      // Trang sức
      ring: { attack: 20, defense: 5, hp: 30, crit_rate: 0.04, crit_damage: 0.15, speed: 2, price: 500 },
      necklace: { attack: 15, defense: 15, hp: 80, crit_rate: 0.03, crit_damage: 0.12, speed: 3, price: 550 },
      earring: { attack: 10, defense: 10, hp: 40, crit_rate: 0.06, crit_damage: 0.25, speed: 4, price: 500 },
      bracelet: { attack: 15, defense: 20, hp: 60, crit_rate: 0.02, crit_damage: 0.10, speed: 5, price: 450 },
      // Linh vật
      spirit_stone: { attack: 30, defense: 5, hp: 50, crit_rate: 0.02, crit_damage: 0.10, speed: 3, price: 350 },
      spirit_pearl: { attack: 15, defense: 20, hp: 100, crit_rate: 0.03, crit_damage: 0.12, speed: 2, price: 400 },
      spirit_seal: { attack: 25, defense: 10, hp: 70, crit_rate: 0.04, crit_damage: 0.15, speed: 4, price: 450 }
    };

    // Lấy tất cả equipment active
    const equipments = await Equipment.find({ is_active: true });

    if (equipments.length === 0) {
      return res.json({
        success: true,
        message: "Không có equipment nào để cân bằng",
        data: { updated: 0 }
      });
    }

    let updatedCount = 0;
    const updates = [];

    for (const eq of equipments) {
      // Ưu tiên dùng subtype stats, fallback về type stats
      const baseStats = (eq.subtype && SUBTYPE_STATS[eq.subtype])
        ? SUBTYPE_STATS[eq.subtype]
        : (BASE_STATS[eq.type] || BASE_STATS.weapon);
      const multiplier = RARITY_MULTIPLIERS[eq.rarity] || 1;
      const critBonus = CRIT_RATE_BONUS[eq.rarity] || 0;
      // GIẢM level multiplier từ 10% xuống 5% mỗi level
      const levelMultiplier = 1 + (eq.level_required - 1) * 0.05;

      const newStats = {
        attack: Math.round(baseStats.attack * multiplier * levelMultiplier),
        defense: Math.round(baseStats.defense * multiplier * levelMultiplier),
        hp: Math.round(baseStats.hp * multiplier * levelMultiplier),
        // Crit Rate: base + flat bonus (không nhân multiplier)
        crit_rate: Math.round((baseStats.crit_rate + critBonus) * 100) / 100,
        // Crit Damage: nhân theo rarity (ít nguy hiểm hơn crit rate)
        crit_damage: Math.round(baseStats.crit_damage * multiplier * 100) / 100,
        speed: Math.round(baseStats.speed * multiplier * levelMultiplier),
        penetration: eq.stats?.penetration || 0,
        evasion: eq.stats?.evasion || 0,
        hit_rate: eq.stats?.hit_rate || 0,
        elemental_damage: eq.stats?.elemental_damage || new Map()
      };

      const newPrice = Math.round(baseStats.price * multiplier * levelMultiplier);

      eq.stats = newStats;
      eq.price = newPrice;
      eq.updated_at = new Date();

      await eq.save();
      updatedCount++;
      updates.push({ name: eq.name, type: eq.type, rarity: eq.rarity });
    }

    await AuditLog.logAction(req.user._id, 'bulk_rebalance_equipment', {
      result: 'success',
      ipAddress: req.ip,
      clientAgent: getClientAgent(req),
      details: { updatedCount, equipmentNames: updates.slice(0, 20).map(u => u.name) }
    });

    res.json({
      success: true,
      message: `Đã cân bằng lại ${updatedCount} trang bị thành công!`,
      data: { updated: updatedCount }
    });
  } catch (error) {
    console.error("[EQUIPMENT] Error bulk rebalancing:", error);
    await AuditLog.logAction(req.user._id, 'bulk_rebalance_equipment', {
      result: 'failed',
      ipAddress: req.ip,
      clientAgent: getClientAgent(req),
      error: error.message
    });
    next(error);
  }
});

/**
 * POST /api/equipment/admin/auto-generate
 * Tự động tạo equipment với stats tính theo công thức cân bằng
 */
router.post("/admin/auto-generate", strictAdminRateLimit, authRequired, adminRequired, async (req, res, next) => {
  try {
    const {
      type,
      subtype,
      rarity,
      level_required = 1,
      customName,
      description,
      img,
      special_effect,
      element
    } = req.body;

    // Validation
    if (!type || !rarity) {
      return res.status(400).json({ error: "Thiếu thông tin bắt buộc: type, rarity" });
    }

    if (!Object.values(EQUIPMENT_TYPES).includes(type)) {
      return res.status(400).json({ error: "Type không hợp lệ" });
    }

    if (!Object.values(RARITY).includes(rarity)) {
      return res.status(400).json({ error: "Rarity không hợp lệ" });
    }

    // Hệ số nhân theo phẩm chất
    const RARITY_MULTIPLIERS = {
      common: 1.0,
      uncommon: 1.5,
      rare: 2.5,
      epic: 4.0,
      legendary: 6.5,
      mythic: 10.0
    };

    // Bonus Crit Rate
    const CRIT_RATE_BONUS = {
      common: 0,
      uncommon: 0.01,
      rare: 0.02,
      epic: 0.04,
      legendary: 0.06,
      mythic: 0.08
    };

    // Base stats theo type
    const BASE_STATS = {
      weapon: { attack: 50, defense: 0, hp: 0, crit_rate: 0.02, crit_damage: 0.1, speed: 5, price: 500 },
      magic_treasure: { attack: 30, defense: 10, hp: 100, crit_rate: 0.03, crit_damage: 0.15, speed: 0, price: 800 },
      armor: { attack: 0, defense: 40, hp: 200, crit_rate: 0, crit_damage: 0, speed: 0, price: 600 },
      accessory: { attack: 15, defense: 15, hp: 50, crit_rate: 0.05, crit_damage: 0.2, speed: 3, price: 400 },
      power_item: { attack: 25, defense: 5, hp: 80, crit_rate: 0.02, crit_damage: 0.1, speed: 2, price: 350 }
    };

    // Subtype stats
    const SUBTYPE_STATS = {
      sword: { attack: 50, defense: 5, hp: 0, crit_rate: 0.03, crit_damage: 0.12, speed: 5, price: 500 },
      saber: { attack: 65, defense: 0, hp: 0, crit_rate: 0.02, crit_damage: 0.15, speed: 3, price: 550 },
      spear: { attack: 55, defense: 0, hp: 0, crit_rate: 0.02, crit_damage: 0.10, speed: 6, price: 480 },
      bow: { attack: 45, defense: 0, hp: 0, crit_rate: 0.06, crit_damage: 0.20, speed: 4, price: 520 },
      fan: { attack: 35, defense: 10, hp: 50, crit_rate: 0.04, crit_damage: 0.15, speed: 7, price: 600 },
      flute: { attack: 30, defense: 5, hp: 80, crit_rate: 0.03, crit_damage: 0.12, speed: 8, price: 650 },
      brush: { attack: 40, defense: 15, hp: 60, crit_rate: 0.04, crit_damage: 0.18, speed: 5, price: 700 },
      dual_sword: { attack: 70, defense: 0, hp: 0, crit_rate: 0.05, crit_damage: 0.18, speed: 8, price: 650 },
      flying_sword: { attack: 60, defense: 0, hp: 0, crit_rate: 0.04, crit_damage: 0.15, speed: 10, price: 800 },
      helmet: { attack: 0, defense: 25, hp: 150, crit_rate: 0, crit_damage: 0, speed: 0, price: 400 },
      chest: { attack: 0, defense: 60, hp: 250, crit_rate: 0, crit_damage: 0, speed: 0, price: 700 },
      shoulder: { attack: 5, defense: 35, hp: 100, crit_rate: 0, crit_damage: 0, speed: 2, price: 500 },
      gloves: { attack: 10, defense: 20, hp: 50, crit_rate: 0.02, crit_damage: 0.08, speed: 3, price: 450 },
      boots: { attack: 0, defense: 30, hp: 80, crit_rate: 0, crit_damage: 0, speed: 8, price: 550 },
      belt: { attack: 5, defense: 25, hp: 120, crit_rate: 0.01, crit_damage: 0.05, speed: 2, price: 400 },
      ring: { attack: 20, defense: 5, hp: 30, crit_rate: 0.04, crit_damage: 0.15, speed: 2, price: 500 },
      necklace: { attack: 15, defense: 15, hp: 80, crit_rate: 0.03, crit_damage: 0.12, speed: 3, price: 550 },
      earring: { attack: 10, defense: 10, hp: 40, crit_rate: 0.06, crit_damage: 0.25, speed: 4, price: 500 },
      bracelet: { attack: 15, defense: 20, hp: 60, crit_rate: 0.02, crit_damage: 0.10, speed: 5, price: 450 },
      spirit_stone: { attack: 30, defense: 5, hp: 50, crit_rate: 0.02, crit_damage: 0.10, speed: 3, price: 350 },
      spirit_pearl: { attack: 15, defense: 20, hp: 100, crit_rate: 0.03, crit_damage: 0.12, speed: 2, price: 400 },
      spirit_seal: { attack: 25, defense: 10, hp: 70, crit_rate: 0.04, crit_damage: 0.15, speed: 4, price: 450 }
    };

    // Smart naming theo rarity và loại
    const RARITY_PREFIXES = {
      common: ['Thô', 'Sơ Cấp', 'Phàm'],
      uncommon: ['Tinh', 'Lương', 'Hảo'],
      rare: ['Linh', 'Diệu', 'Quý'],
      epic: ['Huyền', 'Thượng', 'Cực'],
      legendary: ['Thần', 'Thiên', 'Thánh'],
      mythic: ['Tiên', 'Hồng Hoang', 'Thái Cổ']
    };

    const ELEMENT_NAMES = {
      fire: 'Hỏa Diễm',
      ice: 'Băng Tuyết',
      wind: 'Phong Vân',
      thunder: 'Lôi Điện',
      earth: 'Đại Địa',
      water: 'Thủy Nguyệt'
    };

    const SUBTYPE_NAMES = {
      sword: 'Kiếm',
      saber: 'Đao',
      spear: 'Thương',
      bow: 'Cung',
      fan: 'Phiến',
      flute: 'Tiêu',
      brush: 'Bút',
      dual_sword: 'Song Kiếm',
      flying_sword: 'Phi Kiếm',
      helmet: 'Mũ',
      chest: 'Giáp',
      shoulder: 'Hộ Vai',
      gloves: 'Găng Tay',
      boots: 'Giày',
      belt: 'Đai Lưng',
      ring: 'Nhẫn',
      necklace: 'Dây Chuyền',
      earring: 'Khuyên Tai',
      bracelet: 'Vòng Tay',
      spirit_stone: 'Linh Thạch',
      spirit_pearl: 'Linh Châu',
      spirit_seal: 'Linh Ấn'
    };

    const TYPE_NAMES = {
      weapon: 'Vũ Khí',
      magic_treasure: 'Pháp Bảo',
      armor: 'Giáp',
      accessory: 'Trang Sức',
      power_item: 'Linh Vật'
    };

    // Generate name
    let generatedName = customName;
    if (!generatedName) {
      const prefix = RARITY_PREFIXES[rarity][Math.floor(Math.random() * RARITY_PREFIXES[rarity].length)];
      const elementPart = element ? ELEMENT_NAMES[element] + ' ' : '';
      const typePart = subtype ? SUBTYPE_NAMES[subtype] : TYPE_NAMES[type];
      generatedName = `${prefix} ${elementPart}${typePart}`;
    }

    // Calculate stats
    const baseStats = (subtype && SUBTYPE_STATS[subtype])
      ? SUBTYPE_STATS[subtype]
      : (BASE_STATS[type] || BASE_STATS.weapon);
    const multiplier = RARITY_MULTIPLIERS[rarity] || 1;
    const critBonus = CRIT_RATE_BONUS[rarity] || 0;
    const levelMultiplier = 1 + (parseInt(level_required) - 1) * 0.05;

    const calculatedStats = {
      attack: Math.round(baseStats.attack * multiplier * levelMultiplier),
      defense: Math.round(baseStats.defense * multiplier * levelMultiplier),
      hp: Math.round(baseStats.hp * multiplier * levelMultiplier),
      crit_rate: Math.round((baseStats.crit_rate + critBonus) * 100) / 100,
      crit_damage: Math.round(baseStats.crit_damage * multiplier * 100) / 100,
      speed: Math.round(baseStats.speed * multiplier * levelMultiplier),
      penetration: 0,
      evasion: 0,
      hit_rate: 0,
      elemental_damage: new Map()
    };

    // Add elemental damage if specified
    if (element && Object.values(ELEMENTAL_TYPES).includes(element)) {
      const elementalDamage = Math.round(baseStats.attack * multiplier * levelMultiplier * 0.3);
      calculatedStats.elemental_damage.set(element, elementalDamage);
    }

    const calculatedPrice = Math.round(baseStats.price * multiplier * levelMultiplier);

    // Create equipment
    const equipment = new Equipment({
      name: generatedName,
      type,
      subtype: subtype || null,
      rarity,
      level_required: parseInt(level_required) || 1,
      price: calculatedPrice,
      img: img || null,
      description: description || null,
      stats: calculatedStats,
      special_effect: special_effect || null,
      created_by: req.user._id,
      is_active: true
    });

    await equipment.save();

    await AuditLog.logAction(req.user._id, 'auto_generate_equipment', {
      targetId: equipment._id,
      targetType: 'equipment',
      result: 'success',
      ipAddress: req.ip,
      clientAgent: getClientAgent(req),
      details: { name: generatedName, type, subtype, rarity, level_required }
    });

    res.status(201).json({
      success: true,
      message: `Tạo ${generatedName} thành công!`,
      data: equipment
    });
  } catch (error) {
    console.error("[EQUIPMENT] Error auto-generating equipment:", error);
    await AuditLog.logAction(req.user._id, 'auto_generate_equipment', {
      result: 'failed',
      ipAddress: req.ip,
      clientAgent: getClientAgent(req),
      error: error.message
    });
    next(error);
  }
});

export default router;

