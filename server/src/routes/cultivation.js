import express from "express";
import mongoose from "mongoose";
import Cultivation, { CULTIVATION_REALMS, QUEST_TEMPLATES, SHOP_ITEMS, ITEM_TYPES } from "../models/Cultivation.js";
import Equipment from "../models/Equipment.js";
import User from "../models/User.js";
import { authRequired } from "../middleware/auth.js";

const router = express.Router();

// ==================== MIDDLEWARE ====================
// Tất cả routes đều cần đăng nhập
router.use(authRequired);

// ==================== HELPER FUNCTIONS ====================

/**
 * Merge equipment stats vào combat stats
 * @param {Object} combatStats - Combat stats từ calculateCombatStats()
 * @param {Object} equipmentStats - Equipment stats từ getEquipmentStats()
 * @returns {Object} Combat stats đã merge với equipment stats
 */
const mergeEquipmentStatsIntoCombatStats = (combatStats, equipmentStats) => {
  if (!equipmentStats) return combatStats;
  
  combatStats.attack = (combatStats.attack || 0) + (equipmentStats.attack || 0);
  combatStats.defense = (combatStats.defense || 0) + (equipmentStats.defense || 0);
  combatStats.qiBlood = (combatStats.qiBlood || 0) + (equipmentStats.hp || 0);
  combatStats.speed = (combatStats.speed || 0) + (equipmentStats.speed || 0);
  combatStats.criticalRate = (combatStats.criticalRate || 0) + ((equipmentStats.crit_rate || 0) * 100);
  combatStats.criticalDamage = (combatStats.criticalDamage || 0) + ((equipmentStats.crit_damage || 0) * 100);
  combatStats.accuracy = (combatStats.accuracy || 0) + ((equipmentStats.hit_rate || 0) * 100);
  combatStats.dodge = (combatStats.dodge || 0) + ((equipmentStats.evasion || 0) * 100);
  combatStats.penetration = (combatStats.penetration || 0) + (equipmentStats.penetration || 0);
  combatStats.lifesteal = (combatStats.lifesteal || 0) + ((equipmentStats.lifesteal || 0) * 100);
  combatStats.regeneration = (combatStats.regeneration || 0) + (equipmentStats.energy_regen || 0);
  
  return combatStats;
};

/**
 * Format cultivation data cho response
 */
const formatCultivationResponse = (cultivation) => {
  // Dùng realmLevel từ database (realm hiện tại của người chơi)
  const currentRealm = CULTIVATION_REALMS.find(r => r.level === cultivation.realmLevel) || CULTIVATION_REALMS[0];
  // Tính realm có thể đạt được từ exp (để hiển thị progress)
  const potentialRealm = cultivation.getRealmFromExp();
  const progress = cultivation.getRealmProgress();
  
  // Tính exp cần cho realm tiếp theo (dựa trên realm hiện tại)
  const nextRealm = CULTIVATION_REALMS.find(r => r.level === currentRealm.level + 1);
  const expToNext = nextRealm ? Math.max(0, nextRealm.minExp - cultivation.exp) : 0;

  return {
    _id: cultivation._id,
    user: cultivation.user,
    
    // Tu vi & Cảnh giới
    exp: cultivation.exp,
    realm: {
      level: currentRealm.level, // Dùng realmLevel từ database
      name: currentRealm.name,
      description: currentRealm.description,
      color: currentRealm.color,
      icon: currentRealm.icon
    },
    subLevel: cultivation.subLevel,
    progress: progress,
    expToNextRealm: expToNext,
    // Thêm thông tin về realm có thể đạt được (để hiển thị progress bar)
    canBreakthrough: potentialRealm.level > currentRealm.level,
    
    // Linh thạch
    spiritStones: cultivation.spiritStones,
    totalSpiritStonesEarned: cultivation.totalSpiritStonesEarned,
    
    // Streak
    loginStreak: cultivation.loginStreak,
    longestStreak: cultivation.longestStreak,
    lastLoginDate: cultivation.lastLoginDate,
    
    // Nhiệm vụ
    dailyQuests: cultivation.dailyQuests.map(q => {
      const template = QUEST_TEMPLATES.daily.find(t => t.id === q.questId);
      return {
        ...q.toObject(),
        ...template,
        progressPercent: template?.requirement ? Math.min(100, (q.progress / template.requirement.count) * 100) : 100
      };
    }),
    weeklyQuests: cultivation.weeklyQuests.map(q => {
      const template = QUEST_TEMPLATES.weekly.find(t => t.id === q.questId);
      return {
        ...q.toObject(),
        ...template,
        progressPercent: template?.requirement ? Math.min(100, (q.progress / template.requirement.count) * 100) : 100
      };
    }),
    achievements: cultivation.achievements.map(q => {
      const template = QUEST_TEMPLATES.achievement.find(t => t.id === q.questId);
      return {
        ...q.toObject(),
        ...template,
        progressPercent: template?.requirement ? Math.min(100, (q.progress / template.requirement.count) * 100) : 100
      };
    }),
    
    // Kho đồ & Trang bị
    inventory: cultivation.inventory,
    equipped: cultivation.equipped,
    activeBoosts: cultivation.activeBoosts.filter(b => new Date(b.expiresAt) > new Date()),
    
    // Công pháp đã học
    learnedTechniques: cultivation.learnedTechniques || [],
    skills: cultivation.getSkills(),
    
    // Thống kê
    stats: cultivation.stats,
    
    // Thông số chiến đấu
    combatStats: cultivation.calculateCombatStats(),
    
    // Equipment stats (sẽ được load async nếu cần)
    equipmentStats: null, // Sẽ được populate nếu cần
    
    // Độ kiếp (Breakthrough)
    breakthroughSuccessRate: cultivation.breakthroughSuccessRate || 30,
    breakthroughFailureCount: cultivation.breakthroughFailureCount || 0,
    lastBreakthroughAttempt: cultivation.lastBreakthroughAttempt,
    breakthroughCooldownUntil: cultivation.breakthroughCooldownUntil,
    
    // Timestamps
    createdAt: cultivation.createdAt,
    updatedAt: cultivation.updatedAt
  };
};

// ==================== ROUTES ====================

/**
 * GET /api/cultivation
 * Lấy thông tin tu tiên của user hiện tại
 */
router.get("/", async (req, res, next) => {
  try {
    const userId = req.user.id;
    const cultivation = await Cultivation.getOrCreate(userId);
    
    // Force sync cultivationCache vào User
    try {
      await User.findByIdAndUpdate(userId, {
        $set: {
          'cultivationCache.realmLevel': cultivation.realmLevel,
          'cultivationCache.realmName': cultivation.realmName,
          'cultivationCache.exp': cultivation.exp
        }
      });
    } catch (syncErr) {
      console.error("[CULTIVATION] Error syncing cache:", syncErr);
    }
    
  // Load equipment stats
  let equipmentStats = null;
  try {
    equipmentStats = await cultivation.getEquipmentStats();
  } catch (equipErr) {
    console.error("[CULTIVATION] Error loading equipment stats:", equipErr);
  }
  
  const response = formatCultivationResponse(cultivation);
  response.equipmentStats = equipmentStats;
  
  // Merge equipment stats vào combatStats để đảm bảo consistency
  if (response.combatStats) {
    response.combatStats = mergeEquipmentStatsIntoCombatStats(response.combatStats, equipmentStats);
  }
    
    res.json({
      success: true,
      data: response
    });
  } catch (error) {
    console.error("[CULTIVATION] Error getting cultivation:", error);
    next(error);
  }
});

/**
 * POST /api/cultivation/sync-cache
 * Force sync cultivation cache cho user hiện tại
 */
router.post("/sync-cache", async (req, res, next) => {
  try {
    const userId = req.user.id;
    const cultivation = await Cultivation.findOne({ user: userId });
    
    if (!cultivation) {
      return res.status(404).json({
        success: false,
        message: "Chưa có thông tin tu tiên"
      });
    }
    
    // Sync vào User
    await User.findByIdAndUpdate(userId, {
      $set: {
        'cultivationCache.realmLevel': cultivation.realmLevel,
        'cultivationCache.realmName': cultivation.realmName,
        'cultivationCache.exp': cultivation.exp
      }
    });
    
    res.json({
      success: true,
      message: "Đã đồng bộ thông tin tu tiên",
      data: {
        realmLevel: cultivation.realmLevel,
        realmName: cultivation.realmName,
        exp: cultivation.exp
      }
    });
  } catch (error) {
    console.error("[CULTIVATION] Error syncing cache:", error);
    next(error);
  }
});

/**
 * POST /api/cultivation/batch
 * Lấy thông tin tu tiên của nhiều users (cho hiển thị badge)
 * @body {Array<string>} userIds - Danh sách user IDs
 */
router.post("/batch", async (req, res, next) => {
  try {
    const { userIds } = req.body;
    
    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "userIds phải là một mảng không rỗng"
      });
    }

    // Giới hạn số lượng userIds để tránh abuse
    const limitedUserIds = userIds.slice(0, 50);

    const cultivations = await Cultivation.find({
      user: { $in: limitedUserIds }
    })
    .select('user exp realmLevel realmName')
    .lean();

    // Convert to map với key là oderId
    const result = {};
    cultivations.forEach(c => {
      const realm = CULTIVATION_REALMS.find(r => r.level === c.realmLevel) || CULTIVATION_REALMS[0];
      result[c.user.toString()] = {
        exp: c.exp,
        realmLevel: c.realmLevel || realm.level,
        realmName: c.realmName || realm.name,
        realm: {
          level: realm.level,
          name: realm.name,
          color: realm.color
        }
      };
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error("[CULTIVATION] Error getting batch cultivation:", error);
    next(error);
  }
});

/**
 * GET /api/cultivation/user/:userId
 * Lấy thông tin tu tiên của user khác (public info)
 */
router.get("/user/:userId", async (req, res, next) => {
  try {
    const { userId } = req.params;
    
    // Kiểm tra user tồn tại
    const user = await User.findById(userId).select('name avatarUrl');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy vị đạo hữu này"
      });
    }
    
    const cultivation = await Cultivation.getOrCreate(userId);
    const realm = cultivation.getRealmFromExp();
    
    // Chỉ trả về thông tin public
    res.json({
      success: true,
      data: {
        user: {
          _id: user._id,
          name: user.name,
          avatarUrl: user.avatarUrl
        },
        exp: cultivation.exp,
        realm: {
          level: realm.level,
          name: realm.name,
          color: realm.color,
          icon: realm.icon
        },
        subLevel: cultivation.subLevel,
        equipped: cultivation.equipped,
        stats: {
          totalPostsCreated: cultivation.stats.totalPostsCreated,
          totalDaysActive: cultivation.stats.totalDaysActive,
          totalQuestsCompleted: cultivation.stats.totalQuestsCompleted
        },
        loginStreak: cultivation.loginStreak,
        longestStreak: cultivation.longestStreak
      }
    });
  } catch (error) {
    console.error("[CULTIVATION] Error getting user cultivation:", error);
    next(error);
  }
});

/**
 * POST /api/cultivation/login
 * Điểm danh hàng ngày
 */
router.post("/login", async (req, res, next) => {
  try {
    const userId = req.user.id;
    const cultivation = await Cultivation.getOrCreate(userId);
    
    const result = cultivation.processLogin();
    
    if (result.alreadyLoggedIn) {
      return res.json({
        success: true,
        message: "Bạn đã điểm danh hôm nay rồi",
        data: {
          alreadyLoggedIn: true,
          streak: result.streak
        }
      });
    }
    
    await cultivation.save();
    
    res.json({
      success: true,
      message: `Điểm danh thành công! Streak: ${result.streak} ngày`,
      data: {
        alreadyLoggedIn: false,
        streak: result.streak,
        expEarned: result.expEarned,
        stonesEarned: result.stonesEarned,
        leveledUp: result.leveledUp,
        newRealm: result.newRealm,
        cultivation: formatCultivationResponse(cultivation)
      }
    });
  } catch (error) {
    console.error("[CULTIVATION] Error processing login:", error);
    next(error);
  }
});

/**
 * POST /api/cultivation/quest/:questId/claim
 * Nhận thưởng nhiệm vụ
 */
router.post("/quest/:questId/claim", async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { questId } = req.params;
    
    const cultivation = await Cultivation.getOrCreate(userId);
    
    try {
      const result = cultivation.claimQuestReward(questId);
      await cultivation.save();
      
      res.json({
        success: true,
        message: "Nhận thưởng thành công!",
        data: {
          expEarned: result.expEarned,
          stonesEarned: result.stonesEarned,
          leveledUp: result.leveledUp,
          newRealm: result.newRealm,
          cultivation: formatCultivationResponse(cultivation)
        }
      });
    } catch (claimError) {
      return res.status(400).json({
        success: false,
        message: claimError.message
      });
    }
  } catch (error) {
    console.error("[CULTIVATION] Error claiming quest reward:", error);
    next(error);
  }
});

/**
 * GET /api/cultivation/shop
 * Lấy danh sách vật phẩm trong shop
 */
router.get("/shop", async (req, res, next) => {
  try {
    const userId = req.user.id;
    const cultivation = await Cultivation.getOrCreate(userId);
    
    // Đánh dấu item đã sở hữu - check chính xác hơn
    const shopItems = SHOP_ITEMS.map(item => {
      // Với công pháp, check trong learnedTechniques
      if (item.type === 'technique') {
        const isOwned = cultivation.learnedTechniques?.some(t => t.techniqueId === item.id) || false;
        return {
          ...item,
          owned: isOwned,
          canAfford: cultivation.spiritStones >= item.price
        };
      }
      
      // Với các item khác, check trong inventory
      const isOwned = cultivation.inventory.some(i => {
        // So sánh itemId (string)
        if (i.itemId && i.itemId.toString() === item.id) return true;
        // So sánh _id nếu có
        if (i._id && i._id.toString() === item.id) return true;
        return false;
      });
      
      return {
        ...item,
        owned: isOwned,
        canAfford: cultivation.spiritStones >= item.price
      };
    });
    
    // Lấy equipment có giá bán (price > 0) và is_active = true
    // Không filter theo level_required ở đây - để hiển thị tất cả, check level khi mua
    const availableEquipment = await Equipment.find({
      is_active: true,
      price: { $gt: 0 }
    }).lean();
    
    // Format equipment để tương thích với shop items
    const equipmentItems = availableEquipment.map(eq => {
      // Convert Map to Object nếu cần
      let elementalDamage = {};
      if (eq.stats?.elemental_damage instanceof Map) {
        elementalDamage = Object.fromEntries(eq.stats.elemental_damage);
      } else if (eq.stats?.elemental_damage) {
        elementalDamage = eq.stats.elemental_damage;
      }
      
      // Check xem equipment đã có trong inventory chưa
      const eqId = eq._id.toString();
      const isOwned = cultivation.inventory.some(i => {
        // So sánh itemId (string)
        if (i.itemId && i.itemId.toString() === eqId) return true;
        // So sánh metadata._id (ObjectId hoặc string)
        if (i.metadata?._id) {
          const metadataId = i.metadata._id.toString();
          if (metadataId === eqId) return true;
        }
        // So sánh _id nếu có
        if (i._id && i._id.toString() === eqId) return true;
        return false;
      });
      
      return {
        id: eqId,
        name: eq.name,
        type: `equipment_${eq.type}`, // equipment_weapon, equipment_armor, etc.
        equipmentType: eq.type, // weapon, armor, etc.
        subtype: eq.subtype || null,
        rarity: eq.rarity,
        price: eq.price,
        img: eq.img,
        description: eq.description,
        level_required: eq.level_required,
        stats: {
          ...eq.stats,
          elemental_damage: elementalDamage
        },
        special_effect: eq.special_effect,
        skill_bonus: eq.skill_bonus,
        energy_regen: eq.energy_regen,
        lifesteal: eq.lifesteal,
        true_damage: eq.true_damage,
        buff_duration: eq.buff_duration,
        owned: isOwned,
        canAfford: cultivation.spiritStones >= eq.price,
        canUse: cultivation.realmLevel >= eq.level_required
      };
    });
    
    // Combine shop items và equipment
    const allItems = [...shopItems, ...equipmentItems];
    
    res.json({
      success: true,
      data: {
        items: allItems,
        spiritStones: cultivation.spiritStones
      }
    });
  } catch (error) {
    console.error("[CULTIVATION] Error getting shop:", error);
    next(error);
  }
});

/**
 * POST /api/cultivation/shop/buy/:itemId
 * Mua vật phẩm
 */
router.post("/shop/buy/:itemId", async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { itemId } = req.params;
    
    const cultivation = await Cultivation.getOrCreate(userId);
    
    // Kiểm tra nếu là equipment (ObjectId hợp lệ)
    if (mongoose.Types.ObjectId.isValid(itemId)) {
      const equipment = await Equipment.findById(itemId);
      
      if (!equipment) {
        return res.status(400).json({
          success: false,
          message: "Trang bị không tồn tại"
        });
      }
      
      if (!equipment.is_active) {
        return res.status(400).json({
          success: false,
          message: "Trang bị này đã bị vô hiệu hóa"
        });
      }
      
      if (equipment.price <= 0) {
        return res.status(400).json({
          success: false,
          message: "Trang bị này không được bán"
        });
      }
      
      // Kiểm tra level requirement
      if (cultivation.realmLevel < equipment.level_required) {
        return res.status(400).json({
          success: false,
          message: `Cần đạt cảnh giới cấp ${equipment.level_required} để mua trang bị này`
        });
      }
      
      // Kiểm tra đã sở hữu chưa (check trong inventory) - chính xác hơn
      const itemIdStr = itemId.toString();
      const alreadyOwned = cultivation.inventory.some(i => {
        // So sánh itemId (string)
        if (i.itemId && i.itemId.toString() === itemIdStr) return true;
        // So sánh metadata._id (ObjectId hoặc string)
        if (i.metadata?._id) {
          const metadataId = i.metadata._id.toString();
          if (metadataId === itemIdStr) return true;
        }
        // So sánh _id nếu có
        if (i._id && i._id.toString() === itemIdStr) return true;
        return false;
      });
      
      if (alreadyOwned) {
        return res.status(400).json({
          success: false,
          message: "Bạn đã sở hữu trang bị này rồi"
        });
      }
      
      // Kiểm tra đủ linh thạch
      if (cultivation.spiritStones < equipment.price) {
        return res.status(400).json({
          success: false,
          message: "Không đủ linh thạch để mua"
        });
      }
      
      // Trừ linh thạch
      cultivation.spendSpiritStones(equipment.price);
      
      // Thêm equipment vào inventory
      const inventoryItem = {
        itemId: equipment._id.toString(),
        name: equipment.name,
        type: `equipment_${equipment.type}`,
        quantity: 1,
        equipped: false,
        acquiredAt: new Date(),
        metadata: {
          _id: equipment._id,
          equipmentType: equipment.type,
          subtype: equipment.subtype,
          rarity: equipment.rarity,
          level_required: equipment.level_required,
          stats: equipment.stats,
          special_effect: equipment.special_effect,
          skill_bonus: equipment.skill_bonus,
          energy_regen: equipment.energy_regen,
          lifesteal: equipment.lifesteal,
          true_damage: equipment.true_damage,
          buff_duration: equipment.buff_duration,
          img: equipment.img,
          description: equipment.description
        }
      };
      
      cultivation.inventory.push(inventoryItem);
      await cultivation.save();
      
      return res.json({
        success: true,
        message: `Đã mua ${equipment.name}!`,
        data: {
          spiritStones: cultivation.spiritStones,
          inventory: cultivation.inventory,
          item: inventoryItem
        }
      });
    }
    
    // Xử lý mua item thông thường
    try {
      const result = cultivation.buyItem(itemId);
      await cultivation.save();
      
      // Nếu là công pháp, trả về thông tin công pháp đã học
      const responseData = {
        spiritStones: cultivation.spiritStones,
        inventory: cultivation.inventory
      };
      
      if (result && result.type === 'technique') {
        responseData.learnedTechnique = result.learnedTechnique;
        const techniqueItem = SHOP_ITEMS.find(t => t.id === itemId && t.type === 'technique');
        if (techniqueItem) {
          responseData.skill = techniqueItem.skill;
        }
      } else {
        responseData.item = result;
      }
      
      res.json({
        success: true,
        message: result && result.type === 'technique' 
          ? `Đã học công pháp ${result.name}!` 
          : `Đã mua ${result?.name || 'vật phẩm'}!`,
        data: responseData
      });
    } catch (buyError) {
      return res.status(400).json({
        success: false,
        message: buyError.message
      });
    }
  } catch (error) {
    console.error("[CULTIVATION] Error buying item:", error);
    next(error);
  }
});

/**
 * POST /api/cultivation/inventory/:itemId/equip
 * Trang bị vật phẩm
 */
router.post("/inventory/:itemId/equip", async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { itemId } = req.params;
    
    const cultivation = await Cultivation.getOrCreate(userId);
    
    try {
      const item = cultivation.equipItem(itemId);
      await cultivation.save();
      
      res.json({
        success: true,
        data: {
          equipped: cultivation.equipped,
          inventory: cultivation.inventory
        }
      });
    } catch (equipError) {
      return res.status(400).json({
        success: false,
        message: equipError.message
      });
    }
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/cultivation/inventory/:itemId/unequip
 * Bỏ trang bị vật phẩm
 */
router.post("/inventory/:itemId/unequip", async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { itemId } = req.params;
    
    const cultivation = await Cultivation.getOrCreate(userId);
    
    try {
      const item = cultivation.unequipItem(itemId);
      await cultivation.save();
      
      res.json({
        success: true,
        data: {
          equipped: cultivation.equipped,
          inventory: cultivation.inventory
        }
      });
    } catch (unequipError) {
      return res.status(400).json({
        success: false,
        message: unequipError.message
      });
    }
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/cultivation/equipment/:equipmentId/equip
 * Trang bị equipment (vũ khí, giáp, trang sức)
 */
router.post("/equipment/:equipmentId/equip", async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { equipmentId } = req.params;
    const { slot } = req.body; // Optional: auto-detect nếu không có
    
    const cultivation = await Cultivation.getOrCreate(userId);
    
    try {
      const equipment = await cultivation.equipEquipment(equipmentId, slot);
      await cultivation.save();
      
      // Recalculate combat stats after equipping
      let combatStats = cultivation.calculateCombatStats();
      
      // Load equipment stats and merge
      const equipmentStats = await cultivation.getEquipmentStats();
      combatStats = mergeEquipmentStatsIntoCombatStats(combatStats, equipmentStats);
      
      res.json({
        success: true,
        data: {
          equipment,
          equipped: cultivation.equipped,
          inventory: cultivation.inventory,
          combatStats: combatStats
        }
      });
    } catch (equipError) {
      return res.status(400).json({
        success: false,
        message: equipError.message
      });
    }
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/cultivation/equipment/:slot/unequip
 * Bỏ trang bị equipment
 */
router.post("/equipment/:slot/unequip", async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { slot } = req.params;
    
    const cultivation = await Cultivation.getOrCreate(userId);
    
    try {
      cultivation.unequipEquipment(slot);
      await cultivation.save();
      
      // Recalculate combat stats after unequipping
      let combatStats = cultivation.calculateCombatStats();
      
      // Load equipment stats and merge
      const equipmentStats = await cultivation.getEquipmentStats();
      combatStats = mergeEquipmentStatsIntoCombatStats(combatStats, equipmentStats);
      
      res.json({
        success: true,
        data: {
          equipped: cultivation.equipped,
          inventory: cultivation.inventory,
          combatStats: combatStats
        }
      });
    } catch (unequipError) {
      return res.status(400).json({
        success: false,
        message: unequipError.message
      });
    }
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/cultivation/equipment/stats
 * Lấy tổng stats từ tất cả equipment đang trang bị
 */
router.get("/equipment/stats", async (req, res, next) => {
  try {
    const userId = req.user.id;
    const cultivation = await Cultivation.getOrCreate(userId);
    
    const equipmentStats = await cultivation.getEquipmentStats();
    
    res.json({
      success: true,
      data: equipmentStats
    });
  } catch (error) {
    console.error("[CULTIVATION] Error getting equipment stats:", error);
    next(error);
  }
});

/**
 * POST /api/cultivation/inventory/:itemId/use
 * Sử dụng vật phẩm tiêu hao (đan dược, consumable)
 */
router.post("/inventory/:itemId/use", async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { itemId } = req.params;
    
    const cultivation = await Cultivation.getOrCreate(userId);
    
    // Tìm item trong inventory
    const itemIndex = cultivation.inventory.findIndex(i => i.itemId === itemId);
    if (itemIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy vật phẩm trong kho đồ"
      });
    }
    
    const item = cultivation.inventory[itemIndex];
    const itemData = SHOP_ITEMS.find(i => i.id === itemId);
    
    if (!itemData) {
      return res.status(404).json({
        success: false,
        message: "Vật phẩm không hợp lệ"
      });
    }
    
    // Check if item is consumable type
    if (!['exp_boost', 'consumable'].includes(item.type)) {
      return res.status(400).json({
        success: false,
        message: "Vật phẩm này không thể sử dụng trực tiếp"
      });
    }
    
    let message = '';
    let reward = {};
    
    // Handle different consumable types
    switch (item.type) {
      case 'exp_boost':
        // Add to active boosts
        const expiresAt = new Date(Date.now() + itemData.duration * 60 * 60 * 1000);
        cultivation.activeBoosts.push({
          type: 'exp',
          multiplier: itemData.multiplier,
          expiresAt
        });
        message = `Đã kích hoạt ${item.name}! Tăng ${itemData.multiplier}x exp trong ${itemData.duration}h`;
        reward = { type: 'boost', multiplier: itemData.multiplier, duration: itemData.duration };
        break;
        
      case 'consumable':
        // Handle different consumable items
        if (itemData.expReward) {
          cultivation.exp += itemData.expReward;
          // KHÔNG tự động cập nhật realm - người chơi phải bấm nút breakthrough
          message = `Đã sử dụng ${item.name}! Nhận được ${itemData.expReward} tu vi`;
          reward = { type: 'exp', amount: itemData.expReward };
        } else if (itemData.spiritStoneReward) {
          cultivation.spiritStones += itemData.spiritStoneReward;
          cultivation.totalSpiritStonesEarned += itemData.spiritStoneReward;
          message = `Đã sử dụng ${item.name}! Nhận được ${itemData.spiritStoneReward} linh thạch`;
          reward = { type: 'spiritStones', amount: itemData.spiritStoneReward };
        } else if (itemData.spiritStoneBonus) {
          const expiresAt = new Date(Date.now() + itemData.duration * 60 * 60 * 1000);
          cultivation.activeBoosts.push({
            type: 'spiritStones',
            multiplier: 1 + itemData.spiritStoneBonus,
            expiresAt
          });
          message = `Đã kích hoạt ${item.name}! Tăng ${Math.round(itemData.spiritStoneBonus * 100)}% linh thạch trong ${itemData.duration}h`;
          reward = { type: 'boost', bonus: itemData.spiritStoneBonus, duration: itemData.duration };
        } else {
          message = `Đã sử dụng ${item.name}!`;
        }
        break;
        
      default:
        return res.status(400).json({
          success: false,
          message: "Không thể sử dụng vật phẩm này"
        });
    }
    
    // Reduce quantity or remove item
    if (item.quantity > 1) {
      cultivation.inventory[itemIndex].quantity -= 1;
    } else {
      cultivation.inventory.splice(itemIndex, 1);
    }
    
    await cultivation.save();
    
    res.json({
      success: true,
      message,
      data: {
        reward,
        cultivation: {
          exp: cultivation.exp,
          realmLevel: cultivation.realmLevel,
          realmName: cultivation.realmName,
          spiritStones: cultivation.spiritStones,
          activeBoosts: cultivation.activeBoosts
        },
        inventory: cultivation.inventory
      }
    });
    
  } catch (error) {
    console.error("[CULTIVATION] Error using item:", error);
    next(error);
  }
});

/**
 * POST /api/cultivation/collect-passive-exp
 * Thu thập tu vi tích lũy theo thời gian
 * Tu vi tăng dần 1 exp/phút, có thể x2/x3 với đan dược
 */
router.post("/collect-passive-exp", async (req, res, next) => {
  try {
    const userId = req.user.id;
    const cultivation = await Cultivation.getOrCreate(userId);
    
    const result = cultivation.collectPassiveExp();
    
    if (!result.collected) {
      return res.json({
        success: true,
        data: result
      });
    }
    
    await cultivation.save();
    
    res.json({
      success: true,
      message: result.multiplier > 1 
        ? `Thu thập ${result.expEarned} tu vi (x${result.multiplier} đan dược)!` 
        : `Thu thập ${result.expEarned} tu vi!`,
      data: {
        ...result,
        cultivation: formatCultivationResponse(cultivation)
      }
    });
  } catch (error) {
    console.error("[CULTIVATION] Error collecting passive exp:", error);
    next(error);
  }
});

/**
 * GET /api/cultivation/passive-exp-status
 * Kiểm tra trạng thái passive exp (pending exp, multiplier, etc.)
 */
router.get("/passive-exp-status", async (req, res, next) => {
  try {
    const userId = req.user.id;
    const cultivation = await Cultivation.getOrCreate(userId);
    
    const now = new Date();
    const lastCollected = cultivation.lastPassiveExpCollected || now;
    const elapsedMs = now.getTime() - new Date(lastCollected).getTime();
    const elapsedMinutes = Math.floor(elapsedMs / (1000 * 60));
    
    // Tính exp đang chờ thu thập
    const maxMinutes = 1440;
    const effectiveMinutes = Math.min(elapsedMinutes, maxMinutes);
    
    // Base exp theo cảnh giới
    const expPerMinuteByRealm = {
      1: 2, 2: 4, 3: 8, 4: 15, 5: 25, 6: 40, 7: 60, 8: 100, 9: 150, 10: 250
    };
    const baseExpPerMinute = expPerMinuteByRealm[cultivation.realmLevel] || 2;
    const baseExp = effectiveMinutes * baseExpPerMinute;
    
    // Tính multiplier
    let multiplier = 1;
    const activeBoosts = cultivation.activeBoosts.filter(b => b.expiresAt > now);
    for (const boost of activeBoosts) {
      if (boost.type === 'exp' || boost.type === 'exp_boost') {
        multiplier = Math.max(multiplier, boost.multiplier);
      }
    }
    
    const pendingExp = Math.floor(baseExp * multiplier);
    
    res.json({
      success: true,
      data: {
        pendingExp,
        baseExp,
        multiplier,
        expPerMinute: baseExpPerMinute,
        minutesElapsed: effectiveMinutes,
        lastCollected,
        realmLevel: cultivation.realmLevel,
        activeBoosts: activeBoosts.map(b => ({
          type: b.type,
          multiplier: b.multiplier,
          expiresAt: b.expiresAt
        }))
      }
    });
  } catch (error) {
    console.error("[CULTIVATION] Error getting passive exp status:", error);
    next(error);
  }
});

/**
 * GET /api/cultivation/leaderboard
 * Bảng xếp hạng
 */
router.get("/leaderboard", async (req, res, next) => {
  try {
    const { type = 'exp', limit = 50 } = req.query;
    const userId = req.user.id;
    
    const leaderboard = await Cultivation.getLeaderboard(type, parseInt(limit));
    
    // Debug log
    console.log("[LEADERBOARD] Raw data sample:", leaderboard.slice(0, 3).map(e => ({
      userName: e.user?.name,
      realmLevel: e.realmLevel,
      realmName: e.realmName,
      exp: e.exp
    })));
    
    // Tìm vị trí của user hiện tại
    const userCultivation = await Cultivation.findOne({ user: userId });
    let userRank = null;
    
    if (userCultivation) {
      let countQuery;
      switch (type) {
        case 'exp':
          countQuery = { exp: { $gt: userCultivation.exp } };
          break;
        case 'realm':
          countQuery = {
            $or: [
              { realmLevel: { $gt: userCultivation.realmLevel } },
              { realmLevel: userCultivation.realmLevel, exp: { $gt: userCultivation.exp } }
            ]
          };
          break;
        case 'spiritStones':
          countQuery = { totalSpiritStonesEarned: { $gt: userCultivation.totalSpiritStonesEarned } };
          break;
        case 'streak':
          countQuery = { longestStreak: { $gt: userCultivation.longestStreak } };
          break;
        default:
          countQuery = { exp: { $gt: userCultivation.exp } };
      }
      
      const rank = await Cultivation.countDocuments(countQuery);
      userRank = rank + 1;
    }
    
    res.json({
      success: true,
      data: {
        type,
        leaderboard: leaderboard.map((entry, index) => ({
          rank: index + 1,
          user: entry.user,
          exp: entry.exp,
          realm: {
            level: entry.realmLevel,
            name: entry.realmName
          },
          spiritStones: entry.spiritStones,
          loginStreak: entry.loginStreak,
          longestStreak: entry.longestStreak,
          equipped: entry.equipped,
          stats: entry.stats,
          isCurrentUser: entry.user?._id?.toString() === userId
        })),
        userRank
      }
    });
  } catch (error) {
    console.error("[CULTIVATION] Error getting leaderboard:", error);
    next(error);
  }
});

/**
 * GET /api/cultivation/realms
 * Lấy danh sách cảnh giới
 */
router.get("/realms", async (req, res, next) => {
  try {
    const userId = req.user.id;
    const cultivation = await Cultivation.getOrCreate(userId);
    const currentRealm = cultivation.getRealmFromExp();
    
    res.json({
      success: true,
      data: {
        realms: CULTIVATION_REALMS.map(realm => ({
          ...realm,
          isCurrent: realm.level === currentRealm.level,
          isUnlocked: cultivation.exp >= realm.minExp
        })),
        currentLevel: currentRealm.level
      }
    });
  } catch (error) {
    console.error("[CULTIVATION] Error getting realms:", error);
    next(error);
  }
});

/**
 * GET /api/cultivation/exp-log
 * Lấy lịch sử exp (giới hạn 50 entries gần nhất)
 */
router.get("/exp-log", async (req, res, next) => {
  try {
    const userId = req.user.id;
    const cultivation = await Cultivation.findOne({ user: userId }).select('+expLog');
    
    if (!cultivation) {
      return res.json({
        success: true,
        data: []
      });
    }
    
    const expLog = cultivation.expLog?.slice(-50).reverse() || [];
    
    res.json({
      success: true,
      data: expLog
    });
  } catch (error) {
    console.error("[CULTIVATION] Error getting exp log:", error);
    next(error);
  }
});

/**
 * POST /api/cultivation/add-exp
 * Thêm exp từ các hoạt động (yin-yang click, etc.)
 */
router.post("/add-exp", async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { amount, source = 'activity' } = req.body;
    
    // Validate amount
    if (!amount || typeof amount !== 'number' || amount < 1 || amount > 10) {
      return res.status(400).json({
        success: false,
        message: "Số exp không hợp lệ (1-10)"
      });
    }
    
    const cultivation = await Cultivation.getOrCreate(userId);
    
    // Rate limiting: max 100 exp per 5 minutes from yinyang_click
    if (source === 'yinyang_click') {
      const now = new Date();
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
      
      // Check recent exp log for yinyang clicks
      const recentClicks = (cultivation.expLog || []).filter(log => 
        log.source === 'yinyang_click' && new Date(log.createdAt) > fiveMinutesAgo
      );
      
      const recentExp = recentClicks.reduce((sum, log) => sum + log.amount, 0);
      
      if (recentExp >= 100) {
        return res.status(429).json({
          success: false,
          message: "Linh khí đã cạn kiệt, hãy chờ một lát..."
        });
      }
    }
    
    // Add exp
    const oldExp = cultivation.exp;
    cultivation.exp += amount;
    
    // Log the exp gain
    if (!cultivation.expLog) cultivation.expLog = [];
    cultivation.expLog.push({
      amount,
      source,
      description: source === 'yinyang_click' ? 'Thu thập linh khí từ âm dương' : 'Hoạt động tu luyện',
      createdAt: new Date()
    });
    
    // Keep only last 100 entries
    if (cultivation.expLog.length > 100) {
      cultivation.expLog = cultivation.expLog.slice(-100);
    }
    
    // Check for level up
    const oldRealm = CULTIVATION_REALMS.find(r => r.minExp <= oldExp && (!CULTIVATION_REALMS[CULTIVATION_REALMS.indexOf(r) + 1] || CULTIVATION_REALMS[CULTIVATION_REALMS.indexOf(r) + 1].minExp > oldExp));
    const newRealm = cultivation.getRealmFromExp();
    const leveledUp = newRealm.level > (oldRealm?.level || 0);
    
    await cultivation.save();
    
    res.json({
      success: true,
      message: `+${amount} Tu Vi`,
      data: {
        expEarned: amount,
        totalExp: cultivation.exp,
        leveledUp,
        newRealm: leveledUp ? newRealm : null,
        cultivation: formatCultivationResponse(cultivation)
      }
    });
  } catch (error) {
    console.error("[CULTIVATION] Error adding exp:", error);
    next(error);
  }
});

/**
 * GET /api/cultivation/stats
 * Lấy thống kê tổng quan
 */
router.get("/stats", async (req, res, next) => {
  try {
    // Tổng số tu sĩ
    const totalCultivators = await Cultivation.countDocuments();
    
    // Phân bổ theo cảnh giới
    const realmDistribution = await Cultivation.aggregate([
      {
        $group: {
          _id: "$realmLevel",
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    
    // Top 3 tu sĩ
    const topCultivators = await Cultivation.getLeaderboard('exp', 3);
    
    // Tổng exp toàn server
    const totalExpResult = await Cultivation.aggregate([
      {
        $group: {
          _id: null,
          totalExp: { $sum: "$exp" },
          totalStones: { $sum: "$totalSpiritStonesEarned" }
        }
      }
    ]);
    
    res.json({
      success: true,
      data: {
        totalCultivators,
        realmDistribution: realmDistribution.map(r => ({
          realm: CULTIVATION_REALMS.find(realm => realm.level === r._id),
          count: r.count
        })),
        topCultivators: topCultivators.map(c => ({
          user: c.user,
          realm: { level: c.realmLevel, name: c.realmName },
          exp: c.exp
        })),
        serverStats: {
          totalExp: totalExpResult[0]?.totalExp || 0,
          totalSpiritStones: totalExpResult[0]?.totalStones || 0
        }
      }
    });
  } catch (error) {
    console.error("[CULTIVATION] Error getting stats:", error);
    next(error);
  }
});

/**
 * GET /api/cultivation/combat-stats
 * Lấy thông số chiến đấu của user hiện tại
 */
router.get("/combat-stats", async (req, res, next) => {
  try {
    const userId = req.user.id;
    const cultivation = await Cultivation.getOrCreate(userId);
    
    let combatStats = cultivation.calculateCombatStats();
    
    // Load equipment stats and merge
    const equipmentStats = await cultivation.getEquipmentStats();
    combatStats = mergeEquipmentStatsIntoCombatStats(combatStats, equipmentStats);
    
    res.json({
      success: true,
      data: combatStats
    });
  } catch (error) {
    console.error("[CULTIVATION] Error getting combat stats:", error);
    next(error);
  }
});

/**
 * GET /api/cultivation/combat-stats/:userId
 * Lấy thông số chiến đấu của user khác (để so sánh)
 */
router.get("/combat-stats/:userId", async (req, res, next) => {
  try {
    const { userId } = req.params;
    const cultivation = await Cultivation.findOne({ user: userId });
    
    if (!cultivation) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy thông tin tu tiên của vị đạo hữu này'
      });
    }
    
    let combatStats = cultivation.calculateCombatStats();
    
    // Load equipment stats and merge
    const equipmentStats = await cultivation.getEquipmentStats();
    combatStats = mergeEquipmentStatsIntoCombatStats(combatStats, equipmentStats);
    
    res.json({
      success: true,
      data: combatStats
    });
  } catch (error) {
    console.error("[CULTIVATION] Error getting combat stats for user:", error);
    next(error);
  }
});

/**
 * POST /api/cultivation/practice-technique
 * Luyện công pháp (tăng exp và level)
 */
router.post("/practice-technique", async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { techniqueId, expGain } = req.body;
    
    if (!techniqueId) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng chọn công pháp để luyện'
      });
    }
    
    const cultivation = await Cultivation.getOrCreate(userId);
    const result = cultivation.practiceTechnique(techniqueId, expGain || 10);
    
    await cultivation.save();
    
    res.json({
      success: true,
      message: result.leveledUp 
        ? `Công pháp đã lên cấp ${result.newLevel}!` 
        : `Luyện công pháp thành công! (+${expGain || 10} exp)`,
      data: result
    });
  } catch (error) {
    console.error("[CULTIVATION] Error practicing technique:", error);
    next(error);
  }
});

/**
 * POST /api/cultivation/breakthrough
 * Thử độ kiếp (breakthrough) - có thể thất bại
 */
router.post("/breakthrough", async (req, res, next) => {
  try {
    const userId = req.user.id;
    const cultivation = await Cultivation.getOrCreate(userId);
    
    // Dùng realmLevel từ database (realm hiện tại của người chơi)
    const currentRealm = CULTIVATION_REALMS.find(r => r.level === cultivation.realmLevel) || CULTIVATION_REALMS[0];
    const nextRealm = CULTIVATION_REALMS.find(r => r.level === currentRealm.level + 1);
    
    if (!nextRealm) {
      return res.status(400).json({
        success: false,
        message: "Bạn đã đạt cảnh giới tối đa!"
      });
    }
    
    // Kiểm tra exp có đủ không
    if (cultivation.exp < nextRealm.minExp) {
      return res.status(400).json({
        success: false,
        message: `Cần ${nextRealm.minExp.toLocaleString()} Tu Vi để độ kiếp lên ${nextRealm.name}`
      });
    }
    
    // Kiểm tra cooldown (nếu đã thất bại trước đó)
    const now = new Date();
    if (cultivation.breakthroughCooldownUntil && cultivation.breakthroughCooldownUntil > now) {
      const remainingMs = cultivation.breakthroughCooldownUntil - now;
      const remainingMinutes = Math.ceil(remainingMs / (1000 * 60));
      return res.status(400).json({
        success: false,
        message: `Sau lần thất bại, bạn cần chờ ${remainingMinutes} phút nữa mới có thể độ kiếp lại`,
        cooldownRemaining: remainingMs
      });
    }
    
    // Tính tỷ lệ thành công
    // Base rate: 30%, mỗi lần thất bại +10% (max 100%)
    const baseSuccessRate = 30;
    const bonusPerFailure = 10;
    const currentSuccessRate = Math.min(100, 
      (cultivation.breakthroughSuccessRate || baseSuccessRate) + 
      (cultivation.breakthroughFailureCount || 0) * bonusPerFailure
    );
    
    // Roll để xem thành công hay thất bại
    const roll = Math.random() * 100;
    const success = roll < currentSuccessRate;
    
    // Cập nhật thời gian thử độ kiếp
    cultivation.lastBreakthroughAttempt = now;
    
    if (success) {
      // THÀNH CÔNG: Lên cảnh giới mới
      const oldRealm = currentRealm;
      cultivation.realmLevel = nextRealm.level;
      cultivation.realmName = nextRealm.name;
      
      // Reset failure count và success rate về base
      cultivation.breakthroughFailureCount = 0;
      cultivation.breakthroughSuccessRate = baseSuccessRate;
      cultivation.breakthroughCooldownUntil = null;
      
      await cultivation.save();
      
      res.json({
        success: true,
        breakthroughSuccess: true,
        message: `Chúc mừng! Bạn đã độ kiếp thành công, đạt cảnh giới ${nextRealm.name}!`,
        data: {
          oldRealm: oldRealm.name,
          newRealm: nextRealm,
          successRate: currentSuccessRate,
          cultivation: formatCultivationResponse(cultivation)
        }
      });
    } else {
      // THẤT BẠI: Tăng failure count và set cooldown
      cultivation.breakthroughFailureCount = (cultivation.breakthroughFailureCount || 0) + 1;
      
      // Cooldown: 1 giờ sau khi thất bại
      const cooldownHours = 1;
      cultivation.breakthroughCooldownUntil = new Date(now.getTime() + cooldownHours * 60 * 60 * 1000);
      
      // Cập nhật success rate (tăng 10% mỗi lần thất bại)
      cultivation.breakthroughSuccessRate = Math.min(100, 
        (cultivation.breakthroughSuccessRate || baseSuccessRate) + bonusPerFailure
      );
      
      await cultivation.save();
      
      const nextSuccessRate = Math.min(100, 
        cultivation.breakthroughSuccessRate + cultivation.breakthroughFailureCount * bonusPerFailure
      );
      
      res.json({
        success: true,
        breakthroughSuccess: false,
        message: `Độ kiếp thất bại! Tỷ lệ thành công lần sau: ${nextSuccessRate}%`,
        data: {
          currentRealm: currentRealm.name,
          targetRealm: nextRealm.name,
          failureCount: cultivation.breakthroughFailureCount,
          nextSuccessRate: nextSuccessRate,
          cooldownUntil: cultivation.breakthroughCooldownUntil,
          cooldownRemaining: cooldownHours * 60 * 60 * 1000,
          cultivation: formatCultivationResponse(cultivation)
        }
      });
    }
  } catch (error) {
    console.error("[CULTIVATION] Error attempting breakthrough:", error);
    next(error);
  }
});

/**
 * POST /api/cultivation/fix-realms
 * Admin: Fix realm levels cho tất cả users dựa trên exp
 */
router.post("/fix-realms", async (req, res, next) => {
  try {
    console.log("[FIX-REALMS] Starting...");
    console.log("[FIX-REALMS] req.user:", req.user ? { id: req.user._id, role: req.user.role, name: req.user.name } : "null");
    
    // Kiểm tra quyền admin
    if (!req.user || req.user.role !== 'admin') {
      console.log("[FIX-REALMS] Access denied - not admin");
      return res.status(403).json({
        success: false,
        error: "Chỉ admin mới có quyền sử dụng chức năng này"
      });
    }

    console.log("[FIX-REALMS] Admin verified, fetching cultivations...");
    
    // Lấy tất cả cultivation records
    const cultivations = await Cultivation.find().populate('user', 'name');
    let fixed = 0;
    const details = [];
    
    console.log(`[FIX-REALMS] Found ${cultivations.length} cultivation records`);
    console.log(`[FIX-REALMS] CULTIVATION_REALMS count:`, CULTIVATION_REALMS?.length || 0);
    
    for (const cult of cultivations) {
      // Debug: tính realm thủ công
      let correctRealm = CULTIVATION_REALMS[0];
      for (let i = CULTIVATION_REALMS.length - 1; i >= 0; i--) {
        if (cult.exp >= CULTIVATION_REALMS[i].minExp) {
          correctRealm = CULTIVATION_REALMS[i];
          break;
        }
      }
      
      const needsFix = cult.realmLevel !== correctRealm.level || cult.realmName !== correctRealm.name;
      
      console.log(`[FIX-REALMS] User ${cult.user?.name}: exp=${cult.exp}, current=${cult.realmLevel}/${cult.realmName}, correct=${correctRealm.level}/${correctRealm.name}, needsFix=${needsFix}`);
      
      details.push({
        userName: cult.user?.name || 'Unknown',
        exp: cult.exp,
        currentLevel: cult.realmLevel,
        currentName: cult.realmName,
        correctLevel: correctRealm.level,
        correctName: correctRealm.name,
        needsFix
      });
      
      if (needsFix) {
        const oldName = cult.realmName;
        cult.realmLevel = correctRealm.level;
        cult.realmName = correctRealm.name;
        await cult.save(); 
        fixed++;
        console.log(`[FIX-REALMS] [SUCCEEDED] Fixed ${cult.user?.name}: exp=${cult.exp}, ${oldName} -> ${correctRealm.name}`);
      }
    }
    
    res.json({
      success: true,
      message: `Đã sửa ${fixed}/${cultivations.length} bản ghi`,
      fixed,
      total: cultivations.length,
      details
    });
  } catch (error) {
    console.error("[CULTIVATION] Error fixing realms:", error);
    next(error);
  }
});

export default router;
