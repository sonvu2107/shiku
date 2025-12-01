/**
 * Redis Client Service
 * Quản lý kết nối Redis tập trung với ioredis
 */

// ============================================================
// CẤU HÌNH
// ============================================================

const config = {
  url: process.env.REDIS_URL || 'redis://localhost:6379',
  password: process.env.REDIS_PASSWORD || undefined,
  tls: process.env.REDIS_TLS === 'true',
  keyPrefix: process.env.REDIS_KEY_PREFIX || 'shiku:',
  maxRetriesPerRequest: 3,
  connectTimeoutMs: 10000,
  enabled: process.env.USE_REDIS === 'true'
};

// ============================================================
// REDIS CLIENT
// ============================================================

let redisClient = null;
let isConnected = false;

/**
 * Khởi tạo Redis client
 */
async function initializeRedis() {
  if (!config.enabled) {
    console.log('[Redis] Đã tắt (USE_REDIS=false)');
    return null;
  }

  try {
    const Redis = (await import('ioredis')).default;
    
    const options = {
      maxRetriesPerRequest: config.maxRetriesPerRequest,
      connectTimeout: config.connectTimeoutMs,
      lazyConnect: true,
      retryStrategy(times) {
        if (times > 10) return null;
        return Math.min(times * 100, 3000);
      }
    };

    if (config.password) options.password = config.password;
    if (config.tls) options.tls = {};

    redisClient = new Redis(config.url, options);

    redisClient.on('connect', () => console.log('[Redis] Connecting...'));
    redisClient.on('ready', () => {
      isConnected = true;
      console.log('[Redis] Connected successfully');
    });
    redisClient.on('error', (err) => console.error('[Redis] Error:', err.message));
    redisClient.on('close', () => {
      isConnected = false;
      console.log('[Redis] Connection closed');
    });

    await redisClient.connect();
    return redisClient;
  } catch (error) {
    console.error('[Redis] Initialization failed:', error.message);
    return null;
  }
}

/**
 * Lấy Redis client instance
 */
function getClient() {
  return redisClient;
}

/**
 * Kiểm tra Redis có đang kết nối không
 */
function isRedisConnected() {
  return isConnected && redisClient !== null;
}

/**
 * Đóng kết nối Redis
 */
async function closeConnection() {
  if (redisClient) {
    try {
      await redisClient.quit();
    } catch {
      redisClient.disconnect();
    }
    redisClient = null;
    isConnected = false;
  }
}

// ============================================================
// HÀM TRỢ GIÚP
// ============================================================

/**
 * Set key với TTL tùy chọn
 */
async function set(key, value, ttlSeconds = null) {
  if (!isRedisConnected()) return false;
  try {
    const fullKey = config.keyPrefix + key;
    if (ttlSeconds) {
      await redisClient.setex(fullKey, ttlSeconds, value);
    } else {
      await redisClient.set(fullKey, value);
    }
    return true;
  } catch (error) {
    console.error('[Redis] SET error:', error.message);
    return false;
  }
}

/**
 * Lấy giá trị key
 */
async function get(key) {
  if (!isRedisConnected()) return null;
  try {
    return await redisClient.get(config.keyPrefix + key);
  } catch (error) {
    console.error('[Redis] GET error:', error.message);
    return null;
  }
}

/**
 * Xóa key
 */
async function del(key) {
  if (!isRedisConnected()) return false;
  try {
    await redisClient.del(config.keyPrefix + key);
    return true;
  } catch (error) {
    console.error('[Redis] DEL error:', error.message);
    return false;
  }
}

/**
 * Kiểm tra key có tồn tại không
 */
async function exists(key) {
  if (!isRedisConnected()) return false;
  try {
    return (await redisClient.exists(config.keyPrefix + key)) === 1;
  } catch {
    return false;
  }
}

/**
 * Set thời gian hết hạn cho key
 */
async function expire(key, seconds) {
  if (!isRedisConnected()) return false;
  try {
    await redisClient.expire(config.keyPrefix + key, seconds);
    return true;
  } catch {
    return false;
  }
}

// ============================================================
// EXPORTS
// ============================================================

export {
  initializeRedis,
  getClient,
  isRedisConnected,
  closeConnection,
  set,
  get,
  del,
  exists,
  expire,
  config as redisConfig
};

export default {
  initialize: initializeRedis,
  getClient,
  isConnected: isRedisConnected,
  close: closeConnection,
  set,
  get,
  del,
  exists,
  expire
};
