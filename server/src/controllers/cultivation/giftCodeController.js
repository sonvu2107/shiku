/**
 * GiftCode Controller - Xử lý nhập mã quà tặng
 */

import GiftCode from '../../models/GiftCode.js';
import Cultivation from '../../models/Cultivation.js';

/**
 * POST /api/cultivation/giftcode/redeem
 * Nhập mã quà tặng
 */
export const redeemGiftCode = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const { code } = req.body;

        if (!code || typeof code !== 'string') {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng nhập mã quà tặng'
            });
        }

        // Tìm code
        const giftCode = await GiftCode.findValidCode(code);
        if (!giftCode) {
            return res.status(404).json({
                success: false,
                message: 'Mã không tồn tại hoặc đã hết hạn'
            });
        }

        // Lấy thông tin cultivation
        const cultivation = await Cultivation.findOne({ user: userId });
        if (!cultivation) {
            return res.status(404).json({
                success: false,
                message: 'Chưa bắt đầu tu tiên'
            });
        }

        // Kiểm tra có thể dùng không
        const canUse = giftCode.canUserUse(userId, cultivation.realmLevel);
        if (!canUse.valid) {
            return res.status(400).json({
                success: false,
                message: canUse.reason
            });
        }

        // Áp dụng phần thưởng
        const rewards = giftCode.rewards;
        const appliedRewards = {
            spiritStones: 0,
            exp: 0,
            items: []
        };

        // Cộng linh thạch
        if (rewards.spiritStones > 0) {
            cultivation.spiritStones += rewards.spiritStones;
            cultivation.totalSpiritStonesEarned += rewards.spiritStones;
            appliedRewards.spiritStones = rewards.spiritStones;
        }

        // Cộng exp
        if (rewards.exp > 0) {
            cultivation.addExp(rewards.exp, 'giftcode', `Mã quà tặng: ${giftCode.name}`);
            appliedRewards.exp = rewards.exp;
        }

        // Thêm items vào inventory
        if (rewards.items && rewards.items.length > 0) {
            for (const item of rewards.items) {
                for (let i = 0; i < (item.quantity || 1); i++) {
                    cultivation.inventory.push({
                        itemId: item.itemId || `giftcode_item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                        type: item.type || 'consumable',
                        name: item.name,
                        quantity: 1,
                        equipped: false,
                        acquiredAt: new Date(),
                        source: 'giftcode',
                        metadata: {
                            ...item.metadata,
                            giftCodeId: giftCode._id,
                            giftCodeName: giftCode.name
                        }
                    });
                }
                appliedRewards.items.push({
                    name: item.name,
                    quantity: item.quantity || 1,
                    type: item.type
                });
            }
        }

        // Đánh dấu user đã dùng code
        giftCode.usedBy.push({
            userId: userId,
            usedAt: new Date(),
            username: req.user.username || req.user.name
        });
        giftCode.usedCount += 1;

        // Lưu
        await giftCode.save();
        cultivation.markModified('inventory');
        await cultivation.save();

        res.json({
            success: true,
            message: `Đã nhận thưởng từ mã "${giftCode.name}"!`,
            data: {
                codeName: giftCode.name,
                rewards: appliedRewards,
                spiritStones: cultivation.spiritStones,
                exp: cultivation.exp
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * GET /api/cultivation/giftcode/history
 * Lịch sử nhập code của user
 */
export const getGiftCodeHistory = async (req, res, next) => {
    try {
        const userId = req.user._id;

        const codes = await GiftCode.find({
            'usedBy.userId': userId
        }).select('code name description rewards usedBy').lean();

        const history = codes.map(code => {
            const usage = code.usedBy.find(u => u.userId.toString() === userId.toString());
            return {
                code: code.code,
                name: code.name,
                description: code.description,
                rewards: code.rewards,
                usedAt: usage?.usedAt
            };
        }).sort((a, b) => new Date(b.usedAt) - new Date(a.usedAt));

        res.json({
            success: true,
            data: {
                history
            }
        });
    } catch (error) {
        next(error);
    }
};

// ==================== ADMIN FUNCTIONS ====================

/**
 * POST /api/admin/giftcode/create
 * Tạo mã quà tặng mới (Admin only)
 */
export const createGiftCode = async (req, res, next) => {
    try {
        const { code, name, description, type, rewards, maxUses, startDate, endDate, requirements } = req.body;

        if (!code || !name) {
            return res.status(400).json({
                success: false,
                message: 'Mã và tên là bắt buộc'
            });
        }

        // Kiểm tra code đã tồn tại
        const existing = await GiftCode.findOne({ code: code.toUpperCase().trim() });
        if (existing) {
            return res.status(400).json({
                success: false,
                message: 'Mã này đã tồn tại'
            });
        }

        const giftCode = new GiftCode({
            code: code.toUpperCase().trim(),
            name,
            description: description || '',
            type: type || 'limited',
            rewards: rewards || { spiritStones: 0, exp: 0, items: [] },
            maxUses: maxUses || 1,
            startDate: startDate ? new Date(startDate) : new Date(),
            endDate: endDate ? new Date(endDate) : null,
            requirements: requirements || { minRealmLevel: 1, maxRealmLevel: 999 },
            createdBy: req.user._id,
            isActive: true
        });

        await giftCode.save();

        res.json({
            success: true,
            message: 'Tạo mã thành công',
            data: giftCode
        });
    } catch (error) {
        next(error);
    }
};

/**
 * GET /api/admin/giftcode/list
 * Danh sách tất cả mã (Admin only)
 */
export const listGiftCodes = async (req, res, next) => {
    try {
        const { page = 1, limit = 20, active } = req.query;

        const query = {};
        if (active !== undefined) {
            query.isActive = active === 'true';
        }

        const codes = await GiftCode.find(query)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit))
            .populate('createdBy', 'username name')
            .lean();

        const total = await GiftCode.countDocuments(query);

        res.json({
            success: true,
            data: {
                codes,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    pages: Math.ceil(total / limit)
                }
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * PUT /api/admin/giftcode/:id
 * Cập nhật mã (Admin only)
 */
export const updateGiftCode = async (req, res, next) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        const giftCode = await GiftCode.findById(id);
        if (!giftCode) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy mã'
            });
        }

        // Cập nhật các field cho phép
        const allowedUpdates = ['name', 'description', 'type', 'rewards', 'maxUses', 'startDate', 'endDate', 'requirements', 'isActive'];
        allowedUpdates.forEach(field => {
            if (updates[field] !== undefined) {
                giftCode[field] = updates[field];
            }
        });

        await giftCode.save();

        res.json({
            success: true,
            message: 'Cập nhật thành công',
            data: giftCode
        });
    } catch (error) {
        next(error);
    }
};

/**
 * DELETE /api/admin/giftcode/:id
 * Xóa mã (Admin only)
 */
export const deleteGiftCode = async (req, res, next) => {
    try {
        const { id } = req.params;

        const result = await GiftCode.findByIdAndDelete(id);
        if (!result) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy mã'
            });
        }

        res.json({
            success: true,
            message: 'Xóa mã thành công'
        });
    } catch (error) {
        next(error);
    }
};

export default {
    redeemGiftCode,
    getGiftCodeHistory,
    createGiftCode,
    listGiftCodes,
    updateGiftCode,
    deleteGiftCode
};
