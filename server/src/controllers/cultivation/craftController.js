/**
 * Craft Controller - API endpoints for crafting system
 * Handles equipment crafting from materials
 */

import mongoose from 'mongoose';
import Cultivation from '../../models/Cultivation.js';
import Equipment from '../../models/Equipment.js';
import {
    executeCraft,
    previewCraft,
    CRAFTABLE_EQUIPMENT_TYPES
} from '../../services/craftService.js';

// ==================== CRAFT LOG SCHEMA ====================
const CraftLogSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },

    // Materials consumed
    materialsConsumed: [{
        templateId: String,
        name: String,
        rarity: String,
        tier: Number,
        element: String,
        qty: Number
    }],

    // Result
    resultEquipmentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Equipment'
    },
    resultRarity: String,
    resultType: String,
    resultName: String,

    // Crafting metadata
    craftMeta: {
        probTableUsed: String,
        highestInputRarity: String,
        dominantElement: String,
        tierCrafted: Number
    },

    success: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true,
    collection: 'craft_logs'
});

CraftLogSchema.index({ userId: 1, createdAt: -1 });

let CraftLog;
try {
    CraftLog = mongoose.model('CraftLog');
} catch {
    CraftLog = mongoose.model('CraftLog', CraftLogSchema);
}

/**
 * GET /api/cultivation/craft/types
 * Get list of craftable equipment types
 */
export const getCraftableTypes = async (req, res, next) => {
    try {
        res.json({
            success: true,
            data: {
                types: CRAFTABLE_EQUIPMENT_TYPES
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * POST /api/cultivation/craft/preview
 * Preview craft result probabilities without crafting
 */
export const previewCraftResult = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const { materialIds } = req.body;

        if (!materialIds || !Array.isArray(materialIds) || materialIds.length < 3) {
            return res.status(400).json({
                success: false,
                message: 'Cần chọn ít nhất 3 nguyên liệu luyện khí'
            });
        }

        // Get user's materials
        const cultivation = await Cultivation.findOne({ user: userId })
            .select('materials')
            .lean();

        if (!cultivation) {
            return res.status(404).json({
                success: false,
                message: 'Đạo hữu chưa nhập môn tu tiên, không thể luyện khí'
            });
        }

        // Map materialIds to actual materials (using index or templateId+rarity)
        const selectedMaterials = [];
        for (const id of materialIds) {
            // id format: "templateId_rarity" or index
            const mat = cultivation.materials.find(m =>
                `${m.templateId}_${m.rarity}` === id
            );
            if (mat && mat.qty > 0) {
                selectedMaterials.push(mat);
            }
        }

        if (selectedMaterials.length < 3) {
            return res.status(400).json({
                success: false,
                message: 'Nguyên liệu linh lực bất túc, vô pháp tế luyện'
            });
        }

        const preview = previewCraft(selectedMaterials);

        res.json({
            success: true,
            data: preview
        });
    } catch (error) {
        next(error);
    }
};

/**
 * POST /api/cultivation/craft/execute
 * Execute crafting - consume materials and create equipment
 */
export const executeCrafting = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const { materialIds, targetType, targetSubtype } = req.body;

        // Validate input
        if (!materialIds || !Array.isArray(materialIds) || materialIds.length < 3) {
            return res.status(400).json({
                success: false,
                message: 'Linh khí bất túc, tối thiểu cần 3 nguyên liệu để luyện thành pháp khí'
            });
        }

        if (!targetType || !targetSubtype) {
            return res.status(400).json({
                success: false,
                message: 'Chưa chọn hình thái pháp khí cần luyện'
            });
        }

        // Get user's cultivation with materials
        const cultivation = await Cultivation.findOne({ user: userId });

        if (!cultivation) {
            return res.status(404).json({
                success: false,
                message: 'Tu vi chưa đủ, chưa thể nhập môn luyện khí chi đạo'
            });
        }

        // Find and validate materials
        const selectedMaterials = [];
        const consumeList = []; // Track what to consume

        for (const id of materialIds) {
            const matIndex = cultivation.materials.findIndex(m =>
                `${m.templateId}_${m.rarity}` === id && m.qty > 0
            );

            if (matIndex === -1) {
                return res.status(400).json({
                    success: false,
                    message: `Nguyên liệu đã tiêu tán hoặc không tồn tại trong kho báu`
                });
            }

            const mat = cultivation.materials[matIndex];

            // Check if same material already selected (need multiple qty)
            const existingConsume = consumeList.find(c => c.index === matIndex);
            if (existingConsume) {
                if (mat.qty <= existingConsume.qty) {
                    return res.status(400).json({
                        success: false,
                        message: `${mat.name} nguyên liệu đã cạn kiệt, không đủ số lượng`
                    });
                }
                existingConsume.qty += 1;
            } else {
                consumeList.push({ index: matIndex, qty: 1 });
            }

            selectedMaterials.push({
                templateId: mat.templateId,
                name: mat.name,
                rarity: mat.rarity,
                tier: mat.tier,
                element: mat.element
            });
        }

        // Get tier from materials
        const tier = selectedMaterials[0].tier;

        // Execute craft logic with subtype
        const craftResult = executeCraft(selectedMaterials, targetType, targetSubtype, tier);

        if (!craftResult.success) {
            return res.status(400).json({
                success: false,
                message: craftResult.error
            });
        }

        // Consume materials
        for (const consume of consumeList) {
            cultivation.materials[consume.index].qty -= consume.qty;
        }

        // Remove materials with 0 qty
        cultivation.materials = cultivation.materials.filter(m => m.qty > 0);

        // Create equipment in database
        const newEquipment = new Equipment({
            name: craftResult.equipment.name,
            type: craftResult.equipment.type,
            subtype: craftResult.equipment.subtype,
            slot: craftResult.equipment.slot,
            rarity: craftResult.equipment.rarity,
            level_required: tier,
            realm_required: craftResult.equipment.realmRequired,
            tier: tier,
            element: craftResult.equipment.element,
            stats: {
                attack: craftResult.equipment.stats.attack || 0,
                defense: craftResult.equipment.stats.defense || 0,
                hp: craftResult.equipment.stats.hp || 0, // Using standard 'hp' key
                zhenYuan: craftResult.equipment.stats.zhenYuan || 0,
                crit_rate: craftResult.equipment.stats.crit_rate || 0, // Already 0-1
                crit_damage: craftResult.equipment.stats.crit_damage || 0, // Already 0-1
                penetration: craftResult.equipment.stats.penetration || 0,
                speed: craftResult.equipment.stats.speed || 0,
                evasion: (craftResult.equipment.stats.dodge || 0) / 100, // Legacy key 'dodge' is 0-100, divide to get 0-1
                hit_rate: (craftResult.equipment.stats.accuracy || 0) / 100, // Legacy key 'accuracy' is 0-100
                resistance: craftResult.equipment.stats.resistance || 0,
                lifesteal: (craftResult.equipment.stats.lifesteal || 0) / 100 // Legacy key 'lifesteal' is 0-100? No, check craftService
            },
            modifiers: craftResult.equipment.modifiers || [],
            durability: craftResult.equipment.durability,
            special_effect: craftResult.equipment.element ?
                `Ngũ Hành: ${craftResult.equipment.element.toUpperCase()}` : null,
            lifesteal: (craftResult.equipment.stats.lifesteal || 0) / 100,
            energy_regen: craftResult.equipment.stats.regeneration || 0,
            description: `Dùng ${selectedMaterials.length} linh vật cấp ${tier} tế luyện, linh khí sung túc`,
            created_by: userId,
            is_active: true
        });

        await newEquipment.save();

        // Add to inventory
        cultivation.inventory.push({
            itemId: newEquipment._id.toString(),
            name: craftResult.equipment.name,
            type: `equipment_${craftResult.equipment.type}`,
            quantity: 1,
            equipped: false,
            acquiredAt: new Date(),
            metadata: {
                equipmentId: newEquipment._id,
                rarity: craftResult.equipment.rarity,
                tier: tier,
                element: craftResult.equipment.element,
                stats: craftResult.equipment.stats,
                craftedAt: new Date()
            }
        });

        await cultivation.save();

        // Log craft
        try {
            await CraftLog.create({
                userId,
                materialsConsumed: selectedMaterials,
                resultEquipmentId: newEquipment._id,
                resultRarity: craftResult.equipment.rarity,
                resultType: craftResult.equipment.type,
                resultName: craftResult.equipment.name,
                craftMeta: {
                    probTableUsed: craftResult.craftInfo.probTableUsed,
                    highestInputRarity: craftResult.equipment.craftMeta.highestInputRarity,
                    dominantElement: craftResult.equipment.element,
                    tierCrafted: tier
                },
                success: true
            });
        } catch (logError) {
            console.error('[Craft] Log failed:', logError.message);
        }

        res.json({
            success: true,
            message: `Luyện khí thành công! ${craftResult.equipment.name} xuất thế, nguyên khí vạn trượng!`,
            data: {
                equipment: {
                    id: newEquipment._id,
                    name: craftResult.equipment.name,
                    type: craftResult.equipment.type,
                    rarity: craftResult.equipment.rarity,
                    tier: tier,
                    element: craftResult.equipment.element,
                    stats: craftResult.equipment.stats
                },
                craftInfo: craftResult.craftInfo,
                materialsConsumed: selectedMaterials.length
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * GET /api/cultivation/craft/history
 * Get user's crafting history
 */
export const getCraftHistory = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const { limit = 20 } = req.query;

        const logs = await CraftLog.find({ userId })
            .sort({ createdAt: -1 })
            .limit(parseInt(limit))
            .lean();

        res.json({
            success: true,
            data: {
                logs,
                total: logs.length
            }
        });
    } catch (error) {
        next(error);
    }
};

export default {
    getCraftableTypes,
    previewCraftResult,
    executeCrafting,
    getCraftHistory
};
