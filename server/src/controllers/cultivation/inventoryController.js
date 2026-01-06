import mongoose from "mongoose";
import Cultivation, { SHOP_ITEMS, SHOP_ITEMS_MAP } from "../../models/Cultivation.js";
import Equipment from "../../models/Equipment.js";
import User from "../../models/User.js";
import { mergeEquipmentStatsIntoCombatStats } from "./coreController.js";

/**
 * Enrich inventory với equipment metadata (stats, rarity, etc.)
 * Cần thiết để frontend có thể hiển thị đúng stats của equipment
 */
async function enrichInventoryWithEquipment(inventory) {
    const equipmentIds = inventory
        .filter(item => item.type?.startsWith('equipment_') && item.itemId)
        .map(item => {
            try {
                return mongoose.Types.ObjectId.isValid(item.itemId) ? new mongoose.Types.ObjectId(item.itemId) : null;
            } catch {
                return null;
            }
        })
        .filter(id => id !== null);

    if (equipmentIds.length === 0) {
        return inventory.map(item => item.toObject ? item.toObject() : item);
    }

    let equipmentMap = new Map();
    try {
        const equipments = await Equipment.find({ _id: { $in: equipmentIds } }).lean();
        equipments.forEach(eq => {
            let elementalDamage = {};
            if (eq.stats?.elemental_damage) {
                if (eq.stats.elemental_damage instanceof Map) {
                    elementalDamage = Object.fromEntries(eq.stats.elemental_damage);
                } else {
                    elementalDamage = eq.stats.elemental_damage;
                }
            }

            equipmentMap.set(eq._id.toString(), {
                _id: eq._id,
                name: eq.name,
                type: eq.type,
                subtype: eq.subtype,
                rarity: eq.rarity,
                level_required: eq.level_required,
                img: eq.img,
                description: eq.description,
                stats: { ...eq.stats, elemental_damage: elementalDamage },
                special_effect: eq.special_effect,
                skill_bonus: eq.skill_bonus,
                energy_regen: eq.energy_regen,
                lifesteal: eq.lifesteal,
                true_damage: eq.true_damage,
                buff_duration: eq.buff_duration
            });
        });
    } catch (err) {
        console.error("[INVENTORY] Error loading equipment for inventory:", err);
    }

    return inventory.map(item => {
        if (item.type?.startsWith('equipment_') && item.itemId) {
            const equipmentIdStr = item.itemId.toString();
            const equipment = equipmentMap.get(equipmentIdStr);

            if (equipment) {
                return {
                    ...(item.toObject ? item.toObject() : item),
                    name: equipment.name,
                    rarity: equipment.rarity,
                    img: equipment.img,
                    metadata: {
                        ...(item.metadata || {}),
                        _id: equipment._id,
                        equipmentType: equipment.type,
                        subtype: equipment.subtype,
                        rarity: equipment.rarity,
                        level_required: equipment.level_required,
                        stats: equipment.stats,
                        special_effect: equipment.special_effect,
                        skill_bonus: equipment.skill_bonus,
                        energy_regen: equipment.energy_regen,
                        lifesteal: equipment.lifesteal,
                        true_damage: equipment.true_damage,
                        buff_duration: equipment.buff_duration,
                        img: equipment.img,
                        description: equipment.description
                    }
                };
            }
        }
        return item.toObject ? item.toObject() : item;
    });
}

/**
 * POST /inventory/:itemId/equip - Trang bị vật phẩm
 */
export const equipItem = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { itemId } = req.params;

        const cultivation = await Cultivation.getOrCreate(userId);

        try {
            cultivation.equipItem(itemId);
            await cultivation.save();

            try {
                await User.findByIdAndUpdate(userId, {
                    $set: {
                        'cultivationCache.equipped.title': cultivation.equipped?.title || null,
                        'cultivationCache.equipped.badge': cultivation.equipped?.badge || null,
                        'cultivationCache.equipped.avatarFrame': cultivation.equipped?.avatarFrame || null,
                        'cultivationCache.equipped.profileEffect': cultivation.equipped?.profileEffect || null
                    }
                });
            } catch (syncErr) {
                console.error("[CULTIVATION] Error syncing equipped cache:", syncErr);
            }

            // Enrich inventory với equipment metadata để frontend hiển thị đúng stats
            const enrichedInventory = await enrichInventoryWithEquipment(cultivation.inventory);

            res.json({
                success: true,
                data: { equipped: cultivation.equipped, inventory: enrichedInventory }
            });
        } catch (equipError) {
            return res.status(400).json({ success: false, message: equipError.message });
        }
    } catch (error) {
        next(error);
    }
};

/**
 * POST /inventory/:itemId/unequip - Bỏ trang bị vật phẩm
 */
export const unequipItem = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { itemId } = req.params;

        const cultivation = await Cultivation.getOrCreate(userId);

        try {
            cultivation.unequipItem(itemId);
            await cultivation.save();

            try {
                await User.findByIdAndUpdate(userId, {
                    $set: {
                        'cultivationCache.equipped.title': cultivation.equipped?.title || null,
                        'cultivationCache.equipped.badge': cultivation.equipped?.badge || null,
                        'cultivationCache.equipped.avatarFrame': cultivation.equipped?.avatarFrame || null,
                        'cultivationCache.equipped.profileEffect': cultivation.equipped?.profileEffect || null
                    }
                });
            } catch (syncErr) {
                console.error("[CULTIVATION] Error syncing equipped cache:", syncErr);
            }

            // Enrich inventory với equipment metadata để frontend hiển thị đúng stats
            const enrichedInventory = await enrichInventoryWithEquipment(cultivation.inventory);

            res.json({
                success: true,
                data: { equipped: cultivation.equipped, inventory: enrichedInventory }
            });
        } catch (unequipError) {
            return res.status(400).json({ success: false, message: unequipError.message });
        }
    } catch (error) {
        next(error);
    }
};

/**
 * POST /equipment/:equipmentId/equip - Trang bị equipment
 */
export const equipEquipment = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { equipmentId } = req.params;
        const { slot } = req.body;

        const cultivation = await Cultivation.getOrCreate(userId);

        try {
            const equipment = await cultivation.equipEquipment(equipmentId, slot);
            await cultivation.save();

            let combatStats = cultivation.calculateCombatStats();
            const equipmentStats = await cultivation.getEquipmentStats();
            combatStats = mergeEquipmentStatsIntoCombatStats(combatStats, equipmentStats);

            // Enrich inventory với equipment metadata để frontend hiển thị đúng stats
            const enrichedInventory = await enrichInventoryWithEquipment(cultivation.inventory);

            res.json({
                success: true,
                data: {
                    equipment,
                    equipped: cultivation.equipped,
                    inventory: enrichedInventory,
                    combatStats: combatStats
                }
            });
        } catch (equipError) {
            return res.status(400).json({ success: false, message: equipError.message });
        }
    } catch (error) {
        next(error);
    }
};

/**
 * POST /equipment/:slot/unequip - Bỏ trang bị equipment
 */
export const unequipEquipment = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { slot } = req.params;

        const cultivation = await Cultivation.getOrCreate(userId);

        try {
            cultivation.unequipEquipment(slot);
            await cultivation.save();

            let combatStats = cultivation.calculateCombatStats();
            const equipmentStats = await cultivation.getEquipmentStats();
            combatStats = mergeEquipmentStatsIntoCombatStats(combatStats, equipmentStats);

            // Enrich inventory với equipment metadata để frontend hiển thị đúng stats
            const enrichedInventory = await enrichInventoryWithEquipment(cultivation.inventory);

            res.json({
                success: true,
                data: {
                    equipped: cultivation.equipped,
                    inventory: enrichedInventory,
                    combatStats: combatStats
                }
            });
        } catch (unequipError) {
            return res.status(400).json({ success: false, message: unequipError.message });
        }
    } catch (error) {
        next(error);
    }
};

/**
 * GET /equipment/stats - Lấy tổng stats từ equipment đang trang bị
 */
export const getEquipmentStats = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const cultivation = await Cultivation.getOrCreate(userId);

        const equipmentStats = await cultivation.getEquipmentStats();

        res.json({ success: true, data: equipmentStats });
    } catch (error) {
        console.error("[CULTIVATION] Error getting equipment stats:", error);
        next(error);
    }
};

// In-memory cache to prevent duplicate requests (backend rate limiting)
const useItemCache = new Map();
const USE_ITEM_COOLDOWN_MS = 3000;

/**
 * POST /inventory/:itemId/use - Sử dụng vật phẩm tiêu hao
 */
export const useItem = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { itemId } = req.params;

        // Rate limiting: Check if same user/item was used recently
        const cacheKey = `${userId}:${itemId}`;
        const lastUsed = useItemCache.get(cacheKey);
        const now = Date.now();

        if (lastUsed && (now - lastUsed) < USE_ITEM_COOLDOWN_MS) {
            return res.status(429).json({
                success: false,
                message: "Vui lòng đợi vài giây trước khi sử dụng lại"
            });
        }

        // Set cache immediately to block concurrent requests
        useItemCache.set(cacheKey, now);

        // Cleanup old cache entries every 100 requests
        if (useItemCache.size > 100) {
            const cutoff = now - USE_ITEM_COOLDOWN_MS * 2;
            for (const [key, time] of useItemCache.entries()) {
                if (time < cutoff) useItemCache.delete(key);
            }
        }

        const cultivation = await Cultivation.getOrCreate(userId);

        const itemIndex = cultivation.inventory.findIndex(i => i.itemId === itemId);
        if (itemIndex === -1) {
            return res.status(404).json({ success: false, message: "Không tìm thấy vật phẩm trong kho đồ" });
        }

        const item = cultivation.inventory[itemIndex];
        // Use SHOP_ITEMS_MAP for O(1) lookup
        const itemData = SHOP_ITEMS_MAP.get(itemId);

        if (!itemData) {
            return res.status(404).json({ success: false, message: "Vật phẩm không hợp lệ" });
        }

        if (!['exp_boost', 'consumable'].includes(item.type)) {
            return res.status(400).json({ success: false, message: "Vật phẩm này không thể sử dụng trực tiếp" });
        }

        let message = '';
        let reward = {};

        switch (item.type) {
            case 'exp_boost':
                const expiresAt = new Date(Date.now() + itemData.duration * 60 * 60 * 1000);
                cultivation.activeBoosts.push({ type: 'exp', multiplier: itemData.multiplier, expiresAt });
                message = `Đã kích hoạt ${item.name}! Tăng ${itemData.multiplier}x exp trong ${itemData.duration}h`;
                reward = { type: 'boost', multiplier: itemData.multiplier, duration: itemData.duration };
                break;

            case 'consumable':
                // Handle loot box items
                if (itemData.isLootBox) {
                    const config = itemData.lootBoxConfig;
                    const rarityOrder = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
                    const minRarityIndex = rarityOrder.indexOf(config.minRarity || 'rare');

                    // Get all eligible items (rare+ from allowed types, not already owned)
                    const eligibleItems = SHOP_ITEMS.filter(shopItem => {
                        // Check rarity
                        const itemRarityIndex = rarityOrder.indexOf(shopItem.rarity || 'common');
                        if (itemRarityIndex < minRarityIndex) return false;

                        // Check type
                        if (!config.dropTypes.includes(shopItem.type)) return false;

                        // Check if already owned (for non-stackable items)
                        if (shopItem.type === 'technique') {
                            const alreadyLearned = cultivation.learnedTechniques?.some(t => t.techniqueId === shopItem.id);
                            if (alreadyLearned) return false;
                        } else {
                            const alreadyOwned = cultivation.inventory.some(i => i.itemId === shopItem.id);
                            if (alreadyOwned) return false;
                        }

                        return true;
                    });

                    if (eligibleItems.length === 0) {
                        // If player owns all eligible items, give spirit stones instead
                        const spiritStoneReward = 500;
                        cultivation.spiritStones += spiritStoneReward;
                        cultivation.totalSpiritStonesEarned += spiritStoneReward;
                        message = `Bạn đã sở hữu tất cả vật phẩm! Nhận được ${spiritStoneReward} linh thạch thay thế`;
                        reward = { type: 'spiritStones', amount: spiritStoneReward };
                    } else {
                        // Weighted random: higher rarity = lower chance
                        const weights = { rare: 60, epic: 30, legendary: 10 };
                        const weightedItems = [];
                        eligibleItems.forEach(item => {
                            const weight = weights[item.rarity] || 30;
                            for (let i = 0; i < weight; i++) {
                                weightedItems.push(item);
                            }
                        });

                        const droppedItem = weightedItems[Math.floor(Math.random() * weightedItems.length)];

                        // Add dropped item to inventory or learn technique
                        if (droppedItem.type === 'technique') {
                            cultivation.learnedTechniques.push({
                                techniqueId: droppedItem.id,
                                level: 1,
                                learnedAt: new Date()
                            });
                            message = `Chúc mừng! Bạn đã học được công pháp [${droppedItem.rarity.toUpperCase()}] ${droppedItem.name}!`;
                        } else {
                            // Check if item already exists in inventory (for stackable items)
                            const existingItem = cultivation.inventory.find(i => i.itemId === droppedItem.id);
                            if (existingItem) {
                                existingItem.quantity = (existingItem.quantity || 1) + 1;
                                message = `Chúc mừng! Bạn đã nhận được [${droppedItem.rarity.toUpperCase()}] ${droppedItem.name}! (x${existingItem.quantity})`;
                            } else {
                                cultivation.inventory.push({
                                    itemId: droppedItem.id,
                                    name: droppedItem.name,
                                    type: droppedItem.type,
                                    quantity: 1,
                                    equipped: false,
                                    acquiredAt: new Date()
                                });
                                message = `Chúc mừng! Bạn đã nhận được [${droppedItem.rarity.toUpperCase()}] ${droppedItem.name}!`;
                            }
                        }

                        reward = { type: 'lootbox', droppedItem: droppedItem };
                    }
                } else if (itemData.expReward) {
                    cultivation.exp += itemData.expReward;
                    message = `Đã sử dụng ${item.name}! Nhận được ${itemData.expReward} tu vi`;
                    reward = { type: 'exp', amount: itemData.expReward };
                } else if (itemData.spiritStoneReward) {
                    cultivation.spiritStones += itemData.spiritStoneReward;
                    cultivation.totalSpiritStonesEarned += itemData.spiritStoneReward;
                    message = `Đã sử dụng ${item.name}! Nhận được ${itemData.spiritStoneReward} linh thạch`;
                    reward = { type: 'spiritStones', amount: itemData.spiritStoneReward };
                } else if (itemData.spiritStoneBonus) {
                    const expiresAt = new Date(Date.now() + itemData.duration * 60 * 60 * 1000);
                    cultivation.activeBoosts.push({ type: 'spiritStones', multiplier: 1 + itemData.spiritStoneBonus, expiresAt });
                    message = `Đã kích hoạt ${item.name}! Tăng ${Math.round(itemData.spiritStoneBonus * 100)}% linh thạch trong ${itemData.duration}h`;
                    reward = { type: 'boost', bonus: itemData.spiritStoneBonus, duration: itemData.duration };
                } else if (itemData.oneTimePurchase && itemData.rewards) {
                    // Xử lý starter pack / gói quà 1 lần
                    const rewards = itemData.rewards;
                    let spiritStonesGained = 0;
                    const itemsGained = [];

                    // Cộng linh thạch
                    if (rewards.spiritStones) {
                        cultivation.spiritStones += rewards.spiritStones;
                        cultivation.totalSpiritStonesEarned += rewards.spiritStones;
                        spiritStonesGained = rewards.spiritStones;
                    }

                    // Thêm các items vào inventory
                    if (rewards.items && rewards.items.length > 0) {
                        for (const rewardItem of rewards.items) {
                            const rewardItemData = SHOP_ITEMS_MAP.get(rewardItem.itemId);
                            if (rewardItemData) {
                                const newItem = {
                                    itemId: rewardItemData.id,
                                    name: rewardItemData.name,
                                    type: rewardItemData.type,
                                    quantity: rewardItem.quantity || 1,
                                    equipped: false,
                                    acquiredAt: new Date(),
                                    metadata: { ...rewardItemData }
                                };
                                cultivation.inventory.push(newItem);
                                itemsGained.push({ name: rewardItemData.name, quantity: rewardItem.quantity || 1 });
                            }
                        }
                    }

                    const itemsStr = itemsGained.map(i => `${i.quantity}x ${i.name}`).join(', ');
                    message = `Đã mở ${item.name}! Nhận được ${spiritStonesGained} linh thạch và ${itemsStr}`;
                    reward = { type: 'starter_pack', spiritStones: spiritStonesGained, items: itemsGained };
                } else {
                    message = `Đã sử dụng ${item.name}!`;
                }
                break;

            default:
                return res.status(400).json({ success: false, message: "Không thể sử dụng vật phẩm này" });
        }

        if (item.quantity > 1) {
            cultivation.inventory[itemIndex].quantity -= 1;
        } else {
            cultivation.inventory.splice(itemIndex, 1);
        }

        await cultivation.save();

        res.json({
            success: true,
            message,
            data: {
                reward,
                cultivation: {
                    exp: cultivation.exp,
                    realmLevel: cultivation.realmLevel,
                    realmName: cultivation.realmName,
                    spiritStones: cultivation.spiritStones,
                    activeBoosts: cultivation.activeBoosts
                },
                inventory: cultivation.inventory
            }
        });

    } catch (error) {
        console.error("[CULTIVATION] Error using item:", error);
        next(error);
    }
};
