/**
 * Equipment Controller - Equipment management APIs
 * Handles repair, enhancement, and equipment info
 */

import Cultivation from '../../models/Cultivation.js';
import Equipment from '../../models/Equipment.js';
import {
    checkRealmLock,
    calculateActiveModifiers,
    calculateElementSynergy,
    MODIFIER_TYPES
} from '../../services/modifierService.js';

// ==================== REPAIR COST CONFIG ====================
// Chi phí sửa chữa (linh thạch/điểm độ bền) - rất thấp
const REPAIR_COST_PER_POINT = {
    common: 1,      // Phàm
    uncommon: 1,    // Thường
    rare: 1,        // Hiếm
    epic: 2,        // Sử Thi
    legendary: 5,   // Huyền Thoại
    mythic: 10      // Thần Thoại
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
 * Repair equipment durability - SỬA TRONG INVENTORY CỦA USER
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
            i.metadata?._id?.toString() === equipmentId ||
            i.itemId?.toString() === equipmentId
        );

        if (!invItem) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy trang bị trong kho đồ'
            });
        }

        // Get equipment from DB để lấy thông tin (name, rarity)
        const equipment = await Equipment.findById(equipmentId);
        if (!equipment) {
            return res.status(404).json({
                success: false,
                message: 'Trang bị không tồn tại'
            });
        }

        // Khởi tạo durability nếu chưa có (trong inventory của user)
        if (!invItem.metadata) invItem.metadata = {};
        if (!invItem.metadata.durability) {
            invItem.metadata.durability = { current: 100, max: 100 };
        }

        const userDurability = invItem.metadata.durability;
        const durabilityToRepair = amount === 'full'
            ? userDurability.max - userDurability.current
            : Math.min(amount, userDurability.max - userDurability.current);

        if (durabilityToRepair <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Trang bị không cần sửa chữa'
            });
        }

        // Calculate cost
        const costPerPoint = REPAIR_COST_PER_POINT[equipment.rarity] || 1;
        const totalCost = durabilityToRepair * costPerPoint;

        // Check if user has enough spirit stones
        if (cultivation.spiritStones < totalCost) {
            return res.status(400).json({
                success: false,
                message: `Cần ${totalCost} linh thạch để sửa chữa, bạn có ${cultivation.spiritStones}`
            });
        }

        // Deduct cost and repair - TRONG INVENTORY CỦA USER
        cultivation.spiritStones -= totalCost;
        userDurability.current = Math.min(userDurability.max, userDurability.current + durabilityToRepair);
        
        cultivation.markModified('inventory');
        await cultivation.save();

        res.json({
            success: true,
            message: `Đã sửa chữa ${durabilityToRepair} độ bền với ${totalCost} linh thạch`,
            data: {
                equipment: {
                    id: equipment._id,
                    name: equipment.name,
                    durability: userDurability
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
 * Tu bổ tất cả equipment bị hư hỏng - SỬA TRONG INVENTORY CỦA USER
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
        
        // Tạo map để tra cứu nhanh equipment info
        const equipmentMap = new Map();
        equipments.forEach(eq => equipmentMap.set(eq._id.toString(), eq));

        // Tính tổng chi phí - DỰA TRÊN DURABILITY TRONG INVENTORY
        let totalCost = 0;
        let totalDurabilityToRepair = 0;
        const repairDetails = [];
        const itemsToRepair = [];

        for (const invItem of equipmentItems) {
            const eqId = (invItem.metadata?._id || invItem.itemId)?.toString();
            const equipment = equipmentMap.get(eqId);
            if (!equipment) continue;
            
            // Lấy durability từ inventory của user
            const userDurability = invItem.metadata?.durability || { current: 100, max: 100 };
            const durabilityToRepair = userDurability.max - userDurability.current;
            
            if (durabilityToRepair > 0) {
                const costPerPoint = REPAIR_COST_PER_POINT[equipment.rarity] || 1;
                const cost = durabilityToRepair * costPerPoint;
                totalCost += cost;
                totalDurabilityToRepair += durabilityToRepair;
                repairDetails.push({
                    id: equipment._id,
                    name: equipment.name,
                    rarity: equipment.rarity,
                    durabilityToRepair,
                    cost
                });
                itemsToRepair.push({ invItem, durabilityToRepair });
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

        // Thực hiện repair - TRONG INVENTORY CỦA USER
        cultivation.spiritStones -= totalCost;
        for (const { invItem } of itemsToRepair) {
            if (!invItem.metadata) invItem.metadata = {};
            if (!invItem.metadata.durability) {
                invItem.metadata.durability = { current: 100, max: 100 };
            }
            invItem.metadata.durability.current = invItem.metadata.durability.max;
        }
        
        cultivation.markModified('inventory');
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
 * Xem trước chi phí tu bổ tất cả - ĐỌC TỪ INVENTORY CỦA USER
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
        const equipmentItems = cultivation.inventory.filter(i => 
            i.type?.startsWith('equipment_') && (i.itemId || i.metadata?._id)
        );

        const equipmentIds = equipmentItems.map(i => i.metadata?._id || i.itemId);
        const equipments = await Equipment.find({ _id: { $in: equipmentIds } }).lean();
        
        // Tạo map để tra cứu nhanh equipment info
        const equipmentMap = new Map();
        equipments.forEach(eq => equipmentMap.set(eq._id.toString(), eq));

        // Tính chi phí - DỰA TRÊN DURABILITY TRONG INVENTORY
        let totalCost = 0;
        const repairDetails = [];

        for (const invItem of equipmentItems) {
            const eqId = (invItem.metadata?._id || invItem.itemId)?.toString();
            const equipment = equipmentMap.get(eqId);
            if (!equipment) continue;
            
            // Lấy durability từ inventory của user
            const userDurability = invItem.metadata?.durability || { current: 100, max: 100 };
            const durabilityToRepair = userDurability.max - userDurability.current;
            
            if (durabilityToRepair > 0) {
                const costPerPoint = REPAIR_COST_PER_POINT[equipment.rarity] || 1;
                const cost = durabilityToRepair * costPerPoint;
                totalCost += cost;
                repairDetails.push({
                    id: equipment._id,
                    name: equipment.name,
                    rarity: equipment.rarity,
                    currentDurability: userDurability.current,
                    maxDurability: userDurability.max,
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
