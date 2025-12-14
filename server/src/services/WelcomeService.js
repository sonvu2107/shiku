/**
 * Welcome Service
 * 
 * Service xử lý các thao tác liên quan đến hệ thống chào mừng user mới:
 * - Tạo welcome notification khi đăng ký
 * - Broadcast thông báo có user mới
 * - Đánh dấu đã xem welcome
 * - Đánh dấu first post và hoàn thành onboarding
 * 
 * @module WelcomeService
 */

import Notification from "../models/Notification.js";
import User from "../models/User.js";

// Throttle map: lưu timestamp broadcast gần nhất
const lastBroadcastTime = new Map();
const BROADCAST_THROTTLE_MS = 5 * 60 * 1000; // 5 phút

class WelcomeService {

    /**
     * Đánh dấu firstLoginAt khi user đăng ký (gọi 1 lần duy nhất)
     * @param {string} userId - User ID
     */
    static async ensureFirstLogin(userId) {
        try {
            await User.updateOne(
                { _id: userId, firstLoginAt: { $exists: false } },
                { $set: { firstLoginAt: new Date() } }
            );
        } catch (error) {
            console.error("[WelcomeService] Error setting firstLoginAt:", error);
        }
    }

    /**
     * Tạo welcome notification cho user mới
     * @param {string} userId - User ID
     */
    static async createWelcomeNotification(userId) {
        try {
            // Check xem đã có welcome notification chưa
            const exists = await Notification.findOne({
                recipient: userId,
                type: "welcome"
            });

            if (exists) return; // Đã tạo rồi

            await Notification.create({
                recipient: userId,
                sender: null, // System notification
                type: "welcome",
                title: "Chào mừng đến Shiku! 👋",
                message: "Đây là nơi mọi người chia sẻ suy nghĩ và kết nối. Hãy đăng bài đầu tiên nhé!",
                data: {
                    url: "/",
                    metadata: { action: "create_first_post" }
                }
            });

            console.log("[WelcomeService] Created welcome notification for user:", userId);
        } catch (error) {
            console.error("[WelcomeService] Error creating welcome notification:", error);
        }
    }

    /**
     * Broadcast thông báo có user mới tham gia (throttled)
     * @param {Object} options - { io, newUser }
     */
    static async broadcastNewMember({ io, newUser }) {
        if (!io || !newUser) return;

        try {
            const now = Date.now();
            const lastBroadcast = lastBroadcastTime.get("global") || 0;

            // Throttle: chỉ broadcast nếu đã qua 5 phút
            if (now - lastBroadcast < BROADCAST_THROTTLE_MS) {
                console.log("[WelcomeService] Broadcast throttled, skipping");
                return;
            }

            lastBroadcastTime.set("global", now);

            // Emit socket event cho tất cả connected users
            io.emit("new-member", {
                userId: newUser._id,
                userName: newUser.name,
                avatarUrl: newUser.avatarUrl,
                message: `${newUser.name} vừa tham gia Shiku!`,
                timestamp: new Date().toISOString()
            });

            console.log("[WelcomeService] Broadcasted new member:", newUser.name);
        } catch (error) {
            console.error("[WelcomeService] Error broadcasting new member:", error);
        }
    }

    /**
     * Lấy welcome data cho user
     * @param {string} userId - User ID
     * @returns {Object} { shouldShowWelcome, isNewUser, hasFirstPost }
     */
    static async getWelcomeData(userId) {
        try {
            const user = await User.findById(userId)
                .select("welcomeShown firstPostAt firstLoginAt createdAt")
                .lean();

            if (!user) {
                return { shouldShowWelcome: false, isNewUser: false, hasFirstPost: false };
            }

            // Check isNewUser manually (vì lean() không có virtuals)
            const referenceDate = user.firstLoginAt || user.createdAt;
            const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
            const isNewUser = referenceDate > sevenDaysAgo;

            return {
                shouldShowWelcome: !user.welcomeShown && isNewUser,
                isNewUser,
                hasFirstPost: !!user.firstPostAt,
                firstLoginAt: user.firstLoginAt,
                firstPostAt: user.firstPostAt
            };
        } catch (error) {
            console.error("[WelcomeService] Error getting welcome data:", error);
            return { shouldShowWelcome: false, isNewUser: false, hasFirstPost: false };
        }
    }

    /**
     * Đánh dấu đã hiển thị welcome modal
     * @param {string} userId - User ID
     */
    static async markWelcomeShown(userId) {
        try {
            await User.updateOne(
                { _id: userId },
                { $set: { welcomeShown: true } }
            );
            console.log("[WelcomeService] Marked welcomeShown for user:", userId);
        } catch (error) {
            console.error("[WelcomeService] Error marking welcomeShown:", error);
        }
    }

    /**
     * Đánh dấu first post và complete onboarding
     * @param {string} userId - User ID
     * @param {string} postId - Post ID (optional, for logging)
     */
    static async markFirstPost(userId, postId = null) {
        try {
            const result = await User.updateOne(
                { _id: userId, firstPostAt: { $exists: false } },
                {
                    $set: {
                        firstPostAt: new Date(),
                        onboardingCompletedAt: new Date()
                    }
                }
            );

            if (result.modifiedCount > 0) {
                console.log("[WelcomeService] Marked firstPost for user:", userId, "postId:", postId);
            }
        } catch (error) {
            console.error("[WelcomeService] Error marking firstPost:", error);
        }
    }
}

export default WelcomeService;
