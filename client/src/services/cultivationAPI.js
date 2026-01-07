/**
 * Cultivation API Service - Hệ Thống Tu Tiên
 * API calls cho frontend
 */

import { api } from '../api.js';

// ==================== CULTIVATION DATA ====================

/**
 * Lấy thông tin tu tiên của user hiện tại
 */
export async function getCultivation() {
  return api('/api/cultivation');
}

/**
 * Lấy summary nhẹ (cho homepage, dashboard)
 */
export async function getCultivationSummary() {
  return api('/api/cultivation/summary');
}

/**
 * Lấy combat stats nhẹ (optimized)
 */
export async function getCombatStatsLean() {
  return api('/api/cultivation/combat-stats-lean');
}

/**
 * Lấy inventory có phân trang
 * @param {number} page - Trang (default 1)
 * @param {number} limit - Số item/trang (default 50, max 100)
 * @param {string} type - Filter theo type (optional)
 */
export async function getInventoryPaginated(page = 1, limit = 50, type = null) {
  const params = new URLSearchParams({ page, limit });
  if (type) params.append('type', type);
  return api(`/api/cultivation/inventory-paginated?${params}`);
}

/**
 * Force sync cultivation cache cho user hiện tại
 */
export async function syncCultivationCache() {
  return api('/api/cultivation/sync-cache', { method: 'POST' });
}

/**
 * Lấy thông tin tu tiên của user khác (public info)
 */
export async function getUserCultivation(userId) {
  return api(`/api/cultivation/user/${userId}`);
}

/**
 * Lấy thông tin tu tiên của nhiều users (cho hiển thị badge)
 * @param {Array<string>} userIds - Danh sách user IDs
 * @returns {Promise<Object>} Map userId -> cultivation info
 */
export async function getCultivationBatch(userIds) {
  if (!userIds || userIds.length === 0) return {};
  return api('/api/cultivation/batch', {
    method: 'POST',
    body: { userIds }
  });
}

/**
 * Điểm danh hàng ngày
 */
export async function dailyLogin() {
  return api('/api/cultivation/login', { method: 'POST' });
}

// ==================== QUESTS ====================

/**
 * Nhận thưởng nhiệm vụ
 */
export async function claimQuestReward(questId) {
  return api(`/api/cultivation/quest/${questId}/claim`, { method: 'POST' });
}

// ==================== SHOP ====================

/**
 * Lấy danh sách vật phẩm trong shop
 */
export async function getShop() {
  return api('/api/cultivation/shop');
}

/**
 * Mua vật phẩm
 */
export async function buyItem(itemId) {
  return api(`/api/cultivation/shop/buy/${itemId}`, { method: 'POST' });
}

// ==================== INVENTORY ====================

/**
 * Trang bị vật phẩm
 */
export async function equipItem(itemId) {
  return api(`/api/cultivation/inventory/${itemId}/equip`, { method: 'POST' });
}

/**
 * Bỏ trang bị vật phẩm
 */
export async function unequipItem(itemId) {
  return api(`/api/cultivation/inventory/${itemId}/unequip`, { method: 'POST' });
}

/**
 * Trang bị equipment (vũ khí, giáp, trang sức)
 */
export async function equipEquipment(equipmentId, slot) {
  return api(`/api/cultivation/equipment/${equipmentId}/equip`, {
    method: 'POST',
    body: JSON.stringify({ slot })
  });
}

/**
 * Bỏ trang bị equipment
 */
export async function unequipEquipment(slot) {
  return api(`/api/cultivation/equipment/${slot}/unequip`, { method: 'POST' });
}

/**
 * Tu bổ (sửa chữa) equipment - khôi phục độ bền
 */
export async function repairEquipment(equipmentId) {
  return api(`/api/cultivation/equipment/${equipmentId}/repair`, { method: 'POST' });
}

/**
 * Xem trước chi phí tu bổ tất cả equipment
 */
export async function previewRepairAll() {
  return api('/api/cultivation/equipment/repair-all/preview');
}

/**
 * Tu bổ tất cả equipment
 */
export async function repairAllEquipment() {
  return api('/api/cultivation/equipment/repair-all', { method: 'POST' });
}

/**
 * Sử dụng vật phẩm tiêu hao (đan dược, consumable)
 */
export async function useItem(itemId) {
  return api(`/api/cultivation/inventory/${itemId}/use`, { method: 'POST' });
}

/**
 * Luyện công pháp (tăng exp và level)
 */
export async function practiceTechnique(techniqueId, expGain = 10) {
  return api('/api/cultivation/practice-technique', {
    method: 'POST',
    body: JSON.stringify({ techniqueId, expGain })
  });
}

/**
 * Thử độ kiếp (breakthrough) - có thể thất bại
 */
export async function attemptBreakthrough() {
  return api('/api/cultivation/breakthrough', { method: 'POST' });
}

// ==================== LEADERBOARD ====================

/**
 * Lấy bảng xếp hạng
 * @param {string} type - Loại xếp hạng: 'exp', 'realm', 'spiritStones', 'streak'
 * @param {number} limit - Số lượng kết quả tối đa
 */
export async function getLeaderboard(type = 'exp', limit = 50) {
  return api(`/api/cultivation/leaderboard?type=${type}&limit=${limit}`);
}

// ==================== REALMS ====================

/**
 * Lấy danh sách cảnh giới
 */
export async function getRealms() {
  return api('/api/cultivation/realms');
}

// ==================== STATS ====================

/**
 * Lấy thống kê tổng quan server
 */
export async function getCultivationStats() {
  return api('/api/cultivation/stats');
}

/**
 * Lấy lịch sử exp
 */
export async function getExpLog() {
  return api('/api/cultivation/exp-log');
}

/**
 * Thêm exp từ hoạt động (yin-yang click, etc.)
 * @param {number} amount - Số exp thêm (1-10)
 * @param {string} source - Nguồn exp: 'yinyang_click', 'activity'
 * @param {number} spiritStones - Số linh thạch nhặt được (optional)
 */
export async function addExpFromActivity(amount, source = 'activity', spiritStones = 0) {
  return api('/api/cultivation/add-exp', {
    method: 'POST',
    body: JSON.stringify({ amount, source, spiritStones })
  });
}

// ==================== PASSIVE EXP ====================

/**
 * Thu thập passive exp (tu vi tăng dần theo thời gian)
 * Tu vi tăng 1 exp/phút, áp dụng multiplier từ đan dược
 */
export async function collectPassiveExp() {
  return api('/api/cultivation/collect-passive-exp', { method: 'POST' });
}

/**
 * Lấy trạng thái passive exp đang chờ thu thập
 * @returns {Promise<Object>} { pendingExp, multiplier, minutesElapsed, activeBoosts }
 */
export async function getPassiveExpStatus() {
  return api('/api/cultivation/passive-exp-status');
}

// ==================== GIFT CODE ====================

/**
 * Đổi mã quà tặng
 * @param {string} code - Mã quà tặng
 * @returns {Promise<Object>} { success, rewards, message }
 */
export async function redeemGiftCode(code) {
  return api('/api/cultivation/giftcode/redeem', {
    method: 'POST',
    body: JSON.stringify({ code })
  });
}

/**
 * Lấy lịch sử đổi mã quà tặng
 * @returns {Promise<Object>} { success, history }
 */
export async function getGiftCodeHistory() {
  return api('/api/cultivation/giftcode/history');
}

/**
 * Cập nhật hình tượng nhân vật
 * @param {string} characterAppearance - Loại nhân vật: 'Immortal_male', 'Immortal_female', 'Demon_male', 'Demon_female'
 */
export async function updateCharacterAppearance(characterAppearance) {
  return api('/api/cultivation/update-character-appearance', {
    method: 'POST',
    body: JSON.stringify({ characterAppearance })
  });
}

// ==================== CONSTANTS ====================

/**
 * Danh sách cảnh giới tu luyện (v2 - 14 Cảnh Giới)
 */
export const CULTIVATION_REALMS = [
  { level: 1, name: "Phàm Nhân", minExp: 0, maxExp: 99, color: "#9CA3AF" },
  { level: 2, name: "Luyện Khí", minExp: 100, maxExp: 999, color: "#10B981" },
  { level: 3, name: "Trúc Cơ", minExp: 1000, maxExp: 4999, color: "#3B82F6" },
  { level: 4, name: "Kim Đan", minExp: 5000, maxExp: 14999, color: "#9A6B1A" },
  { level: 5, name: "Nguyên Anh", minExp: 15000, maxExp: 39999, color: "#8B5CF6" },
  { level: 6, name: "Hóa Thần", minExp: 40000, maxExp: 99999, color: "#EC4899" },
  { level: 7, name: "Luyện Hư", minExp: 100000, maxExp: 249999, color: "#14B8A6" },
  { level: 8, name: "Hợp Thể", minExp: 250000, maxExp: 499999, color: "#22C55E" },
  { level: 9, name: "Đại Thừa", minExp: 500000, maxExp: 999999, color: "#F97316" },
  { level: 10, name: "Chân Tiên", minExp: 1000000, maxExp: 2999999, color: "#60A5FA" },
  { level: 11, name: "Kim Tiên", minExp: 3000000, maxExp: 6999999, color: "#FACC15" },
  { level: 12, name: "Tiên Vương", minExp: 7000000, maxExp: 14999999, color: "#A855F7" },
  { level: 13, name: "Tiên Đế", minExp: 15000000, maxExp: 29999999, color: "#EF4444" },
  { level: 14, name: "Thiên Đế", minExp: 30000000, maxExp: Infinity, color: "#FF00FF" }
];

/**
 * Lấy thông tin cảnh giới từ level
 */
export function getRealmByLevel(level) {
  return CULTIVATION_REALMS.find(r => r.level === level) || CULTIVATION_REALMS[0];
}

/**
 * Format số lớn (VD: 1000 -> 1K)
 */
export function formatNumber(num) {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

// ==================== TIER SYSTEM ====================

/**
 * Lưu cache tier config từ server
 */
let tierConfigCache = null;

/**
 * Fetch tier config từ server
 */
export async function fetchTierConfig() {
  if (tierConfigCache) return tierConfigCache;
  try {
    const response = await api('/api/cultivation/tier-config');
    if (response.success) {
      tierConfigCache = response.data;
      return response.data;
    }
  } catch (err) {
    console.error('Failed to fetch tier config:', err);
  }
  // Fallback defaults
  return {
    tiers: [
      { key: 'SO_THANH', name: 'Sơ Thành', color: '#94A3B8', range: [1, 3], canNghichThien: false },
      { key: 'TRUNG_THANH', name: 'Trung Thành', color: '#3B82F6', range: [4, 6], canNghichThien: false },
      { key: 'DAI_THANH', name: 'Đại Thành', color: '#8B5CF6', range: [7, 9], canNghichThien: true },
      { key: 'VIEN_MAN', name: 'Viên Mãn', color: '#FFD700', range: [10, 10], canNghichThien: true }
    ],
    debuffs: []
  };
}

/**
 * Lấy tier từ subLevel (client-side với fallback)
 */
export function getTierBySubLevel(subLevel) {
  const level = subLevel || 1;
  const tiers = tierConfigCache?.tiers || [
    { key: 'SO_THANH', name: 'Sơ Thành', color: '#94A3B8', range: [1, 3], canNghichThien: false },
    { key: 'TRUNG_THANH', name: 'Trung Thành', color: '#3B82F6', range: [4, 6], canNghichThien: false },
    { key: 'DAI_THANH', name: 'Đại Thành', color: '#8B5CF6', range: [7, 9], canNghichThien: true },
    { key: 'VIEN_MAN', name: 'Viên Mãn', color: '#FFD700', range: [10, 10], canNghichThien: true }
  ];

  for (const tier of tiers) {
    if (level >= tier.range[0] && level <= tier.range[1]) {
      return tier;
    }
  }
  return tiers[0];
}

/**
 * Lấy tên đầy đủ: "Kim Đan - Đại Thành"
 */
export function getFullRealmName(realmLevel, subLevel) {
  const realm = getRealmByLevel(realmLevel);
  const tier = getTierBySubLevel(subLevel);
  return `${realm.name} - ${tier.name}`;
}
