import Cultivation, { SHOP_ITEMS_MAP } from "../../models/Cultivation.js";
import { saveWithRetry } from "../../utils/dbUtils.js";

const EQUIPMENT_SELL_MIN = 0.25;
const EQUIPMENT_SELL_MAX = 0.4;
const NON_EQUIPMENT_SELL_RATE = 0.5;
const FALLBACK_STACKABLE_PRICE = 10;
const PRICE_MULTIPLIER = 1.5;
const MAX_EQUIPMENT_SELL_PRICE = 25000; // Giới hạn giá bán tối đa cho trang bị
const PERCENT_WEIGHT = 300;
const HP_DIVISOR = 5;
const SPEED_WEIGHT = 2;
const PENETRATION_WEIGHT = 2;
const TRUE_DAMAGE_WEIGHT = 2;
const SKILL_BONUS_WEIGHT = 5;
const ENERGY_REGEN_WEIGHT = 5;
const BUFF_DURATION_WEIGHT = 0.5;

// Multiplier giá bán dựa trên độ hiếm

// Giá cơ bản mỗi level (Linh Thạch)

/**
 * Tính giá bán của một item
 * @param {Object} item 
 * @returns {number}
 */
function calculateSellPrice(item) {
    return calculateSellPriceV2(item);
    if (!item) return 0;

    // Nếu là trang bị (có type bắt đầu bằng equipment_)
    if (item.type && item.type.startsWith("equipment_")) {
        const rarity = item.rarity || item.metadata?.rarity || RARITY.COMMON;
        const level = item.level || item.metadata?.level || 1;
        const multiplier = SELL_RARITY_MULTIPLIERS[rarity] || 1;

        return Math.floor(level * multiplier * BASE_PRICE_PER_LEVEL);
    }

    // Các vật phẩm khác (đan dược, nguyên liệu...) - Tạm tính giá mặc định thấp
    // TODO: Cần logic giá riêng cho Consumable nếu muốn bán
    if (["exp_boost", "consumable", "material"].includes(item.type)) {
        return 10;
    }

    return 0; // Không bán được (title, badge...)
}

/**
 * Bán vật phẩm trong túi đồ
 * POST /api/cultivation/inventory/sell
 * Body: { items?: [{ itemId, quantity }], itemIds?: ["itemId1", "itemId2"] }
 */
const toNumber = (value) => {
    const num = Number(value);
    return Number.isFinite(num) ? num : 0;
};

const normalizePercent = (value) => {
    const num = toNumber(value);
    if (num <= 0) return 0;
    if (num <= 1) return num;
    return num / 100;
};

const sumElementalDamage = (elementalDamage) => {
    if (!elementalDamage) return 0;
    if (elementalDamage instanceof Map) {
        let total = 0;
        elementalDamage.forEach((val) => {
            total += toNumber(val);
        });
        return total;
    }
    if (typeof elementalDamage === 'object') {
        return Object.values(elementalDamage).reduce((sum, val) => sum + toNumber(val), 0);
    }
    return 0;
};

const getEquipmentStats = (item) => {
    const statsSource = item?.metadata?.stats || item?.stats || item?.metadata || {};

    return {
        attack: toNumber(statsSource.attack),
        defense: toNumber(statsSource.defense),
        hp: toNumber(statsSource.hp || statsSource.qiBlood),
        speed: toNumber(statsSource.speed),
        penetration: toNumber(statsSource.penetration),
        critRate: normalizePercent(statsSource.crit_rate ?? statsSource.criticalRate ?? statsSource.critRate),
        critDamage: normalizePercent(statsSource.crit_damage ?? statsSource.criticalDamage ?? statsSource.critDamage),
        evasion: normalizePercent(statsSource.evasion ?? statsSource.dodge),
        hitRate: normalizePercent(statsSource.hit_rate ?? statsSource.accuracy ?? statsSource.hitRate),
        lifesteal: normalizePercent(statsSource.lifesteal),
        skillBonus: toNumber(item?.metadata?.skill_bonus ?? statsSource.skill_bonus ?? item?.skill_bonus),
        energyRegen: toNumber(item?.metadata?.energy_regen ?? statsSource.energy_regen ?? item?.energy_regen),
        trueDamage: toNumber(item?.metadata?.true_damage ?? statsSource.true_damage ?? item?.true_damage),
        buffDuration: toNumber(item?.metadata?.buff_duration ?? statsSource.buff_duration ?? item?.buff_duration),
        elementalDamage: sumElementalDamage(statsSource.elemental_damage)
    };
};

const getEquipmentSellRatio = (item) => {
    const durability = item?.metadata?.durability;
    if (durability && Number.isFinite(durability.current) && Number.isFinite(durability.max) && durability.max > 0) {
        const ratio = Math.max(0, Math.min(1, durability.current / durability.max));
        return EQUIPMENT_SELL_MIN + (EQUIPMENT_SELL_MAX - EQUIPMENT_SELL_MIN) * ratio;
    }
    return EQUIPMENT_SELL_MAX;
};

const calculateEquipmentBasePrice = (item) => {
    const stats = getEquipmentStats(item);
    const flatScore = stats.attack
        + stats.defense
        + (stats.hp / HP_DIVISOR)
        + (stats.speed * SPEED_WEIGHT)
        + (stats.penetration * PENETRATION_WEIGHT)
        + (stats.trueDamage * TRUE_DAMAGE_WEIGHT)
        + (stats.skillBonus * SKILL_BONUS_WEIGHT)
        + (stats.energyRegen * ENERGY_REGEN_WEIGHT)
        + (stats.buffDuration * BUFF_DURATION_WEIGHT);
    const percentScore = (stats.critRate + stats.critDamage + stats.evasion + stats.hitRate + stats.lifesteal) * PERCENT_WEIGHT;
    const totalScore = flatScore + percentScore + stats.elementalDamage;
    const basePrice = Math.floor(totalScore * PRICE_MULTIPLIER);

    if (basePrice > 0) return basePrice;

    const fallbackPrice = toNumber(item?.metadata?.price || item?.price);
    return fallbackPrice > 0 ? fallbackPrice : 0;
};

const getNonEquipmentBasePrice = (item) => {
    const shopItem = SHOP_ITEMS_MAP.get(item?.itemId);
    return toNumber(item?.metadata?.price || shopItem?.price || item?.price);
};

const calculateSellPriceV2 = (item) => {
    if (!item) return 0;

    if (item.type && item.type.startsWith("equipment_")) {
        const basePrice = calculateEquipmentBasePrice(item);
        if (basePrice <= 0) return 0;
        const sellPrice = Math.floor(basePrice * getEquipmentSellRatio(item));
        return Math.min(sellPrice, MAX_EQUIPMENT_SELL_PRICE); // Giới hạn tối đa 40k
    }

    const basePrice = getNonEquipmentBasePrice(item);
    if (basePrice > 0) {
        return Math.floor(basePrice * NON_EQUIPMENT_SELL_RATE);
    }

    if (["exp_boost", "breakthrough_boost", "consumable", "material"].includes(item.type)) {
        return FALLBACK_STACKABLE_PRICE;
    }

    return 0;
};

export const sellItems = async (req, res) => {
    try {
        const userId = req.user._id;
        const { itemIds, items } = req.body;
        const normalizedItems = [];

        if (Array.isArray(items)) {
            for (const entry of items) {
                if (!entry || !entry.itemId) continue;
                const qty = Math.floor(Number(entry.quantity)) || 1;
                if (qty > 0) normalizedItems.push({ itemId: String(entry.itemId), quantity: qty });
            }
        } else if (Array.isArray(itemIds)) {
            for (const itemId of itemIds) {
                if (!itemId) continue;
                normalizedItems.push({ itemId: String(itemId), quantity: 1 });
            }
        }

        if (normalizedItems.length === 0) {
            return res.status(400).json({ success: false, message: "Chưa chọn vật phẩm để bán" });
        }

        const cultivation = await Cultivation.findOne({ user: userId });
        if (!cultivation) {
            return res.status(404).json({ success: false, message: "Không tìm thấy dữ liệu tu luyện" });
        }

        let totalValue = 0;
        let soldCount = 0;
        const newInventory = [];
        const itemsToSellMap = new Map();

        for (const entry of normalizedItems) {
            const qty = Math.min(999, Math.floor(Number(entry.quantity)) || 1);
            if (qty <= 0) continue;
            const current = itemsToSellMap.get(entry.itemId) || 0;
            itemsToSellMap.set(entry.itemId, current + qty);
        }

        const equippedItemIds = new Set(
            Object.values(cultivation.equipped || {}).filter(Boolean).map((id) => id.toString())
        );

        // Duyệt qua inventory hiện tại
        // Logic: Giữ lại những item KHÔNG nằm trong danh sách bán HOẶC không thể bán
        // Những item nằm trong danh sách bán sẽ được xử lý tính tiền

        // Tạo Map hoặc Set itemIds cần bán để lookup nhanh?
        // Tuy nhiên inventory item có itemId riêng biệt (thường là uuid hoặc unique string)

        for (const item of cultivation.inventory) {
            // Safe convert to string to match request body which is array of strings
            const itemIdStr = item.itemId ? String(item.itemId) : "";
            const remainingQty = itemIdStr ? (itemsToSellMap.get(itemIdStr) || 0) : 0;

            // Nếu item này nằm trong danh sách yêu cầu bán
            if (remainingQty > 0) {
                // Kiểm tra điều kiện bán
                // 1. Không được đang trang bị
                if (item.equipped || equippedItemIds.has(itemIdStr)) {
                    newInventory.push(item); // Giữ lại, không bán
                    continue;
                }

                // 2. Kiểm tra giá bán (nếu giá = 0 tức là không bán được)
                const unitPrice = calculateSellPriceV2(item);
                if (unitPrice <= 0) {
                    newInventory.push(item);
                    continue;
                }

                const availableQty = item.type?.startsWith('equipment_')
                    ? 1
                    : Math.max(1, Math.floor(Number(item.quantity)) || 1);
                const sellQty = Math.min(availableQty, remainingQty);

                if (sellQty <= 0) {
                    newInventory.push(item);
                    continue;
                }

                const nextRemaining = remainingQty - sellQty;
                if (nextRemaining > 0) {
                    itemsToSellMap.set(itemIdStr, nextRemaining);
                } else {
                    itemsToSellMap.delete(itemIdStr);
                }

                totalValue += unitPrice * sellQty;
                soldCount += sellQty;

                if (availableQty > sellQty) {
                    item.quantity = availableQty - sellQty;
                    newInventory.push(item);
                }
                continue;

                const price = calculateSellPrice(item);
                if (price > 0) {
                    totalValue += price;
                    soldCount++;
                    soldItems.push({ name: item.name, price });
                    // Không push vào newInventory => Xóa hỏi túi
                } else {
                    newInventory.push(item); // Giữ lại
                }
            } else {
                newInventory.push(item); // Không nằm trong danh sách bán -> Giữ lại
            }
        }

        if (soldCount === 0) {
            return res.status(400).json({ success: false, message: "Không có vật phẩm nào hợp lệ để bán" });
        }

        // Cập nhật inventory và tiền
        cultivation.inventory = newInventory;
        cultivation.spiritStones += totalValue;
        cultivation.totalSpiritStonesEarned = (cultivation.totalSpiritStonesEarned || 0) + totalValue;

        await saveWithRetry(cultivation);

        res.json({
            success: true,
            message: `Đã bán ${soldCount} vật phẩm, thu về ${totalValue.toLocaleString()} Linh Thạch`,
            data: {
                totalValue,
                soldCount,
                spiritStones: cultivation.spiritStones,
                inventory: cultivation.inventory
            }
        });

    } catch (error) {
        console.error("Error selling items:", error);
        res.status(500).json({ success: false, message: `Lỗi khi bán vật phẩm: ${error.message}`, error: error.stack });
    }
};
