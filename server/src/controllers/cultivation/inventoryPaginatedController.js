import Cultivation from "../../models/Cultivation.js";
import Equipment from "../../models/Equipment.js";

/**
 * GET /api/cultivation/inventory
 * Paginated inventory endpoint with equipment enrichment
 * Query params: page (default 1), limit (default 50), type (optional filter)
 */
export const getInventoryPaginated = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
        const typeFilter = req.query.type || null; // e.g., 'equipment_weapon', 'material'

        // 1. Get user's inventory with aggregation for pagination
        const result = await Cultivation.aggregate([
            { $match: { user: userId } },
            { $project: { inventory: 1, _id: 0 } },
            { $unwind: { path: "$inventory", preserveNullAndEmptyArrays: true } },
            // Apply type filter if specified
            ...(typeFilter ? [{ $match: { "inventory.type": typeFilter } }] : []),
            // Facet for pagination + count
            {
                $facet: {
                    items: [
                        { $skip: (page - 1) * limit },
                        { $limit: limit },
                        { $replaceRoot: { newRoot: "$inventory" } }
                    ],
                    totalCount: [{ $count: "count" }]
                }
            }
        ]);

        const items = result[0]?.items || [];
        const totalCount = result[0]?.totalCount[0]?.count || 0;
        const totalPages = Math.ceil(totalCount / limit);

        // 2. Enrich equipment items with metadata
        const equipmentIds = items
            .filter(item => item.type?.startsWith('equipment_'))
            .map(item => item.itemId)
            .filter(id => id && id.length === 24);

        let equipmentMap = new Map();
        if (equipmentIds.length > 0) {
            const equipments = await Equipment.find({ _id: { $in: equipmentIds } })
                .select('name type subtype rarity stats img description level_required durability')
                .lean();

            equipments.forEach(eq => {
                equipmentMap.set(eq._id.toString(), eq);
            });
        }

        // 3. Enrich items
        const enrichedItems = items.map(item => {
            if (item.type?.startsWith('equipment_')) {
                const equipment = equipmentMap.get(item.itemId);
                if (equipment) {
                    return {
                        ...item,
                        metadata: {
                            ...equipment,
                            // Preserve runtime fields
                            durability: item.metadata?.durability || equipment.durability || { current: 100, max: 100 },
                            acquiredAt: item.metadata?.acquiredAt,
                            lastUsedAt: item.metadata?.lastUsedAt
                        }
                    };
                }
            }
            return item;
        });

        res.json({
            success: true,
            data: {
                items: enrichedItems,
                pagination: {
                    page,
                    limit,
                    totalCount,
                    totalPages,
                    hasNext: page < totalPages,
                    hasPrev: page > 1
                }
            }
        });
    } catch (error) {
        console.error('[CULTIVATION] Error getting paginated inventory:', error);
        next(error);
    }
};
