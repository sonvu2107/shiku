import express from "express";
import Equipment, { EQUIPMENT_TYPES, WEAPON_SUBTYPES, ARMOR_SUBTYPES, RARITY, ELEMENTAL_TYPES } from "../models/Equipment.js";
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

    // Check 1: Full admin role
    if (req.user.role === "admin") {
      hasAdminAccess = true;
    }

    // Check 2: User has admin.* permissions via their role  
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
 * Lấy danh sách equipment (public, có filter)
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
 * Tạo equipment mới (admin only)
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
 * Cập nhật equipment (admin only)
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
 */
router.delete("/admin/:id", strictAdminRateLimit, authRequired, adminRequired, async (req, res, next) => {
  try {
    const equipment = await Equipment.findById(req.params.id);

    if (!equipment) {
      return res.status(404).json({ error: "Equipment không tồn tại" });
    }

    equipment.is_active = false;
    equipment.updated_at = new Date();
    await equipment.save();

    await AuditLog.logAction(req.user._id, 'delete_equipment', {
      targetId: equipment._id,
      targetType: 'equipment',
      result: 'success',
      ipAddress: req.ip,
      clientAgent: getClientAgent(req),
      details: { name: equipment.name }
    });

    res.json({
      success: true,
      message: "Xóa equipment thành công"
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

export default router;

