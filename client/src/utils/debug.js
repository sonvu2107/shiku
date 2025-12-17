/**
 * Debug Utility - Centralized logging with debug flag
 * Only logs when DEBUG mode is enabled
 * 
 * Usage:
 *   import { debug, debugGroup, debugWarn, debugError } from '../utils/debug';
 *   debug('tokenManager', 'Token refreshed successfully');
 *   debugGroup('Chat').log('Message sent:', message);
 */

// Debug flag - set to true in development, false in production
const DEBUG = import.meta.env.DEV || localStorage.getItem('debug') === 'true';

// Specific module debug flags
const DEBUG_MODULES = {
    tokenManager: DEBUG,
    socket: DEBUG,
    chat: DEBUG,
    auth: DEBUG,
    api: DEBUG,
    profile: DEBUG,
    equipment: DEBUG,
    keepalive: DEBUG,
    userCache: DEBUG,
};

/**
 * Check if a module should log
 */
const shouldLog = (module) => {
    if (!DEBUG) return false;
    if (!module) return DEBUG;
    return DEBUG_MODULES[module] ?? DEBUG;
};

/**
 * Main debug log function
 * @param {string} module - Module name (e.g., 'tokenManager', 'chat')
 * @param {...any} args - Arguments to log
 */
export const debug = (module, ...args) => {
    if (shouldLog(module)) {
        console.log(`[${module}]`, ...args);
    }
};

/**
 * Debug warning
 */
export const debugWarn = (module, ...args) => {
    if (shouldLog(module)) {
        console.warn(`[${module}]`, ...args);
    }
};

/**
 * Debug error - always logs regardless of flag
 */
export const debugError = (module, ...args) => {
    console.error(`[${module}]`, ...args);
};

/**
 * Create a debug group for a specific module
 * @param {string} module - Module name
 * @returns {Object} Object with log, warn, error methods
 */
export const debugGroup = (module) => ({
    log: (...args) => debug(module, ...args),
    warn: (...args) => debugWarn(module, ...args),
    error: (...args) => debugError(module, ...args),
    enabled: shouldLog(module),
});

/**
 * Enable/disable debug mode at runtime
 */
export const setDebug = (enabled) => {
    if (enabled) {
        localStorage.setItem('debug', 'true');
    } else {
        localStorage.removeItem('debug');
    }
    console.log(`Debug mode ${enabled ? 'enabled' : 'disabled'}. Refresh to apply.`);
};

/**
 * Enable specific module debug
 */
export const setModuleDebug = (module, enabled) => {
    DEBUG_MODULES[module] = enabled;
};

export default { debug, debugWarn, debugError, debugGroup, setDebug, setModuleDebug };
