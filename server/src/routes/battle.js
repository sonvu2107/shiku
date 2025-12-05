import express from "express";
import Battle from "../models/Battle.js";
import Cultivation, { CULTIVATION_REALMS, SHOP_ITEMS, ITEM_TYPES } from "../models/Cultivation.js";
import Equipment from "../models/Equipment.js";
import User from "../models/User.js";
import Notification from "../models/Notification.js";
import { authRequired } from "../middleware/auth.js";

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
 * @returns {number} Mana cost (scaled theo max mana)
 */
const getManaCostByRarity = (rarity, maxMana = 1000) => {
  // Base mana cost theo rarity
  const baseManaCostMap = {
    'common': 10,
    'uncommon': 20,
    'rare': 35,
    'epic': 50,
    'legendary': 75
  };
  
  const baseCost = baseManaCostMap[rarity] || 10;
  
  // Scale theo max mana: người có mana lớn hơn sẽ tốn nhiều hơn
  // Công thức: baseCost * (1 + (maxMana - 1000) / 5000)
  // Ví dụ: maxMana = 1000 -> multiplier = 1.0
  //        maxMana = 5000 -> multiplier = 1.8
  //        maxMana = 10000 -> multiplier = 2.8
  const manaMultiplier = 1 + Math.max(0, (maxMana - 1000) / 5000);
  const scaledCost = Math.floor(baseCost * manaMultiplier);
  
  // Đảm bảo cost không quá 30% max mana
  const maxCost = Math.floor(maxMana * 0.3);
  
  return Math.min(scaledCost, maxCost);
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
      const technique = SHOP_ITEMS.find(t => t.id === learned.techniqueId && t.type === ITEM_TYPES.TECHNIQUE);
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
      if (attackerCooldowns[skill.techniqueId] <= 0 && attackerMana >= (skill.manaCost || 10)) {
        // Use this skill
        usedSkill = skill;
        skillDamageBonus = (skill.damage || 50) * skill.damageMultiplier;
        manaConsumed = skill.manaCost || 10;
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

    // Tính toán né tránh
    const hitChance = (attacker.accuracy - defender.dodge) / 100;
    const isDodged = Math.random() > Math.max(0.1, hitChance);

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
  const baseStones = 20;

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
        battles: battles.map(battle => ({
          _id: battle._id,
          challenger: {
            _id: battle.challenger._id,
            username: battle.challenger.name,
            avatar: battle.challenger.avatarUrl,
            realmLevel: battle.challengerStats.realmLevel,
            realmName: battle.challengerStats.realmName
          },
          opponent: {
            _id: battle.opponent._id,
            username: battle.opponent.name,
            avatar: battle.opponent.avatarUrl,
            realmLevel: battle.opponentStats.realmLevel,
            realmName: battle.opponentStats.realmName
          },
          winner: battle.winner,
          isDraw: battle.isDraw,
          isUserWinner: battle.winner && battle.winner._id.toString() === userId.toString(),
          isUserChallenger: battle.challenger._id.toString() === userId.toString(),
          totalTurns: battle.totalTurns,
          rewards: battle.rewards,
          createdAt: battle.createdAt
        })),
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
        $lte: Math.min(10, userRealmLevel + 2)
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
        $lte: Math.min(10, userRealmLevel + 2)
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
    
    rankings[0].challengerStats.forEach(s => {
      statsMap.set(s._id.toString(), {
        userId: s._id,
        battles: s.battles,
        wins: s.wins
      });
    });

    rankings[0].opponentStats.forEach(s => {
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

export default router;
