import mongoose from "mongoose";
import Cultivation, { SHOP_ITEMS, SHOP_ITEMS_MAP, TECHNIQUES_MAP } from "../../models/Cultivation.js";
import Equipment from "../../models/Equipment.js";
import { getSectBuildingBonuses } from "../../services/sectBuildingBonusService.js";

/**
 * GET /shop - Lấy danh sách vật phẩm trong shop
 */
export const getShop = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const cultivation = await Cultivation.getOrCreate(userId);

        // Lấy bonus từ Tông Môn (nếu có)
        const sectBonuses = await getSectBuildingBonuses(userId);
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

        const availableEquipment = await Equipment.find({
            is_active: true,
            price: { $gt: 0 }
        }).lean();

        const equipmentItems = availableEquipment.map(eq => {
            let elementalDamage = {};
            if (eq.stats?.elemental_damage instanceof Map) {
                elementalDamage = Object.fromEntries(eq.stats.elemental_damage);
            } else if (eq.stats?.elemental_damage) {
                elementalDamage = eq.stats.elemental_damage;
            }

            const eqId = eq._id.toString();
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
                buff_duration: eq.buff_duration,
                owned: isOwned,
                canAfford: cultivation.spiritStones >= eq.price,
                canUse: cultivation.realmLevel >= eq.level_required
            };
        });

        const allItems = [...shopItems, ...equipmentItems];

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
 */
export const buyItem = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { itemId } = req.params;

        const cultivation = await Cultivation.getOrCreate(userId);

        // 1. Kiểm tra xem item có trong danh sách SHOP_ITEMS không (để tránh nhầm lẫn ID 12 ký tự với ObjectId)
        // Use SHOP_ITEMS_MAP for O(1) lookup
        const shopItem = SHOP_ITEMS_MAP.get(itemId);

        if (shopItem) {
            // Lấy bonus giảm giá từ Tông Môn (Đan Phòng)
            const sectBonuses = await getSectBuildingBonuses(userId);
            const shopDiscount = sectBonuses.shopDiscount || 0;

            // Tính giá sau giảm (chỉ áp dụng cho đan dược)
            const isAlchemyItem = shopItem.type === 'exp_boost' || shopItem.type === 'breakthrough_boost' || shopItem.type === 'consumable';
            const discountedPrice = isAlchemyItem
                ? Math.floor(shopItem.price * (1 - shopDiscount))
                : shopItem.price;

            // Normal item purchase với giá đã giảm
            try {
                const result = cultivation.buyItem(itemId, discountedPrice);
                await cultivation.save();

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

                res.json({
                    success: true,
                    message: result && result.type === 'technique'
                        ? `Đã học công pháp ${result.name}!`
                        : `Đã mua ${result?.name || 'vật phẩm'}!`,
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
            await cultivation.save();

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
