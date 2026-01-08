/**
 * Cultivation Service - Backend helper functions
 * Xử lý việc cộng exp khi user thực hiện các actions
 */

import Cultivation from "../models/Cultivation.js";
import { saveWithRetry } from "../utils/dbUtils.js";

/**
 * Cộng exp cho user khi thực hiện action
 * @param {string} userId - ID của user
 * @param {string} action - Loại action: 'post', 'comment', 'like', 'receive_like', 'friend', 'event'
 * @param {Object} options - Tùy chọn thêm
 * @returns {Object} Kết quả cộng exp
 */
export async function addExpForAction(userId, action, options = {}) {
  if (!userId) return null;

  try {
    const cultivation = await Cultivation.getOrCreate(userId);

    // Định nghĩa exp cho mỗi action
    const expRewards = {
      post: 30,           // Đăng bài viết
      comment: 10,        // Bình luận
      like: 2,            // Thích bài viết (legacy - backward compatibility)
      upvote: 2,          // Upvote bài viết (NEW)
      receive_like: 3,    // Nhận lượt thích (legacy)
      receive_upvote: 3,  // Nhận upvote (NEW)
      receive_comment: 5, // Nhận bình luận
      friend: 20,         // Kết bạn
      event: 50,          // Tham gia sự kiện
      share: 15,          // Chia sẻ
      story: 15           // Đăng story
    };

    const spiritStoneRewards = {
      post: 5,
      comment: 2,
      like: 1,            // Legacy
      upvote: 1,          // NEW
      receive_like: 1,    // Legacy
      receive_upvote: 1,  // NEW
      receive_comment: 2,
      friend: 5,
      event: 10,
      share: 3,
      story: 3
    };

    const expAmount = expRewards[action] || 0;
    const stoneAmount = spiritStoneRewards[action] || 0;

    if (expAmount === 0) return null;

    // Cộng exp
    const expResult = cultivation.addExp(
      expAmount,
      action,
      options.description || `Thực hiện: ${action}`
    );

    // Cộng linh thạch
    if (stoneAmount > 0) {
      cultivation.addSpiritStones(stoneAmount, action);
    }

    // Cập nhật quest progress
    const questResults = cultivation.updateQuestProgress(action, 1);

    await saveWithRetry(cultivation);

    return {
      expAdded: expResult.addedExp,
      stonesAdded: stoneAmount,
      totalExp: expResult.totalExp,
      leveledUp: expResult.leveledUp,
      newRealm: expResult.newRealm,
      questsCompleted: questResults.filter(q => q.type === 'completed').length
    };
  } catch (error) {
    console.error(`[CULTIVATION] Error adding exp for action ${action}:`, error);
    return null;
  }
}

/**
 * Cộng exp cho người nhận (khi bài viết được like, comment, etc.)
 * @param {string} authorId - ID của tác giả
 * @param {string} action - Loại action nhận được
 */
export async function addExpForReceiver(authorId, action) {
  const receiverActions = {
    like: 'receive_like',      // Legacy
    upvote: 'receive_upvote',  // NEW
    comment: 'receive_comment'
  };

  const receiverAction = receiverActions[action];
  if (!receiverAction) return null;

  return addExpForAction(authorId, receiverAction, {
    description: `Nhận ${action} từ người dùng khác`
  });
}

/**
 * Lấy thông tin cultivation cơ bản cho user (dùng để hiển thị badge)
 */
export async function getCultivationBasicInfo(userId) {
  if (!userId) return null;

  try {
    const cultivation = await Cultivation.findOne({ user: userId })
      .select('exp realmLevel realmName subLevel equipped')
      .lean();

    if (!cultivation) {
      // Trả về default cho user chưa có cultivation
      return {
        exp: 0,
        realmLevel: 1,
        realmName: "Phàm Nhân",
        subLevel: 1,
        equipped: {}
      };
    }

    return cultivation;
  } catch (error) {
    console.error('[CULTIVATION] Error getting basic info:', error);
    return null;
  }
}

/**
 * Batch get cultivation info cho nhiều users
 */
export async function getCultivationBatch(userIds) {
  if (!userIds || userIds.length === 0) return {};

  try {
    const cultivations = await Cultivation.find({
      user: { $in: userIds }
    })
      .select('user exp realmLevel realmName subLevel equipped')
      .lean();

    // Convert to map
    const result = {};
    cultivations.forEach(c => {
      result[c.user.toString()] = {
        exp: c.exp,
        realmLevel: c.realmLevel,
        realmName: c.realmName,
        subLevel: c.subLevel,
        equipped: c.equipped
      };
    });

    return result;
  } catch (error) {
    console.error('[CULTIVATION] Error batch getting info:', error);
    return {};
  }
}

export default {
  addExpForAction,
  addExpForReceiver,
  getCultivationBasicInfo,
  getCultivationBatch
};
