/**
 * Encryption Service
 * 
 * Cung cấp mã hóa/giải mã tin nhắn sử dụng AES-256-GCM
 * - Mã hóa tại server trước khi lưu vào database
 * - Giải mã khi trả về cho client
 * 
 * @module encryptionService
 */

import crypto from 'crypto';

// Encryption configuration
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 128 bits
const AUTH_TAG_LENGTH = 16; // 128 bits
const KEY_LENGTH = 32; // 256 bits

// Get encryption key from environment
const getEncryptionKey = () => {
    const key = process.env.MESSAGE_ENCRYPTION_KEY;

    if (!key) {
        console.warn('[ENCRYPTION] MESSAGE_ENCRYPTION_KEY not set. Using fallback key (NOT SECURE FOR PRODUCTION)');
        // Fallback key for development - KHÔNG DÙNG CHO PRODUCTION
        return crypto.scryptSync('shiku-default-key-dev', 'salt', KEY_LENGTH);
    }

    // If key is hex string (64 chars = 32 bytes)
    if (key.length === 64 && /^[0-9a-fA-F]+$/.test(key)) {
        return Buffer.from(key, 'hex');
    }

    // Otherwise, derive key from password
    return crypto.scryptSync(key, 'shiku-encryption-salt', KEY_LENGTH);
};

let encryptionKey = null;

/**
 * Initialize encryption key (lazy loading)
 */
const initKey = () => {
    if (!encryptionKey) {
        encryptionKey = getEncryptionKey();
    }
    return encryptionKey;
};

/**
 * Encrypt plaintext message
 * @param {string} plaintext - Original message content
 * @returns {string} Encrypted string in format: iv:authTag:ciphertext (all base64)
 */
export function encrypt(plaintext) {
    if (!plaintext || typeof plaintext !== 'string') {
        return plaintext;
    }

    try {
        const key = initKey();
        const iv = crypto.randomBytes(IV_LENGTH);

        const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
            authTagLength: AUTH_TAG_LENGTH
        });

        let encrypted = cipher.update(plaintext, 'utf8', 'base64');
        encrypted += cipher.final('base64');

        const authTag = cipher.getAuthTag();

        // Format: iv:authTag:ciphertext (all base64)
        return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`;
    } catch (error) {
        console.error('[ENCRYPTION] Error encrypting message:', error.message);
        // Return original text if encryption fails (graceful degradation)
        return plaintext;
    }
}

/**
 * Decrypt encrypted message
 * @param {string} encrypted - Encrypted string in format: iv:authTag:ciphertext
 * @returns {string} Original plaintext message
 */
export function decrypt(encrypted) {
    if (!encrypted || typeof encrypted !== 'string') {
        return encrypted;
    }

    // Check if message is encrypted (contains colons for iv:authTag:ciphertext format)
    if (!encrypted.includes(':') || encrypted.split(':').length !== 3) {
        // Not encrypted, return as-is (backward compatibility with old messages)
        return encrypted;
    }

    try {
        const key = initKey();
        const [ivBase64, authTagBase64, ciphertext] = encrypted.split(':');

        const iv = Buffer.from(ivBase64, 'base64');
        const authTag = Buffer.from(authTagBase64, 'base64');

        const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, {
            authTagLength: AUTH_TAG_LENGTH
        });

        decipher.setAuthTag(authTag);

        let decrypted = decipher.update(ciphertext, 'base64', 'utf8');
        decrypted += decipher.final('utf8');

        return decrypted;
    } catch (error) {
        // If decryption fails, might be an unencrypted message
        // Return as-is for backward compatibility
        console.warn('[ENCRYPTION] Decryption failed, returning original:', error.message);
        return encrypted;
    }
}

/**
 * Check if a string is encrypted
 * @param {string} text - Text to check
 * @returns {boolean} True if text appears to be encrypted
 */
export function isEncrypted(text) {
    if (!text || typeof text !== 'string') return false;

    const parts = text.split(':');
    if (parts.length !== 3) return false;

    // Check if parts are valid base64
    try {
        Buffer.from(parts[0], 'base64');
        Buffer.from(parts[1], 'base64');
        Buffer.from(parts[2], 'base64');
        return true;
    } catch {
        return false;
    }
}

/**
 * Generate a new random encryption key
 * @returns {string} 32-byte hex string for use as MESSAGE_ENCRYPTION_KEY
 */
export function generateKey() {
    return crypto.randomBytes(KEY_LENGTH).toString('hex');
}

export default {
    encrypt,
    decrypt,
    isEncrypted,
    generateKey
};
