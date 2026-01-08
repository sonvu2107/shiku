// services/sectBuildingBonusService.js
// Dịch vụ lấy bonus từ công trình Tông Môn cho user

import SectMember from "../models/SectMember.js";
import Sect from "../models/Sect.js";
import { SECT_BUILDINGS } from "../data/sectBuildings.js";

/**
 * Lấy tất cả bonus từ công trình Tông Môn của user
 * @param {string} userId - ID người dùng
 * @returns {Promise<Object>} Các bonus hiện có
 */
export async function getSectBuildingBonuses(userId) {
    const bonuses = {
        dailyBonusEnergy: 0,   // Linh Điền
        techniqueSlots: 0,     // Tàng Kinh Các
        shopDiscount: 0,       // Đan Phòng
        arenaBonus: 0,         // Luyện Công Trường
    };

    try {
        // Tìm thành viên tông môn
        const member = await SectMember.findOne({ user: userId, isActive: true });
        if (!member) return bonuses;

        // Lấy thông tin Tông Môn
        const sect = await Sect.findById(member.sect);
        if (!sect || !sect.buildings) return bonuses;

        // Helper: lấy level theo buildingId từ mảng buildings
        const getLevel = (id) => (sect.buildings || []).find(b => b.buildingId === id)?.level || 0;

        // Linh Điền - Bonus Linh Khí điểm danh
        const spiritFieldLevel = getLevel('spirit_field');
        if (spiritFieldLevel > 0) {
            bonuses.dailyBonusEnergy = SECT_BUILDINGS.spirit_field?.effects?.[spiritFieldLevel]?.dailyBonusEnergy || 0;
        }

        // Tàng Kinh Các - Số slot công pháp
        const libraryLevel = getLevel('library');
        if (libraryLevel > 0) {
            bonuses.techniqueSlots = SECT_BUILDINGS.library?.effects?.[libraryLevel]?.techniqueSlots || 0;
        }

        // Đan Phòng - Giảm giá shop
        const alchemyRoomLevel = getLevel('alchemy_room');
        if (alchemyRoomLevel > 0) {
            bonuses.shopDiscount = SECT_BUILDINGS.alchemy_room?.effects?.[alchemyRoomLevel]?.shopDiscount || 0;
        }

        // Luyện Công Trường - Bonus Arena
        const trainingGroundsLevel = getLevel('training_grounds');
        if (trainingGroundsLevel > 0) {
            bonuses.arenaBonus = SECT_BUILDINGS.training_grounds?.effects?.[trainingGroundsLevel]?.arenaBonus || 0;
        }

        // Trả về cùng với tên Tông Môn để debug
        bonuses.sectName = sect.name;
        bonuses.sectId = sect._id.toString();

    } catch (error) {
        console.error("[Sect Bonus] Lỗi khi lấy bonus Tông Môn:", error);
    }

    return bonuses;
}

export default { getSectBuildingBonuses };
