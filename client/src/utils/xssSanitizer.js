/**
 * XSS Sanitization Utilities (Frontend)
 * 
 * Lightweight client-side sanitization để bảo vệ khi render content.
 * Đây là lớp bảo vệ thứ 2 (defense in depth) sau backend sanitization.
 * 
 * @module utils/xssSanitizer
 */

/**
 * Danh sách các XSS patterns nguy hiểm
 */
const XSS_PATTERNS = [
    // JavaScript protocol
    /javascript\s*:/gi,
    /j\s*a\s*v\s*a\s*s\s*c\s*r\s*i\s*p\s*t\s*:/gi,

    // VBScript
    /vbscript\s*:/gi,

    // Data URI với script
    /data\s*:\s*text\/html/gi,
    /data\s*:\s*application\/javascript/gi,

    // Event handlers
    /on\w+\s*=/gi,

    // Expression
    /expression\s*\(/gi,

    // Script tags
    /<\s*script/gi,
    /<\s*\/\s*script/gi,
];

/**
 * Decode HTML entities
 * @param {string} str - String cần decode
 * @returns {string} - String đã decode
 */
const decodeHTMLEntities = (str) => {
    if (!str || typeof str !== 'string') return str;

    const textarea = document.createElement('textarea');
    textarea.innerHTML = str;
    return textarea.value;
};

/**
 * Kiểm tra string có chứa XSS không
 * @param {string} str - String cần kiểm tra
 * @returns {boolean} - true nếu có XSS
 */
export const containsXSS = (str) => {
    if (!str || typeof str !== 'string') return false;

    const decoded = decodeHTMLEntities(str);

    for (const pattern of XSS_PATTERNS) {
        if (pattern.test(decoded) || pattern.test(str)) {
            return true;
        }
    }

    return false;
};

/**
 * Escape HTML characters để hiển thị an toàn
 * @param {string} str - String cần escape
 * @returns {string} - String đã escape
 */
export const escapeHTML = (str) => {
    if (!str || typeof str !== 'string') return '';

    const escapeMap = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
        '/': '&#x2F;',
        '`': '&#x60;',
        '=': '&#x3D;'
    };

    return str.replace(/[&<>"'`=/]/g, char => escapeMap[char]);
};

/**
 * Sanitize text - Loại bỏ XSS patterns và escape HTML
 * @param {string} input - Input cần sanitize
 * @param {object} options - Options
 * @param {boolean} options.escapeHtml - Có escape HTML không (default: true)
 * @param {number} options.maxLength - Giới hạn độ dài
 * @returns {string} - Input đã sanitize
 */
export const sanitizeText = (input, options = {}) => {
    if (!input || typeof input !== 'string') return '';

    const { escapeHtml = true, maxLength = 10000 } = options;

    let sanitized = input.trim().slice(0, maxLength);

    // Remove XSS patterns
    for (const pattern of XSS_PATTERNS) {
        sanitized = sanitized.replace(pattern, '');
    }

    // Escape HTML nếu cần
    if (escapeHtml) {
        sanitized = escapeHTML(sanitized);
    }

    return sanitized;
};

/**
 * Sanitize URL - Chặn javascript: và data: protocols
 * @param {string} url - URL cần sanitize
 * @returns {string} - URL an toàn hoặc empty string
 */
export const sanitizeUrl = (url) => {
    if (!url || typeof url !== 'string') return '';

    const trimmed = url.trim();
    const decoded = decodeHTMLEntities(trimmed).toLowerCase();

    // Chặn dangerous protocols
    if (
        decoded.includes('javascript:') ||
        decoded.includes('vbscript:') ||
        decoded.includes('data:text/html') ||
        decoded.includes('data:application/javascript') ||
        /on\w+\s*=/i.test(decoded)
    ) {
        return '';
    }

    return trimmed;
};

/**
 * Sanitize for display - Dùng khi render nội dung user-generated
 * @param {string} content - Content cần sanitize
 * @returns {string} - Content an toàn để hiển thị
 */
export const sanitizeForDisplay = (content) => {
    if (!content || typeof content !== 'string') return '';

    // Nếu chứa XSS, escape toàn bộ
    if (containsXSS(content)) {
        return escapeHTML(content);
    }

    return content;
};

/**
 * Clean username for display
 * @param {string} username - Username
 * @returns {string} - Username sạch
 */
export const sanitizeUsername = (username) => {
    if (!username || typeof username !== 'string') return '';

    // Remove HTML entities và special chars
    return username
        .replace(/[<>'"&;()[\]{}\\]/g, '')
        .replace(/&#\w+;/g, '')
        .trim()
        .slice(0, 50);
};

export default {
    containsXSS,
    escapeHTML,
    sanitizeText,
    sanitizeUrl,
    sanitizeForDisplay,
    sanitizeUsername
};
