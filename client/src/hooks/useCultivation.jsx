/**
 * useCultivation Hook - Quản lý state hệ thống tu tiên
 */

import React, { useState, useEffect, useCallback, useContext, createContext, useRef } from 'react';
import {
  getCultivation,
  getCultivationSummary,
  getCombatStatsLean,
  getInventoryPaginated,
  dailyLogin,
  claimQuestReward,
  getShop,
  buyItem,
  equipItem,
  unequipItem,
  equipEquipment as equipEquipmentAPI,
  unequipEquipment as unequipEquipmentAPI,
  repairEquipment as repairEquipmentAPI,
  previewRepairAll as previewRepairAllAPI,
  repairAllEquipment as repairAllEquipmentAPI,
  useItem as useItemAPI,
  getLeaderboard,
  getRealms,
  getExpLog,
  addExpFromActivity,
  collectPassiveExp as collectPassiveExpAPI,
  getPassiveExpStatus,
  practiceTechnique as practiceTechniqueAPI,
  attemptBreakthrough as attemptBreakthroughAPI,
  updateCharacterAppearance as updateCharacterAppearanceAPI,
  redeemGiftCode as redeemGiftCodeAPI,
  getGiftCodeHistory as getGiftCodeHistoryAPI,
  sellItems as sellItemsAPI,
  getCombatSlots as getCombatSlotsAPI,
  equipCombatSlot as equipCombatSlotAPI,
  unequipCombatSlot as unequipCombatSlotAPI,
} from '../services/cultivationAPI.js';

// Context cho Cultivation
const CultivationContext = createContext(null);

/**
 * Provider component cho Cultivation
 */
export function CultivationProvider({ children }) {
  const [cultivation, setCultivation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [shop, setShop] = useState(null);
  const [leaderboard, setLeaderboard] = useState(null);
  const [realms, setRealms] = useState(null);
  const [expLog, setExpLog] = useState([]);

  // Notification state cho level up, rewards, etc.
  const [notification, setNotification] = useState(null);

  // Ref to prevent double API calls (synchronous check)
  const isUsingItemRef = useRef(false);

  /**
   * Load cultivation data
   */
  const loadCultivation = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setError(null);
      const response = await getCultivation();
      if (response.success) {
        setCultivation(response.data);
      }
    } catch (err) {
      setError(err.message);
      console.error('[Cultivation] Error loading:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  /**
   * Refresh chỉ combat stats (lightweight - không fetch full cultivation)
   */
  const refreshCombatStats = useCallback(async () => {
    try {
      const response = await getCombatStatsLean();
      if (response.success) {
        setCultivation(prev => prev ? {
          ...prev,
          combatStats: response.data.combatStats,
          realmLevel: response.data.realmLevel
        } : prev);
      }
      return response.data;
    } catch (err) {
      console.error('[Cultivation] Error refreshing combat stats:', err);
    }
  }, []);

  /**
   * Load inventory có phân trang (lightweight)
   */
  const loadInventoryPage = useCallback(async (page = 1, limit = 50, type = null) => {
    try {
      const response = await getInventoryPaginated(page, limit, type);
      if (response.success) {
        return response.data; // { items, pagination }
      }
    } catch (err) {
      console.error('[Cultivation] Error loading inventory page:', err);
    }
    return null;
  }, []);

  /**
   * Điểm danh hàng ngày
   */
  const checkIn = useCallback(async () => {
    try {
      setError(null);
      const response = await dailyLogin();

      if (response.success) {
        if (response.data.alreadyLoggedIn) {
          setNotification({
            type: 'info',
            title: 'Đã điểm danh',
            message: `Bạn đã điểm danh hôm nay rồi. Streak: ${response.data.streak} ngày`
          });
        } else {
          // Update local state instead of full reload
          const { expEarned, stonesEarned } = response.data;
          setCultivation(prev => {
            if (!prev) return prev;
            return {
              ...prev,
              exp: prev.exp + (expEarned || 0),
              totalExp: prev.totalExp + (expEarned || 0),
              spiritStones: prev.spiritStones + (stonesEarned || 0)
            };
          });

          // Show notification
          setNotification({
            type: 'success',
            title: 'Điểm danh thành công!',
            message: `+${response.data.expEarned} Tu Vi, +${response.data.stonesEarned} Linh Thạch. Streak: ${response.data.streak} ngày`
          });
        }

        return response.data;
      }
    } catch (err) {
      setError(err.message);
      setNotification({
        type: 'error',
        title: 'Lỗi',
        message: err.message
      });
      throw err;
    }
  }, []);

  /**
   * Claim quest reward
   */
  const claimReward = useCallback(async (questId) => {
    try {
      setError(null);
      const response = await claimQuestReward(questId);

      if (response.success) {
        // Update local state instead of full reload
        const { expEarned, stonesEarned } = response.data;
        setCultivation(prev => {
          if (!prev) return prev;

          // Update exp and stones
          const updated = {
            ...prev,
            exp: prev.exp + (expEarned || 0),
            totalExp: prev.totalExp + (expEarned || 0),
            spiritStones: prev.spiritStones + (stonesEarned || 0)
          };

          // Mark quest as claimed in dailyQuests
          if (prev.dailyQuests) {
            updated.dailyQuests = prev.dailyQuests.map(q =>
              q.questId === questId ? { ...q, claimed: true } : q
            );
          }

          // Mark quest as claimed in weeklyQuests
          if (prev.weeklyQuests) {
            updated.weeklyQuests = prev.weeklyQuests.map(q =>
              q.questId === questId ? { ...q, claimed: true } : q
            );
          }

          // Mark quest as claimed in achievements
          if (prev.achievements) {
            updated.achievements = prev.achievements.map(q =>
              q.questId === questId ? { ...q, claimed: true } : q
            );
          }

          return updated;
        });

        setNotification({
          type: 'success',
          title: 'Nhận thưởng thành công!',
          message: `+${response.data.expEarned} Tu Vi, +${response.data.stonesEarned} Linh Thạch`
        });

        return response.data;
      }
    } catch (err) {
      setError(err.message);
      setNotification({
        type: 'error',
        title: 'Lỗi',
        message: err.message
      });
      throw err;
    }
  }, []);

  /**
   * Load shop items
   */
  const loadShop = useCallback(async () => {
    try {
      const response = await getShop();
      if (response.success) {
        setShop(response.data);
      }
      return response.data;
    } catch (err) {
      console.error('[Cultivation] Error loading shop:', err);
      throw err;
    }
  }, []);

  /**
   * Mua vật phẩm
   * @param {string} itemId - ID vật phẩm
   * @param {number} quantity - Số lượng mua (default: 1)
   */
  const purchaseItem = useCallback(async (itemId, quantity = 1) => {
    try {
      setError(null);
      const response = await buyItem(itemId, quantity);

      // Xử lý trường hợp đã mua starter pack rồi
      if (response.alreadyPurchased) {
        setNotification({
          type: 'info',
          title: 'Thông báo',
          message: response.message || 'Bạn đã nhận gói quà này rồi!'
        });
        return response.data;
      }

      if (response.success) {
        // Update cultivation with new inventory and spirit stones
        const updateData = {
          spiritStones: response.data.spiritStones,
          inventory: response.data.inventory
        };

        // Cập nhật learnedTechniques từ server response (bao gồm lootbox và mua trực tiếp)
        // Server trả về mảng đầy đủ learnedTechniques
        if (response.data.learnedTechniques) {
          updateData.learnedTechniques = response.data.learnedTechniques;
        }

        setCultivation(prev => ({
          ...prev,
          ...updateData
        }));

        // Update shop
        await loadShop();

        setNotification({
          type: 'success',
          title: response.data.learnedTechnique ? 'Học công pháp thành công!' : 'Mua thành công!',
          message: response.message
        });

        return response.data;
      }
    } catch (err) {
      setError(err.message);
      setNotification({
        type: 'error',
        title: 'Lỗi',
        message: err.message
      });
      throw err;
    }
  }, [loadShop]);

  /**
   * Trang bị vật phẩm
   */
  const equip = useCallback(async (itemId) => {
    try {
      setError(null);
      const response = await equipItem(itemId);

      if (response.success) {
        setCultivation(prev => ({
          ...prev,
          equipped: response.data.equipped,
          inventory: response.data.inventory
        }));
        // Response đã chứa đủ thông tin, không cần reload
        return response.data;
      }
    } catch (err) {
      setError(err.message);
      setNotification({
        type: 'error',
        title: 'Lỗi',
        message: err.message
      });
      throw err;
    }
  }, []);

  /**
   * Bỏ trang bị
   */
  const unequip = useCallback(async (itemId) => {
    try {
      setError(null);
      const response = await unequipItem(itemId);

      if (response.success) {
        setCultivation(prev => ({
          ...prev,
          equipped: response.data.equipped,
          inventory: response.data.inventory
        }));
        // Response đã chứa đủ thông tin, không cần reload
        return response.data;
      }
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  /**
   * Trang bị equipment (vũ khí, giáp, trang sức)
   */
  const equipEquipment = useCallback(async (equipmentId, slot) => {
    try {
      setError(null);
      const response = await equipEquipmentAPI(equipmentId, slot);

      if (response.success) {
        setCultivation(prev => ({
          ...prev,
          equipped: response.data.equipped,
          inventory: response.data.inventory,
          combatStats: response.data.combatStats || prev.combatStats
        }));
        // Response đã chứa combatStats, không cần reload
        return response.data;
      }
    } catch (err) {
      setError(err.message);
      setNotification({
        type: 'error',
        title: 'Lỗi',
        message: err.message
      });
      throw err;
    }
  }, []);

  /**
   * Bỏ trang bị equipment
   */
  const unequipEquipment = useCallback(async (slot) => {
    try {
      setError(null);
      const response = await unequipEquipmentAPI(slot);

      if (response.success) {
        setCultivation(prev => ({
          ...prev,
          equipped: response.data.equipped,
          inventory: response.data.inventory,
          combatStats: response.data.combatStats || prev.combatStats
        }));
        // Response đã chứa combatStats, không cần reload
        return response.data;
      }
    } catch (err) {
      setError(err.message);
      setNotification({
        type: 'error',
        title: 'Lỗi',
        message: err.message
      });
      throw err;
    }
  }, []);

  /**
   * Tu bổ (sửa chữa) equipment - khôi phục độ bền
   */
  const repairEquipment = useCallback(async (equipmentId) => {
    try {
      setError(null);
      const response = await repairEquipmentAPI(equipmentId);

      if (response.success) {
        // Cập nhật inventory với durability mới
        setCultivation(prev => ({
          ...prev,
          spiritStones: response.data.spiritStones ?? prev.spiritStones,
          inventory: prev.inventory.map(item => {
            if (item.itemId === equipmentId || item.metadata?._id === equipmentId) {
              return {
                ...item,
                metadata: {
                  ...item.metadata,
                  durability: response.data.equipment?.durability
                }
              };
            }
            return item;
          })
        }));

        setNotification({
          type: 'success',
          title: 'Tu Bổ Thành Công',
          message: response.message || `Đã khôi phục độ bền ${response.data.equipment?.name || 'trang bị'}`
        });

        return response.data;
      }
    } catch (err) {
      setError(err.message);
      setNotification({
        type: 'error',
        title: 'Lỗi Tu Bổ',
        message: err.message
      });
      throw err;
    }
  }, []);

  /**
   * Xem trước chi phí tu bổ tất cả equipment
   */
  const previewRepairAll = useCallback(async () => {
    try {
      setError(null);
      const response = await previewRepairAllAPI();
      return response.data;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  /**
   * Tu bổ tất cả equipment
   */
  const repairAllEquipment = useCallback(async () => {
    try {
      setError(null);
      const response = await repairAllEquipmentAPI();

      if (response.success) {
        // Reload cultivation để cập nhật inventory và spiritStones
        await loadCultivation();

        setNotification({
          type: 'success',
          title: 'Tu Bổ Thành Công',
          message: response.message || `Đã tu bổ ${response.data.repairedCount} trang bị`
        });

        return response.data;
      }
    } catch (err) {
      setError(err.message);
      setNotification({
        type: 'error',
        title: 'Lỗi Tu Bổ',
        message: err.message
      });
      throw err;
    }
  }, []);

  /**
   * Sử dụng vật phẩm tiêu hao (đan dược, consumable)
   * @param {string} itemId - ID vật phẩm
   * @param {number} quantity - Số lượng muốn dùng (default: 1)
   */
  const useItem = useCallback(async (itemId, quantity = 1) => {
    // Synchronous check to prevent double API calls
    if (isUsingItemRef.current) {
      console.warn('[Cultivation] Blocked duplicate useItem call');
      return;
    }
    isUsingItemRef.current = true;

    try {
      setError(null);
      const response = await useItemAPI(itemId, quantity);

      if (response.success) {
        // Update cultivation state với thông tin mới
        setCultivation(prev => ({
          ...prev,
          ...response.data.cultivation,
          inventory: response.data.inventory || prev.inventory,
          // Cập nhật learnedTechniques nếu drop được công pháp
          learnedTechniques: response.data.cultivation?.learnedTechniques || prev?.learnedTechniques
        }));

        // Xử lý thông báo cho loot box
        if (response.data.reward?.type === 'lootbox') {
          const droppedItem = response.data.reward.droppedItem;
          setNotification({
            type: 'success',
            title: 'Mở rương thành công!',
            message: response.message,
            lootboxResult: droppedItem
          });
        } else {
          // Thông báo thường cho các item khác
          setNotification({
            type: 'success',
            message: response.message,
            reward: response.data.reward
          });
        }

        return response.data;
      }
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      isUsingItemRef.current = false;
    }
  }, []);

  /**
   * Bán vật phẩm
   */
  const sellItems = useCallback(async (itemIds) => {
    try {
      setError(null);
      const response = await sellItemsAPI(itemIds);

      if (response.success) {
        setCultivation(prev => ({
          ...prev,
          inventory: prev.inventory.filter(item => !itemIds.includes(item.itemId)),
          spiritStones: (prev.spiritStones || 0) + response.data.totalValue
        }));

        setNotification({
          type: 'success',
          title: 'Bán thành công',
          message: response.message
        });

        return response.data;
      }
    } catch (err) {
      setError(err.message);
      setNotification({
        type: 'error',
        title: 'Lỗi',
        message: err.message
      });
      throw err;
    }
  }, []);

  /**
   * Load leaderboard
   */
  const loadLeaderboard = useCallback(async (type = 'exp', limit = 50) => {
    try {
      const response = await getLeaderboard(type, limit);
      if (response.success) {
        setLeaderboard(response.data);
      }
      return response.data;
    } catch (err) {
      console.error('[Cultivation] Error loading leaderboard:', err);
      throw err;
    }
  }, []);

  /**
   * Load realms
   */
  const loadRealms = useCallback(async () => {
    try {
      const response = await getRealms();
      if (response.success) {
        setRealms(response.data);
      }
      return response.data;
    } catch (err) {
      console.error('[Cultivation] Error loading realms:', err);
      throw err;
    }
  }, []);

  /**
   * Load exp log
   */
  const loadExpLog = useCallback(async () => {
    try {
      const response = await getExpLog();
      if (response.success) {
        setExpLog(response.data);
      }
      return response.data;
    } catch (err) {
      console.error('[Cultivation] Error loading exp log:', err);
      throw err;
    }
  }, []);

  /**
   * Thêm exp từ hoạt động (yin-yang click)
   */
  const addExp = useCallback(async (amount, source = 'activity', spiritStones = 0) => {
    try {
      setError(null);
      // Request patch mode for high-frequency actions
      const response = await addExpFromActivity(amount, source, spiritStones, { mode: 'patch' });

      if (response.success) {
        // Handle patch response
        if (response.mode === 'patch' && response.patch) {
          setCultivation(prev => {
            if (!prev) return prev;

            const incomingVer = response.dataVersion;
            const prevVer = prev.dataVersion ?? 0;

            // Out-of-order check: ignore if incoming is older OR equal
            if (incomingVer != null && incomingVer <= prevVer) {
              console.warn('[Cultivation] Ignoring out-of-order patch response', { incomingVer, prevVer });
              return prev;
            }

            // Safe merge: apply patch fields while preserving heavy state
            return {
              ...prev,
              ...response.patch,
              // Explicitly set dataVersion if valid number
              dataVersion: (typeof incomingVer === 'number' ? incomingVer : prevVer),
            };
          });
        } else {
          // Legacy full response handling
          const fullCultivation = response.data?.cultivation || response.cultivation;
          if (fullCultivation) {
            setCultivation(fullCultivation);
          } else {
            console.warn('[Cultivation] Unexpected response structure:', response);
          }
        }

        // Handle level-up notification (legacy field)
        if (response.data?.leveledUp) {
          setNotification({
            type: 'success',
            title: 'Đột phá cảnh giới!',
            message: `Chúc mừng! Bạn đã đột phá đến ${response.data.newRealm?.name}!`,
            levelUp: true,
            newRealm: response.data.newRealm
          });
        }

        return response.data || response;
      }
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  /**
   * Luyện công pháp
   */
  const practiceTechnique = useCallback(async (techniqueId, expGain = 10) => {
    try {
      setError(null);
      const response = await practiceTechniqueAPI(techniqueId, expGain);

      if (response.success) {
        // Cập nhật learnedTechniques local để tránh reload cả trang (giữ nguyên scroll)
        const { newLevel, currentExp } = response.data || {};
        if (typeof newLevel === 'number' && typeof currentExp === 'number') {
          setCultivation(prev => {
            if (!prev || !prev.learnedTechniques) return prev;
            const updatedTechniques = prev.learnedTechniques.map(t =>
              t.techniqueId === techniqueId
                ? {
                  ...t,
                  level: newLevel,
                  exp: currentExp,
                  lastPracticedAt: new Date().toISOString()
                }
                : t
            );
            return {
              ...prev,
              learnedTechniques: updatedTechniques
            };
          });
        }

        setNotification({
          type: response.data?.leveledUp ? 'success' : 'info',
          title: response.data?.leveledUp ? 'Công pháp lên cấp!' : 'Luyện công pháp thành công!',
          message: response.message
        });

        return response.data;
      }
    } catch (err) {
      setError(err.message);
      setNotification({
        type: 'error',
        title: 'Lỗi',
        message: err.message
      });
      throw err;
    }
  }, []);

  /**
   * Thu thập passive exp (tu vi tăng dần theo thời gian)
   */
  const collectPassiveExp = useCallback(async () => {
    try {
      setError(null);
      const response = await collectPassiveExpAPI();

      if (response.success && response.data.collected) {
        // Update local state instead of full reload
        const { expEarned, multiplier, minutesElapsed, leveledUp, newRealm, newExp, newTotalExp } = response.data;

        setCultivation(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            exp: newExp !== undefined ? newExp : (prev.exp + expEarned),
            totalExp: newTotalExp !== undefined ? newTotalExp : (prev.totalExp + expEarned),
            realm: newRealm || prev.realm
          };
        });

        // Show notification với thông tin chi tiết
        setNotification({
          type: leveledUp ? 'success' : 'info',
          title: leveledUp ? 'Đột phá cảnh giới!' : 'Thu thập tu vi',
          message: leveledUp
            ? `Chúc mừng! Bạn đã đột phá đến ${newRealm?.name}!`
            : multiplier > 1
              ? `+${expEarned} Tu Vi (x${multiplier} đan dược, ${minutesElapsed} phút tu luyện)`
              : `+${expEarned} Tu Vi (${minutesElapsed} phút tu luyện)`,
          levelUp: leveledUp,
          newRealm: newRealm
        });

        return response.data;
      }

      return response.data;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  /**
   * Lấy trạng thái passive exp đang chờ
   */
  const loadPassiveExpStatus = useCallback(async () => {
    try {
      const response = await getPassiveExpStatus();
      if (response.success) {
        return response.data;
      }
    } catch (err) {
      console.error('[Cultivation] Error loading passive exp status:', err);
      throw err;
    }
  }, []);

  /**
   * Thử độ kiếp (breakthrough) - có thể thất bại
   */
  const attemptBreakthrough = useCallback(async () => {
    try {
      setError(null);
      const response = await attemptBreakthroughAPI();

      if (response.success) {
        // Reload cultivation để cập nhật realm và breakthrough info
        await loadCultivation();

        setNotification({
          type: response.data?.breakthroughSuccess ? 'success' : 'error',
          title: response.data?.breakthroughSuccess ? 'Độ kiếp thành công!' : 'Độ kiếp thất bại!',
          message: response.message,
          breakthroughSuccess: response.data?.breakthroughSuccess,
          newRealm: response.data?.newRealm,
          nextSuccessRate: response.data?.nextSuccessRate,
          cooldownUntil: response.data?.cooldownUntil
        });

        return response.data;
      }
    } catch (err) {
      setError(err.message);
      setNotification({
        type: 'error',
        title: 'Lỗi',
        message: err.message
      });
      throw err;
    }
  }, [loadCultivation]);

  const clearNotification = useCallback(() => {
    setNotification(null);
  }, []);

  /**
   * Cập nhật hình tượng nhân vật
   */
  const updateCharacterAppearance = useCallback(async (characterAppearance) => {
    try {
      setError(null);
      const response = await updateCharacterAppearanceAPI(characterAppearance);

      if (response.success) {
        // Update local state
        setCultivation(prev => ({
          ...prev,
          characterAppearance: response.data.characterAppearance,
          lastAppearanceChangeAt: response.data.lastAppearanceChangeAt
        }));

        setNotification({
          type: 'success',
          title: 'Đổi hình tượng thành công!',
          message: response.message
        });

        return response.data;
      }
    } catch (err) {
      setError(err.message);
      setNotification({
        type: 'error',
        title: 'Lỗi',
        message: err.message
      });
      throw err;
    }
  }, []);

  /**
   * Đổi mã quà tặng
   */
  const redeemGiftCode = useCallback(async (code) => {
    try {
      setError(null);
      const response = await redeemGiftCodeAPI(code);

      if (response.success) {
        // Reload cultivation để cập nhật phần thưởng
        await loadCultivation();

        setNotification({
          type: 'success',
          title: 'Đổi Mã Thành Công!',
          message: response.message || 'Đã nhận phần thưởng'
        });

        return response.data;
      }
    } catch (err) {
      setError(err.message);
      setNotification({
        type: 'error',
        title: 'Lỗi',
        message: err.message
      });
      throw err;
    }
  }, []);

  /**
   * Lấy lịch sử đổi mã quà tặng
   */
  const loadGiftCodeHistory = useCallback(async () => {
    try {
      setError(null);
      const response = await getGiftCodeHistoryAPI();
      return response.data;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  /**
   * Lấy thông tin combat slots
   */
  const loadCombatSlots = useCallback(async () => {
    try {
      setError(null);
      const response = await getCombatSlotsAPI();
      return response.data;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  /**
   * Trang bị công pháp vào combat slot
   */
  const equipCombatSlot = useCallback(async (slotIndex, techniqueId) => {
    try {
      setError(null);
      const response = await equipCombatSlotAPI(slotIndex, techniqueId);

      if (response.success) {
        // Update local state với equipped slots
        setCultivation(prev => ({
          ...prev,
          equippedCombatTechniques: response.data.equippedSlots || prev.equippedCombatTechniques
        }));

        setNotification({
          type: 'success',
          title: 'Trang bị thành công!',
          message: response.message
        });

        return response.data;
      }
    } catch (err) {
      setError(err.message);
      setNotification({
        type: 'error',
        title: 'Lỗi',
        message: err.message
      });
      throw err;
    }
  }, []);

  /**
   * Tháo công pháp khỏi combat slot
   */
  const unequipCombatSlot = useCallback(async (slotIndex) => {
    try {
      setError(null);
      const response = await unequipCombatSlotAPI(slotIndex);

      if (response.success) {
        // Update local state
        setCultivation(prev => ({
          ...prev,
          equippedCombatTechniques: (prev.equippedCombatTechniques || [])
            .filter(slot => slot.slotIndex !== slotIndex)
        }));

        setNotification({
          type: 'success',
          title: 'Tháo thành công!',
          message: response.message
        });

        return response.data;
      }
    } catch (err) {
      setError(err.message);
      setNotification({
        type: 'error',
        title: 'Lỗi',
        message: err.message
      });
      throw err;
    }
  }, []);

  /**
   * Refresh all cultivation data
   */
  const refresh = useCallback(async (silent = false) => {
    await loadCultivation(silent);
  }, [loadCultivation]);

  // Load initial data
  useEffect(() => {
    loadCultivation();
  }, [loadCultivation]);

  const value = {
    // State
    cultivation,
    setCultivation,
    loading,
    error,
    shop,
    leaderboard,
    realms,
    expLog,
    notification,

    // Actions
    loadCultivation,
    refreshCombatStats,
    loadInventoryPage,
    checkIn,
    claimReward,
    loadShop,
    purchaseItem,
    equip,
    unequip,
    equipEquipment,
    unequipEquipment,
    repairEquipment,
    previewRepairAll,
    repairAllEquipment,
    useItem,
    loadLeaderboard,
    loadRealms,
    loadExpLog,
    addExp,
    collectPassiveExp,
    loadPassiveExpStatus,
    clearNotification,
    refresh,
    practiceTechnique,
    attemptBreakthrough,
    updateCharacterAppearance,
    redeemGiftCode,
    sellItems,
    loadGiftCodeHistory,
    loadCombatSlots,
    equipCombatSlot,
    unequipCombatSlot
  };

  return (
    <CultivationContext.Provider value={value}>
      {children}
    </CultivationContext.Provider>
  );
}

/**
 * Hook để sử dụng Cultivation context
 */
export function useCultivation() {
  const context = useContext(CultivationContext);
  if (!context) {
    throw new Error('useCultivation must be used within a CultivationProvider');
  }
  return context;
}

/**
 * Hook đơn giản để lấy thông tin cultivation (không cần Provider)
 */
export function useCultivationData(userId = null) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = userId
          ? await import('../services/cultivationAPI.js').then(m => m.getUserCultivation(userId))
          : await getCultivation();

        if (response.success) {
          setData(response.data);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userId]);

  return { data, loading, error };
}

export default useCultivation;