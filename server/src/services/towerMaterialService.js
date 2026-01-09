/**
 * Tower Material Service
 * Handles tower-specific materials: contract, shard, crystal
 */

// ==================== MATERIAL TEMPLATES ====================
export const TOWER_MATERIAL_TEMPLATES = {
    mat_contract: {
        templateId: 'mat_contract',
        name: 'Khế Ước Phi Thăng',
        tier: 14,
        rarity: 'legendary',
        element: null,
        icon: '',
        description: 'Khế ước thần bí ký kết với Thiên Đạo, cần thiết để phi thăng vượt khỏi giới hạn phàm trần. Mỗi tuần Thiên Đạo chỉ ban xuống một đạo khế ước duy nhất.'
    },
    mat_heaven_shard: {
        templateId: 'mat_heaven_shard',
        name: 'Thiên Đạo Mảnh',
        tier: 14,
        rarity: 'epic',
        element: null,
        icon: '',
        description: 'Mảnh vỡ từ Thiên Đạo rơi xuống, chứa đựng huyền diệu vô tận. Thu thập đủ 1200 mảnh mới có thể lĩnh ngộ Phi Thăng Chi Đạo.'
    },
    mat_root_crystal: {
        templateId: 'mat_root_crystal',
        name: 'Linh Căn Tinh Thạch',
        tier: 14,
        rarity: 'rare',
        element: null,
        icon: '',
        description: 'Tinh thạch kết tinh từ Linh Căn thiên địa, yêu cầu 2000 viên để củng cố nền móng trước khi phi thăng.'
    }
};

/**
 * Add material to cultivation (add-or-increment pattern)
 * @param {Object} cultivation - Cultivation document
 * @param {string} templateId - Material template ID
 * @param {number} qty - Quantity to add
 */
export function addTowerMaterial(cultivation, templateId, qty) {
    if (!qty || qty <= 0) return;

    const tpl = TOWER_MATERIAL_TEMPLATES[templateId];
    if (!tpl) {
        throw new Error(`Unknown tower material templateId=${templateId}`);
    }

    const idx = cultivation.materials.findIndex(m => m.templateId === templateId);
    if (idx >= 0) {
        cultivation.materials[idx].qty += qty;
        cultivation.materials[idx].acquiredAt = new Date();
    } else {
        cultivation.materials.push({
            ...tpl,
            qty,
            acquiredAt: new Date()
        });
    }
}

/**
 * Get material quantity
 * @param {Object} cultivation - Cultivation document
 * @param {string} templateId - Material template ID
 * @returns {number} Quantity
 */
export function getTowerMaterialQty(cultivation, templateId) {
    const m = cultivation.materials.find(x => x.templateId === templateId);
    return m?.qty || 0;
}

/**
 * Consume material (for ascension)
 * @param {Object} cultivation - Cultivation document
 * @param {string} templateId - Material template ID
 * @param {number} qty - Quantity to consume
 * @returns {boolean} Success
 */
export function consumeTowerMaterial(cultivation, templateId, qty) {
    if (!qty || qty <= 0) return true;

    const idx = cultivation.materials.findIndex(m => m.templateId === templateId);
    if (idx < 0) return false;

    if (cultivation.materials[idx].qty < qty) return false;

    cultivation.materials[idx].qty -= qty;

    // Remove if qty = 0
    if (cultivation.materials[idx].qty <= 0) {
        cultivation.materials.splice(idx, 1);
    }

    return true;
}

/**
 * Get all tower materials for a cultivation
 */
export function getTowerMaterials(cultivation) {
    return {
        mat_contract: getTowerMaterialQty(cultivation, 'mat_contract'),
        mat_heaven_shard: getTowerMaterialQty(cultivation, 'mat_heaven_shard'),
        mat_root_crystal: getTowerMaterialQty(cultivation, 'mat_root_crystal')
    };
}

export default {
    TOWER_MATERIAL_TEMPLATES,
    addTowerMaterial,
    getTowerMaterialQty,
    consumeTowerMaterial,
    getTowerMaterials
};
