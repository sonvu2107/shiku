import mongoose from "mongoose";
import Cultivation, { SHOP_ITEMS, SHOP_ITEMS_MAP, TECHNIQUES_MAP } from "../../models/Cultivation.js";
import Equipment from "../../models/Equipment.js";
import { getSectBuildingBonuses } from "../../services/sectBuildingBonusService.js";
import { get as redisGet, set as redisSet, getClient, isRedisConnected } from "../../services/redisClient.js";
import { saveWithRetry } from "../../utils/dbUtils.js";
import { getShopCacheKey } from "../../services/shopCacheService.js";

// ==================== SECT BONUSES CACHE ====================
// Redis for multi-instance consistency, fallback to in-memory for single instance
const SECT_BONUSES_CACHE_TTL = 300; // 5 minutes in seconds
const SECT_BONUSES_CACHE_KEY_PREFIX = 'sect_bonuses:';

// ==================== SHOP EQUIPMENT CACHE ====================
const SHOP_CACHE_TTL = 1800; // 30 minutes in seconds

// In-memory fallback cache (used when Redis is not available)
const sectBonusesFallbackCache = new Map();

// Track in-flight requests to prevent duplicate DB calls
const pendingSectBonusesRequests = new Map();

async function getCachedSectBonuses(userId) {
    const cacheKey = SECT_BONUSES_CACHE_KEY_PREFIX + userId;

    // Try Redis first (shared across instances)
    if (isRedisConnected()) {
        try {
            const cached = await redisGet(cacheKey);
            if (cached) {
                return JSON.parse(cached);
            }

            // Check if there's already a pending request for this user
            if (pendingSectBonusesRequests.has(userId)) {
                return pendingSectBonusesRequests.get(userId);
            }

            // Create and track the promise
            const promise = (async () => {
                const data = await getSectBuildingBonuses(userId);
                await redisSet(cacheKey, JSON.stringify(data), SECT_BONUSES_CACHE_TTL);
                return data;
            })();

            pendingSectBonusesRequests.set(userId, promise);

            try {
                return await promise;
            } finally {
                pendingSectBonusesRequests.delete(userId);
            }
        } catch (error) {
            console.error('[SHOP CACHE] Redis error, falling back to memory:', error.message);
            pendingSectBonusesRequests.delete(userId);
        }
    }

    // Fallback to in-memory cache (single instance only)
    const cached = sectBonusesFallbackCache.get(userId);
    const now = Date.now();
    if (cached && now - cached.timestamp < SECT_BONUSES_CACHE_TTL * 1000) {
        return cached.data;
    }

    // Check pending request for fallback path
    if (pendingSectBonusesRequests.has(userId)) {
        return pendingSectBonusesRequests.get(userId);
    }

    const promise = (async () => {
        const data = await getSectBuildingBonuses(userId);
        sectBonusesFallbackCache.set(userId, { data, timestamp: Date.now() });

        // Cleanup fallback cache if too large
        if (sectBonusesFallbackCache.size > 100) {
            const cutoff = Date.now() - SECT_BONUSES_CACHE_TTL * 1000;
            for (const [key, value] of sectBonusesFallbackCache.entries()) {
                if (value.timestamp < cutoff) {
                    sectBonusesFallbackCache.delete(key);
                }
            }
        }

        return data;
    })();

    pendingSectBonusesRequests.set(userId, promise);

    try {
        return await promise;
    } catch (error) {
        console.error(`[SHOP CACHE] Error fetching sect bonuses for user ${userId}:`, error.message);
        throw error;
    } finally {
        pendingSectBonusesRequests.delete(userId);
    }
}

/**
 * GET /shop - Lấy danh sách vật phẩm trong shop
 */
export const getShop = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const redis = getClient();
        const shopCacheKey = getShopCacheKey();

        // Try equipment cache first (shared for all users)
        let equipmentItems = null;
        if (redis && isRedisConnected()) {
            try {
                const cached = await redis.get(shopCacheKey);
                if (cached) {
                    equipmentItems = JSON.parse(cached);
                    console.log('[SHOP CACHE] Hit - using cached equipment');
                }
            } catch (error) {
                console.error('[SHOP CACHE] Redis read error:', error.message);
            }
        }

        // Cache miss - query DB
        if (!equipmentItems) {
            const availableEquipment = await Equipment.find({
                is_active: true,
                price: { $gt: 0 }
            }).lean();

            equipmentItems = availableEquipment.map(eq => {
                let elementalDamage = {};
                if (eq.stats?.elemental_damage instanceof Map) {
                    elementalDamage = Object.fromEntries(eq.stats.elemental_damage);
                } else if (eq.stats?.elemental_damage) {
                    elementalDamage = eq.stats.elemental_damage;
                }

                const eqId = eq._id.toString();

                return {
                    id: eqId,
                    name: eq.name,
                    type: `equipment_${eq.type}`,
                    equipmentType: eq.type,
                    subtype: eq.subtype || null,
                    rarity: eq.rarity,
                    price: eq.price,
                    img: eq.img,
                    description: eq.description,
                    level_required: eq.level_required,
                    stats: { ...eq.stats, elemental_damage: elementalDamage },
                    special_effect: eq.special_effect,
                    skill_bonus: eq.skill_bonus,
                    energy_regen: eq.energy_regen,
                    lifesteal: eq.lifesteal,
                    true_damage: eq.true_damage,
                    buff_duration: eq.buff_duration
                };
            });

            // Save to cache
            if (redis && isRedisConnected()) {
                redis.set(shopCacheKey, JSON.stringify(equipmentItems), 'EX', SHOP_CACHE_TTL)
                    .catch(err => console.error('[SHOP CACHE] Write error:', err.message));
            }
        }

        // Get user-specific data (cultivation + ownership)
        const cultivation = await Cultivation.getOrCreate(userId);

        // Lấy bonus từ Tông Môn (cached - TTL 5 phút)
        const sectBonuses = await getCachedSectBonuses(userId);
        const shopDiscount = sectBonuses.shopDiscount || 0; // Đan Phòng giảm giá

        // Lọc bỏ items độc quyền rank (price: 0 hoặc exclusive: true)
        // NHƯNG giữ lại items oneTimePurchase (starter pack) với price: 0
        const shopItems = SHOP_ITEMS
            .filter(item => (item.price > 0 || item.oneTimePurchase) && !item.exclusive)
            .map(item => {
                // Tính giá sau giảm (chỉ áp dụng cho đan dược)
                const isAlchemyItem = item.type === 'exp_boost' || item.type === 'breakthrough_boost' || item.type === 'consumable';
                const discountedPrice = isAlchemyItem
                    ? Math.floor(item.price * (1 - shopDiscount))
                    : item.price;

                if (item.type === 'technique') {
                    const isOwned = cultivation.learnedTechniques?.some(t => t.techniqueId === item.id) || false;
                    return { ...item, price: discountedPrice, originalPrice: item.price, owned: isOwned, canAfford: cultivation.spiritStones >= discountedPrice };
                }

                // Kiểm tra đã mua cho oneTimePurchase items (kiểm tra purchasedOneTimeItems)
                if (item.oneTimePurchase) {
                    const isPurchased = cultivation.purchasedOneTimeItems?.includes(item.id) || false;
                    return {
                        ...item,
                        owned: isPurchased, // Đánh dấu "Đã sở hữu" nếu đã mua
                        canAfford: true // Miễn phí
                    };
                }

                // Kiểm tra đã nhận cho các item thường
                const isOwned = cultivation.inventory.some(i => {
                    if (i.itemId && i.itemId.toString() === item.id) return true;
                    if (i._id && i._id.toString() === item.id) return true;
                    return false;
                });

                return {
                    ...item,
                    price: discountedPrice,
                    originalPrice: item.price,
                    owned: isOwned,
                    canAfford: cultivation.spiritStones >= discountedPrice
                };
            });

        // Add ownership and affordability to equipment items
        const enrichedEquipmentItems = equipmentItems.map(eq => {
            const eqId = eq.id;
            const isOwned = cultivation.inventory.some(i => {
                if (i.itemId && i.itemId.toString() === eqId) return true;
                if (i.metadata?._id) {
                    const metadataId = i.metadata._id.toString();
                    if (metadataId === eqId) return true;
                }
                if (i._id && i._id.toString() === eqId) return true;
                return false;
            });

            return {
                ...eq,
                owned: isOwned,
                canAfford: cultivation.spiritStones >= eq.price,
                canUse: cultivation.realmLevel >= eq.level_required
            };
        });

        const allItems = [...shopItems, ...enrichedEquipmentItems];

        res.json({
            success: true,
            data: { items: allItems, spiritStones: cultivation.spiritStones }
        });
    } catch (error) {
        console.error("[CULTIVATION] Error getting shop:", error);
        next(error);
    }
};

/**
 * POST /shop/buy/:itemId - Mua vật phẩm
 * @body {number} quantity - Số lượng muốn mua (default: 1, max: 99)
 */
export const buyItem = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { itemId } = req.params;
        const { quantity = 1 } = req.body;

        // Validate quantity
        const qty = Math.floor(Number(quantity));
        if (isNaN(qty) || qty < 1 || qty > 99) {
            return res.status(400).json({
                success: false,
                message: "Số lượng không hợp lệ (1-99)"
            });
        }

        const cultivation = await Cultivation.getOrCreate(userId);

        // 1. Kiểm tra xem item có trong danh sách SHOP_ITEMS không (để tránh nhầm lẫn ID 12 ký tự với ObjectId)
        // Use SHOP_ITEMS_MAP for O(1) lookup
        const shopItem = SHOP_ITEMS_MAP.get(itemId);

        if (shopItem) {
            // Chỉ cho phép mua nhiều với items tiêu hao (exp_boost, breakthrough_boost, consumable)
            const isConsumableType = ['exp_boost', 'breakthrough_boost', 'consumable'].includes(shopItem.type);
            if (qty > 1 && !isConsumableType) {
                return res.status(400).json({
                    success: false,
                    message: "Vật phẩm này chỉ có thể mua 1 cái"
                });
            }

            // Lấy bonus giảm giá từ Tông Môn (cached - TTL 5 phút)
            const sectBonuses = await getCachedSectBonuses(userId);
            const shopDiscount = sectBonuses.shopDiscount || 0;

            // Tính giá sau giảm (chỉ áp dụng cho đan dược)
            const isAlchemyItem = shopItem.type === 'exp_boost' || shopItem.type === 'breakthrough_boost' || shopItem.type === 'consumable';
            const unitPrice = isAlchemyItem
                ? Math.floor(shopItem.price * (1 - shopDiscount))
                : shopItem.price;

            // Tính tổng giá cho số lượng
            const totalPrice = unitPrice * qty;

            // Normal item purchase với giá đã giảm và số lượng
            try {
                const result = cultivation.buyItem(itemId, totalPrice, qty);
                await saveWithRetry(cultivation);

                const responseData = { spiritStones: cultivation.spiritStones, inventory: cultivation.inventory };

                // Xử lý response đặc biệt cho starter pack
                if (result && result.type === 'starter_pack') {
                    // Đã mua rồi - trả về thông báo thân thiện
                    if (result.alreadyPurchased) {
                        return res.json({
                            success: false,
                            alreadyPurchased: true,
                            message: result.message,
                            data: responseData
                        });
                    }
                    // Mua thành công
                    return res.json({
                        success: true,
                        message: `Đã mua ${result.name}! Vào túi đồ và bấm "Dùng" để nhận phần thưởng.`,
                        data: responseData
                    });
                }

                if (result && result.type === 'technique') {
                    responseData.learnedTechnique = result.learnedTechnique;
                    // Use TECHNIQUES_MAP for O(1) lookup
                    const techniqueItem = TECHNIQUES_MAP.get(itemId);
                    if (techniqueItem) {
                        responseData.skill = techniqueItem.skill;
                    }
                } else {
                    responseData.item = result;
                }

                // Message hiển thị số lượng nếu > 1
                const quantityText = qty > 1 ? ` x${qty}` : '';
                res.json({
                    success: true,
                    message: result && result.type === 'technique'
                        ? `Đã học công pháp ${result.name}!`
                        : `Đã mua ${result?.name || 'vật phẩm'}${quantityText}!`,
                    data: responseData
                });
                return; // Kết thúc sau khi xử lý thành công
            } catch (buyError) {
                return res.status(400).json({ success: false, message: buyError.message });
            }
        }


        // 2. Check if equipment (valid ObjectId and NOT in SHOP_ITEMS)
        if (mongoose.Types.ObjectId.isValid(itemId)) {
            const equipment = await Equipment.findById(itemId);

            if (!equipment) {
                return res.status(400).json({ success: false, message: "Trang bị không tồn tại" });
            }

            if (!equipment.is_active) {
                return res.status(400).json({ success: false, message: "Trang bị này đã bị vô hiệu hóa" });
            }

            if (equipment.price <= 0) {
                return res.status(400).json({ success: false, message: "Trang bị này không được bán" });
            }

            if (cultivation.realmLevel < equipment.level_required) {
                return res.status(400).json({
                    success: false,
                    message: `Cần đạt cảnh giới cấp ${equipment.level_required} để mua trang bị này`
                });
            }

            const itemIdStr = itemId.toString();
            const alreadyOwned = cultivation.inventory.some(i => {
                if (i.itemId && i.itemId.toString() === itemIdStr) return true;
                if (i.metadata?._id) {
                    const metadataId = i.metadata._id.toString();
                    if (metadataId === itemIdStr) return true;
                }
                if (i._id && i._id.toString() === itemIdStr) return true;
                return false;
            });

            if (alreadyOwned) {
                return res.status(400).json({ success: false, message: "Bạn đã sở hữu trang bị này rồi" });
            }

            if (cultivation.spiritStones < equipment.price) {
                return res.status(400).json({ success: false, message: "Không đủ linh thạch để mua" });
            }

            cultivation.spendSpiritStones(equipment.price);

            const inventoryItem = {
                itemId: equipment._id.toString(),
                name: equipment.name,
                type: `equipment_${equipment.type}`,
                quantity: 1,
                equipped: false,
                acquiredAt: new Date(),
                metadata: {
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

            cultivation.inventory.push(inventoryItem);
            await saveWithRetry(cultivation);

            return res.json({
                success: true,
                message: `Đã mua ${equipment.name}!`,
                data: { spiritStones: cultivation.spiritStones, inventory: cultivation.inventory, item: inventoryItem }
            });
        }

        // Return 404 if neither found
        return res.status(404).json({ success: false, message: "Vật phẩm không tồn tại" });


    } catch (error) {
        console.error("[CULTIVATION] Error buying item:", error);
        next(error);
    }
};
