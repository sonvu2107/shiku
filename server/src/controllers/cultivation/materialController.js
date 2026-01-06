/**
 * Material Controller - API endpoints for materials system
 * Handles material catalog, user inventory, and adding drops
 */

import Cultivation from '../../models/Cultivation.js';
import { DropLog, MATERIAL_TEMPLATES, MATERIAL_TEMPLATES_MAP } from '../../models/Material.js';

/**
 * GET /api/cultivation/materials/catalog
 * Get all available material templates (catalog)
 */
export const getMaterialCatalog = async (req, res, next) => {
    try {
        const { tier, element } = req.query;

        let materials = [...MATERIAL_TEMPLATES];

        // Filter by tier if specified
        if (tier) {
            const tierNum = parseInt(tier);
            materials = materials.filter(m => m.tier === tierNum);
        }

        // Filter by element if specified
        if (element) {
            materials = materials.filter(m => m.element === element);
        }

        res.json({
            success: true,
            data: {
                materials,
                total: materials.length
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * GET /api/cultivation/materials/inventory
 * Get user's material inventory
 */
export const getUserMaterials = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const { tier, rarity, element, sortBy = 'tier' } = req.query;

        const cultivation = await Cultivation.findOne({ user: userId })
            .select('materials')
            .lean();

        if (!cultivation) {
            return res.status(404).json({
                success: false,
                message: 'Chưa bắt đầu tu tiên'
            });
        }

        let materials = cultivation.materials || [];

        // Filter
        if (tier) {
            const tierNum = parseInt(tier);
            materials = materials.filter(m => m.tier === tierNum);
        }
        if (rarity) {
            materials = materials.filter(m => m.rarity === rarity);
        }
        if (element) {
            materials = materials.filter(m => m.element === element);
        }

        // Sort
        materials.sort((a, b) => {
            if (sortBy === 'tier') return b.tier - a.tier;
            if (sortBy === 'rarity') {
                const rarityOrder = ['mythic', 'legendary', 'epic', 'rare', 'uncommon', 'common'];
                return rarityOrder.indexOf(a.rarity) - rarityOrder.indexOf(b.rarity);
            }
            if (sortBy === 'qty') return b.qty - a.qty;
            return 0;
        });

        // Calculate totals
        const totals = {
            total: materials.reduce((sum, m) => sum + m.qty, 0),
            byRarity: {},
            byElement: {},
            byTier: {}
        };

        for (const m of materials) {
            totals.byRarity[m.rarity] = (totals.byRarity[m.rarity] || 0) + m.qty;
            if (m.element) {
                totals.byElement[m.element] = (totals.byElement[m.element] || 0) + m.qty;
            }
            totals.byTier[m.tier] = (totals.byTier[m.tier] || 0) + m.qty;
        }

        res.json({
            success: true,
            data: {
                materials,
                totals
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Add materials to user's inventory (internal function)
 * Called by dungeonController when completing dungeon
 * @param {ObjectId} userId - User ID
 * @param {Array} drops - Array of material drops from dropService
 * @returns {Object} Updated materials summary
 */
export const addMaterialsToInventory = async (userId, drops) => {
    if (!drops || drops.length === 0) {
        return { added: 0 };
    }

    const cultivation = await Cultivation.findOne({ user: userId });
    if (!cultivation) {
        throw new Error('Cultivation not found');
    }

    // Initialize materials array if needed
    if (!cultivation.materials) {
        cultivation.materials = [];
    }

    const addedMaterials = [];

    for (const drop of drops) {
        // Find existing material with same templateId + rarity
        const existingIdx = cultivation.materials.findIndex(
            m => m.templateId === drop.templateId && m.rarity === drop.rarity
        );

        if (existingIdx >= 0) {
            // Stack with existing
            cultivation.materials[existingIdx].qty += drop.qty;
            addedMaterials.push({
                ...drop,
                newQty: cultivation.materials[existingIdx].qty,
                stacked: true
            });
        } else {
            // Add new entry
            cultivation.materials.push({
                templateId: drop.templateId,
                name: drop.name,
                tier: drop.tier,
                rarity: drop.rarity,
                element: drop.element,
                icon: drop.icon,
                qty: drop.qty,
                acquiredAt: new Date()
            });
            addedMaterials.push({
                ...drop,
                newQty: drop.qty,
                stacked: false
            });
        }
    }

    await cultivation.save();

    return {
        added: addedMaterials.length,
        materials: addedMaterials
    };
};

/**
 * Log material drop (for audit/analytics)
 * @param {ObjectId} userId - User ID
 * @param {string} dungeonId - Dungeon ID
 * @param {Array} drops - Drops array
 * @param {Object} dropMeta - Drop metadata
 */
export const logMaterialDrop = async (userId, dungeonId, drops, dropMeta) => {
    try {
        await DropLog.create({
            userId,
            dungeonId,
            difficulty: dropMeta.difficulty,
            drops: drops.map(d => ({
                templateId: d.templateId,
                rarity: d.rarity,
                tier: d.tier,
                element: d.element,
                qty: d.qty
            })),
            dropMeta: {
                rollsBase: dropMeta.rollsBase,
                rollsBonus: dropMeta.rollsBonus,
                bonuses: dropMeta.bonuses,
                dungeonTier: dropMeta.dungeonTier
            }
        });
    } catch (error) {
        console.error('[MaterialController] Log drop failed:', error.message);
        // Don't throw - logging failure shouldn't break gameplay
    }
};

/**
 * GET /api/cultivation/materials/drops/history
 * Get user's recent drop history
 */
export const getDropHistory = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const { limit = 20 } = req.query;

        const logs = await DropLog.find({ userId })
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
    getMaterialCatalog,
    getUserMaterials,
    addMaterialsToInventory,
    logMaterialDrop,
    getDropHistory
};
