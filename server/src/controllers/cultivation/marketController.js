import Cultivation from "../../models/Cultivation.js";
import { RARITY } from "../../models/Equipment.js";

// Multiplier giá bán dựa trên độ hiếm
const SELL_RARITY_MULTIPLIERS = {
    [RARITY.COMMON]: 1,
    [RARITY.UNCOMMON]: 2,
    [RARITY.RARE]: 5,
    [RARITY.EPIC]: 10,
    [RARITY.LEGENDARY]: 50,
    [RARITY.MYTHIC]: 100
};

// Giá cơ bản mỗi level (Linh Thạch)
const BASE_PRICE_PER_LEVEL = 100;

/**
 * Tính giá bán của một item
 * @param {Object} item 
 * @returns {number}
 */
function calculateSellPrice(item) {
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
 * Body: { itemIds: ["itemId1", "itemId2"] }
 */
export const sellItems = async (req, res) => {
    try {
        const userId = req.user._id;
        const { itemIds } = req.body;

        if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
            return res.status(400).json({ success: false, message: "Chưa chọn vật phẩm để bán" });
        }

        const cultivation = await Cultivation.findOne({ user: userId });
        if (!cultivation) {
            return res.status(404).json({ success: false, message: "Không tìm thấy dữ liệu tu luyện" });
        }

        let totalValue = 0;
        let soldCount = 0;
        const newInventory = [];
        const soldItems = [];

        // Duyệt qua inventory hiện tại
        // Logic: Giữ lại những item KHÔNG nằm trong danh sách bán HOẶC không thể bán
        // Những item nằm trong danh sách bán sẽ được xử lý tính tiền

        // Tạo Map hoặc Set itemIds cần bán để lookup nhanh?
        // Tuy nhiên inventory item có itemId riêng biệt (thường là uuid hoặc unique string)
        const itemsToSellSet = new Set(itemIds);

        for (const item of cultivation.inventory) {
            // Safe convert to string to match request body which is array of strings
            const itemIdStr = item.itemId ? String(item.itemId) : "";

            // Nếu item này nằm trong danh sách yêu cầu bán
            if (itemsToSellSet.has(itemIdStr)) {
                // Kiểm tra điều kiện bán
                // 1. Không được đang trang bị
                if (item.equipped) {
                    newInventory.push(item); // Giữ lại, không bán
                    continue;
                }

                // 2. Kiểm tra giá bán (nếu giá = 0 tức là không bán được)
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

        await cultivation.save();

        res.json({
            success: true,
            message: `Đã bán ${soldCount} vật phẩm, thu về ${totalValue.toLocaleString()} Linh Thạch`,
            data: {
                totalValue,
                soldCount,
                spiritStones: cultivation.spiritStones
            }
        });

    } catch (error) {
        console.error("Error selling items:", error);
        res.status(500).json({ success: false, message: `Lỗi khi bán vật phẩm: ${error.message}`, error: error.stack });
    }
};
