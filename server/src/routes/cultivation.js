import express from "express";
import Cultivation, { CULTIVATION_REALMS, QUEST_TEMPLATES, SHOP_ITEMS, ITEM_TYPES } from "../models/Cultivation.js";
import User from "../models/User.js";
import { authRequired } from "../middleware/auth.js";

const router = express.Router();

// ==================== MIDDLEWARE ====================
// Tất cả routes đều cần đăng nhập
router.use(authRequired);

// ==================== HELPER FUNCTIONS ====================

/**
 * Format cultivation data cho response
 */
const formatCultivationResponse = (cultivation) => {
  const realm = cultivation.getRealmFromExp();
  const progress = cultivation.getRealmProgress();
  const expToNext = cultivation.getExpToNextRealm();

  return {
    _id: cultivation._id,
    user: cultivation.user,
    
    // Tu vi & Cảnh giới
    exp: cultivation.exp,
    realm: {
      level: realm.level,
      name: realm.name,
      description: realm.description,
      color: realm.color,
      icon: realm.icon
    },
    subLevel: cultivation.subLevel,
    progress: progress,
    expToNextRealm: expToNext,
    
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
    
    res.json({
      success: true,
      data: formatCultivationResponse(cultivation)
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
    
    // Đánh dấu item đã sở hữu
    const shopItems = SHOP_ITEMS.map(item => ({
      ...item,
      owned: cultivation.inventory.some(i => i.itemId === item.id),
      canAfford: cultivation.spiritStones >= item.price
    }));
    
    res.json({
      success: true,
      data: {
        items: shopItems,
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
        message: `Đã trang bị ${item.name}!`,
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
    console.error("[CULTIVATION] Error equipping item:", error);
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
        message: `Đã bỏ trang bị ${item.name}!`,
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
    console.error("[CULTIVATION] Error unequipping item:", error);
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
          // Update realm if needed
          const newRealm = cultivation.getRealmFromExp();
          if (newRealm && newRealm.level !== cultivation.realmLevel) {
            cultivation.realmLevel = newRealm.level;
            cultivation.realmName = newRealm.name;
          }
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
    
    const combatStats = cultivation.calculateCombatStats();
    
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
    
    const combatStats = cultivation.calculateCombatStats();
    
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
