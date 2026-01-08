import express from "express";
import Battle from "../models/Battle.js";
import Cultivation, { CULTIVATION_REALMS, SHOP_ITEMS, ITEM_TYPES, TECHNIQUES_MAP } from "../models/Cultivation.js";
import Equipment from "../models/Equipment.js";
import User from "../models/User.js";
import Notification from "../models/Notification.js";
import { authRequired } from "../middleware/auth.js";
import { PK_BOTS, BOT_BATTLE_COOLDOWN, getBotsByRealmLevel, getBotById } from "../data/pkBots.js";
import { logPKOverkillEvent } from "../controllers/cultivation/worldEventController.js";
import { getTierBySubLevel, applyDebuffEffects } from "../data/tierConfig.js";
import { reduceDurability } from "../services/modifierService.js";
import { executeSkill, applyStatusEffects } from "../services/combatSkillService.js";

const router = express.Router();

// Tất cả routes đều cần đăng nhập
router.use(authRequired);

// ==================== HELPER FUNCTIONS ====================

/**
 * Reduce durability for all equipped items after battle
 * GIẢM ĐỘ BỀN TRONG INVENTORY CỦA USER, KHÔNG PHẢI EQUIPMENT COLLECTION
 * Chỉ có 20% cơ hội giảm 1 độ bền mỗi trận
 */
const reduceEquipmentDurability = async (cultivation) => {
  const equipmentSlots = ['weapon', 'magicTreasure', 'helmet', 'chest', 'shoulder', 'gloves', 'boots', 'belt', 'ring', 'necklace', 'earring', 'bracelet', 'powerItem'];

  let hasChanges = false;

  for (const slot of equipmentSlots) {
    const equipmentId = cultivation.equipped?.[slot];
    if (!equipmentId) continue;

    // Chỉ 20% cơ hội giảm độ bền
    if (Math.random() > 0.2) continue;

    // Tìm item trong inventory
    const invItem = cultivation.inventory.find(i =>
      i.itemId?.toString() === equipmentId.toString() ||
      i.metadata?._id?.toString() === equipmentId.toString()
    );

    if (invItem) {
      // Khởi tạo durability nếu chưa có
      if (!invItem.metadata) invItem.metadata = {};
      if (!invItem.metadata.durability) {
        invItem.metadata.durability = { current: 100, max: 100 };
      }

      // Giảm 1 độ bền
      invItem.metadata.durability.current = Math.max(0, invItem.metadata.durability.current - 1);
      hasChanges = true;
    }
  }

  // Đánh dấu inventory đã thay đổi để mongoose save
  if (hasChanges) {
    cultivation.markModified('inventory');
  }
};

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
    'common': 0.05,      // 5% max mana
    'uncommon': 0.08,    // 8% max mana
    'rare': 0.10,        // 10% max mana
    'epic': 0.12,        // 12% max mana
    'legendary': 0.15,   // 15% max mana
    'mythic': 0.20       // 20% max mana
  };

  const costPercent = manaCostPercentMap[rarity] || 0.05;
  const manaCost = Math.floor(maxMana * costPercent);

  // Minimum cost is 5, maximum is 40% of max mana
  return Math.max(5, Math.min(manaCost, Math.floor(maxMana * 0.4)));
};

/**
 * Lấy skills từ công pháp đã trang bị trong combat slots
 * @param {Object} cultivation - Cultivation object
 * @param {number} maxMana - Lượng chân nguyên tối đa (optional, sẽ tính từ combatStats nếu không có)
 * @returns {Array} Danh sách skills đã sắp xếp theo slot index
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

  // ==================== CHỈ LẤY SKILLS TỪ EQUIPPED SLOTS ====================
  const equippedSlots = cultivation.equippedCombatTechniques || [];

  // Backward compatibility: Nếu chưa có slots nhưng có learned techniques
  // → Tự động equip công pháp đầu tiên vào slot 0
  if (equippedSlots.length === 0 && cultivation.learnedTechniques?.length > 0) {
    const firstTechnique = cultivation.learnedTechniques[0];
    equippedSlots.push({
      slotIndex: 0,
      techniqueId: firstTechnique.techniqueId
    });
  }

  // Sắp xếp theo slotIndex (0 → 4)
  const sortedSlots = equippedSlots.sort((a, b) => a.slotIndex - b.slotIndex);

  sortedSlots.forEach(slot => {
    // Tìm learned technique tương ứng
    const learned = cultivation.learnedTechniques?.find(t => t.techniqueId === slot.techniqueId);
    if (!learned) return; // Skip nếu chưa học (shouldn't happen)

    // Use TECHNIQUES_MAP for O(1) lookup
    const technique = TECHNIQUES_MAP.get(learned.techniqueId);
    if (technique && technique.skill) {
      skills.push({
        ...technique.skill,
        techniqueId: technique.id,
        techniqueName: technique.name,
        rarity: technique.rarity || 'common',
        level: learned.level,
        slotIndex: slot.slotIndex, // Thêm slotIndex để tracking
        // Damage multiplier dựa trên level của công pháp
        damageMultiplier: 1 + (learned.level - 1) * 0.15,
        // Mana cost dựa trên rarity và max mana (scaled)
        manaCost: getManaCostByRarity(technique.rarity || 'common', actualMaxMana)
      });
    }
  });

  return skills;
};

/**
 * Tính toán một trận đấu PK với skills
 * @param {Object} challengerStats - Combat stats của người thách đấu
 * @param {Object} opponentStats - Combat stats của đối thủ
 * @param {Array} challengerSkills - Skills của người thách đấu
 * @param {Array} opponentSkills - Skills của đối thủ
 * @param {Object|null} nghichThienMeta - Nghịch thiên meta data (damageReduction)
 * @returns {Object} Kết quả trận đấu
 */
const simulateBattle = (challengerStats, opponentStats, challengerSkills = [], opponentSkills = [], nghichThienMeta = null) => {
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

  // Buff/Debuff tracking
  let challengerBuffs = [];
  let challengerDebuffs = [];
  let opponentBuffs = [];
  let opponentDebuffs = [];

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
    let skillResult = null; // Full skill effects from combatSkillService
    let manaConsumed = 0;
    for (const skill of attackerSkills) {


      if (attackerCooldowns[skill.techniqueId] <= 0 && attackerMana >= (skill.manaCost !== undefined ? skill.manaCost : 10)) {
        // Use this skill
        usedSkill = skill;
        manaConsumed = skill.manaCost !== undefined ? skill.manaCost : 10;
        attackerCooldowns[skill.techniqueId] = skill.cooldown || 3;

        // Execute skill with full effects (healing, buffs, debuffs, etc.)
        const attackerObj = { attack: attacker.attack, maxQiBlood: (currentAttacker === 'challenger' ? challengerMaxHp : opponentMaxHp), qiBlood: (currentAttacker === 'challenger' ? challengerHp : opponentHp), maxZhenYuan: (currentAttacker === 'challenger' ? challengerMaxMana : opponentMaxMana), zhenYuan: attackerMana };
        const defenderObj = { maxQiBlood: (currentAttacker === 'challenger' ? opponentMaxHp : challengerMaxHp), qiBlood: defenderHp };
        skillResult = executeSkill(skill, attackerObj, defenderObj);

        // Skill damage (from executeSkill or fallback to old formula)
        skillDamageBonus = skillResult.damage > 0 ? skillResult.damage : Math.floor(attacker.attack * (skill.damageMultiplier || 1));

        // Consume mana
        if (currentAttacker === 'challenger') {
          challengerMana = Math.max(0, challengerMana - manaConsumed);
        } else {
          opponentMana = Math.max(0, opponentMana - manaConsumed);
        }

        // Apply mana restore
        if (skillResult && skillResult.manaRestore > 0) {
          if (currentAttacker === 'challenger') {
            challengerMana = Math.min(challengerMaxMana, challengerMana + skillResult.manaRestore);
          } else {
            opponentMana = Math.min(opponentMaxMana, opponentMana + skillResult.manaRestore);
          }
        }

        // Apply healing
        if (skillResult && skillResult.healing > 0) {
          if (currentAttacker === 'challenger') {
            challengerHp = Math.min(challengerMaxHp, challengerHp + skillResult.healing);
          } else {
            opponentHp = Math.min(opponentMaxHp, opponentHp + skillResult.healing);
          }
        }

        // Collect buffs for attacker
        if (skillResult && skillResult.buffs && skillResult.buffs.length > 0) {
          if (currentAttacker === 'challenger') {
            challengerBuffs.push(...skillResult.buffs);
          } else {
            opponentBuffs.push(...skillResult.buffs);
          }
        }

        // Collect debuffs for defender
        if (skillResult && skillResult.debuffs && skillResult.debuffs.length > 0) {
          if (currentAttacker === 'challenger') {
            opponentDebuffs.push(...skillResult.debuffs);
          } else {
            challengerDebuffs.push(...skillResult.debuffs);
          }
        }

        break;
      }
    }

    // Apply active buffs/debuffs to stats before attack
    let effectiveAttacker = { ...attacker };
    let effectiveDefender = { ...defender };

    if (currentAttacker === 'challenger') {
      if (challengerBuffs.length > 0) {
        effectiveAttacker = applyStatusEffects(effectiveAttacker, challengerBuffs);
      }
      if (opponentDebuffs.length > 0) {
        effectiveDefender = applyStatusEffects(effectiveDefender, opponentDebuffs);
      }
    } else {
      if (opponentBuffs.length > 0) {
        effectiveAttacker = applyStatusEffects(effectiveAttacker, opponentBuffs);
      }
      if (challengerDebuffs.length > 0) {
        effectiveDefender = applyStatusEffects(effectiveDefender, challengerDebuffs);
      }
    }

    // Tính toán né tránh (improved formula)
    // OLD: hitChance = (accuracy - dodge) / 100 -> 100 accuracy vs 50 dodge = 50% hit (too low!)
    // NEW: Use multiplicative formula - accuracy reduces dodge effectiveness
    const accuracyFactor = Math.min((effectiveAttacker.accuracy || 100) / 100, 1.5);
    const dodgeReduction = (effectiveDefender.dodge || 0) / ((effectiveDefender.dodge || 0) + (effectiveAttacker.accuracy || 100));
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
    if ((attacker.regeneration || 0) > 0) {
      const maxHp = currentAttacker === 'challenger' ? challengerMaxHp : opponentMaxHp;
      const regenRate = Math.min(attacker.regeneration || 0, 5); // Max 5%
      regenerationHealed = Math.floor(maxHp * regenRate / 100);
    }


    // Kiểm tra Stun (trước khi đánh)
    if (effectiveAttacker.stunned) {
      logs.push({
        turn,
        attacker: currentAttacker,
        description: `Bị choáng! Không thể hành động!`,
        isStunned: true,
        challengerHp: Math.floor(challengerHp),
        opponentHp: Math.floor(opponentHp),
        challengerMana: Math.floor(challengerMana),
        opponentMana: Math.floor(opponentMana),
        skillUsed: null
      });
      // Skip turn nhưng vẫn tính regeneration/poison cuối turn nếu muốn...
      // Ở đây logic đơn giản là skip phase tấn công
    }

    if (!isDodged && !effectiveAttacker.stunned) {
      // Tính sát thương cơ bản: Attack - (Defense * (1 - Penetration/100))
      // Handle Ignore Defense
      let effectiveDefense = defender.defense || 0;
      if (effectiveAttacker.ignoreDef) {
        effectiveDefense = 0;
      } else {
        const penetration = attacker.penetration || 0;
        effectiveDefense = effectiveDefense * (1 - Math.min(penetration, 80) / 100);
      }

      // Improved defense scaling: DEF now reduces 70% of its value from damage
      damage = Math.max(1, (attacker.attack || 0) - effectiveDefense * 0.7);

      // Thêm skill damage bonus
      if (skillDamageBonus > 0) {
        damage += skillDamageBonus;
      }

      // Giảm sát thương theo kháng tính
      const resistance = defender.resistance || 0;
      damage = damage * (1 - Math.min(resistance, 50) / 100);

      // Handle Invulnerable
      if (effectiveDefender.invulnerable) {
        damage = 0;
        description += " [Bất Tử - Ngăn chặn sát thương!]";
      }

      // Critical hit (chỉ check nếu damage > 0)
      if (damage > 0) {
        const critRate = attacker.criticalRate || 0;
        const critDamage = attacker.criticalDamage || 150; // Default 150%
        if (Math.random() * 100 < critRate) {
          isCritical = true;
          damage = damage * (critDamage / 100);
        }

        // Thêm random 10%
        damage = Math.floor(damage * (0.9 + Math.random() * 0.2));
        damage = Math.max(1, damage);

        // ========== FINAL DAMAGE CAP (Prevent 1-hit kills) ==========
        // Cap damage at 20% of defender's max HP per hit AFTER all multipliers
        const defenderMaxHpForCap = currentAttacker === 'challenger' ? opponentMaxHp : challengerMaxHp;
        const maxDamagePerHit = Math.floor(defenderMaxHpForCap * 0.20);
        if (damage > maxDamagePerHit) {
          damage = maxDamagePerHit;
          description += " [Damage Capped]";
        }

        // Handle Shield (Absorb damage)
        if (effectiveDefender.shield > 0) {
          const absorbed = Math.min(damage, effectiveDefender.shield);
          damage -= absorbed;
          description += ` [Lá chắn chặn ${absorbed}]`;
        }
      }

      // Lifesteal (chỉ hoạt động khi tấn công thành công và gây damage > 0)
      if (damage > 0 && (attacker.lifesteal || 0) > 0) {
        lifestealHealed = Math.floor(damage * (attacker.lifesteal || 0) / 100);
      }
    }

    // Áp dụng sát thương và hồi máu
    let actualDamageDealt = 0;
    if (!effectiveAttacker.stunned) {
      if (currentAttacker === 'challenger') {
        // Apply Defender's Damage Reduction Buff (Thiết Bốc, Đại Địa Hộ, etc.)
        let incomingDamage = damage;
        if ((effectiveDefender.damageReduction || 0) > 0) {
          const reduction = Math.min(effectiveDefender.damageReduction, 0.75);
          incomingDamage = Math.floor(incomingDamage * (1 - reduction));
        }
        opponentHp = Math.max(0, opponentHp - incomingDamage);
        actualDamageDealt = incomingDamage;
        challengerHp = Math.min(challengerMaxHp, challengerHp + lifestealHealed + regenerationHealed);
        totalDamageByChallenger += incomingDamage;
      } else {
        // Khi opponent đánh challenger, apply damage reduction từ buff và nghịch thiên
        let incomingDamage = damage;
        // Apply Defender's Damage Reduction Buff
        if ((effectiveDefender.damageReduction || 0) > 0) {
          const reduction = Math.min(effectiveDefender.damageReduction, 0.75);
          incomingDamage = Math.floor(incomingDamage * (1 - reduction));
        }
        // Special Nghịch Thiên reduction
        if (nghichThienMeta && nghichThienMeta.damageReduction > 0) {
          incomingDamage = Math.floor(incomingDamage * (1 - nghichThienMeta.damageReduction));
        }
        challengerHp = Math.max(0, challengerHp - incomingDamage);
        actualDamageDealt = incomingDamage;
        opponentHp = Math.min(opponentMaxHp, opponentHp + lifestealHealed + regenerationHealed);
        totalDamageByOpponent += incomingDamage;
      }
    } else {
      // Stunned: Regen only
      if (currentAttacker === 'challenger') {
        challengerHp = Math.min(challengerMaxHp, challengerHp + regenerationHealed);
      } else {
        opponentHp = Math.min(opponentMaxHp, opponentHp + regenerationHealed);
      }
    }

    // Handle Reflect Damage (Phản Đòn)
    if (!isDodged && !effectiveAttacker.stunned && actualDamageDealt > 0 && effectiveDefender.reflectDamage > 0) {
      const reflected = Math.floor(actualDamageDealt * effectiveDefender.reflectDamage);
      if (currentAttacker === 'challenger') {
        challengerHp = Math.max(0, challengerHp - reflected);
        description += ` [Bị phản ${reflected} sát thương!]`;
      } else {
        opponentHp = Math.max(0, opponentHp - reflected);
        description += ` [Bị phản ${reflected} sát thương!]`;
      }
    }

    // Handle Poison (DOT) - Check opponent debuffs for 'poison'
    // opponentDebuffs if attacker is challenger, etc.
    // logic: "At end of turn, current attacker/defender takes poison dmg?"
    // Usually Poison ticks on Victim's turn start or end.
    // Let's implement: Both sides check poison at end of turn.
    let poisonDamage = 0;
    // Check poison on Challenger
    challengerDebuffs.forEach(d => {
      if (d.type === 'poison') {
        // 1% per tick of MAX HP? Or value stored?
        // Service: damagePerTick: 0.01 (1%)
        const pDmg = Math.floor(challengerMaxHp * (d.damagePerTick || 0.01));
        challengerHp = Math.max(0, challengerHp - pDmg);
        poisonDamage += pDmg;
      }
    });
    // Check poison on Opponent
    opponentDebuffs.forEach(d => {
      if (d.type === 'poison') {
        const pDmg = Math.floor(opponentMaxHp * (d.damagePerTick || 0.01));
        opponentHp = Math.max(0, opponentHp - pDmg);
        poisonDamage += pDmg; // Accumulate or log separately?
      }
    });
    if (poisonDamage > 0) {
      // description += ` [Độc sát: -${poisonDamage}]`;
      // Hard to attribute description to specific log entry since log is per turn (attacker centered).
      // Maybe just let HP update reflect it.
    }

    // Tạo mô tả
    if (!effectiveAttacker.stunned) {
      if (isDodged) {
        description = `Đòn đánh bị né tránh!`;
        // Hiển thị regeneration nếu có
        if (regenerationHealed > 0) description += ` Hồi ${regenerationHealed} máu`;
      } else if (usedSkill) {
        description = `Sử dụng [${usedSkill.name}]! ${isCritical ? 'Chí mạng! ' : ''}Gây ${damage} sát thương`;
        if (manaConsumed > 0) description += ` (Tốn ${manaConsumed} chân nguyên)`;
        // Skill effects
        if (skillResult && skillResult.healing > 0) description += `, hồi ${skillResult.healing} HP`;
        if (skillResult && skillResult.manaRestore > 0) description += `, +${skillResult.manaRestore} MP`;
        if (skillResult && skillResult.effects && skillResult.effects.length > 0) description += ` [${skillResult.effects.join(', ')}]`;
        if (lifestealHealed > 0) description += `, hút ${lifestealHealed} máu`;
        if (regenerationHealed > 0) description += `, tái sinh ${regenerationHealed} máu`;
      } else if (isCritical) {
        description = `Chí mạng! Gây ${damage} sát thương`;
        if (lifestealHealed > 0) description += `, hút ${lifestealHealed} máu`;
        if (regenerationHealed > 0) description += `, hồi ${regenerationHealed} máu`;
      } else {
        description = `Gây ${damage} sát thương`;
        if (lifestealHealed > 0) description += `, hút ${lifestealHealed} máu`;
        if (regenerationHealed > 0) description += `, hồi ${regenerationHealed} máu`;
      }
    } else {
      // Stunned description already set
      if (regenerationHealed > 0) description += ` (Hồi phục ${regenerationHealed})`;
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

    // End of turn: Decrement buff/debuff durations and remove expired
    challengerBuffs = challengerBuffs.map(b => ({ ...b, duration: b.duration - 1 })).filter(b => b.duration > 0);
    challengerDebuffs = challengerDebuffs.map(b => ({ ...b, duration: b.duration - 1 })).filter(b => b.duration > 0);
    opponentBuffs = opponentBuffs.map(b => ({ ...b, duration: b.duration - 1 })).filter(b => b.duration > 0);
    opponentDebuffs = opponentDebuffs.map(b => ({ ...b, duration: b.duration - 1 })).filter(b => b.duration > 0);

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
 * @param {Object} winnerStats - Combat stats của người thắng
 * @param {Object} loserStats - Combat stats của người thua
 * @param {boolean} isDraw - Có hòa không
 * @param {number} tierMultiplier - Reward multiplier từ tier (default 1.0)
 */
const calculateRewards = (winnerStats, loserStats, isDraw, tierMultiplier = 1.0) => {
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

  // Apply tier multiplier
  const finalMultiplier = bonusMultiplier * tierMultiplier;

  return {
    winnerExp: Math.floor(baseExp * finalMultiplier),
    winnerSpiritStones: Math.floor(baseStones * finalMultiplier),
    loserExp: Math.floor(baseExp * 0.2),
    loserSpiritStones: 0
  };
};

// ==================== ROUTES ====================

/**
 * POST /api/battle/training
 * Chế độ tập luyện: Test skill rotation với Stats tùy chỉnh hoặc Dummy Target
 * Body: {
 *   playerStats: { qiBlood: 1000, zhenYuan: 1000, speed: 100, ... }, // Optional override
 *   dummyStats: { qiBlood: 10000000, speed: 0, ... } // Optional override
 * }
 */
router.post("/training", async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { playerStats: customPlayerStats, dummyStats: customDummyStats } = req.body;

    const cultivation = await Cultivation.findOne({ user: userId }).lean();
    if (!cultivation) {
      return res.status(400).json({ success: false, message: "Chưa bắt đầu tu tiên" });
    }

    // 1. Setup Player Stats
    let playerStats;
    if (customPlayerStats) {
      // Use custom stats if provided
      playerStats = {
        attack: 100,
        defense: 10,
        qiBlood: 1000,
        zhenYuan: 1000,
        speed: 100,
        critRate: 0,
        critDamage: 1.5,
        ...customPlayerStats
      };
    } else {
      // Use real stats
      const cultivationDoc = await Cultivation.findOne({ user: userId });
      playerStats = cultivationDoc.calculateCombatStats();
      const equipStats = await cultivationDoc.getEquipmentStats();
      mergeEquipmentStats(playerStats, equipStats);
    }

    // 2. Setup Skills
    const cultivationDoc = await Cultivation.findOne({ user: userId });
    const playerSkills = getLearnedSkills(cultivationDoc, playerStats.zhenYuan);

    // TRAINING MODE SPECIAL: Set mana cost to 0 (Infinite Mana)
    // Giúp user test thoải mái rotation mà không lo hết mana
    playerSkills.forEach(skill => skill.manaCost = 0);

    // 3. Setup Dummy Stats
    const dummyStats = {
      name: "Mộc Nhân Trang",
      attack: 0,
      defense: 0,
      qiBlood: 10000000, // 10M HP for long testing
      zhenYuan: 0,
      speed: 0, // Player always goes first
      critRate: 0,
      critDamage: 1.5,
      ...customDummyStats
    };

    const dummySkills = []; // Dummy has no skills

    // 4. Run Simulation
    const battleResult = simulateBattle(playerStats, dummyStats, playerSkills, dummySkills);

    // 5. Return detailed logs
    res.json({
      success: true,
      data: {
        playerStats: {
          hp: playerStats.qiBlood,
          atk: playerStats.attack,
          spd: playerStats.speed
        },
        dummyStats: {
          hp: dummyStats.qiBlood,
          def: dummyStats.defense
        },
        skillsEquipped: playerSkills.map(s => s.name),
        totalTurns: battleResult.totalTurns,
        totalDamage: battleResult.totalDamageByChallenger,
        logs: battleResult.logs
      }
    });

  } catch (error) {
    next(error);
  }
});

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

    // ==================== NGHỊCH THIÊN VALIDATION ====================
    const realmDiff = opponentCultivation.realmLevel - challengerCultivation.realmLevel;
    const { mode = 'normal' } = req.body; // mode: 'normal' | 'nghich_thien'

    // Chặn cứng: không cho đánh vượt 2 cảnh giới trở lên
    if (realmDiff >= 2) {
      return res.status(400).json({
        success: false,
        message: 'Chỉ có thể nghịch thiên chiến đấu với đối thủ cao hơn 1 cảnh giới!',
        requiresNghichThien: false
      });
    }

    // Lấy tier info của challenger
    const challengerTier = challengerCultivation.getTierInfo();
    const isNghichThien = realmDiff === 1 && mode === 'nghich_thien';

    // Nếu đối thủ cao hơn 1 cảnh giới nhưng không bật nghịch thiên mode
    if (realmDiff === 1 && mode !== 'nghich_thien') {
      return res.status(400).json({
        success: false,
        message: 'Đối thủ cao hơn 1 cảnh giới. Bật chế độ Nghịch Thiên để tiếp tục!',
        requiresNghichThien: true,
        canNghichThien: challengerTier.privileges.canNghichThien,
        tierName: challengerTier.name
      });
    }

    // Nếu bật nghịch thiên nhưng tier không đủ
    if (isNghichThien && !challengerTier.privileges.canNghichThien) {
      return res.status(400).json({
        success: false,
        message: `Cần đạt Đại Thành mới có thể nghịch thiên! Hiện tại: ${challengerTier.name}`,
        requiresNghichThien: true,
        canNghichThien: false
      });
    }

    // Tính combat stats (Base + Techniques)
    let challengerStats = challengerCultivation.calculateCombatStats();
    let opponentStats = opponentCultivation.calculateCombatStats();

    // Lấy và tích hợp stats từ trang bị
    const challengerEquipStats = await challengerCultivation.getEquipmentStats();
    const opponentEquipStats = await opponentCultivation.getEquipmentStats();

    mergeEquipmentStats(challengerStats, challengerEquipStats);
    mergeEquipmentStats(opponentStats, opponentEquipStats);

    // ==================== APPLY DEBUFFS ====================
    const activeDebuffs = challengerCultivation.getActiveDebuffs();
    if (activeDebuffs.length > 0) {
      challengerStats = applyDebuffEffects(challengerStats, activeDebuffs);
    }

    // ==================== NGHỊCH THIÊN BONUSES ====================
    if (isNghichThien) {
      // +Crit bonus với clamp max 100
      const critBonus = challengerTier.privileges.critBonusVsHigher || 0;
      challengerStats.criticalRate = Math.min(100, challengerStats.criticalRate + critBonus);

    }

    // Lấy realm info
    const challengerRealm = CULTIVATION_REALMS.find(r => r.level === challengerCultivation.realmLevel) || CULTIVATION_REALMS[0];
    const opponentRealm = CULTIVATION_REALMS.find(r => r.level === opponentCultivation.realmLevel) || CULTIVATION_REALMS[0];

    challengerStats.realmLevel = challengerCultivation.realmLevel;
    challengerStats.realmName = challengerRealm.name;
    opponentStats.realmLevel = opponentCultivation.realmLevel;
    opponentStats.realmName = opponentRealm.name;

    // Pass damage reduction để simulateBattle sử dụng
    const nghichThienMeta = isNghichThien ? {
      damageReduction: challengerTier.privileges.damageReductionVsHigher || 0
    } : null;

    // Lấy skills từ công pháp đã học (với max mana để tính mana cost chính xác)
    const challengerSkills = getLearnedSkills(challengerCultivation, challengerStats.zhenYuan);
    const opponentSkills = getLearnedSkills(opponentCultivation, opponentStats.zhenYuan);

    // Thực hiện trận đấu (truyền nghịch thiên meta để apply damage reduction)
    const battleResult = simulateBattle(challengerStats, opponentStats, challengerSkills, opponentSkills, { nghichThienMeta });

    // ==================== TÍNH PHẦN THƯỞNG ====================
    // Tier multiplier chỉ apply khi nghịch thiên thắng
    const tierMultiplier = (isNghichThien && battleResult.winner === 'challenger')
      ? (challengerTier.privileges.rewardMultiplier || 1.0)
      : 1.0;

    let rewards;
    if (battleResult.isDraw) {
      rewards = calculateRewards(challengerStats, opponentStats, true);
    } else if (battleResult.winner === 'challenger') {
      rewards = calculateRewards(challengerStats, opponentStats, false, tierMultiplier);
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

    // ==================== DEBUFF HANDLING ====================
    // Tiêu hao 1 lượt debuff sau mỗi trận
    challengerCultivation.consumeDebuffBattle();

    // Nếu thua nghịch thiên -> Áp dụng debuff "Trọng Thương"
    if (isNghichThien && battleResult.winner !== 'challenger') {
      const debuffConfig = challengerTier.privileges.debuffOnLose;
      if (debuffConfig) {
        challengerCultivation.applyDebuff(debuffConfig.type, debuffConfig.duration);
      }
    }

    // Log Thiên Hạ Ký Event (PK Overkill - Vượt cấp chiến thắng)
    if (!battleResult.isDraw) {
      const winnerStats = battleResult.winner === 'challenger' ? challengerStats : opponentStats;
      const loserStats = battleResult.winner === 'challenger' ? opponentStats : challengerStats;

      // Nếu winner realm level nhỏ hơn loser realm level -> Overkill
      if ((winnerStats.realmLevel || 0) < (loserStats.realmLevel || 0)) {
        const winnerId = battleResult.winner === 'challenger' ? challengerId : opponentId;
        const winnerName = battleResult.winner === 'challenger' ? challenger.name : opponent.name;
        const opponentName = battleResult.winner === 'challenger' ? opponent.name : challenger.name;

        logPKOverkillEvent(winnerId, winnerName, winnerStats.realmName, opponentName, loserStats.realmName)
          .catch(e => console.error('[WorldEvent] PK log error:', e));
      }
    }

    // Giảm độ bền trang bị sau chiến đấu
    try {
      await reduceEquipmentDurability(challengerCultivation);
      if (opponentCultivation && !String(opponentId).startsWith('bot_')) {
        await reduceEquipmentDurability(opponentCultivation);
      }
    } catch (durabilityError) {
      console.error('[BATTLE] Durability reduction error:', durabilityError.message);
    }

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
        $lte: Math.min(14, userRealmLevel + 2)
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
        $lte: Math.min(14, userRealmLevel + 2)
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

    // ==================== NGHỊCH THIÊN VALIDATION (BOT) ====================
    const realmDiff = bot.realmLevel - challengerCultivation.realmLevel;
    const { mode = 'normal' } = req.body;

    // Chặn cứng: không cho đánh vượt 2 cảnh giới trở lên
    if (realmDiff >= 2) {
      return res.status(400).json({
        success: false,
        message: 'Chỉ có thể nghịch thiên chiến đấu với đối thủ cao hơn 1 cảnh giới!',
        requiresNghichThien: false
      });
    }

    // Lấy tier info
    const challengerTier = challengerCultivation.getTierInfo();
    const isNghichThien = realmDiff === 1 && mode === 'nghich_thien';

    // Nếu bot cao hơn 1 cảnh giới nhưng không bật nghịch thiên mode
    if (realmDiff === 1 && mode !== 'nghich_thien') {
      return res.status(400).json({
        success: false,
        message: 'Đối thủ cao hơn 1 cảnh giới. Bật chế độ Nghịch Thiên để tiếp tục!',
        requiresNghichThien: true,
        canNghichThien: challengerTier.privileges.canNghichThien,
        tierName: challengerTier.name
      });
    }

    // Nếu bật nghịch thiên nhưng tier không đủ
    if (isNghichThien && !challengerTier.privileges.canNghichThien) {
      return res.status(400).json({
        success: false,
        message: `Cần đạt Đại Thành mới có thể nghịch thiên! Hiện tại: ${challengerTier.name}`,
        requiresNghichThien: true,
        canNghichThien: false
      });
    }

    // Tính combat stats của người chơi
    let challengerStats = challengerCultivation.calculateCombatStats();
    const challengerEquipStats = await challengerCultivation.getEquipmentStats();
    mergeEquipmentStats(challengerStats, challengerEquipStats);

    // Apply debuffs
    const activeDebuffs = challengerCultivation.getActiveDebuffs();
    if (activeDebuffs.length > 0) {
      challengerStats = applyDebuffEffects(challengerStats, activeDebuffs);
    }

    // Apply nghịch thiên crit bonus
    if (isNghichThien) {
      const critBonus = challengerTier.privileges.critBonusVsHigher || 0;
      challengerStats.criticalRate = Math.min(100, challengerStats.criticalRate + critBonus);
    }

    const challengerRealm = CULTIVATION_REALMS.find(r => r.level === challengerCultivation.realmLevel) || CULTIVATION_REALMS[0];
    challengerStats.realmLevel = challengerCultivation.realmLevel;
    challengerStats.realmName = challengerRealm.name;

    // Nghịch thiên meta cho damage reduction
    const nghichThienMeta = isNghichThien ? {
      damageReduction: challengerTier.privileges.damageReductionVsHigher || 0
    } : null;

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
      10: { attack: 6400, defense: 3200, qiBlood: 64000, zhenYuan: 32000, speed: 55, criticalRate: 28, criticalDamage: 240, accuracy: 99, dodge: 28, penetration: 25, resistance: 25, lifesteal: 18, regeneration: 8, luck: 28 },
      11: { attack: 12800, defense: 6400, qiBlood: 128000, zhenYuan: 64000, speed: 60, criticalRate: 30, criticalDamage: 250, accuracy: 99, dodge: 30, penetration: 28, resistance: 28, lifesteal: 20, regeneration: 9, luck: 30 },
      12: { attack: 25600, defense: 12800, qiBlood: 256000, zhenYuan: 128000, speed: 65, criticalRate: 32, criticalDamage: 270, accuracy: 100, dodge: 32, penetration: 30, resistance: 30, lifesteal: 10, regeneration: 2, luck: 32 },
      13: { attack: 51200, defense: 25600, qiBlood: 512000, zhenYuan: 256000, speed: 70, criticalRate: 35, criticalDamage: 290, accuracy: 100, dodge: 35, penetration: 32, resistance: 32, lifesteal: 12, regeneration: 2, luck: 35 },
      14: { attack: 102400, defense: 51200, qiBlood: 1024000, zhenYuan: 512000, speed: 80, criticalRate: 40, criticalDamage: 350, accuracy: 100, dodge: 40, penetration: 35, resistance: 35, lifesteal: 15, regeneration: 2, luck: 40 }
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
            damageMultiplier: 1.2,
            level: 1 // Bots có skill level 1 để tránh quá mạnh
          });
        }
      }
    }

    // Lấy skills của người chơi
    const challengerSkills = getLearnedSkills(challengerCultivation, challengerStats.zhenYuan);

    // Thực hiện trận đấu (với nghịch thiên meta)
    console.log('[BATTLE-DEBUG] Challenger Stats:', JSON.stringify({
      attack: challengerStats.attack,
      defense: challengerStats.defense,
      qiBlood: challengerStats.qiBlood,
      criticalRate: challengerStats.criticalRate,
      lifesteal: challengerStats.lifesteal,
      regeneration: challengerStats.regeneration
    }));
    console.log('[BATTLE-DEBUG] Bot Stats:', JSON.stringify({
      attack: opponentStats.attack,
      defense: opponentStats.defense,
      qiBlood: opponentStats.qiBlood,
      criticalRate: opponentStats.criticalRate,
      lifesteal: opponentStats.lifesteal,
      regeneration: opponentStats.regeneration
    }));
    console.log('[BATTLE-DEBUG] Challenger Skills:', challengerSkills.map(s => s.name));
    console.log('[BATTLE-DEBUG] Bot Skills:', botSkills.map(s => s.name));
    const battleResult = simulateBattle(challengerStats, opponentStats, challengerSkills, botSkills, { nghichThienMeta });
    console.log('[BATTLE-DEBUG] RESULT:', JSON.stringify({
      winner: battleResult.winner,
      isDraw: battleResult.isDraw,
      totalTurns: battleResult.totalTurns,
      finalChallengerHp: battleResult.finalChallengerHp,
      finalOpponentHp: battleResult.finalOpponentHp,
      totalDmgByChallenger: battleResult.totalDamageByChallenger,
      totalDmgByOpponent: battleResult.totalDamageByOpponent
    }));

    // Tier reward multiplier cho nghịch thiên thắng
    const tierMultiplier = (isNghichThien && battleResult.winner === 'challenger')
      ? (challengerTier.privileges.rewardMultiplier || 1.0)
      : 1.0;

    // Tính phần thưởng (với rewardMultiplier + tierMultiplier)
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
        winnerExp: Math.floor(baseExp * bonusMultiplier * bot.rewardMultiplier * tierMultiplier),
        winnerSpiritStones: Math.floor(baseStones * bonusMultiplier * bot.rewardMultiplier * tierMultiplier),
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

    // Giảm độ bền trang bị sau chiến đấu (vs Bot)
    try {
      await reduceEquipmentDurability(challengerCultivation);
    } catch (durabilityError) {
      console.error('[BATTLE-BOT] Durability reduction error:', durabilityError.message);
    }

    // ==================== DEBUFF HANDLING (BOT) ====================
    // Tiêu hao 1 lượt debuff sau mỗi trận
    challengerCultivation.consumeDebuffBattle();

    // Nếu thua nghịch thiên -> Áp dụng debuff "Trọng Thương"
    if (isNghichThien && battleResult.winner !== 'challenger') {
      const debuffConfig = challengerTier.privileges.debuffOnLose;
      if (debuffConfig) {
        challengerCultivation.applyDebuff(debuffConfig.type, debuffConfig.duration);
      }
    }
    await challengerCultivation.save();

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
