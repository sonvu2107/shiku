/**
 * Time Key Utilities
 * Chuẩn Asia/Bangkok timezone cho daily/weekly reset
 */

const TZ_OFFSET_MIN = 7 * 60; // Asia/Bangkok fixed offset (+07:00)

function toBangkokDate(d = new Date()) {
    const utc = d.getTime() + d.getTimezoneOffset() * 60_000;
    return new Date(utc + TZ_OFFSET_MIN * 60_000);
}

/**
 * Get day key in Bangkok timezone
 * Format: "YYYY-MM-DD"
 */
export function getDayKeyBangkok(d = new Date()) {
    const bkk = toBangkokDate(d);
    const y = bkk.getFullYear();
    const m = String(bkk.getMonth() + 1).padStart(2, '0');
    const day = String(bkk.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

/**
 * Get ISO week key in Bangkok timezone
 * Format: "YYYY-WWW" (e.g., "2026-W02")
 * Monday = start of week
 */
export function getISOWeekKeyBangkok(d = new Date()) {
    const bkk = toBangkokDate(d);

    // ISO week algorithm: shift to Thursday
    const date = new Date(bkk.getFullYear(), bkk.getMonth(), bkk.getDate());
    const day = date.getDay() || 7; // Mon=1..Sun=7
    date.setDate(date.getDate() + 4 - day);

    const yearStart = new Date(date.getFullYear(), 0, 1);
    const weekNo = Math.ceil((((date - yearStart) / 86400000) + 1) / 7);

    const yyyy = date.getFullYear();
    const ww = String(weekNo).padStart(2, '0');
    return `${yyyy}-W${ww}`;
}

/**
 * Check if current time is past daily reset (00:00 Bangkok)
 */
export function isPastDailyReset(lastDayKey) {
    return getDayKeyBangkok() !== lastDayKey;
}

/**
 * Check if current time is past weekly reset (Monday 00:00 Bangkok)
 */
export function isPastWeeklyReset(lastWeekKey) {
    return getISOWeekKeyBangkok() !== lastWeekKey;
}

export default {
    getDayKeyBangkok,
    getISOWeekKeyBangkok,
    isPastDailyReset,
    isPastWeeklyReset
};
