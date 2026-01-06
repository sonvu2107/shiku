/**
 * Equipment Controller - Equipment management APIs
 * Handles repair, enhancement, and equipment info
 */

import Cultivation from '../../models/Cultivation.js';
import Equipment from '../../models/Equipment.js';
import {
    repairDurability,
    checkRealmLock,
    calculateActiveModifiers,
    calculateElementSynergy,
    MODIFIER_TYPES
} from '../../services/modifierService.js';

// ==================== REPAIR COST CONFIG ====================
// Chi phí sửa chữa (linh thạch/điểm độ bền) - đã giảm 60%
const REPAIR_COST_PER_POINT = {
    common: 1,      // Phàm
    uncommon: 1,    // Thường (giảm từ 2)
    rare: 2,        // Hiếm (giảm từ 5)
    epic: 4,        // Sử Thi (giảm từ 10)
    legendary: 10,  // Huyền Thoại (giảm từ 25)
    mythic: 20      // Thần Thoại (giảm từ 50)
};

/**
 * GET /api/cultivation/equipment/:equipmentId
 * Get equipment details with modifiers
 */
export const getEquipmentDetails = async (req, res, next) => {
    try {
        const { equipmentId } = req.params;

        const equipment = await Equipment.findById(equipmentId).lean();

        if (!equipment) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy trang bị'
            });
        }

        // Map modifier types to readable info
        const modifiersWithInfo = (equipment.modifiers || []).map(mod => ({
            ...mod,
            info: MODIFIER_TYPES[mod.type] || { name: mod.type, description: '' }
        }));

        res.json({
            success: true,
            data: {
                ...equipment,
                modifiers: modifiersWithInfo
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * POST /api/cultivation/equipment/:equipmentId/repair
 * Repair equipment durability
 */
export const repairEquipment = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const { equipmentId } = req.params;
        const { amount = 'full' } = req.body; // 'full' or number

        // Get user's cultivation
        const cultivation = await Cultivation.findOne({ user: userId });
        if (!cultivation) {
            return res.status(404).json({
                success: false,
                message: 'Chưa bắt đầu tu tiên'
            });
        }

        // Find equipment in inventory
        const invItem = cultivation.inventory.find(i =>
            i.metadata?.equipmentId?.toString() === equipmentId ||
            i.itemId === equipmentId
        );

        if (!invItem) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy trang bị trong kho đồ'
            });
        }

        // Get equipment from DB
        const equipment = await Equipment.findById(equipmentId);
        if (!equipment) {
            return res.status(404).json({
                success: false,
                message: 'Trang bị không tồn tại'
            });
        }

        // Calculate repair needed
        if (!equipment.durability) {
            equipment.durability = { current: 100, max: 100 };
        }

        const durabilityToRepair = amount === 'full'
            ? equipment.durability.max - equipment.durability.current
            : Math.min(amount, equipment.durability.max - equipment.durability.current);

        if (durabilityToRepair <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Trang bị không cần sửa chữa'
            });
        }

        // Calculate cost
        const costPerPoint = REPAIR_COST_PER_POINT[equipment.rarity] || 5;
        const totalCost = durabilityToRepair * costPerPoint;

        // Check if user has enough spirit stones
        if (cultivation.spiritStones < totalCost) {
            return res.status(400).json({
                success: false,
                message: `Cần ${totalCost} linh thạch để sửa chữa, bạn có ${cultivation.spiritStones}`
            });
        }

        // Deduct cost and repair
        cultivation.spiritStones -= totalCost;
        repairDurability(equipment, durabilityToRepair);

        await equipment.save();
        await cultivation.save();

        res.json({
            success: true,
            message: `Đã sửa chữa ${durabilityToRepair} độ bền với ${totalCost} linh thạch`,
            data: {
                equipment: {
                    id: equipment._id,
                    name: equipment.name,
                    durability: equipment.durability
                },
                cost: totalCost,
                remainingSpiritStones: cultivation.spiritStones
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * POST /api/cultivation/equipment/repair-all
 * Tu bổ tất cả equipment bị hư hỏng
 */
export const repairAllEquipment = async (req, res, next) => {
    try {
        const userId = req.user._id;

        // Get user's cultivation
        const cultivation = await Cultivation.findOne({ user: userId });
        if (!cultivation) {
            return res.status(404).json({
                success: false,
                message: 'Chưa bắt đầu tu tiên'
            });
        }

        // Lấy tất cả equipment trong inventory cần repair
        // Equipment được lưu với itemId là equipmentId, hoặc metadata._id
        const equipmentItems = cultivation.inventory.filter(i => 
            i.type?.startsWith('equipment_') && (i.itemId || i.metadata?._id)
        );

        if (equipmentItems.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Không có trang bị nào trong kho'
            });
        }

        const equipmentIds = equipmentItems.map(i => i.metadata?._id || i.itemId);
        const equipments = await Equipment.find({ _id: { $in: equipmentIds } });

        // Tính tổng chi phí
        let totalCost = 0;
        let totalDurabilityToRepair = 0;
        const repairDetails = [];

        for (const eq of equipments) {
            if (!eq.durability) {
                eq.durability = { current: 100, max: 100 };
            }
            
            const durabilityToRepair = eq.durability.max - eq.durability.current;
            if (durabilityToRepair > 0) {
                const costPerPoint = REPAIR_COST_PER_POINT[eq.rarity] || 5;
                const cost = durabilityToRepair * costPerPoint;
                totalCost += cost;
                totalDurabilityToRepair += durabilityToRepair;
                repairDetails.push({
                    id: eq._id,
                    name: eq.name,
                    rarity: eq.rarity,
                    durabilityToRepair,
                    cost
                });
            }
        }

        if (totalDurabilityToRepair <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Tất cả trang bị đã có độ bền tối đa'
            });
        }

        // Check linh thạch
        if (cultivation.spiritStones < totalCost) {
            return res.status(400).json({
                success: false,
                message: `Cần ${totalCost.toLocaleString()} linh thạch để tu bổ tất cả, bạn có ${cultivation.spiritStones.toLocaleString()}`
            });
        }

        // Thực hiện repair
        cultivation.spiritStones -= totalCost;
        for (const eq of equipments) {
            repairDurability(eq, 'full');
            await eq.save();
        }
        await cultivation.save();

        res.json({
            success: true,
            message: `Đã tu bổ ${repairDetails.length} trang bị với ${totalCost.toLocaleString()} linh thạch`,
            data: {
                repairedCount: repairDetails.length,
                totalCost,
                remainingSpiritStones: cultivation.spiritStones,
                details: repairDetails
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * GET /api/cultivation/equipment/repair-all/preview
 * Xem trước chi phí tu bổ tất cả
 */
export const previewRepairAll = async (req, res, next) => {
    try {
        const userId = req.user._id;

        const cultivation = await Cultivation.findOne({ user: userId }).lean();
        if (!cultivation) {
            return res.status(404).json({
                success: false,
                message: 'Chưa bắt đầu tu tiên'
            });
        }

        // Lấy tất cả equipment trong inventory
        // Equipment được lưu với itemId là equipmentId, hoặc metadata._id
        const equipmentItems = cultivation.inventory.filter(i => 
            i.type?.startsWith('equipment_') && (i.itemId || i.metadata?._id)
        );

        const equipmentIds = equipmentItems.map(i => i.metadata?._id || i.itemId);
        const equipments = await Equipment.find({ _id: { $in: equipmentIds } }).lean();

        // Tính chi phí
        let totalCost = 0;
        const repairDetails = [];

        for (const eq of equipments) {
            const durability = eq.durability || { current: 100, max: 100 };
            const durabilityToRepair = durability.max - durability.current;
            
            if (durabilityToRepair > 0) {
                const costPerPoint = REPAIR_COST_PER_POINT[eq.rarity] || 5;
                const cost = durabilityToRepair * costPerPoint;
                totalCost += cost;
                repairDetails.push({
                    id: eq._id,
                    name: eq.name,
                    rarity: eq.rarity,
                    currentDurability: durability.current,
                    maxDurability: durability.max,
                    durabilityToRepair,
                    cost
                });
            }
        }

        res.json({
            success: true,
            data: {
                needsRepair: repairDetails.length,
                totalCost,
                canAfford: cultivation.spiritStones >= totalCost,
                currentSpiritStones: cultivation.spiritStones,
                details: repairDetails
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * GET /api/cultivation/equipment/active-modifiers
 * Get all active modifiers from equipped items
 */
export const getActiveModifiers = async (req, res, next) => {
    try {
        const userId = req.user._id;

        const cultivation = await Cultivation.findOne({ user: userId }).lean();
        if (!cultivation) {
            return res.status(404).json({
                success: false,
                message: 'Chưa bắt đầu tu tiên'
            });
        }

        // Get equipped items from cultivation.equipped slots (new system)
        const equipmentSlots = ['weapon', 'magicTreasure', 'helmet', 'chest', 'shoulder', 'gloves', 'boots', 'belt', 'ring', 'necklace', 'earring', 'bracelet', 'powerItem'];
        const equipmentIds = equipmentSlots
            .map(slot => cultivation.equipped?.[slot])
            .filter(id => id != null);

        const equipments = await Equipment.find({
            _id: { $in: equipmentIds }
        }).lean();

        // Calculate active modifiers
        const activeModifiers = calculateActiveModifiers(equipments);

        // Calculate element synergy
        const synergies = calculateElementSynergy(equipments);

        // Add synergy modifiers
        for (const [element, synergy] of Object.entries(synergies)) {
            const synergyMod = synergy.bonus;
            if (!activeModifiers[synergyMod.type]) {
                activeModifiers[synergyMod.type] = {
                    totalValue: 0,
                    sources: [],
                    isSynergy: true
                };
            }
            activeModifiers[synergyMod.type].totalValue += synergyMod.value;
            activeModifiers[synergyMod.type].sources.push({
                itemName: `${element.toUpperCase()} ${synergy.tier} Synergy`,
                value: synergyMod.value
            });
        }

        // Map modifier types to readable info
        const modifiersWithInfo = {};
        for (const [type, data] of Object.entries(activeModifiers)) {
            modifiersWithInfo[type] = {
                ...data,
                info: MODIFIER_TYPES[type] || { name: type, description: '' }
            };
        }

        res.json({
            success: true,
            data: {
                modifiers: modifiersWithInfo,
                synergies,
                equippedCount: equipments.length
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * POST /api/cultivation/equipment/:equipmentId/check-equip
 * Check if user can equip (realm lock validation)
 */
export const checkCanEquip = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const { equipmentId } = req.params;

        const cultivation = await Cultivation.findOne({ user: userId }).lean();
        if (!cultivation) {
            return res.status(404).json({
                success: false,
                message: 'Chưa bắt đầu tu tiên'
            });
        }

        const equipment = await Equipment.findById(equipmentId).lean();
        if (!equipment) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy trang bị'
            });
        }

        const result = checkRealmLock(cultivation.realmLevel, equipment);

        res.json({
            success: true,
            data: {
                canEquip: result.canEquip,
                reason: result.reason,
                playerRealm: cultivation.realmLevel,
                requiredRealm: equipment.realm_required || equipment.level_required || 1
            }
        });
    } catch (error) {
        next(error);
    }
};

export default {
    getEquipmentDetails,
    repairEquipment,
    repairAllEquipment,
    previewRepairAll,
    getActiveModifiers,
    checkCanEquip
};
