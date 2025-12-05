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
 */
export async function addExpFromActivity(amount, source = 'activity') {
  return api('/api/cultivation/add-exp', {
    method: 'POST',
    body: JSON.stringify({ amount, source })
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

// ==================== CONSTANTS ====================

/**
 * Danh sách cảnh giới tu luyện 
 */
export const CULTIVATION_REALMS = [
  { level: 1, name: "Phàm Nhân", minExp: 0, maxExp: 99, color: "#9CA3AF", icon: "" },
  { level: 2, name: "Luyện Khí", minExp: 100, maxExp: 999, color: "#10B981", icon: "" },
  { level: 3, name: "Trúc Cơ", minExp: 1000, maxExp: 4999, color: "#3B82F6", icon: "" },
  { level: 4, name: "Kim Đan", minExp: 5000, maxExp: 14999, color: "#F59E0B", icon: "" },
  { level: 5, name: "Nguyên Anh", minExp: 15000, maxExp: 39999, color: "#8B5CF6", icon: "" },
  { level: 6, name: "Hóa Thần", minExp: 40000, maxExp: 99999, color: "#EC4899", icon: "" },
  { level: 7, name: "Luyện Hư", minExp: 100000, maxExp: 249999, color: "#14B8A6", icon: "" },
  { level: 8, name: "Đại Thừa", minExp: 250000, maxExp: 499999, color: "#F97316", icon: "" },
  { level: 9, name: "Độ Kiếp", minExp: 500000, maxExp: 999999, color: "#EF4444", icon: "" },
  { level: 10, name: "Tiên Nhân", minExp: 1000000, maxExp: 4999999, color: "#FFD700", icon: "" },
  { level: 11, name: "Thiên Đế", minExp: 5000000, maxExp: Infinity, color: "#FF00FF", icon: "" }
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
