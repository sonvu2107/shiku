/**
 * useCultivation Hook - Quản lý state hệ thống tu tiên
 */

import { useState, useEffect, useCallback, useContext, createContext } from 'react';
import { 
  getCultivation, 
  dailyLogin, 
  claimQuestReward, 
  getShop, 
  buyItem, 
  equipItem, 
  unequipItem,
  useItem as useItemAPI,
  getLeaderboard,
  getRealms,
  getExpLog,
  addExpFromActivity
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

  /**
   * Load cultivation data
   */
  const loadCultivation = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getCultivation();
      if (response.success) {
        setCultivation(response.data);
      }
    } catch (err) {
      setError(err.message);
      console.error('[Cultivation] Error loading:', err);
    } finally {
      setLoading(false);
    }
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
          setCultivation(response.data.cultivation);
          
          // Show notification
          setNotification({
            type: 'success',
            title: response.data.leveledUp ? 'Đột phá cảnh giới!' : 'Điểm danh thành công!',
            message: response.data.leveledUp 
              ? `Chúc mừng! Bạn đã đột phá đến ${response.data.newRealm?.name}!`
              : `+${response.data.expEarned} Tu Vi, +${response.data.stonesEarned} Linh Thạch. Streak: ${response.data.streak} ngày`,
            levelUp: response.data.leveledUp,
            newRealm: response.data.newRealm
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
        setCultivation(response.data.cultivation);
        
        setNotification({
          type: 'success',
          title: response.data.leveledUp ? 'Đột phá cảnh giới!' : 'Nhận thưởng thành công!',
          message: response.data.leveledUp 
            ? `Chúc mừng! Bạn đã đột phá đến ${response.data.newRealm?.name}!`
            : `+${response.data.expEarned} Tu Vi, +${response.data.stonesEarned} Linh Thạch`,
          levelUp: response.data.leveledUp,
          newRealm: response.data.newRealm
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
   */
  const purchaseItem = useCallback(async (itemId) => {
    try {
      setError(null);
      const response = await buyItem(itemId);
      
      if (response.success) {
        // Update cultivation with new inventory and spirit stones
        setCultivation(prev => ({
          ...prev,
          spiritStones: response.data.spiritStones,
          inventory: response.data.inventory
        }));
        
        // Update shop
        await loadShop();
        
        setNotification({
          type: 'success',
          title: 'Mua thành công!',
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
        
        return response.data;
      }
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  /**
   * Sử dụng vật phẩm tiêu hao (đan dược, consumable)
   */
  const useItem = useCallback(async (itemId) => {
    try {
      setError(null);
      const response = await useItemAPI(itemId);
      
      if (response.success) {
        // Update cultivation state với thông tin mới
        setCultivation(prev => ({
          ...prev,
          ...response.data.cultivation,
          inventory: response.data.inventory || prev.inventory
        }));
        
        // Hiển thị thông báo nếu có
        if (response.data.message) {
          setNotification({
            type: 'success',
            message: response.data.message,
            reward: response.data.reward
          });
        }
        
        return response.data;
      }
    } catch (err) {
      setError(err.message);
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
  const addExp = useCallback(async (amount, source = 'activity') => {
    try {
      setError(null);
      const response = await addExpFromActivity(amount, source);
      
      if (response.success) {
        setCultivation(response.data.cultivation);
        
        if (response.data.leveledUp) {
          setNotification({
            type: 'success',
            title: 'Đột phá cảnh giới!',
            message: `Chúc mừng! Bạn đã đột phá đến ${response.data.newRealm?.name}!`,
            levelUp: true,
            newRealm: response.data.newRealm
          });
        }
        
        return response.data;
      }
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  /**
   * Clear notification
   */
  const clearNotification = useCallback(() => {
    setNotification(null);
  }, []);

  /**
   * Refresh all cultivation data
   */
  const refresh = useCallback(async () => {
    await loadCultivation();
  }, [loadCultivation]);

  // Load initial data
  useEffect(() => {
    loadCultivation();
  }, [loadCultivation]);

  const value = {
    // State
    cultivation,
    loading,
    error,
    shop,
    leaderboard,
    realms,
    expLog,
    notification,
    
    // Actions
    loadCultivation,
    checkIn,
    claimReward,
    loadShop,
    purchaseItem,
    equip,
    unequip,
    useItem,
    loadLeaderboard,
    loadRealms,
    loadExpLog,
    addExp,
    clearNotification,
    refresh
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
