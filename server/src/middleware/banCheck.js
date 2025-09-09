import User from "../models/User.js";

// Middleware to check if user is banned
export const checkBanStatus = async (req, res, next) => {
  try {
    if (!req.user) return next();
    
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ error: "User không tồn tại" });
    
    // Auto-unban if ban time has expired
    if (user.isBanned && user.banExpiresAt && new Date() >= user.banExpiresAt) {
      user.isBanned = false;
      user.banReason = "";
      user.bannedAt = null;
      user.banExpiresAt = null;
      user.bannedBy = null;
      await user.save();
      return next();
    }
    
    // Check if still banned
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
