/**
 * Helper functions for Cultivation System
 */

/**
 * Lấy thông số chiến đấu từ cultivation data (từ API)
 * Tích hợp equipment stats vào combat stats
 * Ưu tiên dùng từ BE, fallback về giá trị mặc định nếu chưa có
 */
export function getCombatStats(cultivation) {
  // Base combat stats từ cultivation
  let baseStats = {};
  
  if (cultivation?.combatStats) {
    baseStats = cultivation.combatStats;
  } else {
    // Fallback: giá trị mặc định
    baseStats = {
      attack: 0,
      defense: 0,
      qiBlood: 0,
      zhenYuan: 0,
      speed: 0,
      criticalRate: 0,
      criticalDamage: 150,
      accuracy: 80,
      dodge: 0,
      penetration: 0,
      resistance: 0,
      lifesteal: 0,
      regeneration: 1,
      luck: 5
    };
  }
  
  // Tích hợp equipment stats nếu có
  if (cultivation?.equipmentStats) {
    const equipStats = cultivation.equipmentStats;
    
    return {
      ...baseStats,
      // Cộng equipment stats vào base stats
      attack: (baseStats.attack || 0) + (equipStats.attack || 0),
      defense: (baseStats.defense || 0) + (equipStats.defense || 0),
      qiBlood: (baseStats.qiBlood || 0) + (equipStats.hp || 0), // HP từ equipment
      speed: (baseStats.speed || 0) + (equipStats.speed || 0),
      criticalRate: (baseStats.criticalRate || 0) + ((equipStats.crit_rate || 0) * 100), // Convert to percentage
      criticalDamage: (baseStats.criticalDamage || 150) + ((equipStats.crit_damage || 0) * 100), // Convert to percentage
      accuracy: (baseStats.accuracy || 80) + ((equipStats.hit_rate || 0) * 100), // Convert to percentage
      dodge: (baseStats.dodge || 0) + ((equipStats.evasion || 0) * 100), // Convert to percentage
      penetration: (baseStats.penetration || 0) + (equipStats.penetration || 0),
      lifesteal: (baseStats.lifesteal || 0) + ((equipStats.lifesteal || 0) * 100), // Convert to percentage
      // Equipment special stats
      regeneration: (baseStats.regeneration || 1) + (equipStats.energy_regen || 0),
      // Keep other stats unchanged
      zhenYuan: baseStats.zhenYuan || 0,
      resistance: baseStats.resistance || 0,
      luck: baseStats.luck || 5
    };
  }
  
  return baseStats;
}

