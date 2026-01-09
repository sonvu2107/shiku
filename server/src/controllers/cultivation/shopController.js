import mongoose from "mongoose";
import Cultivation, { SHOP_ITEMS, SHOP_ITEMS_MAP, TECHNIQUES_MAP } from "../../models/Cultivation.js";
import Equipment from "../../models/Equipment.js";
import { MATERIAL_TEMPLATES } from "../../models/Material.js";
import { getSectBuildingBonuses } from "../../services/sectBuildingBonusService.js";
import { get as redisGet, set as redisSet, getClient, isRedisConnected } from "../../services/redisClient.js";
import { saveWithRetry } from "../../utils/dbUtils.js";
import { getShopCacheKey } from "../../services/shopCacheService.js";

// ==================== SECT BONUSES CACHE ====================
const SECT_BONUSES_CACHE_TTL = 300; // 5 minutes
const SECT_BONUSES_CACHE_KEY_PREFIX = 'sect_bonuses:';

// ==================== SHOP EQUIPMENT CACHE ====================
const SHOP_CACHE_TTL = 1800; // 30 minutes

const sectBonusesFallbackCache = new Map();
const pendingSectBonusesRequests = new Map();

async function getCachedSectBonuses(userId) {
    const cacheKey = SECT_BONUSES_CACHE_KEY_PREFIX + userId;
    if (isRedisConnected()) {
        try {
            const cached = await redisGet(cacheKey);
            if (cached) return JSON.parse(cached);
            if (pendingSectBonusesRequests.has(userId)) return pendingSectBonusesRequests.get(userId);

            const promise = (async () => {
                const data = await getSectBuildingBonuses(userId);
                await redisSet(cacheKey, JSON.stringify(data), SECT_BONUSES_CACHE_TTL);
                return data;
            })();
            pendingSectBonusesRequests.set(userId, promise);
            try { return await promise; } finally { pendingSectBonusesRequests.delete(userId); }
        } catch (error) {
            console.error('[SHOP CACHE] Redis error:', error.message);
        }
    }
    // Fallback logic handled by simple return for brevity in this critical update
    return await getSectBuildingBonuses(userId);
}

// ==================== LOOTBOX CONFIGURATION ====================

// Helper to get items by type/rarity
const match = (type, rarity) => SHOP_ITEMS.filter(i => i.type === type && (!rarity || i.rarity === rarity)).map(i => i.id);
const matByTier = (min, max) => MATERIAL_TEMPLATES.filter(m => m.tier >= min && m.tier <= max).map(m => m.id);

const POOLS = {
    // Materials
    materials_low: matByTier(1, 3),   // Tier 1-3
    materials_mid: matByTier(4, 6),   // Tier 4-6
    materials_high: matByTier(7, 14), // Tier 7-14 (Includes Tier 7 and Tier 11 materials)

    // Consumables
    cons_common: match('consumable', 'common'),
    cons_uncommon: match('consumable', 'uncommon'),
    cons_rare: match('consumable', 'rare'),
    cons_epic: match('consumable', 'epic'),

    // Boosts
    boost_exp: match('exp_boost'),
    boost_breakthrough: match('breakthrough_boost'),

    // High Value
    techniques_common: match('technique', 'common'),
    techniques_uncommon: match('technique', 'uncommon'),
    techniques_rare: match('technique', 'rare'),
    techniques_epic: match('technique', 'epic'),
    techniques_legendary: match('technique', 'legendary'),

    cosmetics_rare: [...match('title', 'rare'), ...match('badge', 'rare'), ...match('avatar_frame', 'rare')],
    cosmetics_epic: [...match('title', 'epic'), ...match('badge', 'epic'), ...match('avatar_frame', 'epic')]
};

const LOOTBOX_TABLES = {
    chest_basic: {
        baseRewards: [
            { pool: 'materials_low', qty: [2, 5], chance: 1.0 }, // Always get materials
            { pool: 'cons_common', qty: [1, 2], chance: 0.5 }    // 50% chance for extra consumable
        ],
        primaryRoll: [
            { chance: 0.60, type: 'materials_mid', qty: [1, 3], outcome: 'small_win' },
            { chance: 0.30, type: 'boost_exp', qty: [1, 1], outcome: 'lucky_boost' },
            { chance: 0.09, type: 'techniques_common', qty: [1, 1], outcome: 'technique_find' },
            { chance: 0.01, type: 'techniques_uncommon', qty: [1, 1], outcome: 'jackpot_technique' }
        ],
        fallback: { pool: 'cons_uncommon', qty: [1, 1] }
    },
    chest_advanced: {
        baseRewards: [
            { pool: 'materials_mid', qty: [3, 8], chance: 1.0 },
            { pool: 'boost_breakthrough', qty: [1, 1], chance: 0.3 }
        ],
        primaryRoll: [
            { chance: 0.50, type: 'materials_high', qty: [1, 3], outcome: 'high_materials' },
            { chance: 0.30, type: 'techniques_uncommon', qty: [1, 1], outcome: 'technique_find' },
            { chance: 0.15, type: 'techniques_rare', qty: [1, 1], outcome: 'big_technique_find' },
            { chance: 0.05, type: 'cosmetics_rare', qty: [1, 1], outcome: 'cosmetic_find' }
        ],
        fallback: { pool: 'boost_exp', qty: [2, 3] }
    },
    chest_master: {
        baseRewards: [
            { pool: 'materials_high', qty: [5, 12], chance: 1.0 },
            { pool: 'boost_breakthrough', qty: [2, 3], chance: 1.0 } // Always get pills
        ],
        primaryRoll: [
            { chance: 0.40, type: 'techniques_rare', qty: [1, 1], outcome: 'rare_technique' },
            { chance: 0.30, type: 'techniques_epic', qty: [1, 1], outcome: 'epic_technique' },
            { chance: 0.20, type: 'cosmetics_epic', qty: [1, 1], outcome: 'epic_cosmetics' },
            { chance: 0.10, type: 'techniques_legendary', qty: [1, 1], outcome: 'LEGENDARY_JACKPOT' }
        ],
        fallback: { pool: 'cons_epic', qty: [1, 2] }
    }
};

// ==================== HELPER FUNCTIONS ====================

const pickRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// Granting rewards to cultivation state (mutates state)
const grantRewards = (cultivation, rewards) => {
    const results = [];

    for (const reward of rewards) {
        // Material Handling
        if (reward.type === 'materials_low' || reward.type === 'materials_mid' || reward.type === 'materials_high' || POOLS[reward.type]) {
            // It's a pool key, processed before calling this, but if passed directly:
            // Logic below assumes 'reward' is resolved item, but allow for raw pool types if needed?
            // No, rollLootBox resolves to specific IDs.
        }

        const shopItem = SHOP_ITEMS_MAP.get(reward.id);
        const materialTemplate = MATERIAL_TEMPLATES.find(m => m.id === reward.id);

        if (materialTemplate) {
            // Add Material
            const existingIdx = cultivation.materials.findIndex(m => m.templateId === reward.id);
            if (existingIdx >= 0) {
                cultivation.materials[existingIdx].qty += reward.qty;
            } else {
                cultivation.materials.push({
                    templateId: materialTemplate.id,
                    name: materialTemplate.name,
                    tier: materialTemplate.tier,
                    rarity: 'common', // Materials from shop/lootbox are generic common rarity usually unless specified
                    element: materialTemplate.element,
                    icon: materialTemplate.icon,
                    qty: reward.qty,
                    acquiredAt: new Date()
                });
            }
            results.push({ ...reward, type: 'material', name: materialTemplate.name });
        } else if (shopItem) {
            // Add Shop Item
            if (shopItem.type === 'technique') {
                const alreadyLearned = cultivation.learnedTechniques.some(t => t.techniqueId === shopItem.id);
                if (!alreadyLearned) {
                    cultivation.learnedTechniques.push({
                        techniqueId: shopItem.id,
                        proficiency: 0,
                        level: 1,
                        learnedAt: new Date()
                    });
                    // Add stats immediately? Usually updated via recalc.
                    results.push({ ...reward, type: 'technique', name: shopItem.name });
                } else {
                    // Duplicate! Handled in rollLootBox, but if here, fallback?
                    // Should theoretically not happen if rollLootBox did its job, OR this is a direct grant.
                    // Just convert to Spirit Stones or Pill as last resort
                    cultivation.spiritStones += Math.floor(shopItem.price * 0.5);
                    results.push({ id: 'spirit_stones', name: 'Linh Thạch (Quy Đổi)', qty: Math.floor(shopItem.price * 0.5), type: 'currency' });
                }
            } else {
                // Consumables, etc.
                const existing = cultivation.inventory.find(i => i.itemId === shopItem.id);
                if (existing) {
                    existing.quantity = (existing.quantity || 1) + reward.qty;
                } else {
                    cultivation.inventory.push({
                        itemId: shopItem.id,
                        name: shopItem.name,
                        type: shopItem.type,
                        quantity: reward.qty,
                        metadata: { ...shopItem },
                        acquiredAt: new Date()
                    });
                }
                results.push({ ...reward, type: shopItem.type, name: shopItem.name });
            }
        }
    }
    return results;
};


const rollLootBox = (lootboxKey, cultivation) => {
    const table = LOOTBOX_TABLES[lootboxKey];
    if (!table) throw new Error("Invalid Lootbox");

    const rewards = [];
    let outcome = "common";
    let duplicateConverted = false;

    // 1. Base Rewards (Always get these)
    table.baseRewards.forEach(entry => {
        if (Math.random() <= entry.chance) {
            const pool = POOLS[entry.pool];
            if (pool && pool.length > 0) {
                const itemId = pickRandom(pool);
                const qty = randInt(entry.qty[0], entry.qty[1]);
                rewards.push({ id: itemId, qty, source: 'base' });
            }
        }
    });

    // 2. Primary Roll (Exclusive weighted check)
    const roll = Math.random();
    let cumulative = 0;
    let hit = null;

    for (const entry of table.primaryRoll) {
        cumulative += entry.chance;
        if (roll <= cumulative) {
            hit = entry;
            outcome = entry.outcome;
            break;
        }
    }

    if (hit) {
        const pool = POOLS[hit.type];
        if (pool && pool.length > 0) {
            let itemId = pickRandom(pool);
            let qty = randInt(hit.qty[0], hit.qty[1]);

            // Check Duplicate for Unique Items
            const itemDef = SHOP_ITEMS_MAP.get(itemId);
            // Unique types checking
            const isUniqueType = itemDef && (itemDef.type === 'technique' || itemDef.type === 'title' || itemDef.type === 'avatar_frame' || itemDef.type === 'profile_effect' || itemDef.type === 'mount' || itemDef.type === 'pet');

            let isOwned = false;
            if (isUniqueType) {
                if (itemDef.type === 'technique') {
                    isOwned = cultivation.learnedTechniques.some(t => t.techniqueId === itemId);
                } else {
                    // Check inventory for cosmetics/pets
                    isOwned = cultivation.inventory.some(i => i.itemId === itemId);
                }
            }

            if (isOwned) {
                duplicateConverted = true;
                // Convert to meaningful consumable (Gold pill or Exp boost)
                const conversionPool = POOLS['cons_epic'];
                itemId = pickRandom(conversionPool);
                qty = 2; // Bonus qty for duplicate
            }

            rewards.push({ id: itemId, qty, source: 'primary' });
        }
    } else {
        // Fallback if no primary hit
        const pool = POOLS[table.fallback.pool];
        if (pool && pool.length > 0) {
            const itemId = pickRandom(pool);
            const qty = randInt(table.fallback.qty[0], table.fallback.qty[1]);
            rewards.push({ id: itemId, qty, source: 'fallback' });
        }
    }

    return { rewards, rolled: { boxKey: lootboxKey, outcome, duplicateConverted } };
};


// ==================== CONTROLLER FUNCTIONS ====================

export const getShop = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const redis = getClient();
        const shopCacheKey = getShopCacheKey();

        let equipmentItems = null;
        if (redis && isRedisConnected()) {
            try {
                const cached = await redis.get(shopCacheKey);
                if (cached) equipmentItems = JSON.parse(cached);
            } catch (e) { console.error('[SHOP] Redis error', e); }
        }

        if (!equipmentItems) {
            const availableEquipment = await Equipment.find({ is_active: true, price: { $gt: 0 } }).lean();
            equipmentItems = availableEquipment.map(eq => ({
                id: eq._id.toString(),
                name: eq.name,
                type: `equipment_${eq.type}`,
                equipmentType: eq.type,
                subtype: eq.subtype,
                rarity: eq.rarity,
                price: eq.price,
                img: eq.img,
                description: eq.description,
                level_required: eq.level_required,
                stats: eq.stats,
                canUse: false // populated later
            }));
            if (redis && isRedisConnected()) {
                redis.set(shopCacheKey, JSON.stringify(equipmentItems), 'EX', SHOP_CACHE_TTL).catch(console.error);
            }
        }

        const cultivation = await Cultivation.getOrCreate(userId);
        const sectBonuses = await getCachedSectBonuses(userId);
        const shopDiscount = sectBonuses.shopDiscount || 0;

        const shopItems = SHOP_ITEMS
            .filter(item => (item.price > 0 || item.oneTimePurchase) && !item.exclusive)
            .map(item => {
                const isAlchemyItem = ['exp_boost', 'breakthrough_boost', 'consumable'].includes(item.type);
                const discountedPrice = isAlchemyItem ? Math.floor(item.price * (1 - shopDiscount)) : item.price;

                let isOwned = false;
                if (item.type === 'technique') {
                    isOwned = cultivation.learnedTechniques?.some(t => t.techniqueId === item.id);
                } else if (item.oneTimePurchase) {
                    isOwned = cultivation.purchasedOneTimeItems?.includes(item.id);
                } else {
                    // check specific items if needed, but consumables are never "owned" in shop sense usually
                }

                return {
                    ...item,
                    price: discountedPrice,
                    originalPrice: item.price,
                    owned: isOwned,
                    canAfford: cultivation.spiritStones >= discountedPrice
                };
            });

        // Process equipment ownership
        const enrichedEquipment = equipmentItems.map(eq => ({
            ...eq,
            owned: cultivation.inventory.some(i => (i.itemId && i.itemId.toString() === eq.id) || (i.metadata?._id && i.metadata._id.toString() === eq.id)),
            canAfford: cultivation.spiritStones >= eq.price,
            canUse: cultivation.realmLevel >= eq.level_required
        }));

        res.json({
            success: true,
            data: { items: [...shopItems, ...enrichedEquipment], spiritStones: cultivation.spiritStones }
        });

    } catch (error) {
        next(error);
    }
};

export const buyItem = async (req, res, next) => {
    let session = null;
    try {
        const userId = req.user.id;
        const { itemId } = req.params;
        const { quantity = 1 } = req.body;
        const qty = Math.floor(Number(quantity));

        if (qty < 1 || qty > 99) return res.status(400).json({ success: false, message: "Số lượng không hợp lệ" });

        console.log(`[BUY_DEBUG] Start - User: ${userId}, Item: ${itemId}, Qty: ${qty}`);

        session = await mongoose.startSession();
        session.startTransaction();

        const cultivation = await Cultivation.findOne({ user: userId }).session(session);
        if (!cultivation) {
            console.error(`[BUY_DEBUG] Cultivation not found for user ${userId}`);
            throw new Error("Không tìm thấy dữ liệu tu luyện");
        }
        console.log(`[BUY_DEBUG] Current SS: ${cultivation.spiritStones}`);

        const shopItem = SHOP_ITEMS_MAP.get(itemId);
        let purchaseResult = {};

        // ==================== FLOW 1: SHOP ITEMS (Including Lootboxes) ====================
        if (shopItem) {
            // Discounts
            const sectBonuses = await getCachedSectBonuses(userId);
            const shopDiscount = sectBonuses.shopDiscount || 0;
            const isAlchemy = ['exp_boost', 'breakthrough_boost', 'consumable'].includes(shopItem.type);
            const unitPrice = isAlchemy ? Math.floor(shopItem.price * (1 - shopDiscount)) : shopItem.price;
            const totalPrice = unitPrice * qty;

            console.log(`[BUY_DEBUG] Item Type: ${shopItem.type}, Unit Price: ${unitPrice}, Total: ${totalPrice}, User Has: ${cultivation.spiritStones}`);

            if (cultivation.spiritStones < totalPrice) {
                console.error(`[BUY_DEBUG] Not enough stones. Required: ${totalPrice}, Has: ${cultivation.spiritStones}`);
                throw new Error("Không đủ Linh Thạch");
            }

            // Deduct Currency
            cultivation.spiritStones -= totalPrice;

            // Handle Lootbox (Instant Open)
            if (shopItem.type === 'lootbox') {
                const rollResults = rollLootBox(shopItem.lootboxKey, cultivation);
                const grantedRewards = grantRewards(cultivation, rollResults.rewards);

                purchaseResult = {
                    type: 'lootbox_result',
                    spent: totalPrice,
                    rewards: grantedRewards,
                    rolled: rollResults.rolled
                };
            }
            // Handle One-Time Purchase
            else if (shopItem.oneTimePurchase) {
                if (cultivation.purchasedOneTimeItems.includes(itemId)) throw new Error("Đã mua gói này rồi");
                cultivation.purchasedOneTimeItems.push(itemId);
                // Grant items from pack
                if (shopItem.rewards && shopItem.rewards.items) {
                    const rewardsList = shopItem.rewards.items.map(i => ({ id: i.itemId, qty: i.quantity, type: 'consumable' }));
                    grantRewards(cultivation, rewardsList);
                    if (shopItem.rewards.spiritStones) cultivation.spiritStones += shopItem.rewards.spiritStones;
                }
                purchaseResult = { type: 'starter_pack', name: shopItem.name };
            }
            // Handle Normal Items (Techniques, Consumables)
            else {
                const rewardList = [{ id: itemId, qty, type: shopItem.type }];
                const granted = grantRewards(cultivation, rewardList);
                purchaseResult = { type: 'item', name: shopItem.name, received: granted };
            }

        }
        // ==================== FLOW 2: EQUIPMENT ====================
        else if (mongoose.Types.ObjectId.isValid(itemId)) {
            const equipment = await Equipment.findById(itemId).session(session);
            if (!equipment) throw new Error("Vật phẩm không tồn tại");

            const totalPrice = equipment.price * qty;
            if (cultivation.spiritStones < totalPrice) throw new Error("Không đủ Linh Thạch");

            cultivation.spiritStones -= totalPrice;

            // Add equipment logic (simplified for brevity, standard inventory push)
            for (let i = 0; i < qty; i++) {
                cultivation.inventory.push({
                    itemId: equipment._id.toString(),
                    name: equipment.name,
                    type: `equipment_${equipment.type}`,
                    quantity: 1,
                    metadata: equipment.toObject(),
                    acquiredAt: new Date()
                });
            }
            purchaseResult = { type: 'equipment', name: equipment.name };
        } else {
            throw new Error("Vật phẩm không hợp lệ");
        }

        await cultivation.save({ session });
        await session.commitTransaction();
        console.log(`[BUY_DEBUG] Success - Remaining SS: ${cultivation.spiritStones}`);

        // Return Success
        res.json({
            success: true,
            data: {
                spiritStones: cultivation.spiritStones,
                inventory: cultivation.inventory,
                purchasedOneTimeItems: cultivation.purchasedOneTimeItems,
                learnedTechniques: cultivation.learnedTechniques, // Return updated techniques
                // Pass Lootbox details specifically
                ...purchaseResult
            },
            message: "Mua thành công!"
        });

    } catch (error) {
        if (session) await session.abortTransaction();
        console.error("Purchase Error:", error);
        res.status(400).json({ success: false, message: error.message });
    } finally {
        if (session) session.endSession();
    }
};
