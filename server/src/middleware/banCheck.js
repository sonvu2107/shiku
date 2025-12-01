/**
 * Ban Check Middleware
 * 
 * Kiểm tra trạng thái ban của user và tự động unban khi hết hạn.
 * 
 * @module banCheck
 */

import User from "../models/User.js";

/**
 * Middleware kiểm tra trạng thái ban của user
 * 
 * - Tự động unban nếu thời gian ban đã hết
 * - Trả về lỗi 403 nếu user vẫn bị ban
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export const checkBanStatus = async (req, res, next) => {
  try {
    if (!req.user) return next();
    
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ error: "Người dùng không tồn tại" });
    
    if (user.isBanned && user.banExpiresAt && new Date() >= user.banExpiresAt) {
      user.isBanned = false;
      user.banReason = "";
      user.bannedAt = null;
      user.banExpiresAt = null;
      user.bannedBy = null;
      await user.save();
      return next();
    }
    
    if (user.isCurrentlyBanned()) {
      const remainingMinutes = user.getRemainingBanTime();
      const banMessage = remainingMinutes === -1 
        ? `Bạn đã bị cấm vĩnh viễn. Lý do: ${user.banReason}`
        : `Bạn đã bị cấm ${remainingMinutes} phút nữa. Lý do: ${user.banReason}`;
      
      return res.status(403).json({ 
        error: banMessage,
        isBanned: true,
        remainingMinutes,
        banReason: user.banReason
      });
    }
    
    next();
  } catch (error) {
    next(error);
  }
};
