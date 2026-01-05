import WorldEvent from "../../models/WorldEvent.js";

/**
 * World Event Controller - Thiên Hạ Ký
 * API endpoints và helper functions cho sự kiện thiên hạ
 */

// Event type configs với văn phong tu tiên
export const EVENT_TEMPLATES = {
    breakthrough_success: {
        templates: [
            '{username} vượt {realm} kiếp, bước vào cảnh giới {targetRealm}!',
            '{username} nghịch thiên độ kiếp, đạt {targetRealm}!',
            'Thiên địa chấn động! {username} đột phá thành công, thành {targetRealm}!'
        ]
    },
    breakthrough_fail: {
        templates: [
            '{username} độ kiếp {targetRealm} thất bại, bị thiên kiếp đánh lui!',
            '{username} nghịch thiên thất bại, tạm lui một bước!',
            'Tiếc thay! {username} độ kiếp bất thành, cần tích lũy thêm đạo hạnh!'
        ]
    },
    dungeon_clear: {
        templates: [
            '{username} khai phá {dungeonName} tầng {dungeonFloor}!',
            '{username} chinh phục bí cảnh {dungeonName}!',
            'Tin vui! {username} đã vượt qua {dungeonName}!'
        ]
    },
    pk_overkill: {
        templates: [
            '{username} ({realm}) vượt cấp đánh bại {opponentName} ({opponentRealm})!',
            '{username} nghịch thiên chiến thắng, hạ gục {opponentName}!',
            'Kinh thiên! {username} dĩ hạ khắc thượng, thắng {opponentName}!'
        ]
    },
    rare_encounter: {
        templates: [
            '{username} gặp kỳ ngộ hiếm: {description}!',
            'Cơ duyên thiên định! {username} {description}!',
            '{username} vận khí bùng nổ, {description}!'
        ]
    }
};

/**
 * Format event thành text hiển thị
 */
export function formatEventText(event) {
    const config = EVENT_TEMPLATES[event.type];
    if (!config) return `${event.username} có sự kiện mới`;

    // Random template
    const template = config.templates[Math.floor(Math.random() * config.templates.length)];

    // Replace placeholders
    let text = template
        .replace('{username}', event.username)
        .replace('{realm}', event.realm || '')
        .replace('{targetRealm}', event.targetRealm || '')
        .replace('{dungeonName}', event.metadata?.dungeonName || 'Bí cảnh')
        .replace('{dungeonFloor}', event.metadata?.dungeonFloor || '')
        .replace('{opponentName}', event.metadata?.opponentName || 'đối thủ')
        .replace('{opponentRealm}', event.metadata?.opponentRealm || '')
        .replace('{description}', event.metadata?.description || '');

    return text;
}

/**
 * GET /world-events - Lấy sự kiện trong ngày
 */
export const getWorldEvents = async (req, res, next) => {
    try {
        const limit = Math.min(parseInt(req.query.limit) || 20, 50);
        const events = await WorldEvent.getTodayEvents(limit);

        // Format events với text và icon
        const formattedEvents = events.map(event => ({
            _id: event._id,
            type: event.type,
            type: event.type,
            text: formatEventText(event),
            username: event.username,
            userId: event.userId,
            realm: event.realm,
            targetRealm: event.targetRealm,
            metadata: event.metadata,
            createdAt: event.createdAt
        }));

        res.json({
            success: true,
            data: formattedEvents,
            count: formattedEvents.length
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Helper: Log breakthrough event
 */
export async function logBreakthroughEvent(userId, username, success, currentRealm, targetRealm) {
    const type = success ? 'breakthrough_success' : 'breakthrough_fail';

    // Chỉ log thất bại ở cảnh giới Kim Đan (level 5) trở lên
    if (!success) {
        const highRealms = ['Kim Đan', 'Nguyên Anh', 'Hóa Thần', 'Đại Thừa', 'Độ Kiếp', 'Tiên Nhân', 'Thiên Đế'];
        if (!highRealms.includes(targetRealm)) {
            return null; // Không log fail ở cảnh giới thấp
        }
    }

    return WorldEvent.logEvent(type, userId, username, {
        realm: currentRealm,
        targetRealm: targetRealm
    });
}

/**
 * Helper: Log dungeon clear event
 */
export async function logDungeonEvent(userId, username, dungeonName, floor, realm) {
    return WorldEvent.logEvent('dungeon_clear', userId, username, {
        realm,
        metadata: {
            dungeonName,
            dungeonFloor: floor
        }
    });
}

/**
 * Helper: Log PK overkill event (vượt cấp thắng)
 */
export async function logPKOverkillEvent(userId, username, userRealm, opponentName, opponentRealm) {
    return WorldEvent.logEvent('pk_overkill', userId, username, {
        realm: userRealm,
        metadata: {
            opponentName,
            opponentRealm
        }
    });
}

/**
 * Helper: Log rare encounter event
 */
export async function logRareEncounterEvent(userId, username, description) {
    return WorldEvent.logEvent('rare_encounter', userId, username, {
        metadata: { description }
    });
}

export default {
    getWorldEvents,
    logBreakthroughEvent,
    logDungeonEvent,
    logPKOverkillEvent,
    logRareEncounterEvent
};
