// services/sectTime.js

/**
 * Chuyển Date thành dateKey theo UTC (YYYY-MM-DD)
 * @param {Date} date 
 * @returns {string}
 */
export function toDateKeyUTC(date = new Date()) {
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, "0");
    const d = String(date.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}

/**
 * Chuyển Date thành weekKey theo UTC
 * weekKey = Monday dateKey (YYYY-MM-DD) của tuần đó
 * Reset vào Monday 00:00 UTC
 * @param {Date} date 
 * @returns {string}
 */
export function toWeekKeyUTC(date = new Date()) {
    const day = date.getUTCDay(); // 0=Sun, 1=Mon, ... 6=Sat
    const diffToMonday = (day + 6) % 7; // Mon->0, Tue->1, ... Sun->6

    const monday = new Date(Date.UTC(
        date.getUTCFullYear(),
        date.getUTCMonth(),
        date.getUTCDate()
    ));
    monday.setUTCDate(monday.getUTCDate() - diffToMonday);
    monday.setUTCHours(0, 0, 0, 0);

    return toDateKeyUTC(monday);
}

/**
 * Kiểm tra xem có phải đầu tuần mới không
 * @param {string} currentWeekKey 
 * @param {string} lastWeekKey 
 * @returns {boolean}
 */
export function isNewWeek(currentWeekKey, lastWeekKey) {
    return currentWeekKey !== lastWeekKey;
}
