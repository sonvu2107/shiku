/**
 * Combat Skill Service
 * Xử lý logic thực thi kỹ năng chiến đấu (skills) trong combat
 */

/**
 * Apply skill effect trong battle
 * @param {Object} skill - Skill object từ technique
 * @param {Object} attacker - Fighter đang dùng skill
 * @param {Object} defender - Fighter nhận skill
 * @param {Object} battleState - Trạng thái battle hiện tại
 * @returns {Object} Result với damage, healing, buffs, debuffs
 */
export function executeSkill(skill, attacker, defender, battleState = {}) {
    const result = {
        damage: 0,
        healing: 0,
        manaRestore: 0,
        buffs: [],      // Buffs cho attacker
        debuffs: [],    // Debuffs cho defender
        effects: []     // Special effects text
    };

    // Base damage calculation nếu skill gây damage
    const baseDamage = attacker.attack || 0;
    const skillMultiplier = skill.damageMultiplier || 1;

    // Skill-specific logic based on skill name
    switch (skill.name) {
        // ==================== OFFENSIVE SKILLS ====================
        case 'Tụ Khí':
            // Tăng 10% Khí Huyết trong 5 giây
            result.buffs.push({
                type: 'qiBlood',
                value: 0.10,
                duration: 5,
                name: 'Tụ Khí'
            });
            result.effects.push('Tăng 10% Khí Huyết (5s)');
            break;

        case 'Kiếm Khí':
            // Gây sát thương bằng 150% Tấn Công
            result.damage = baseDamage * 1.5 * skillMultiplier;
            result.effects.push('Kiếm khí xuyên phá!');
            break;

        case 'Thiết Bốc':
            // Giảm 30% sát thương nhận trong 5 giây
            result.buffs.push({
                type: 'damageReduction',
                value: 0.30,
                duration: 5,
                name: 'Thiết Bốc'
            });
            result.effects.push('Phòng thủ tăng cường!');
            break;

        case 'Lôi Điện':
            // Tăng 50% Tốc Độ trong 8 giây
            result.buffs.push({
                type: 'speed',
                value: 0.50,
                duration: 8,
                name: 'Lôi Điện'
            });
            result.effects.push('Tấn công tức thời!');;
            break;

        case 'Long Tức':
            // Hồi 20% Chân Nguyên
            const maxMana = attacker.maxZhenYuan || attacker.zhenYuan || 1000;
            result.manaRestore = Math.floor(maxMana * 0.20);
            result.effects.push(`Hồi ${result.manaRestore} Chân Nguyên`);
            break;

        case 'Tái Sinh':
            // Hồi 20% Khí Huyết và Chân Nguyên (nerfed from 50%)
            const maxHp = attacker.maxQiBlood || attacker.qiBlood || 1000;
            const maxMp = attacker.maxZhenYuan || attacker.zhenYuan || 1000;
            result.healing = Math.floor(maxHp * 0.20);
            result.manaRestore = Math.floor(maxMp * 0.20);
            result.effects.push('Phượng Hoàng tái sinh!');
            break;

        case 'Hư Không':
            // Miễn dịch sát thương trong 2 giây
            result.buffs.push({
                type: 'invulnerable',
                value: 1.0,
                duration: 2,
                name: 'Hư Không'
            });
            result.effects.push('Bất khả xâm phạm!');
            break;

        case 'Hấp Huyết':
            // Gây sát thương và hồi 30% sát thương gây ra
            const damageDealt = baseDamage * 1.2 * skillMultiplier;
            result.damage = damageDealt;
            result.healing = Math.floor(damageDealt * 0.30);
            result.effects.push('Hấp thu sinh lực!');
            break;

        case 'Băng Phong':
            // Gây sát thương băng bằng 180% Tấn Công
            result.damage = baseDamage * 1.8 * skillMultiplier;
            result.effects.push('Băng phong xâm lấn!');
            break;

        case 'Viêm Hoàng Nộ':
            // Gây sát thương lửa bằng 220% Tấn Công
            result.damage = baseDamage * 2.2 * skillMultiplier;
            result.effects.push('Viêm hoàng nộ hỏa!');
            break;

        case 'Bóng Ma':
            // Tăng 100% Chí Mạng cho đòn tiếp theo
            result.buffs.push({
                type: 'criticalRate',
                value: 1.0,
                duration: 1,
                name: 'Bóng Ma',
                oneTime: true // Chỉ áp dụng cho 1 đòn
            });
            result.effects.push('Chí mạng đảm bảo!');
            break;

        case 'Cuồng Phong Trảm':
            // Gây 2 đòn liên tiếp, mỗi đòn 100% Tấn Công
            result.damage = baseDamage * 1.0 * skillMultiplier * 2;
            result.effects.push('Cuồng phong liên trảm!');
            break;

        case 'Đại Địa Hộ':
            // Giảm 50% sát thương nhận trong 3 giây
            result.buffs.push({
                type: 'damageReduction',
                value: 0.50,
                duration: 3,
                name: 'Đại Địa Hộ'
            });
            result.effects.push('Đại địa bảo hộ!');
            break;

        case 'Thiên Lôi':
            // Gây sát thương sấm bằng 280% Tấn Công
            result.damage = baseDamage * 2.8 * skillMultiplier;
            result.effects.push('Thiên lôi giáng thế!');
            break;

        case 'Tuyền Nguyên':
            // Hồi 30% Khí Huyết tối đa
            const maxHealth = attacker.maxQiBlood || attacker.qiBlood || 1000;
            result.healing = Math.floor(maxHealth * 0.30);
            result.effects.push(`Hồi ${result.healing} Khí Huyết`);
            break;

        case 'Phá Giáp':
            // Bỏ qua 50% Phòng Thủ của đối thủ trong 5 giây
            result.debuffs.push({
                type: 'defenseReduction',
                value: 0.50,
                duration: 5,
                name: 'Phá Giáp'
            });
            result.effects.push('Phá vỡ phòng ngự!');
            break;

        case 'Phản Đòn':
            // Phản 40% sát thương nhận về đối thủ
            result.buffs.push({
                type: 'reflectDamage',
                value: 0.40,
                duration: 5,
                name: 'Phản Đòn'
            });
            result.effects.push('Phản kích sẵn sàng!');
            break;

        case 'Hỗn Độn Nhất Kích':
            // Gây sát thương bằng 350% Tấn Công, bỏ qua kháng cự
            result.damage = baseDamage * 3.5 * skillMultiplier;
            result.buffs.push({
                type: 'ignoreDef',
                value: 1.0,
                duration: 1,
                name: 'Hỗn Độn',
                oneTime: true
            });
            result.effects.push('Hỗn độn phá diệt!');
            break;

        // ==================== MYTHIC TIER SKILLS ====================
        case 'Quy Tông': // Vạn Pháp Qui Tông
            result.damage = baseDamage * 5.0 * skillMultiplier;
            result.healing = Math.floor(result.damage * 0.5);
            result.effects.push('Vạn pháp quy nhất!');
            break;

        case 'Ma Hoá': // Bất Diệt Ma Công  
            result.buffs.push({
                type: 'invulnerable',
                value: 1.0,
                duration: 4,
                name: 'Ma Hoá'
            });
            result.buffs.push({
                type: 'regeneration',
                value: 0.05, // 5% HP/sec
                duration: 4,
                name: 'Ma Hoá Regen'
            });
            result.effects.push('Bất diệt ma thân!');
            break;

        case 'Độc Sát': // Thiên Địch Độc Tôn
            result.damage = baseDamage * 4.0 * skillMultiplier;
            result.debuffs.push({
                type: 'poison',
                value: 0.10, // 10% max HP over duration
                duration: 10,
                damagePerTick: 0.01, // 1% per second
                name: 'Độc Tố'
            });
            result.effects.push('Độc tố xâm nhập!');
            break;

        // ==================== LEGENDARY TIER SKILLS ====================
        case 'Âm Dương Hóa': // Thái Cực Huyền Công
            result.damage = baseDamage * 2.5 * skillMultiplier;
            result.healing = Math.floor(result.damage * 0.3);
            result.effects.push('Âm dương hòa hợp!');
            break;

        case 'Bạt Đao': // Bạt Đao Thuật
            result.damage = baseDamage * 1.2 * skillMultiplier * 3; // 3 slashes
            result.effects.push('Ba đao liên chém!');
            break;

        case 'Kim Cang': // Kim Cang Bất Hoại  
            const shieldAmount = Math.floor((attacker.maxQiBlood || attacker.qiBlood) * 0.4);
            result.buffs.push({
                type: 'shield',
                value: shieldAmount,
                duration: 8,
                name: 'Kim Cang'
            });
            result.effects.push(`Lá chắn ${shieldAmount} HP!`);
            break;

        case 'Bạo Tẩu': // Thiên Ma Giải Thể
            result.buffs.push({
                type: 'attack',
                value: 1.0, // +100% ATK
                duration: 10,
                name: 'Bạo Tẩu ATK'
            });
            result.debuffs.push({
                type: 'defenseReduction',
                value: 0.5, // -50% DEF
                duration: 10,
                name: 'Bạo Tẩu DEF',
                target: 'self' // Apply to self
            });
            result.effects.push('Bạo tẩu hóa ma!');
            break;

        case 'Hồi Linh': // Vô Song Trị Liệu
            const maxHeal = Math.floor((attacker.maxQiBlood || attacker.qiBlood) * 0.5);
            result.healing = maxHeal;
            result.effects.push(`Hồi ${maxHeal} HP (AOE)`);
            break;

        // ==================== EPIC TIER SKILLS ====================
        case 'Mị Ảnh': // Quỷ Mị Bộ Pháp
            result.buffs.push({
                type: 'invulnerable',
                value: 1.0,
                duration: 2,
                name: 'Mị Ảnh'
            });
            result.effects.push('Né tránh hoàn toàn!');
            break;

        case 'Thủ Phá': // Hỗn Thiên Thủ  
            result.damage = baseDamage * 1.5 * skillMultiplier;
            result.buffs.push({
                type: 'ignoreDef',
                value: 1.0,
                duration: 1,
                name: 'Thủ Phá',
                oneTime: true
            });
            result.effects.push('Phá vỡ mọi giáp!');
            break;

        case 'Nhiên Huyết': // Nhiên Huyết Quyết
            const hpCost = Math.floor((attacker.qiBlood || 1000) * 0.2);
            result.buffs.push({
                type: 'attack',
                value: 0.6, // +60% ATK
                duration: 15,
                name: 'Nhiên Huyết',
                hpCost: hpCost // Deduct HP
            });
            result.effects.push(`Đốt ${hpCost} HP → +60% ATK!`);
            break;

        case 'Băng Vực': // Băng Phong Lĩnh Vực
            result.debuffs.push({
                type: 'slow',
                value: 0.5, // -50% Speed
                duration: 8,
                name: 'Băng Vực'
            });
            result.debuffs.push({
                type: 'attackReduction',
                value: 0.3, // -30% ATK
                duration: 8,
                name: 'Băng Vực ATK'
            });
            result.effects.push('Lĩnh vực băng giá!');
            break;

        // ==================== RARE TIER SKILLS ====================
        case 'Kiếm Trận': // Kiếm Vũ
            result.damage = baseDamage * 0.8 * skillMultiplier * 4; // 4 strikes
            result.effects.push('Tứ liên kiếm!');
            break;

        case 'Chung Hộ': // Hộ Tâm Chung
            result.buffs.push({
                type: 'fatalProtection',
                value: 0.3, // Revive to 30% HP
                duration: 60, // Lasts until triggered
                name: 'Chung Hộ',
                oneTime: true
            });
            result.effects.push('Hộ mệnh kích hoạt!');
            break;

        case 'Không Chưởng': // Phá Không Chưởng
            result.damage = baseDamage * 2.0 * skillMultiplier;
            result.debuffs.push({
                type: 'stun',
                value: 1.0,
                duration: 2,
                name: 'Choáng'
            });
            result.effects.push('Choáng 2 giây!');
            break;

        default:
            // Default: gây damage based on skill description
            // Parse damage từ description nếu có
            const descMatch = skill.description?.match(/(\d+)%\s*Tấn Công/);
            if (descMatch) {
                const percent = parseInt(descMatch[1]) / 100;
                result.damage = baseDamage * percent * skillMultiplier;
                result.effects.push(`${skill.name}!`);
            }
            break;
    }

    // Apply level-based scaling
    if (skill.level && skill.level > 1) {
        result.damage *= (1 + (skill.level - 1) * 0.1);
        result.healing *= (1 + (skill.level - 1) * 0.1);
    }

    return result;
}

/**
 * Check nếu skill có thể dùng (cooldown, mana)
 */
export function canUseSkill(skill, fighter, battleState = {}) {
    // Check mana
    const currentMana = fighter.currentZhenYuan || fighter.zhenYuan || 0;
    if (currentMana < (skill.manaCost || 0)) {
        return { canUse: false, reason: 'Không đủ Chân Nguyên' };
    }

    // Check cooldown (if tracking in battleState)
    const skillCooldowns = battleState.skillCooldowns || {};
    const skillKey = `${fighter.id}_${skill.name}`;
    if (skillCooldowns[skillKey] && skillCooldowns[skillKey] > 0) {
        return { canUse: false, reason: 'Kỹ năng đang hồi chiêu' };
    }

    return { canUse: true };
}

/**
 * Apply buffs/debuffs vào fighter stats
 */
export function applyStatusEffects(fighter, effects) {
    const modifiedStats = { ...fighter };

    effects.forEach(effect => {
        switch (effect.type) {
            case 'qiBlood':
                modifiedStats.maxQiBlood = (modifiedStats.maxQiBlood || modifiedStats.qiBlood) * (1 + effect.value);
                break;
            case 'speed':
                modifiedStats.speed = (modifiedStats.speed || 100) * (1 + effect.value);
                break;
            case 'criticalRate':
                // FIXED: criticalRate is now 0-100% scale (not 0-1)
                // Skill values like 1.0 mean +100% crit rate
                const critAdd = effect.value >= 1 ? effect.value : effect.value * 100;
                modifiedStats.criticalRate = Math.min(100, (modifiedStats.criticalRate || 0) + critAdd);
                break;
            case 'damageReduction':
                modifiedStats.damageReduction = (modifiedStats.damageReduction || 0) + effect.value;
                break;
            case 'defenseReduction':
                modifiedStats.defense = (modifiedStats.defense || 0) * (1 - effect.value);
                break;
            case 'invulnerable':
                modifiedStats.invulnerable = true;
                break;
            case 'reflectDamage':
                modifiedStats.reflectDamage = effect.value;
                break;
            case 'ignoreDef':
                modifiedStats.ignoreDef = true;
                break;
            case 'shield':
                // NOTE: Shield pool is now managed by battleEngine (event-based)
                // Do NOT modify stats.shield here to prevent double-count
                break;
            case 'stun':
                modifiedStats.stunned = true;
                break;
            // === NEW EFFECT TYPES ===
            case 'attack': {
                // Normalize: value < 1 treated as fraction (0.6 = 60%), else percent
                const addPct = effect.value < 1 ? effect.value * 100 : effect.value;
                modifiedStats.attack = (modifiedStats.attack || 0) * (1 + addPct / 100);
                break;
            }
            case 'regeneration': {
                // Regeneration is 0-100% scale in engine
                const regenAdd = effect.value < 1 ? effect.value * 100 : effect.value;
                modifiedStats.regeneration = (modifiedStats.regeneration || 0) + regenAdd;
                break;
            }
            case 'slow': {
                // Normalize: value < 1 treated as fraction
                const subPct = Math.min(Math.max(effect.value < 1 ? effect.value * 100 : effect.value, 0), 95);
                modifiedStats.speed = (modifiedStats.speed || 100) * (1 - subPct / 100);
                break;
            }
            case 'attackReduction': {
                // Normalize: value < 1 treated as fraction
                const subPct = Math.min(Math.max(effect.value < 1 ? effect.value * 100 : effect.value, 0), 95);
                modifiedStats.attack = (modifiedStats.attack || 0) * (1 - subPct / 100);
                break;
            }
            case 'fatalProtection':
                // Revive when HP reaches 0 (value = HP% to revive to)
                modifiedStats.fatalProtection = effect.value;
                modifiedStats.fatalProtectionOneTime = !!effect.oneTime;
                break;
            case 'poison':
                // Poison is handled by battleEngine DOT logic, keep for duration tracking
                break;
        }
    });

    return modifiedStats;
}

export default {
    executeSkill,
    canUseSkill,
    applyStatusEffects
};
