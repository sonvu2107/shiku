/**
 * VibeCheck Service
 * 
 * Business logic cho Vibe Check feature
 * - Lấy vibe check hôm nay
 * - Vote cho 1 option
 * - Tính toán percentages
 */

import VibeCheck from "../models/VibeCheck.js";
import VibeCheckResponse from "../models/VibeCheckResponse.js";

class VibeCheckService {
    /**
     * Lấy vibe check hôm nay + kết quả
     * @param {string} userId - User ID để check đã vote chưa
     * @returns {Object} Vibe check data với hasVoted và userChoice
     */
    static async getTodayVibeCheck(userId) {
        const vibeCheck = await VibeCheck.getTodayVibeCheck();

        // Check user đã vote chưa
        let userResponse = null;
        if (userId) {
            userResponse = await VibeCheckResponse.findOne({
                user: userId,
                vibeCheck: vibeCheck._id
            });
        }

        // Calculate percentages
        const options = vibeCheck.options.map(opt => ({
            id: opt.id,
            emoji: opt.emoji,
            label: opt.label,
            votes: opt.votes,
            percentage: vibeCheck.totalVotes > 0
                ? Math.round((opt.votes / vibeCheck.totalVotes) * 100)
                : 0
        }));

        return {
            id: vibeCheck._id,
            date: vibeCheck.date,
            question: vibeCheck.question,
            options,
            totalVotes: vibeCheck.totalVotes,
            hasVoted: !!userResponse,
            userChoice: userResponse?.optionId || null
        };
    }

    /**
     * Vote cho 1 option
     * @param {string} userId - User ID
     * @param {string} optionId - Option ID đã chọn
     * @returns {Object} Updated vibe check data
     */
    static async vote(userId, optionId) {
        const vibeCheck = await VibeCheck.getTodayVibeCheck();

        // Validate option exists
        const option = vibeCheck.options.find(o => o.id === optionId);
        if (!option) {
            throw new Error("Option không hợp lệ");
        }

        // Check đã vote chưa
        const existingResponse = await VibeCheckResponse.findOne({
            user: userId,
            vibeCheck: vibeCheck._id
        });

        if (existingResponse) {
            throw new Error("Bạn đã vote rồi!");
        }

        // Tạo response
        await VibeCheckResponse.create({
            user: userId,
            vibeCheck: vibeCheck._id,
            optionId
        });

        // Update vote count
        await VibeCheck.updateOne(
            { _id: vibeCheck._id, "options.id": optionId },
            {
                $inc: {
                    "options.$.votes": 1,
                    totalVotes: 1
                }
            }
        );

        // Return updated data
        return this.getTodayVibeCheck(userId);
    }

    /**
     * Lấy lịch sử vibe check của user
     * @param {string} userId - User ID
     * @param {number} limit - Số lượng trả về
     * @returns {Array} Lịch sử votes
     */
    static async getUserHistory(userId, limit = 7) {
        const responses = await VibeCheckResponse.find({ user: userId })
            .sort({ createdAt: -1 })
            .limit(limit)
            .populate("vibeCheck", "date question options totalVotes");

        return responses.map(r => ({
            date: r.vibeCheck.date,
            question: r.vibeCheck.question,
            yourChoice: r.optionId,
            yourChoiceEmoji: r.vibeCheck.options.find(o => o.id === r.optionId)?.emoji,
            totalVotes: r.vibeCheck.totalVotes
        }));
    }
}

export default VibeCheckService;
