import express from "express";
import Battle from "../models/Battle.js";
import Cultivation, { CULTIVATION_REALMS, SHOP_ITEMS, ITEM_TYPES, TECHNIQUES_MAP } from "../models/Cultivation.js";
import Equipment from "../models/Equipment.js";
import User from "../models/User.js";
import Notification from "../models/Notification.js";
import { authRequired } from "../middleware/auth.js";
import { PK_BOTS, BOT_BATTLE_COOLDOWN, getBotsByRealmLevel, getBotById } from "../data/pkBots.js";

const router = express.Router();

// Tất cả routes đều cần đăng nhập
router.use(authRequired);

// ==================== HELPER FUNCTIONS ====================

/**
 * Tích hợp stats từ trang bị vào combat stats
 */
const mergeEquipmentStats = (combatStats, equipStats) => {
  if (!equipStats) return combatStats;

  combatStats.attack = (combatStats.attack || 0) + (equipStats.attack || 0);
  combatStats.defense = (combatStats.defense || 0) + (equipStats.defense || 0);
  combatStats.qiBlood = (combatStats.qiBlood || 0) + (equipStats.hp || 0); // HP từ equipment cộng vào qiBlood
  combatStats.speed = (combatStats.speed || 0) + (equipStats.speed || 0);

  // Percentage stats (convert 0-1 to 0-100)
  combatStats.criticalRate = (combatStats.criticalRate || 0) + ((equipStats.crit_rate || 0) * 100);
  combatStats.criticalDamage = (combatStats.criticalDamage || 0) + ((equipStats.crit_damage || 0) * 100);
  combatStats.accuracy = (combatStats.accuracy || 0) + ((equipStats.hit_rate || 0) * 100);
  combatStats.dodge = (combatStats.dodge || 0) + ((equipStats.evasion || 0) * 100);
  combatStats.lifesteal = (combatStats.lifesteal || 0) + ((equipStats.lifesteal || 0) * 100);

  combatStats.penetration = (combatStats.penetration || 0) + (equipStats.penetration || 0);
  combatStats.regeneration = (combatStats.regeneration || 0) + (equipStats.energy_regen || 0);

  return combatStats;
};

/**
 * Tính mana cost dựa trên rarity của công pháp và max mana của người dùng
 * @param {string} rarity - Rarity của công pháp (common, uncommon, rare, epic, legendary)
 * @param {number} maxMana - Lượng chân nguyên tối đa của người dùng
 * @returns {number} Mana cost (percentage of max mana)
 */
const getManaCostByRarity = (rarity, maxMana = 1000) => {
  // Mana cost as percentage of max mana based on rarity
  // Higher rarity = higher cost but more powerful skill
  const manaCostPercentMap = {
    'common': 0.15,      // 15% max mana
    'uncommon': 0.20,    // 20% max mana
    'rare': 0.25,        // 25% max mana
    'epic': 0.30,        // 30% max mana
    'legendary': 0.35    // 35% max mana
  };

  const costPercent = manaCostPercentMap[rarity] || 0.15;
  const manaCost = Math.floor(maxMana * costPercent);

  // Minimum cost is 20, maximum is 40% of max mana
  return Math.max(20, Math.min(manaCost, Math.floor(maxMana * 0.4)));
};

/**
 * Lấy skills từ công pháp đã học
 * @param {Object} cultivation - Cultivation object
 * @param {number} maxMana - Lượng chân nguyên tối đa (optional, sẽ tính từ combatStats nếu không có)
 */
const getLearnedSkills = (cultivation, maxMana = null) => {
  const skills = [];

  // Tính maxMana nếu chưa có
  let actualMaxMana = maxMana;
  if (!actualMaxMana) {
    // Tính từ combat stats nếu có
    if (cultivation.calculateCombatStats) {
      const combatStats = cultivation.calculateCombatStats();
      actualMaxMana = combatStats.zhenYuan || 1000;
    } else if (cultivation.combatStats?.zhenYuan) {
      actualMaxMana = cultivation.combatStats.zhenYuan;
    } else {
      actualMaxMana = 1000; // Default
    }
  }

  if (cultivation.learnedTechniques && cultivation.learnedTechniques.length > 0) {
    cultivation.learnedTechniques.forEach(learned => {
      // Use TECHNIQUES_MAP for O(1) lookup
      const technique = TECHNIQUES_MAP.get(learned.techniqueId);
      if (technique && technique.skill) {
        skills.push({
          ...technique.skill,
          techniqueId: technique.id,
          techniqueName: technique.name,
          rarity: technique.rarity || 'common',
          level: learned.level,
          // Damage multiplier dựa trên level của công pháp
          damageMultiplier: 1 + (learned.level - 1) * 0.15,
          // Mana cost dựa trên rarity và max mana (scaled)
          manaCost: getManaCostByRarity(technique.rarity || 'common', actualMaxMana)
        });
      }
    });
  }
  return skills;
};

/**
 * Tính toán một trận đấu PK với skills
 * @param {Object} challengerStats - Combat stats của người thách đấu
 * @param {Object} opponentStats - Combat stats của đối thủ
 * @param {Array} challengerSkills - Skills của người thách đấu
 * @param {Array} opponentSkills - Skills của đối thủ
 * @returns {Object} Kết quả trận đấu
 */
const simulateBattle = (challengerStats, opponentStats, challengerSkills = [], opponentSkills = []) => {
  const MAX_TURNS = 50;
  const logs = [];

  // HP ban đầu = qiBlood
  let challengerHp = challengerStats.qiBlood;
  let opponentHp = opponentStats.qiBlood;

  const challengerMaxHp = challengerStats.qiBlood;
  const opponentMaxHp = opponentStats.qiBlood;

  // Mana ban đầu = zhenYuan
  let challengerMana = challengerStats.zhenYuan;
  let opponentMana = opponentStats.zhenYuan;

  const challengerMaxMana = challengerStats.zhenYuan;
  const opponentMaxMana = opponentStats.zhenYuan;

  let turn = 0;
  let totalDamageByChallenger = 0;
  let totalDamageByOpponent = 0;

  // Skill cooldowns tracking
  const challengerSkillCooldowns = {};
  const opponentSkillCooldowns = {};
  challengerSkills.forEach(s => challengerSkillCooldowns[s.techniqueId] = 0);
  opponentSkills.forEach(s => opponentSkillCooldowns[s.techniqueId] = 0);

  // Ai nhanh hơn sẽ đánh trước
  let currentAttacker = challengerStats.speed >= opponentStats.speed ? 'challenger' : 'opponent';

  while (challengerHp > 0 && opponentHp > 0 && turn < MAX_TURNS) {
    turn++;

    const attacker = currentAttacker === 'challenger' ? challengerStats : opponentStats;
    const defender = currentAttacker === 'challenger' ? opponentStats : challengerStats;
    const defenderHp = currentAttacker === 'challenger' ? opponentHp : challengerHp;
    const attackerSkills = currentAttacker === 'challenger' ? challengerSkills : opponentSkills;
    const attackerCooldowns = currentAttacker === 'challenger' ? challengerSkillCooldowns : opponentSkillCooldowns;
    const attackerMana = currentAttacker === 'challenger' ? challengerMana : opponentMana;

    // Reduce cooldowns TRƯỚC khi check skill (để tránh giảm cooldown vừa set)
    Object.keys(attackerCooldowns).forEach(key => {
      if (attackerCooldowns[key] > 0) attackerCooldowns[key]--;
    });

    // Mana regeneration mỗi turn (5% max mana)
    const manaRegen = Math.floor((currentAttacker === 'challenger' ? challengerMaxMana : opponentMaxMana) * 0.05);
    if (currentAttacker === 'challenger') {
      challengerMana = Math.min(challengerMaxMana, challengerMana + manaRegen);
    } else {
      opponentMana = Math.min(opponentMaxMana, opponentMana + manaRegen);
    }

    // Check if can use skill (cần đủ mana và hết cooldown)
    let usedSkill = null;
    let skillDamageBonus = 0;
    let manaConsumed = 0;
    for (const skill of attackerSkills) {
      if (attackerCooldowns[skill.techniqueId] <= 0 && attackerMana >= (skill.manaCost || 20)) {
        // Use this skill
        usedSkill = skill;
        // Skill damage = attacker's ATTACK × damageMultiplier (scaled by skill level)
        skillDamageBonus = Math.floor(attacker.attack * (skill.damageMultiplier || 1));
        manaConsumed = skill.manaCost || 20;
        attackerCooldowns[skill.techniqueId] = skill.cooldown || 3;
        // Consume mana
        if (currentAttacker === 'challenger') {
          challengerMana = Math.max(0, challengerMana - manaConsumed);
        } else {
          opponentMana = Math.max(0, opponentMana - manaConsumed);
        }
        break;
      }
    }

    // Tính toán né tránh (improved formula)
    // OLD: hitChance = (accuracy - dodge) / 100 -> 100 accuracy vs 50 dodge = 50% hit (too low!)
    // NEW: Use multiplicative formula - accuracy reduces dodge effectiveness
    const accuracyFactor = Math.min((attacker.accuracy || 100) / 100, 1.5);
    const dodgeReduction = (defender.dodge || 0) / ((defender.dodge || 0) + (attacker.accuracy || 100));
    const hitChance = accuracyFactor * (1 - dodgeReduction);
    const isDodged = Math.random() > Math.max(0.3, Math.min(hitChance, 0.95));

    let damage = 0;
    let isCritical = false;
    let lifestealHealed = 0;
    let regenerationHealed = 0;
    let description = '';
    let skillUsed = usedSkill ? usedSkill.name : null;

    // Regeneration: Hồi máu nhẹ mỗi turn (không quá imba)
    // Giới hạn max 5% HP/turn để tránh trận đấu kéo dài vô tận
    if (attacker.regeneration > 0) {
      const maxHp = currentAttacker === 'challenger' ? challengerMaxHp : opponentMaxHp;
      const regenRate = Math.min(attacker.regeneration, 5); // Max 5%
      regenerationHealed = Math.floor(maxHp * regenRate / 100);
    }

    if (!isDodged) {
      // Tính sát thương cơ bản: Attack - (Defense * (1 - Penetration/100))
      const effectiveDefense = defender.defense * (1 - Math.min(attacker.penetration, 80) / 100);
      damage = Math.max(1, attacker.attack - effectiveDefense * 0.5);

      // Thêm skill damage bonus
      if (skillDamageBonus > 0) {
        damage += skillDamageBonus;
      }

      // Giảm sát thương theo kháng tính
      damage = damage * (1 - Math.min(defender.resistance, 50) / 100);

      // Critical hit
      if (Math.random() * 100 < attacker.criticalRate) {
        isCritical = true;
        damage = damage * (attacker.criticalDamage / 100);
      }

      // Thêm random 10%
      damage = Math.floor(damage * (0.9 + Math.random() * 0.2));
      damage = Math.max(1, damage);

      // Lifesteal (chỉ hoạt động khi tấn công thành công)
      if (attacker.lifesteal > 0) {
        lifestealHealed = Math.floor(damage * attacker.lifesteal / 100);
      }
    }

    // Áp dụng sát thương và hồi máu
    if (currentAttacker === 'challenger') {
      opponentHp = Math.max(0, opponentHp - damage);
      challengerHp = Math.min(challengerMaxHp, challengerHp + lifestealHealed + regenerationHealed);
      totalDamageByChallenger += damage;
    } else {
      challengerHp = Math.max(0, challengerHp - damage);
      opponentHp = Math.min(opponentMaxHp, opponentHp + lifestealHealed + regenerationHealed);
      totalDamageByOpponent += damage;
    }

    // Tạo mô tả
    if (isDodged) {
      description = `Đòn đánh bị né tránh!`;
      // Hiển thị regeneration nếu có
      if (regenerationHealed > 0) description += ` Hồi ${regenerationHealed} máu`;
    } else if (usedSkill) {
      description = `Sử dụng [${usedSkill.name}]! ${isCritical ? 'Chí mạng! ' : ''}Gây ${damage} sát thương`;
      if (manaConsumed > 0) description += ` (Tốn ${manaConsumed} chân nguyên)`;
      if (lifestealHealed > 0) description += `, hút ${lifestealHealed} máu`;
      if (regenerationHealed > 0) description += `, hồi ${regenerationHealed} máu`;
    } else if (isCritical) {
      description = `Chí mạng! Gây ${damage} sát thương`;
      if (lifestealHealed > 0) description += `, hút ${lifestealHealed} máu`;
      if (regenerationHealed > 0) description += `, hồi ${regenerationHealed} máu`;
    } else {
      description = `Gây ${damage} sát thương`;
      if (lifestealHealed > 0) description += `, hút ${lifestealHealed} máu`;
      if (regenerationHealed > 0) description += `, hồi ${regenerationHealed} máu`;
    }

    logs.push({
      turn,
      attacker: currentAttacker,
      damage,
      isCritical,
      isDodged,
      lifestealHealed,
      regenerationHealed,
      challengerHp: Math.floor(challengerHp),
      opponentHp: Math.floor(opponentHp),
      challengerMana: Math.floor(challengerMana),
      opponentMana: Math.floor(opponentMana),
      manaConsumed: manaConsumed > 0 ? manaConsumed : undefined,
      description,
      skillUsed
    });

    // Kiểm tra xem có ai hết máu không - dừng ngay lập tức
    if (challengerHp <= 0 || opponentHp <= 0) {
      break; // Dừng trận đấu ngay khi có người hết máu
    }

    // Chuyển lượt
    currentAttacker = currentAttacker === 'challenger' ? 'opponent' : 'challenger';
  }

  // Xác định người thắng
  let winner = null;
  let isDraw = false;

  if (challengerHp <= 0 && opponentHp <= 0) {
    isDraw = true;
  } else if (opponentHp <= 0) {
    winner = 'challenger';
  } else if (challengerHp <= 0) {
    winner = 'opponent';
  } else {
    // Hết lượt, ai còn nhiều HP hơn thắng
    if (challengerHp > opponentHp) {
      winner = 'challenger';
    } else if (opponentHp > challengerHp) {
      winner = 'opponent';
    } else {
      isDraw = true;
    }
  }

  return {
    winner,
    isDraw,
    logs,
    totalTurns: turn,
    totalDamageByChallenger,
    totalDamageByOpponent,
    finalChallengerHp: Math.floor(challengerHp),
    finalOpponentHp: Math.floor(opponentHp)
  };
};

/**
 * Tính phần thưởng dựa trên kết quả trận đấu
 */
const calculateRewards = (winnerStats, loserStats, isDraw) => {
  if (isDraw) {
    return {
      winnerExp: 10,
      winnerSpiritStones: 5,
      loserExp: 10,
      loserSpiritStones: 5
    };
  }

  // Base rewards
  const baseExp = 50;
  const baseStones = 35; // Tăng từ 20 lên 35 để cân bằng với dungeon

  // Bonus nếu thắng người mạnh hơn
  const levelDiff = (loserStats.realmLevel || 1) - (winnerStats.realmLevel || 1);
  const bonusMultiplier = Math.max(1, 1 + levelDiff * 0.2);

  return {
    winnerExp: Math.floor(baseExp * bonusMultiplier),
    winnerSpiritStones: Math.floor(baseStones * bonusMultiplier),
    loserExp: Math.floor(baseExp * 0.2),
    loserSpiritStones: 0
  };
};

// ==================== ROUTES ====================

/**
 * POST /api/battle/challenge
 * Thách đấu và thực hiện trận đấu ngay lập tức
 */
router.post("/challenge", async (req, res, next) => {
  try {
    const challengerId = req.user._id;
    const { opponentId } = req.body;

    if (!opponentId) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng chọn đối thủ"
      });
    }

    if (challengerId.toString() === opponentId) {
      return res.status(400).json({
        success: false,
        message: "Không thể tự thách đấu bản thân"
      });
    }

    // Kiểm tra cooldown (1 phút giữa các trận với cùng đối thủ)
    const recentBattle = await Battle.findOne({
      $or: [
        { challenger: challengerId, opponent: opponentId },
        { challenger: opponentId, opponent: challengerId }
      ],
      createdAt: { $gt: new Date(Date.now() - 60 * 1000) }
    });

    if (recentBattle) {
      const remainingTime = Math.ceil((60 * 1000 - (Date.now() - recentBattle.createdAt)) / 1000);
      return res.status(429).json({
        success: false,
        message: `Vui lòng đợi ${remainingTime} giây trước khi thách đấu lại đối thủ này`
      });
    }

    // Lấy thông tin người thách đấu
    const challenger = await User.findById(challengerId);
    const challengerCultivation = await Cultivation.findOne({ user: challengerId });

    if (!challengerCultivation) {
      return res.status(400).json({
        success: false,
        message: "Bạn chưa bắt đầu tu tiên"
      });
    }

    // Lấy thông tin đối thủ
    const opponent = await User.findById(opponentId);
    if (!opponent) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy đối thủ"
      });
    }

    const opponentCultivation = await Cultivation.findOne({ user: opponentId });
    if (!opponentCultivation) {
      return res.status(400).json({
        success: false,
        message: "Đối thủ chưa bắt đầu tu tiên"
      });
    }

    // Tính combat stats (Base + Techniques)
    const challengerStats = challengerCultivation.calculateCombatStats();
    const opponentStats = opponentCultivation.calculateCombatStats();

    // Lấy và tích hợp stats từ trang bị
    const challengerEquipStats = await challengerCultivation.getEquipmentStats();
    const opponentEquipStats = await opponentCultivation.getEquipmentStats();

    mergeEquipmentStats(challengerStats, challengerEquipStats);
    mergeEquipmentStats(opponentStats, opponentEquipStats);

    // Lấy realm info
    const challengerRealm = CULTIVATION_REALMS.find(r => r.level === challengerCultivation.realmLevel) || CULTIVATION_REALMS[0];
    const opponentRealm = CULTIVATION_REALMS.find(r => r.level === opponentCultivation.realmLevel) || CULTIVATION_REALMS[0];

    challengerStats.realmLevel = challengerCultivation.realmLevel;
    challengerStats.realmName = challengerRealm.name;
    opponentStats.realmLevel = opponentCultivation.realmLevel;
    opponentStats.realmName = opponentRealm.name;

    // Lấy skills từ công pháp đã học (với max mana để tính mana cost chính xác)
    const challengerSkills = getLearnedSkills(challengerCultivation, challengerStats.zhenYuan);
    const opponentSkills = getLearnedSkills(opponentCultivation, opponentStats.zhenYuan);

    // Thực hiện trận đấu
    const battleResult = simulateBattle(challengerStats, opponentStats, challengerSkills, opponentSkills);

    // Tính phần thưởng
    let rewards;
    if (battleResult.isDraw) {
      rewards = calculateRewards(challengerStats, opponentStats, true);
    } else if (battleResult.winner === 'challenger') {
      rewards = calculateRewards(challengerStats, opponentStats, false);
    } else {
      rewards = calculateRewards(opponentStats, challengerStats, false);
      // Đổi vị trí winner/loser rewards
      rewards = {
        winnerExp: rewards.winnerExp,
        winnerSpiritStones: rewards.winnerSpiritStones,
        loserExp: rewards.loserExp,
        loserSpiritStones: rewards.loserSpiritStones
      };
    }

    // Tạo bản ghi trận đấu
    const battle = new Battle({
      challenger: challengerId,
      challengerUsername: challenger.name,
      challengerStats,
      opponent: opponentId,
      opponentUsername: opponent.name,
      opponentStats,
      winner: battleResult.isDraw ? null : (battleResult.winner === 'challenger' ? challengerId : opponentId),
      isDraw: battleResult.isDraw,
      rewards,
      battleLogs: battleResult.logs,
      totalTurns: battleResult.totalTurns,
      totalDamageByChallenger: battleResult.totalDamageByChallenger,
      totalDamageByOpponent: battleResult.totalDamageByOpponent,
      status: 'completed',
      completedAt: new Date()
    });

    await battle.save();

    // Cộng phần thưởng
    if (battleResult.isDraw) {
      await Cultivation.findOneAndUpdate(
        { user: challengerId },
        { $inc: { exp: rewards.winnerExp, spiritStones: rewards.winnerSpiritStones } }
      );
      await Cultivation.findOneAndUpdate(
        { user: opponentId },
        { $inc: { exp: rewards.loserExp, spiritStones: rewards.loserSpiritStones } }
      );
    } else if (battleResult.winner === 'challenger') {
      await Cultivation.findOneAndUpdate(
        { user: challengerId },
        { $inc: { exp: rewards.winnerExp, spiritStones: rewards.winnerSpiritStones } }
      );
      await Cultivation.findOneAndUpdate(
        { user: opponentId },
        { $inc: { exp: rewards.loserExp, spiritStones: rewards.loserSpiritStones } }
      );
    } else {
      await Cultivation.findOneAndUpdate(
        { user: opponentId },
        { $inc: { exp: rewards.winnerExp, spiritStones: rewards.winnerSpiritStones } }
      );
      await Cultivation.findOneAndUpdate(
        { user: challengerId },
        { $inc: { exp: rewards.loserExp, spiritStones: rewards.loserSpiritStones } }
      );
    }

    console.log(`[BATTLE] ${challenger.name} vs ${opponent.name} - Winner: ${battleResult.winner || 'Draw'}`);

    // Cập nhật quest progress cho PK 
    challengerCultivation.updateQuestProgress('pk_battle', 1);
    if (battleResult.winner === 'challenger') {
      challengerCultivation.updateQuestProgress('pk_win', 1);
    }
    await challengerCultivation.save();

    // Đối thủ cũng được tính PK battle (nếu là user thật, không phải bot)
    if (opponentId && !String(opponentId).startsWith('bot_')) {
      opponentCultivation.updateQuestProgress('pk_battle', 1);
      if (battleResult.winner === 'opponent') {
        opponentCultivation.updateQuestProgress('pk_win', 1);
      }
      await opponentCultivation.save();
    }

    // Gửi thông báo cho đối thủ
    const notificationResult = battleResult.isDraw
      ? 'HÒA'
      : battleResult.winner === 'challenger' ? 'THUA' : 'THẮNG';

    const notificationMessage = battleResult.isDraw
      ? `Trận đấu với ${challenger.name} kết thúc hòa! Bạn nhận được ${rewards.loserExp} exp.`
      : battleResult.winner === 'challenger'
        ? `${challenger.name} đã đánh bại bạn trong trận PK! Bạn nhận được ${rewards.loserExp} exp.`
        : `Bạn đã chiến thắng trận PK với ${challenger.name}! Bạn nhận được ${rewards.winnerExp} exp và ${rewards.winnerSpiritStones} linh thạch.`;

    await Notification.create({
      recipient: opponentId,
      sender: challengerId,
      type: 'pk_result',
      title: `Kết quả PK: ${notificationResult}`,
      message: notificationMessage,
      data: {
        metadata: {
          battleId: battle._id.toString(),
          result: notificationResult,
          challengerName: challenger.name,
          totalTurns: battleResult.totalTurns
        }
      }
    });

    res.json({
      success: true,
      message: battleResult.isDraw
        ? "Trận đấu kết thúc hòa!"
        : `${battleResult.winner === 'challenger' ? challenger.name : opponent.name} chiến thắng!`,
      data: {
        battleId: battle._id,
        challenger: {
          id: challengerId,
          username: challenger.name,
          avatar: challenger.avatarUrl,
          stats: challengerStats,
          finalHp: battleResult.finalChallengerHp
        },
        opponent: {
          id: opponentId,
          username: opponent.name,
          avatar: opponent.avatarUrl,
          stats: opponentStats,
          finalHp: battleResult.finalOpponentHp
        },
        winner: battleResult.isDraw ? null : battleResult.winner,
        isDraw: battleResult.isDraw,
        rewards,
        battleLogs: battleResult.logs,
        totalTurns: battleResult.totalTurns,
        totalDamageByChallenger: battleResult.totalDamageByChallenger,
        totalDamageByOpponent: battleResult.totalDamageByOpponent
      }
    });

  } catch (error) {
    console.error("[BATTLE] Challenge error:", error);
    next(error);
  }
});

/**
 * GET /api/battle/history
 * Lấy lịch sử trận đấu của user
 */
router.get("/history", async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { page = 1, limit = 10 } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const battles = await Battle.find({
      $or: [
        { challenger: userId },
        { opponent: userId }
      ]
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('challenger', 'name avatarUrl')
      .populate('opponent', 'name avatarUrl')
      .populate('winner', 'name avatarUrl')
      .lean();

    const total = await Battle.countDocuments({
      $or: [
        { challenger: userId },
        { opponent: userId }
      ]
    });

    // Tính thống kê
    const stats = await Battle.aggregate([
      {
        $match: {
          $or: [
            { challenger: userId },
            { opponent: userId }
          ]
        }
      },
      {
        $group: {
          _id: null,
          totalBattles: { $sum: 1 },
          wins: {
            $sum: {
              $cond: [{ $eq: ["$winner", userId] }, 1, 0]
            }
          },
          draws: {
            $sum: {
              $cond: ["$isDraw", 1, 0]
            }
          }
        }
      }
    ]);

    const battleStats = stats[0] || { totalBattles: 0, wins: 0, draws: 0 };
    battleStats.losses = battleStats.totalBattles - battleStats.wins - battleStats.draws;

    res.json({
      success: true,
      data: {
        battles: battles.map(battle => {
          // Kiểm tra nếu opponent id = challenger id thì đây là battle với bot
          const isBotBattle = battle.challenger._id.toString() === battle.opponent._id.toString();

          return {
            _id: battle._id,
            challenger: {
              _id: battle.challenger._id,
              username: battle.challengerUsername || battle.challenger.name,
              avatar: battle.challenger.avatarUrl,
              realmLevel: battle.challengerStats.realmLevel,
              realmName: battle.challengerStats.realmName
            },
            opponent: {
              _id: battle.opponent._id,
              username: isBotBattle ? battle.opponentUsername : (battle.opponentUsername || battle.opponent.name),
              avatar: isBotBattle ? null : battle.opponent.avatarUrl,
              realmLevel: battle.opponentStats.realmLevel,
              realmName: battle.opponentStats.realmName,
              isBot: isBotBattle
            },
            winner: battle.winner,
            isDraw: battle.isDraw,
            isUserWinner: battle.winner && battle.winner._id.toString() === userId.toString(),
            isUserChallenger: battle.challenger._id.toString() === userId.toString(),
            totalTurns: battle.totalTurns,
            rewards: battle.rewards,
            createdAt: battle.createdAt
          }
        }),
        stats: battleStats,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / parseInt(limit))
        }
      }
    });

  } catch (error) {
    console.error("[BATTLE] Get history error:", error);
    next(error);
  }
});

/**
 * GET /api/battle/:id
 * Lấy chi tiết một trận đấu
 */
router.get("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;

    const battle = await Battle.findById(id)
      .populate('challenger', 'name avatarUrl')
      .populate('opponent', 'name avatarUrl')
      .populate('winner', 'name avatarUrl')
      .lean();

    if (!battle) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy trận đấu"
      });
    }

    res.json({
      success: true,
      data: {
        _id: battle._id,
        challenger: {
          _id: battle.challenger._id,
          username: battle.challenger.name,
          avatar: battle.challenger.avatarUrl,
          stats: battle.challengerStats
        },
        opponent: {
          _id: battle.opponent._id,
          username: battle.opponent.name,
          avatar: battle.opponent.avatarUrl,
          stats: battle.opponentStats
        },
        winner: battle.winner,
        isDraw: battle.isDraw,
        rewards: battle.rewards,
        battleLogs: battle.battleLogs,
        totalTurns: battle.totalTurns,
        totalDamageByChallenger: battle.totalDamageByChallenger,
        totalDamageByOpponent: battle.totalDamageByOpponent,
        createdAt: battle.createdAt,
        completedAt: battle.completedAt
      }
    });

  } catch (error) {
    console.error("[BATTLE] Get battle detail error:", error);
    next(error);
  }
});

/**
 * GET /api/battle/opponents/list
 * Lấy danh sách đối thủ để thách đấu
 */
router.get("/opponents/list", async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { page = 1, limit = 20 } = req.query;

    // Lấy cultivation của user để biết realm level
    const userCultivation = await Cultivation.findOne({ user: userId });
    if (!userCultivation) {
      return res.status(400).json({
        success: false,
        message: "Bạn chưa bắt đầu tu tiên"
      });
    }

    const userRealmLevel = userCultivation.realmLevel;

    // Tìm các user có realm level trong khoảng ±2
    const cultivations = await Cultivation.find({
      user: { $ne: userId },
      realmLevel: {
        $gte: Math.max(1, userRealmLevel - 2),
        $lte: Math.min(11, userRealmLevel + 2)
      }
    })
      .sort({ realmLevel: -1, exp: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit))
      .populate('user', 'name avatarUrl')
      .lean();

    const total = await Cultivation.countDocuments({
      user: { $ne: userId },
      realmLevel: {
        $gte: Math.max(1, userRealmLevel - 2),
        $lte: Math.min(11, userRealmLevel + 2)
      }
    });

    const opponents = cultivations.map(c => {
      const realm = CULTIVATION_REALMS.find(r => r.level === c.realmLevel) || CULTIVATION_REALMS[0];
      return {
        userId: c.user?._id,
        username: c.user?.name || 'Tu sĩ ẩn danh',
        avatar: c.user?.avatarUrl,
        realmLevel: c.realmLevel,
        realmName: realm.name,
        realmColor: realm.color,
        exp: c.exp
      };
    });

    res.json({
      success: true,
      data: {
        opponents,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / parseInt(limit))
        }
      }
    });

  } catch (error) {
    console.error("[BATTLE] Get opponents error:", error);
    next(error);
  }
});

/**
 * GET /api/battle/ranking/list
 * Lấy bảng xếp hạng PK
 */
router.get("/ranking/list", async (req, res, next) => {
  try {
    const { limit = 20 } = req.query;

    // Aggregate để tính win rate và số trận thắng
    const rankings = await Battle.aggregate([
      {
        $facet: {
          // Thống kê từ góc nhìn challenger
          challengerStats: [
            {
              $group: {
                _id: "$challenger",
                battles: { $sum: 1 },
                wins: {
                  $sum: {
                    $cond: [
                      { $and: [{ $eq: ["$winner", "$challenger"] }, { $eq: ["$isDraw", false] }] },
                      1,
                      0
                    ]
                  }
                }
              }
            }
          ],
          // Thống kê từ góc nhìn opponent
          opponentStats: [
            {
              $group: {
                _id: "$opponent",
                battles: { $sum: 1 },
                wins: {
                  $sum: {
                    $cond: [
                      { $and: [{ $eq: ["$winner", "$opponent"] }, { $eq: ["$isDraw", false] }] },
                      1,
                      0
                    ]
                  }
                }
              }
            }
          ]
        }
      }
    ]);

    // Merge stats
    const statsMap = new Map();

    // Check if rankings has data before accessing
    const challengerStats = rankings[0]?.challengerStats || [];
    const opponentStats = rankings[0]?.opponentStats || [];

    challengerStats.forEach(s => {
      statsMap.set(s._id.toString(), {
        userId: s._id,
        battles: s.battles,
        wins: s.wins
      });
    });

    opponentStats.forEach(s => {
      const existing = statsMap.get(s._id.toString());
      if (existing) {
        existing.battles += s.battles;
        existing.wins += s.wins;
      } else {
        statsMap.set(s._id.toString(), {
          userId: s._id,
          battles: s.battles,
          wins: s.wins
        });
      }
    });

    // Convert to array and sort
    let rankedUsers = Array.from(statsMap.values())
      .map(s => ({
        ...s,
        winRate: s.battles > 0 ? (s.wins / s.battles * 100).toFixed(1) : 0
      }))
      .sort((a, b) => {
        // Sắp xếp theo số trận thắng, rồi win rate
        if (b.wins !== a.wins) return b.wins - a.wins;
        return parseFloat(b.winRate) - parseFloat(a.winRate);
      })
      .slice(0, parseInt(limit));

    // Populate user info
    const userIds = rankedUsers.map(u => u.userId);
    const users = await User.find({ _id: { $in: userIds } }).select('name avatarUrl').lean();
    const cultivations = await Cultivation.find({ user: { $in: userIds } }).lean();

    const userMap = new Map();
    users.forEach(u => userMap.set(u._id.toString(), u));

    const cultMap = new Map();
    cultivations.forEach(c => cultMap.set(c.user.toString(), c));

    rankedUsers = rankedUsers.map((u, index) => {
      const user = userMap.get(u.userId.toString()) || {};
      const cult = cultMap.get(u.userId.toString()) || {};
      const realm = CULTIVATION_REALMS.find(r => r.level === cult.realmLevel) || CULTIVATION_REALMS[0];

      return {
        rank: index + 1,
        userId: u.userId,
        username: user.name || 'Tu sĩ ẩn danh',
        avatar: user.avatarUrl,
        battles: u.battles,
        wins: u.wins,
        losses: u.battles - u.wins,
        winRate: u.winRate,
        realmLevel: cult.realmLevel || 1,
        realmName: realm.name
      };
    });

    res.json({
      success: true,
      data: rankedUsers
    });

  } catch (error) {
    console.error("[BATTLE] Get ranking error:", error);
    next(error);
  }
});

// ==================== BOT BATTLE ROUTES ====================

/**
 * GET /api/battle/bots/list
 * Lấy danh sách bots để thách đấu (trong khoảng ±1 cảnh giới)
 */
router.get("/bots/list", async (req, res, next) => {
  try {
    const userId = req.user._id;

    // Lấy cultivation của user để biết realm level
    const userCultivation = await Cultivation.findOne({ user: userId });
    if (!userCultivation) {
      return res.status(400).json({
        success: false,
        message: "Bạn chưa bắt đầu tu tiên"
      });
    }

    const userRealmLevel = userCultivation.realmLevel;
    const bots = getBotsByRealmLevel(userRealmLevel);

    // Thêm thông tin realm color
    const botsWithColor = bots.map(bot => {
      const realm = CULTIVATION_REALMS.find(r => r.level === bot.realmLevel) || CULTIVATION_REALMS[0];
      return {
        ...bot,
        realmColor: realm.color,
        isHarder: bot.realmLevel > userRealmLevel,
        isEasier: bot.realmLevel < userRealmLevel
      };
    });

    res.json({
      success: true,
      data: {
        bots: botsWithColor,
        userRealmLevel
      }
    });

  } catch (error) {
    console.error("[BATTLE] Get bots error:", error);
    next(error);
  }
});

/**
 * POST /api/battle/challenge/bot
 * Thách đấu một bot NPC
 */
router.post("/challenge/bot", async (req, res, next) => {
  try {
    const challengerId = req.user._id;
    const { botId } = req.body;

    if (!botId) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng chọn đối thủ"
      });
    }

    // Tìm bot
    const bot = getBotById(botId);
    if (!bot) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy đối thủ này"
      });
    }

    // Kiểm tra cooldown (30 giây giữa các trận với cùng bot)
    const recentBattle = await Battle.findOne({
      challenger: challengerId,
      opponentUsername: bot.name,
      createdAt: { $gt: new Date(Date.now() - BOT_BATTLE_COOLDOWN) }
    });

    if (recentBattle) {
      const remainingTime = Math.ceil((BOT_BATTLE_COOLDOWN - (Date.now() - recentBattle.createdAt)) / 1000);
      return res.status(429).json({
        success: false,
        message: `Vui lòng đợi ${remainingTime} giây trước khi thách đấu lại ${bot.name}`
      });
    }

    // Lấy thông tin người thách đấu
    const challenger = await User.findById(challengerId);
    const challengerCultivation = await Cultivation.findOne({ user: challengerId });

    if (!challengerCultivation) {
      return res.status(400).json({
        success: false,
        message: "Bạn chưa bắt đầu tu tiên"
      });
    }

    // Tính combat stats của người chơi
    const challengerStats = challengerCultivation.calculateCombatStats();
    const challengerEquipStats = await challengerCultivation.getEquipmentStats();
    mergeEquipmentStats(challengerStats, challengerEquipStats);

    const challengerRealm = CULTIVATION_REALMS.find(r => r.level === challengerCultivation.realmLevel) || CULTIVATION_REALMS[0];
    challengerStats.realmLevel = challengerCultivation.realmLevel;
    challengerStats.realmName = challengerRealm.name;

    // Tính combat stats của bot (base stats * statMultiplier)
    const botRealm = CULTIVATION_REALMS.find(r => r.level === bot.realmLevel) || CULTIVATION_REALMS[0];
    const baseStatsByRealm = {
      1: { attack: 10, defense: 5, qiBlood: 100, zhenYuan: 50, speed: 10, criticalRate: 5, criticalDamage: 150, accuracy: 80, dodge: 5, penetration: 0, resistance: 0, lifesteal: 0, regeneration: 0.5, luck: 5 },
      2: { attack: 25, defense: 12, qiBlood: 250, zhenYuan: 120, speed: 15, criticalRate: 8, criticalDamage: 160, accuracy: 85, dodge: 8, penetration: 2, resistance: 2, lifesteal: 1, regeneration: 1, luck: 8 },
      3: { attack: 50, defense: 25, qiBlood: 500, zhenYuan: 250, speed: 20, criticalRate: 10, criticalDamage: 170, accuracy: 88, dodge: 10, penetration: 5, resistance: 5, lifesteal: 2, regeneration: 1.5, luck: 10 },
      4: { attack: 100, defense: 50, qiBlood: 1000, zhenYuan: 500, speed: 25, criticalRate: 12, criticalDamage: 180, accuracy: 90, dodge: 12, penetration: 8, resistance: 8, lifesteal: 3, regeneration: 2, luck: 12 },
      5: { attack: 200, defense: 100, qiBlood: 2000, zhenYuan: 1000, speed: 30, criticalRate: 15, criticalDamage: 190, accuracy: 92, dodge: 15, penetration: 12, resistance: 12, lifesteal: 5, regeneration: 3, luck: 15 },
      6: { attack: 400, defense: 200, qiBlood: 4000, zhenYuan: 2000, speed: 35, criticalRate: 18, criticalDamage: 200, accuracy: 94, dodge: 18, penetration: 15, resistance: 15, lifesteal: 7, regeneration: 4, luck: 18 },
      7: { attack: 800, defense: 400, qiBlood: 8000, zhenYuan: 4000, speed: 40, criticalRate: 20, criticalDamage: 210, accuracy: 96, dodge: 20, penetration: 18, resistance: 18, lifesteal: 10, regeneration: 5, luck: 20 },
      8: { attack: 1600, defense: 800, qiBlood: 16000, zhenYuan: 8000, speed: 45, criticalRate: 22, criticalDamage: 220, accuracy: 97, dodge: 22, penetration: 20, resistance: 20, lifesteal: 12, regeneration: 6, luck: 22 },
      9: { attack: 3200, defense: 1600, qiBlood: 32000, zhenYuan: 16000, speed: 50, criticalRate: 25, criticalDamage: 230, accuracy: 98, dodge: 25, penetration: 22, resistance: 22, lifesteal: 15, regeneration: 7, luck: 25 },
      10: { attack: 6400, defense: 3200, qiBlood: 64000, zhenYuan: 32000, speed: 60, criticalRate: 30, criticalDamage: 250, accuracy: 99, dodge: 30, penetration: 25, resistance: 25, lifesteal: 20, regeneration: 8, luck: 30 },
      11: { attack: 12800, defense: 6400, qiBlood: 128000, zhenYuan: 64000, speed: 70, criticalRate: 35, criticalDamage: 300, accuracy: 100, dodge: 35, penetration: 30, resistance: 30, lifesteal: 25, regeneration: 10, luck: 35 }
    };

    const baseStats = baseStatsByRealm[bot.realmLevel] || baseStatsByRealm[1];
    const opponentStats = {};
    for (const [key, value] of Object.entries(baseStats)) {
      // Nhân stats theo statMultiplier
      opponentStats[key] = Math.floor(value * bot.statMultiplier);
    }
    opponentStats.realmLevel = bot.realmLevel;
    opponentStats.realmName = bot.realmName;

    // Lấy skills của bot
    const botSkills = [];
    if (bot.skills && bot.skills.length > 0) {
      for (const techniqueId of bot.skills) {
        // Use TECHNIQUES_MAP for O(1) lookup
        const technique = TECHNIQUES_MAP.get(techniqueId);
        if (technique && technique.skill) {
          const manaCost = getManaCostByRarity(technique.rarity, opponentStats.zhenYuan);
          botSkills.push({
            techniqueId: technique.id,
            name: technique.skill.name,
            description: technique.skill.description,
            cooldown: technique.skill.cooldown,
            manaCost,
            damageMultiplier: 1.5,
            level: 5 // Bots có skill level 5 mặc định
          });
        }
      }
    }

    // Lấy skills của người chơi
    const challengerSkills = getLearnedSkills(challengerCultivation, challengerStats.zhenYuan);

    // Thực hiện trận đấu
    const battleResult = simulateBattle(challengerStats, opponentStats, challengerSkills, botSkills);

    // Tính phần thưởng (với rewardMultiplier)
    let rewards;
    if (battleResult.isDraw) {
      rewards = {
        winnerExp: Math.floor(10 * bot.rewardMultiplier),
        winnerSpiritStones: Math.floor(5 * bot.rewardMultiplier),
        loserExp: Math.floor(10 * bot.rewardMultiplier),
        loserSpiritStones: Math.floor(5 * bot.rewardMultiplier)
      };
    } else if (battleResult.winner === 'challenger') {
      const baseExp = 50;
      const baseStones = 20;
      const levelDiff = bot.realmLevel - challengerCultivation.realmLevel;
      const bonusMultiplier = Math.max(1, 1 + levelDiff * 0.2);

      rewards = {
        winnerExp: Math.floor(baseExp * bonusMultiplier * bot.rewardMultiplier),
        winnerSpiritStones: Math.floor(baseStones * bonusMultiplier * bot.rewardMultiplier),
        loserExp: 0,
        loserSpiritStones: 0
      };
    } else {
      // Người chơi thua - vẫn nhận một ít exp
      rewards = {
        winnerExp: 0,
        winnerSpiritStones: 0,
        loserExp: Math.floor(10 * bot.rewardMultiplier),
        loserSpiritStones: 0
      };
    }

    // Tạo bản ghi trận đấu (với bot là opponent)
    const battle = new Battle({
      challenger: challengerId,
      challengerUsername: challenger.name,
      challengerStats,
      opponent: challengerId, // Bot không có user id, dùng challenger id làm placeholder
      opponentUsername: bot.name,
      opponentStats,
      winner: battleResult.isDraw ? null : (battleResult.winner === 'challenger' ? challengerId : null),
      isDraw: battleResult.isDraw,
      rewards,
      battleLogs: battleResult.logs,
      totalTurns: battleResult.totalTurns,
      totalDamageByChallenger: battleResult.totalDamageByChallenger,
      totalDamageByOpponent: battleResult.totalDamageByOpponent,
      status: 'completed',
      completedAt: new Date()
    });

    await battle.save();

    // Cộng phần thưởng cho người chơi
    if (battleResult.isDraw) {
      await Cultivation.findOneAndUpdate(
        { user: challengerId },
        { $inc: { exp: rewards.winnerExp, spiritStones: rewards.winnerSpiritStones } }
      );
    } else if (battleResult.winner === 'challenger') {
      await Cultivation.findOneAndUpdate(
        { user: challengerId },
        { $inc: { exp: rewards.winnerExp, spiritStones: rewards.winnerSpiritStones } }
      );
    } else {
      // Thua cũng nhận một ít exp
      await Cultivation.findOneAndUpdate(
        { user: challengerId },
        { $inc: { exp: rewards.loserExp } }
      );
    }

    console.log(`[BATTLE/BOT] ${challenger.name} vs ${bot.name} - Winner: ${battleResult.winner || 'Draw'}`);

    res.json({
      success: true,
      message: battleResult.isDraw
        ? `Trận đấu với ${bot.name} kết thúc hòa!`
        : battleResult.winner === 'challenger'
          ? `Bạn đã chiến thắng ${bot.name}!`
          : `${bot.name} đã đánh bại bạn!`,
      data: {
        battleId: battle._id,
        challenger: {
          id: challengerId,
          username: challenger.name,
          avatar: challenger.avatarUrl,
          stats: challengerStats,
          finalHp: battleResult.finalChallengerHp
        },
        opponent: {
          id: `bot_${bot.id}`,
          username: bot.name,
          avatar: bot.avatar,
          stats: opponentStats,
          finalHp: battleResult.finalOpponentHp,
          isBot: true,
          description: bot.description
        },
        winner: battleResult.isDraw ? null : battleResult.winner,
        isDraw: battleResult.isDraw,
        rewards,
        battleLogs: battleResult.logs,
        totalTurns: battleResult.totalTurns,
        totalDamageByChallenger: battleResult.totalDamageByChallenger,
        totalDamageByOpponent: battleResult.totalDamageByOpponent,
        rewardMultiplier: bot.rewardMultiplier
      }
    });

  } catch (error) {
    console.error("[BATTLE/BOT] Challenge bot error:", error);
    next(error);
  }
});

export default router;
