/**
 * Craft Controller - API endpoints for crafting system
 * Handles equipment crafting from materials
 */

import mongoose from 'mongoose';
import Cultivation from '../../models/Cultivation.js';
import Equipment from '../../models/Equipment.js';
import {
    previewCraft,
    executeCraft,
    CRAFTABLE_EQUIPMENT_TYPES,
    getCraftTableKey,
    getDominantElement,
    getHighestRarity
} from '../../services/craftService.js';
import { saveWithRetry } from '../../utils/dbUtils.js';
import { invalidateCultivationCache } from './coreController.js';
import {
    getPityConfig,
    calculateWeightedBPSTable,
    validateBPSTable,
    applyBonusBPS,
    applyPityBPS, // Still used for logging context or unused?
    // Actually, controller now delegates logic to executeCraft.
    // But I kept some logic like calculating Pity Bonus (which uses incrementPerFail from config).
    // Let's keep getPityConfig.
    // calculateWeightedBPSTable is used for validation?
    // Check code: const baseTable = calculateWeightedBPSTable(selectedMaterials); -> YES used.
    RARITY_ORDER
} from '../../services/craftService_bps.js';

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

        const preview = previewCraft(selectedMaterials, req.body.useCatalyst);

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
            return res.status(400).json({ success: false, message: 'Linh khí bất túc, tối thiểu cần 3 nguyên liệu' });
        }
        if (!targetType || !targetSubtype) {
            return res.status(400).json({ success: false, message: 'Chưa chọn hình thái pháp khí' });
        }

        const cultivation = await Cultivation.findOne({ user: userId });
        if (!cultivation) return res.status(404).json({ success: false, message: 'Chưa nhập môn tu tiên' });

        const selectedMaterials = [];
        const consumeList = [];
        for (const id of materialIds) {
            const matIndex = cultivation.materials.findIndex(m => `${m.templateId}_${m.rarity}` === id && m.qty > 0);
            if (matIndex === -1) return res.status(400).json({ success: false, message: 'Nguyên liệu không tồn tại' });

            const mat = cultivation.materials[matIndex];
            const existing = consumeList.find(c => c.index === matIndex);
            if (existing && mat.qty <= existing.qty) return res.status(400).json({ success: false, message: 'Nguyên liệu không đủ' });

            existing ? existing.qty++ : consumeList.push({ index: matIndex, qty: 1 });
            selectedMaterials.push({
                templateId: mat.templateId, name: mat.name, rarity: mat.rarity, tier: mat.tier, element: mat.element
            });
        }
        const tier = selectedMaterials[0].tier;

        // Pity & Catalyst Setup
        const PITY_KEYS = new Set(['epic', 'legendary']);
        if (!cultivation.craftPity) cultivation.craftPity = { epic: 0, legendary: 0 };

        const tableKey = getCraftTableKey(selectedMaterials);
        const pityConfig = getPityConfig(tableKey);

        // Calculate Pity Bonus
        let pityBonusBPS = 0;
        let currentPity = 0;
        if (pityConfig && PITY_KEYS.has(tableKey)) {
            currentPity = Math.max(0, cultivation.get(`craftPity.${tableKey}`) || 0);
            pityBonusBPS = Math.min(currentPity * pityConfig.incrementPerFail, pityConfig.maxBonus);
        }

        // Check Catalyst
        let useCatalyst = false;
        if (req.body.useCatalyst) {
            const catIdx = cultivation.inventory?.findIndex(i => i.itemId === 'craft_catalyst_luck' && i.quantity > 0);
            if (catIdx === -1 || catIdx === undefined) return res.status(400).json({ success: false, message: 'Không có Tạo Hóa Đan' });

            cultivation.inventory[catIdx].quantity -= 1;
            if (cultivation.inventory[catIdx].quantity <= 0) cultivation.inventory.splice(catIdx, 1);
            useCatalyst = true;
        }

        // EXECUTE CRAFT via SAFE WRAPPER
        const craftResult = executeCraft(
            selectedMaterials,
            targetType,
            targetSubtype,
            tier,
            { useCatalyst, tableKey, pityBonusBPS }
        );

        if (!craftResult.success) {
            return res.status(400).json({ success: false, message: craftResult.error });
        }

        // Pity Update
        const resultRarity = craftResult.craftInfo.resultRarity;
        const usedTableKey = craftResult.craftInfo.probTableUsed; // Should allow confirming which pities to update

        if (pityConfig && PITY_KEYS.has(usedTableKey)) {
            const pityPath = `craftPity.${usedTableKey}`;
            if (resultRarity === pityConfig.targetRarity) {
                cultivation.set(pityPath, 0);
                if (process.env.NODE_ENV !== 'production') console.log(`[Craft] Pity RESET ${usedTableKey}`);
            } else {
                cultivation.set(pityPath, currentPity + 1);
                if (process.env.NODE_ENV !== 'production') console.log(`[Craft] Pity UP ${usedTableKey}`);
            }
            cultivation.markModified('craftPity');
        }

        // Consume Materials
        for (const consume of consumeList) cultivation.materials[consume.index].qty -= consume.qty;
        cultivation.materials = cultivation.materials.filter(m => m.qty > 0);

        // Save Equipment
        const newEq = new Equipment({
            name: craftResult.equipment.name, type: craftResult.equipment.type, subtype: craftResult.equipment.subtype,
            slot: craftResult.equipment.slot, rarity: resultRarity, level_required: tier, realm_required: tier,
            tier: tier, element: craftResult.equipment.element,
            stats: {
                ...craftResult.equipment.stats, hp: craftResult.equipment.stats.hp || 0,
                evasion: (craftResult.equipment.stats.dodge || 0) / 100,
                hit_rate: (craftResult.equipment.stats.accuracy || 0) / 100,
                lifesteal: (craftResult.equipment.stats.lifesteal || 0) / 100
            },
            modifiers: craftResult.equipment.modifiers || [],
            durability: craftResult.equipment.durability,
            special_effect: craftResult.equipment.element ? `Ngũ Hành: ${craftResult.equipment.element.toUpperCase()}` : null,
            description: `Dùng ${selectedMaterials.length} linh vật cấp ${tier} tế luyện`,
            created_by: userId, is_active: true
        });
        await newEq.save();

        // Add to Inventory
        cultivation.inventory.push({
            itemId: newEq._id.toString(), name: newEq.name, type: `equipment_${newEq.type}`, quantity: 1,
            equipped: false, acquiredAt: new Date(),
            metadata: { equipmentId: newEq._id, rarity: resultRarity, tier, element: newEq.element, stats: newEq.stats }
        });

        await saveWithRetry(cultivation);
        await invalidateCultivationCache(userId);

        // Log
        try {
            await CraftLog.create({
                userId, materialsConsumed: selectedMaterials, resultEquipmentId: newEq._id,
                resultRarity, resultType: newEq.type, resultName: newEq.name,
                craftMeta: { probTableUsed: usedTableKey, dominantElement: newEq.element, tierCrafted: tier },
                success: true
            });
        } catch (e) { console.error(e); }

        res.json({
            success: true,
            message: `Luyện khí thành công! ${newEq.name} xuất thế!`,
            data: {
                equipment: { id: newEq._id, name: newEq.name, type: newEq.type, rarity: resultRarity, tier, element: newEq.element, stats: newEq.stats },
                craftInfo: craftResult.craftInfo,
                materialsConsumed: selectedMaterials.length
            }
        });

    } catch (error) { next(error); }
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
