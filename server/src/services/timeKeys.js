/**
 * Time key helpers for Asia/Bangkok timezone
 * Used for daily/weekly quest resets
 */

const TZ = "Asia/Bangkok";

/**
 * Get day key (YYYY-MM-DD) in Asia/Bangkok timezone
 * @param {Date} date - Date to convert
 * @returns {string} Day key in format YYYY-MM-DD
 */
export function getDayKey(date = new Date()) {
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: TZ,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).formatToParts(date);

    const y = parts.find(p => p.type === "year").value;
    const m = parts.find(p => p.type === "month").value;
    const d = parts.find(p => p.type === "day").value;
    return `${y}-${m}-${d}`; // YYYY-MM-DD
}

/**
 * Get week key (Monday's day key) in Asia/Bangkok timezone
 * @param {Date} date - Date to convert
 * @returns {string} Monday's day key in format YYYY-MM-DD
 */
export function getWeekKey(date = new Date()) {
    // Get date components in TZ
    const dayKey = getDayKey(date); // YYYY-MM-DD in TZ
    const [yy, mm, dd] = dayKey.split("-").map(Number);

    // Create a date at UTC midnight for that TZ date key
    const anchor = new Date(Date.UTC(yy, mm - 1, dd));
    const weekday = anchor.getUTCDay(); // 0=Sun..6=Sat

    // Monday=1 => offset to Monday
    const diffToMonday = (weekday === 0 ? -6 : 1 - weekday); // Sun -> -6
    anchor.setUTCDate(anchor.getUTCDate() + diffToMonday);

    const y = anchor.getUTCFullYear();
    const m = String(anchor.getUTCMonth() + 1).padStart(2, "0");
    const d = String(anchor.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${d}`; // Monday dayKey
}
