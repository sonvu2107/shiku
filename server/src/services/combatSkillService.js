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

        case 'Băng Phong':
            result.healing = 0;
            result.damage = baseDamage * 1.3 * skillMultiplier;
            result.debuffs.push({
                type: 'speed', // Slow
                value: 0.3,
                duration: 2, // 2 turns (was 3s)
                name: 'Băng Phong'
            });
            result.effects.push('Làm chậm 2 lượt!');
            break;

        case 'Liệt Hỏa':
            result.healing = 0;
            result.damage = baseDamage * 1.5 * skillMultiplier;
            result.debuffs.push({
                type: 'defenseReduction',
                value: 0.2,
                duration: 2, // 2 turns (was 3s)
                name: 'Liệt Hỏa'
            });
            result.effects.push('Giảm giáp 2 lượt!');
            break;

        case 'Thổ Giáp':
            result.healing = 0;
            result.damage = baseDamage * 0.8 * skillMultiplier; // Defensive skill
            result.buffs.push({
                type: 'defense',
                value: 0.3,
                duration: 3, // 3 turns (was 5s)
                name: 'Thổ Giáp'
            });
            result.effects.push('Tăng thủ 3 lượt!');
            break;

        case 'Hồi Xuân':
            result.damage = 0;
            result.healing = attacker.maxQiBlood * 0.15 * skillMultiplier; // Heal 15%
            result.buffs.push({
                type: 'regeneration',
                value: 0.05, // +5% regen
                duration: 3, // 3 turns (was 5s)
                name: 'Hồi Xuân'
            });
            result.effects.push('Hồi phục 3 lượt!');
            break;

        case 'Lôi Điện':
            result.healing = 0;
            result.damage = baseDamage * 1.4 * skillMultiplier;
            // Chance to stun
            if (Math.random() < 0.3) {
                result.debuffs.push({
                    type: 'stun',
                    value: 1,
                    duration: 1, // 1 turn (was 2s)
                    name: 'Lôi Điện'
                });
                result.effects.push('Choáng 1 lượt!');
            }
            break;

        case 'Cuồng Nộ':
            result.healing = 0;
            result.damage = baseDamage * 1.6 * skillMultiplier;
            result.buffs.push({
                type: 'criticalRate',
                value: 0.2, // +20% crit
                duration: 2, // 2 turns (was 3s)
                name: 'Cuồng Nộ'
            });
            result.effects.push('Tăng bạo kích 2 lượt!');
            break;

        case 'Kim Cang':
            result.damage = baseDamage * 1.0 * skillMultiplier;
            result.buffs.push({
                type: 'damageReduction',
                value: 0.15,
                duration: 2, // 2 turns (was 4s)
                name: 'Kim Cang'
            });
            result.effects.push('Giảm sát thương 2 lượt!');
            break;

        // --- ADVANCED SKILLS ---
        case 'Vạn Kiếm Quy Tông':
            result.damage = baseDamage * 2.5 * skillMultiplier; // High AoE/Single target dmg
            break;

        case 'Thiên Địa Đồng Thọ':
            result.damage = baseDamage * 3.0 * skillMultiplier;
            // Risk: self damage
            result.hpCost = Math.floor(attacker.maxQiBlood * 0.1); // 10% HP cost
            break;

        case 'Bát Quái Chưởng':
            result.damage = baseDamage * 1.8 * skillMultiplier;
            result.debuffs.push({
                type: 'attackReduction',
                value: 0.2,
                duration: 2, // 2 turns
                name: 'Bát Quái'
            });
            result.effects.push('Giảm công 2 lượt!');
            break;

        case 'Lăng Ba Vi Bộ':
            result.damage = baseDamage * 1.2 * skillMultiplier;
            result.buffs.push({
                type: 'dodge', // Assuming dodge buff exists or handled as stat
                value: 0.2, // +20% dodge
                duration: 2, // 2 turns
                name: 'Lăng Ba'
            });
            result.effects.push('Tăng né tránh 2 lượt!');
            break;

        case 'Hư Không':
            result.damage = baseDamage * 2.2 * skillMultiplier;
            result.buffs.push({
                type: 'invulnerable',
                value: 1,
                duration: 1, // 1 turn (was 2s - usually 1 turn invuln is strong)
                name: 'Hư Không'
            });
            result.effects.push('Bất tử 1 lượt!');
            break;

        case 'Tái Sinh':
            // Revive passive usually, but if active:
            result.healing = attacker.maxQiBlood * 0.4 * skillMultiplier;
            result.effects.push('Đại hồi phục!');
            break;

        case 'Định Thân':
            result.damage = baseDamage * 0.5 * skillMultiplier;
            result.debuffs.push({
                type: 'stun',
                value: 1,
                duration: 2, // 2 turns (was 3s)
                name: 'Định Thân'
            });
            result.effects.push('Choáng 2 lượt!');
            break;

        case 'Phá Giáp':
            // Bỏ qua 50% Phòng Thủ của đối thủ trong 2 lượt
            result.debuffs.push({
                type: 'defenseReduction',
                value: 0.50,
                duration: 2, // Was 5s
                name: 'Phá Giáp'
            });
            result.effects.push('Phá vỡ phòng ngự!');
            break;

        case 'Phản Đòn':
            // Phản 40% sát thương nhận về đối thủ trong 2 lượt
            result.buffs.push({
                type: 'reflectDamage',
                value: 0.40,
                duration: 2, // Was 5s
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
                duration: 2, // Was 4s
                name: 'Ma Hoá'
            });
            result.buffs.push({
                type: 'regeneration',
                value: 0.05, // 5% HP/turn
                duration: 2, // Was 4s
                name: 'Ma Hoá Regen'
            });
            result.effects.push('Bất diệt ma thân!');
            break;

        case 'Độc Sát': // Thiên Địch Độc Tôn
            result.damage = baseDamage * 4.0 * skillMultiplier;
            result.debuffs.push({
                type: 'poison',
                value: 0.10, // 10% max HP over duration
                duration: 3, // Was 10s
                damagePerTick: 0.01, // 1% per turn
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
                duration: 3, // Was 8s
                name: 'Kim Cang'
            });
            result.effects.push(`Lá chắn ${shieldAmount} HP!`);
            break;

        case 'Bạo Tẩu': // Thiên Ma Giải Thể
            result.buffs.push({
                type: 'attack',
                value: 1.0, // +100% ATK
                duration: 3, // Was 10s
                name: 'Bạo Tẩu ATK'
            });
            result.debuffs.push({
                type: 'defenseReduction',
                value: 0.5, // -50% DEF
                duration: 3, // Was 10s
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
                duration: 1, // Was 2s
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
            // Check if skill has data-driven effects
            if (skill.effects && Array.isArray(skill.effects)) {

                // Base damage logic
                if (skill.damage) {
                    let mult = skill.damage.multiplier || 1;
                    // Handle conditional bonus (e.g. Execute)
                    if (skill.condition?.targetHpBelowPct) {
                        const targetHpPct = (defender.qiBlood / (defender.maxQiBlood || 1));
                        if (targetHpPct < skill.condition.targetHpBelowPct) {
                            mult = mult * (skill.condition.bonusMultiplier || 1);
                        }
                    }
                    result.damage = baseDamage * mult * skillMultiplier;
                } else if (skill.type === 'attack') {
                    // Default attack if type is attack but no explicit damage config
                    result.damage = baseDamage * skillMultiplier;
                }

                // Self cost
                if (skill.selfCost?.hpPctMaxHp) {
                    const cost = Math.floor((attacker.maxQiBlood || 1000) * skill.selfCost.hpPctMaxHp);
                    // Add as a 'cost' buff/effect? Or just subtract immediately?
                    // Implemented as negative healing (trick) or add a special result field
                    result.hpCost = cost;
                }

                // Passive revive check (one-time)
                if (skill.passive?.kind === 'fatalProtection') {
                    result.buffs.push({
                        type: 'fatalProtection',
                        value: skill.passive.revivePctMaxHp || 0.3,
                        duration: 999,
                        name: skill.name,
                        oneTime: true
                    });
                    result.effects.push(`${skill.name} (Nội tại)`);
                }

                // Heal
                if (skill.heal) {
                    const maxHp = attacker.maxQiBlood || attacker.qiBlood || 1000;
                    if (skill.heal.pctMaxHp) {
                        result.healing += Math.floor(maxHp * skill.heal.pctMaxHp);
                        result.effects.push(`Hồi phục`);
                    }
                }

                // Parse effects list
                skill.effects.forEach(eff => {
                    // Chance check
                    if (eff.chance && Math.random() > eff.chance) return;

                    const duration = eff.duration || 1;
                    const label = eff.label || skill.name;

                    switch (eff.kind) {
                        case 'lifesteal':
                            // Immediate lifesteal for this hit
                            result.lifestealPct = eff.valuePct || eff.value;

                            // If duration > 0, also add as buff (if supported by applyStatusEffects)
                            if (duration > 0) {
                                result.buffs.push({
                                    type: eff.kind,
                                    value: eff.valuePct || eff.value,
                                    duration: duration,
                                    name: label
                                });
                            }
                            result.effects.push(label);
                            break;

                        case 'attack':
                        case 'defense':
                        case 'speed':
                        case 'criticalRate':
                        // case 'lifesteal': // Handled above
                        case 'reflectDamage':
                        case 'damageReduction':
                            result.buffs.push({
                                type: eff.kind,
                                value: eff.valuePct || eff.value,
                                duration: duration,
                                name: label
                            });
                            result.effects.push(label);
                            break;

                        case 'shield':
                            const sVal = Math.floor((attacker.maxQiBlood || 1000) * (eff.valuePctMaxHp || 0.1));
                            result.buffs.push({
                                type: 'shield',
                                value: sVal,
                                duration: duration,
                                name: label
                            });
                            result.effects.push(`Giáp`);
                            break;

                        case 'invulnerable':
                            result.buffs.push({
                                type: 'invulnerable',
                                value: 1,
                                duration: duration,
                                name: label
                            });
                            result.effects.push('Bất Tử');
                            break;

                        case 'poison':
                            result.debuffs.push({
                                type: 'poison',
                                value: 0, // Not used usually
                                damagePerTick: eff.dotPctMaxHp || 0.02,
                                duration: duration,
                                name: label
                            });
                            result.effects.push(label || 'Trúng Độc');
                            break;

                        case 'stun':
                            result.debuffs.push({
                                type: 'stun',
                                value: 1,
                                duration: duration,
                                name: label
                            });
                            result.effects.push('Choáng');
                            break;

                        case 'slow':
                            result.debuffs.push({
                                type: 'slow',
                                value: eff.slowPct || 0.3,
                                duration: duration,
                                name: label
                            });
                            result.effects.push('Làm Chậm');
                            break;

                        case 'defenseReduction':
                            result.debuffs.push({
                                type: 'defenseReduction',
                                value: eff.valuePct || 0.3,
                                duration: duration,
                                name: label
                            });
                            result.effects.push(label || 'Phá Giáp');
                            break;

                        case 'silence':
                            result.debuffs.push({
                                type: 'silence',
                                value: 1,
                                duration: duration,
                                name: label
                            });
                            result.effects.push(label || 'Câm Lặng');
                            break;

                        case 'dispel':
                            result.dispel = true;
                            result.effects.push('Xóa Buff');
                            break;
                    }
                });

            } else {
                // Default: gây damage based on skill description
                // Parse damage từ description nếu có
                const descMatch = skill.description?.match(/(\d+)%\s*Tấn Công/);
                if (descMatch) {
                    const percent = parseInt(descMatch[1]) / 100;
                    result.damage = baseDamage * percent * skillMultiplier;
                    result.effects.push(`${skill.name}!`);
                }
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
    // Check silence
    if (fighter.silenced) {
        return { canUse: false, reason: 'Bị phong ấn' };
    }

    // Check condition (e.g. hpBelowPct for Enrage)
    if (skill.condition?.hpBelowPct) {
        const hpPct = (fighter.qiBlood / (fighter.maxQiBlood || 1));
        if (hpPct >= skill.condition.hpBelowPct) {
            return { canUse: false, reason: 'Chưa đủ điều kiện' };
        }
    }

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
            case 'defense': {
                const addPct = effect.value < 1 ? effect.value * 100 : effect.value;
                modifiedStats.defense = (modifiedStats.defense || 0) * (1 + addPct / 100);
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
            case 'silence':
                modifiedStats.silenced = true;
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
