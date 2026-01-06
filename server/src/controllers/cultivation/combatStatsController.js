import Cultivation from "../../models/Cultivation.js";
import { mergeEquipmentStatsIntoCombatStats } from "./coreController.js";

/**
 * GET /api/cultivation/combat-stats-lean
 * Lightweight endpoint for combat stats - uses same calculation as original
 */
export const getCombatStatsLean = async (req, res, next) => {
    try {
        const userId = req.user.id;

        // 1. Get cultivation (need full doc for calculateCombatStats method)
        const cultivation = await Cultivation.findOne({ user: userId })
            .select('realmLevel exp equipped learnedTechniques statsVersion');

        if (!cultivation) {
            return res.status(404).json({
                success: false,
                message: 'Cultivation not found'
            });
        }

        // 2. Calculate base combat stats (same logic as original)
        let combatStats = cultivation.calculateCombatStats();

        // 3. Get equipment stats and merge
        const equipmentStats = await cultivation.getEquipmentStats();
        combatStats = mergeEquipmentStatsIntoCombatStats(combatStats, equipmentStats);

        res.json({
            success: true,
            data: {
                combatStats,
                realmLevel: cultivation.realmLevel,
                statsVersion: cultivation.statsVersion || 0
            }
        });
    } catch (error) {
        console.error('[CULTIVATION] Error getting combat stats:', error);
        next(error);
    }
};
