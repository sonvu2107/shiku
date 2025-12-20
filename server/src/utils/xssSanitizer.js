/**
 * XSS Sanitization Utilities
 * 
 * Cung cấp các hàm để sanitize input chống XSS attacks.
 * Bao gồm:
 * - Chặn JavaScript protocol URLs
 * - Chặn event handlers (onClick, onLoad, etc.)
 * - Decode và chặn encoded XSS payloads
 * - Strip HTML entities nguy hiểm
 * 
 * @module utils/xssSanitizer
 */

import sanitizeHtml from "sanitize-html";

/**
 * Danh sách các patterns XSS nguy hiểm
 */
const XSS_PATTERNS = [
    // JavaScript protocol (với variations)
    /javascript\s*:/gi,
    /j\s*a\s*v\s*a\s*s\s*c\s*r\s*i\s*p\s*t\s*:/gi,
    /&#\s*x?\d+;?.*javascript/gi,

    // VBScript protocol
    /vbscript\s*:/gi,

    // Data URI với script
    /data\s*:\s*text\/html/gi,
    /data\s*:\s*application\/javascript/gi,

    // Event handlers (onClick, onLoad, onError, etc.)
    /on\w+\s*=/gi,

    // Expression trong CSS
    /expression\s*\(/gi,

    // SVG/XML injections
    /<\s*svg/gi,
    /<\s*script/gi,
    /<\s*iframe/gi,
    /<\s*object/gi,
    /<\s*embed/gi,
    /<\s*link/gi,
    /<\s*meta/gi,
    /<\s*style/gi,
    /<\s*form/gi,
    /<\s*input/gi,
    /<\s*button/gi,

    // Base64 encoded script attempts
    /base64\s*,\s*[a-zA-Z0-9+/=]+/gi,

    // Unicode escapes
    /\\u00[0-9a-f]{2}/gi,
    /\\x[0-9a-f]{2}/gi,
];

/**
 * Decode HTML entities để phát hiện XSS ẩn
 * @param {string} str - String cần decode
 * @returns {string} - String đã decode
 */
const decodeHTMLEntities = (str) => {
    if (!str || typeof str !== 'string') return str;

    return str
        // Decode numeric entities
        .replace(/&#(\d+);?/g, (_, num) => String.fromCharCode(parseInt(num, 10)))
        // Decode hex entities
        .replace(/&#x([0-9a-f]+);?/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
        // Decode common named entities
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&apos;/g, "'")
        // Handle URL encoded
        .replace(/%3C/gi, '<')
        .replace(/%3E/gi, '>')
        .replace(/%22/gi, '"')
        .replace(/%27/gi, "'")
        .replace(/%0D/gi, '\r')
        .replace(/%0A/gi, '\n');
};

/**
 * Kiểm tra string có chứa XSS patterns không
 * @param {string} str - String cần kiểm tra
 * @returns {boolean} - true nếu có XSS pattern
 */
export const containsXSS = (str) => {
    if (!str || typeof str !== 'string') return false;

    // Decode trước khi check để phát hiện encoded XSS
    const decoded = decodeHTMLEntities(str);

    for (const pattern of XSS_PATTERNS) {
        if (pattern.test(decoded) || pattern.test(str)) {
            return true;
        }
    }

    return false;
};

/**
 * Sanitize input text - Loại bỏ mọi XSS patterns
 * @param {string} input - Input cần sanitize
 * @param {object} options - Options
 * @param {boolean} options.allowBasicFormatting - Cho phép basic formatting (bold, italic)
 * @param {number} options.maxLength - Giới hạn độ dài
 * @returns {string} - Input đã sanitize
 */
export const sanitizeText = (input, options = {}) => {
    if (!input || typeof input !== 'string') return '';

    const { allowBasicFormatting = false, maxLength = 10000 } = options;

    let sanitized = input;

    // 1. Trim và limit length
    sanitized = sanitized.trim().slice(0, maxLength);

    // 2. Decode HTML entities để xử lý encoded attacks
    const decoded = decodeHTMLEntities(sanitized);

    // 3. Nếu decoded version khác original và chứa XSS → reject cả chuỗi gốc
    if (decoded !== sanitized && containsXSS(decoded)) {
        // Replace với version đã được strip hoàn toàn
        sanitized = sanitizeHtml(decoded, { allowedTags: [], allowedAttributes: {} });
    }

    // 4. Remove tất cả XSS patterns
    for (const pattern of XSS_PATTERNS) {
        sanitized = sanitized.replace(pattern, '');
    }

    // 5. Strip HTML tags (giữ lại basic formatting nếu được phép)
    if (allowBasicFormatting) {
        sanitized = sanitizeHtml(sanitized, {
            allowedTags: ['b', 'i', 'em', 'strong', 'u'],
            allowedAttributes: {}
        });
    } else {
        sanitized = sanitizeHtml(sanitized, {
            allowedTags: [],
            allowedAttributes: {}
        });
    }

    // 6. Normalize whitespace
    sanitized = sanitized.replace(/\s+/g, ' ').trim();

    return sanitized;
};

/**
 * Sanitize username - Strict mode cho usernames
 * @param {string} username - Username cần sanitize
 * @returns {string} - Username đã sanitize
 */
export const sanitizeUsername = (username) => {
    if (!username || typeof username !== 'string') return '';

    // Strip mọi thứ, chỉ giữ letters, numbers, spaces, underscores, hyphens
    let sanitized = sanitizeText(username, { maxLength: 50 });

    // Thêm filter cho special chars nguy hiểm trong username
    sanitized = sanitized
        .replace(/[<>'"&;()[\]{}\\]/g, '') // Remove special chars
        .replace(/\s+/g, ' ') // Normalize spaces
        .trim();

    return sanitized;
};

/**
 * Sanitize array of strings (như poll options)
 * @param {Array<string>} items - Array cần sanitize
 * @param {object} options - Options
 * @returns {Array<string>} - Array đã sanitize
 */
export const sanitizeArray = (items, options = {}) => {
    if (!Array.isArray(items)) return [];

    return items
        .filter(item => typeof item === 'string')
        .map(item => sanitizeText(item, options))
        .filter(item => item.length > 0);
};

/**
 * Sanitize URL - Chặn javascript: và data: protocols
 * @param {string} url - URL cần sanitize
 * @returns {string|null} - URL đã sanitize hoặc null nếu không an toàn
 */
export const sanitizeUrl = (url) => {
    if (!url || typeof url !== 'string') return null;

    const trimmed = url.trim();
    const decoded = decodeHTMLEntities(trimmed).toLowerCase();

    // Chặn dangerous protocols
    const dangerousProtocols = [
        'javascript:',
        'vbscript:',
        'data:text/html',
        'data:application/javascript',
    ];

    for (const protocol of dangerousProtocols) {
        if (decoded.includes(protocol)) {
            return null;
        }
    }

    // Kiểm tra event handlers
    if (/on\w+\s*=/i.test(decoded)) {
        return null;
    }

    return trimmed;
};

/**
 * Deep sanitize object - Sanitize tất cả string fields trong object
 * @param {object} obj - Object cần sanitize
 * @param {object} options - Options
 * @returns {object} - Object đã sanitize
 */
export const sanitizeObject = (obj, options = {}) => {
    if (!obj || typeof obj !== 'object') return obj;

    if (Array.isArray(obj)) {
        return obj.map(item => sanitizeObject(item, options));
    }

    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'string') {
            sanitized[key] = sanitizeText(value, options);
        } else if (typeof value === 'object' && value !== null) {
            sanitized[key] = sanitizeObject(value, options);
        } else {
            sanitized[key] = value;
        }
    }

    return sanitized;
};

/**
 * Middleware để sanitize request body
 * @param {object} options - Options cho sanitization
 * @returns {Function} - Express middleware
 */
export const sanitizeRequestBody = (options = {}) => {
    return (req, res, next) => {
        if (req.body && typeof req.body === 'object') {
            req.body = sanitizeObject(req.body, options);
        }
        next();
    };
};

export default {
    containsXSS,
    sanitizeText,
    sanitizeUsername,
    sanitizeArray,
    sanitizeUrl,
    sanitizeObject,
    sanitizeRequestBody
};
