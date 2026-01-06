import Cultivation from "../../models/Cultivation.js";

/**
 * GET /api/cultivation/summary
 * Lightweight endpoint for homepage - minimal data only
 */
export const getSummary = async (req, res, next) => {
    try {
        const userId = req.user.id;

        const cultivation = await Cultivation.findOne({ user: userId })
            .select('exp realmLevel realmName subLevel spiritStones loginStreak lastLoginDayKey dataVersion')
            .lean();

        if (!cultivation) {
            return res.status(404).json({
                success: false,
                message: 'Cultivation not found'
            });
        }

        res.json({
            success: true,
            data: {
                exp: cultivation.exp,
                realmLevel: cultivation.realmLevel,
                realmName: cultivation.realmName,
                subLevel: cultivation.subLevel,
                spiritStones: cultivation.spiritStones,
                loginStreak: cultivation.loginStreak,
                dataVersion: cultivation.dataVersion
            }
        });
    } catch (error) {
        console.error('[CULTIVATION] Error getting summary:', error);
        next(error);
    }
};
