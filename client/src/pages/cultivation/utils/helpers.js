/**
 * Helper functions for Cultivation System
 */

/**
 * Lấy thông số chiến đấu từ cultivation data (từ API)
 * Backend đã merge equipment stats vào combatStats rồi, nên chỉ cần trả về trực tiếp
 * Fallback về merge thủ công nếu backend chưa merge (cho tương thích ngược)
 */
export function getCombatStats(cultivation) {
  // Backend đã merge equipment stats vào combatStats rồi
  // Nên chỉ cần trả về combatStats trực tiếp
  if (cultivation?.combatStats) {
    return cultivation.combatStats;
  }
  
  // Fallback: giá trị mặc định nếu không có combatStats
  return {
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

