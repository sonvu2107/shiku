/**
 * Redis Response Cache Middleware
 * 
 * Caches GET responses in Redis with fallback to in-memory cache.
 * Features:
 * - Redis primary cache with configurable TTL
 * - In-memory fallback when Redis unavailable
 * - X-Cache header for debugging (HIT/MISS/HIT-MEM)
 * - Per-user caching support (varyByUser)
 * 
 * @module responseCache
 */

import crypto from "crypto";
import { getClient, isRedisConnected, redisConfig } from "../services/redisClient.js";

// ============================================================
// FALLBACK MEMORY CACHE
// ============================================================

const mem = new Map(); // key -> { exp, body }
const now = () => Date.now();

// ============================================================
// IN-FLIGHT COALESCING (Thundering Herd Protection)
// ============================================================

const inFlight = new Map(); // key -> { exp: number, p: Promise<{ status, payload, ct }> }

function getInFlight(key) {
    const entry = inFlight.get(key);
    if (!entry) return null;
    if (entry.exp <= now()) {
        inFlight.delete(key);
        return null;
    }
    return entry.p;
}

function setInFlight(key, ttlSeconds, promise) {
    // Cap wait window to 5-30s to avoid stuck requests
    const waitSeconds = Math.min(Math.max(ttlSeconds, 5), 30);
    inFlight.set(key, { exp: now() + waitSeconds * 1000, p: promise });
    promise.finally(() => inFlight.delete(key));
    return promise;
}

function getMem(key) {
    const it = mem.get(key);
    if (!it) return null;
    if (it.exp <= now()) {
        mem.delete(key);
        return null;
    }
    return it;
}

function setMem(key, ttlSeconds, body) {
    // Limit memory cache TTL to MAX_MEM_TTL to prevent memory bloat
    const safeTtl = Math.min(ttlSeconds, MAX_MEM_TTL || 30);
    mem.set(key, { exp: now() + safeTtl * 1000, body });

    // Cleanup: remove only overflow entries (not fixed 50)
    const maxEntries = MAX_MEM_ENTRIES || 300;
    if (mem.size > maxEntries) {
        const overflow = mem.size - maxEntries;
        let toDelete = Math.min(overflow, 50);
        for (const k of mem.keys()) {
            mem.delete(k);
            if (--toDelete <= 0) break;
        }
    }
}

// ============================================================
// CACHE KEY GENERATION
// ============================================================

function stableStringify(obj) {
    // Normalize value recursively without stringifying at each level
    const normalize = (v) => {
        if (v === null || v === undefined) return null;
        if (Array.isArray(v)) {
            const arr = v.map(normalize);
            // Optimize: use simple sort for primitives, JSON sort only for objects
            if (arr.every(x => typeof x === "string" || typeof x === "number" || x === null)) {
                return arr.sort();
            }
            return arr.sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
        }
        if (typeof v !== "object") return v;

        const keys = Object.keys(v).sort();
        const out = {};
        for (const k of keys) out[k] = normalize(v[k]);
        return out;
    };
    return JSON.stringify(normalize(obj));
}

/**
 * Generate cache key from request
 * @param {Request} req - Express request
 * @param {Object} options - Options
 * @param {string} options.prefix - Cache key prefix
 * @param {boolean} options.varyByUser - Include user ID in key
 * @returns {string} Cache key
 */
function makeCacheKey(req, { prefix, varyByUser = false }) {
    // Use null instead of "anon" since we SKIP when req.user is null for varyByUser
    const userId = varyByUser
        ? (req.user?.id || req.user?._id?.toString() || null)
        : null;

    // Use originalUrl path for safety with mounted routers
    const urlPath = req.originalUrl.split("?")[0];

    const raw = [
        req.method,
        urlPath,
        stableStringify(req.query),
        userId,
    ].join("|");

    const hash = crypto.createHash("sha1").update(raw).digest("hex");
    const keyPrefix = redisConfig?.keyPrefix || "shiku:";
    return `${keyPrefix}${prefix}:${hash}`;
}

// ============================================================
// CONFIGURATION
// ============================================================

const MAX_PAYLOAD_SIZE = 100 * 1024; // 100KB max cache payload
const MAX_MEM_ENTRIES = 300; // Reduced from 500 for safety
const MAX_MEM_TTL = 30; // Max 30s for memory cache

// Enable debug logging in dev or when DEBUG_CACHE=true
const DEBUG_CACHE = process.env.NODE_ENV !== 'production' || process.env.DEBUG_CACHE === 'true';

// ============================================================
// HIT/MISS METRICS
// ============================================================

const metrics = {
    hit: {},   // { prefix: count }
    miss: {},  // { prefix: count }
    lastLog: Date.now()
};

function recordMetric(prefix, type) {
    if (!metrics[type][prefix]) metrics[type][prefix] = 0;
    metrics[type][prefix]++;

    // Log metrics every 60 seconds (only in dev or DEBUG_CACHE)
    if (DEBUG_CACHE && Date.now() - metrics.lastLog > 60_000) {
        const lines = [];
        const allPrefixes = new Set([...Object.keys(metrics.hit), ...Object.keys(metrics.miss)]);
        for (const p of allPrefixes) {
            const hit = metrics.hit[p] || 0;
            const miss = metrics.miss[p] || 0;
            const total = hit + miss;
            const rate = total > 0 ? Math.round((hit / total) * 100) : 0;
            lines.push(`${p}: ${hit}/${total} (${rate}%)`);
        }
        if (lines.length > 0) {
            console.log(`[ResponseCache] Metrics - ${lines.join(', ')}`);
        }
        // Reset counters
        metrics.hit = {};
        metrics.miss = {};
        metrics.lastLog = Date.now();
    }
}

/**
 * Response cache middleware
 * @param {Object} options - Options
 * @param {number} options.ttlSeconds - Cache TTL in seconds (default: 30)
 * @param {string} options.prefix - Cache key prefix (default: "get")
 * @param {boolean} options.varyByUser - Cache per user (default: false)
 * @param {number} options.maxSize - Max payload size to cache (default: 100KB)
 * @returns {Function} Express middleware
 */
function responseCache({ ttlSeconds = 30, prefix = "get", varyByUser = false, maxSize = MAX_PAYLOAD_SIZE } = {}) {
    return async (req, res, next) => {
        // Only cache GET requests
        if (req.method !== "GET") return next();

        // SAFETY: If varyByUser but no req.user, skip caching to prevent wrong cache
        if (varyByUser && !req.user) {
            if (DEBUG_CACHE) {
                console.warn(`[ResponseCache] SKIP-USER - varyByUser=true but req.user is null for ${prefix}`);
            }
            res.set("X-Cache", "SKIP-USER");
            return next();
        }

        const key = makeCacheKey(req, { prefix, varyByUser });

        // Add X-Cache-Key header in development for debugging (full key for easier debug)
        if (DEBUG_CACHE) {
            res.set("X-Cache-Key", key);
        }

        // 1) Try Redis first
        try {
            if (isRedisConnected()) {
                const client = getClient();
                if (client) {
                    const cached = await client.get(key);
                    if (cached) {
                        recordMetric(prefix, 'hit');
                        res.set("X-Cache", "HIT");
                        res.type("application/json");
                        return res.status(200).send(cached);
                    }
                }
            }
        } catch (err) {
            // Ignore Redis read errors, fallback to memory
            console.error("[ResponseCache] Redis read error:", err.message);
        }

        // 2) Try memory fallback
        const memHit = getMem(key);
        if (memHit) {
            recordMetric(prefix, 'hit');
            res.set("X-Cache", "HIT-MEM");
            res.type("application/json");
            return res.status(200).send(memHit.body);
        }

        // 2.5) In-flight coalescing: if same key is being computed, wait for it
        const pending = getInFlight(key);
        if (pending) {
            recordMetric(prefix, 'hit'); // Count as HIT since we avoid DB
            res.set("X-Cache", "WAIT");
            try {
                const { status, payload, ct } = await pending;
                if (ct) res.type(ct);
                else res.type("application/json");
                return res.status(status || 200).send(payload);
            } catch (e) {
                // If leader fails, follower falls back to running handler
                res.set("X-Cache", "WAIT-ERR");
                // Continue to next() below
            }
        }

        // Record MISS here (correct place: no cache found, will run handler)
        recordMetric(prefix, 'miss');

        // Create in-flight promise (this request becomes the leader)
        let resolveInFlight, rejectInFlight;
        const inFlightPromise = setInFlight(
            key,
            typeof ttlSeconds === "number" ? ttlSeconds : 30,
            new Promise((resolve, reject) => {
                resolveInFlight = resolve;
                rejectInFlight = reject;
            })
        );

        // Safety: reject if connection closes before resolve (client abort)
        res.on("close", () => {
            if (rejectInFlight) {
                rejectInFlight(new Error("leader-connection-closed"));
                resolveInFlight = null;
                rejectInFlight = null;
            }
        });

        // 3) Hook BOTH res.json and res.send to cache the response
        const originalJson = res.json.bind(res);
        const originalSend = res.send.bind(res);
        let cached = false; // Prevent double caching

        const cacheAndSend = async (body, useSend = false) => {
            // Guard: already sent or already cached
            if (res.headersSent || cached) {
                return useSend ? originalSend(body) : originalJson(body);
            }

            try {
                // Only cache 2xx responses
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    // SAFETY: Skip non-JSON payloads (Buffer, stream, non-JSON content-type)
                    if (Buffer.isBuffer(body)) {
                        res.set("X-Cache", "SKIP-TYPE");
                        if (rejectInFlight) {
                            rejectInFlight(new Error("skip-type-buffer"));
                            resolveInFlight = null;
                            rejectInFlight = null;
                        }
                        return useSend ? originalSend(body) : originalJson(body);
                    }

                    const ct = res.getHeader("Content-Type");
                    if (ct && !String(ct).includes("application/json")) {
                        res.set("X-Cache", "SKIP-TYPE");
                        if (rejectInFlight) {
                            rejectInFlight(new Error("skip-type-content"));
                            resolveInFlight = null;
                            rejectInFlight = null;
                        }
                        return useSend ? originalSend(body) : originalJson(body);
                    }

                    // SAFETY: Skip string responses that don't look like JSON
                    if (typeof body === "string") {
                        const s = body.trim();
                        const looksJson = (s.startsWith("{") && s.endsWith("}")) || (s.startsWith("[") && s.endsWith("]"));
                        if (!looksJson) {
                            res.set("X-Cache", "SKIP-TYPE");
                            if (rejectInFlight) {
                                rejectInFlight(new Error("skip-type-string"));
                                resolveInFlight = null;
                                rejectInFlight = null;
                            }
                            return useSend ? originalSend(body) : originalJson(body);
                        }
                    }

                    const payload = typeof body === "string" ? body : JSON.stringify(body);

                    // Resolve in-flight followers as early as possible
                    try {
                        if (resolveInFlight) {
                            const status = res.statusCode || 200;
                            const ctHeader = res.getHeader("Content-Type") || "application/json";
                            resolveInFlight({ status, payload, ct: String(ctHeader) });
                            resolveInFlight = null;
                            rejectInFlight = null;
                        }
                    } catch (_) { }

                    // SAFETY: Don't cache oversized responses
                    if (payload.length > maxSize) {
                        if (DEBUG_CACHE) {
                            console.warn(`[ResponseCache] SKIP-SIZE - Payload too large (${Math.round(payload.length / 1024)}KB) for ${prefix}`);
                        }
                        res.set("X-Cache", "SKIP-SIZE");
                        return useSend ? originalSend(body) : originalJson(body);
                    }

                    // Try Redis first (fire-and-forget to avoid blocking)
                    try {
                        if (isRedisConnected()) {
                            const client = getClient();
                            if (client) {
                                // Fire-and-forget: don't await to avoid slowing response
                                client.set(key, payload, "EX", ttlSeconds).catch(() => { });
                            } else {
                                setMem(key, ttlSeconds, payload);
                            }
                        } else {
                            setMem(key, ttlSeconds, payload);
                        }
                    } catch (err) {
                        console.error("[ResponseCache] Redis write error:", err.message);
                        setMem(key, ttlSeconds, payload);
                    }

                    // Cache stored successfully
                    cached = true;
                    res.set("X-Cache", "MISS");
                }
            } catch (err) {
                console.error("[ResponseCache] Error caching response:", err.message);
            }

            return useSend ? originalSend(body) : originalJson(body);
        };

        res.json = (body) => cacheAndSend(body, false);
        res.send = (body) => cacheAndSend(body, true);

        return next();
    };
}

// ============================================================
// CACHE INVALIDATION
// ============================================================

/**
 * Invalidate cache entries by pattern using SCAN (safe for production)
 * @param {string} pattern - Pattern to match (e.g., "feed:*")
 * @returns {Promise<number>} Number of keys deleted
 */
async function invalidateByPattern(pattern) {
    const keyPrefix = redisConfig?.keyPrefix || "shiku:";

    // Helper to convert glob pattern to regex (with proper escaping)
    function patternToRegex(p) {
        const escaped = p.replace(/[.+?^${}()|[\]\\]/g, "\\$&");
        return new RegExp("^" + escaped.replace(/\*/g, ".*") + "$");
    }

    if (!isRedisConnected()) {
        // Clear memory cache entries matching pattern (include keyPrefix!)
        const regex = patternToRegex(`${keyPrefix}${pattern}`);
        let deleted = 0;
        for (const key of mem.keys()) {
            if (regex.test(key)) {
                mem.delete(key);
                deleted++;
            }
        }
        return deleted;
    }

    const client = getClient();
    if (!client) return 0;

    const match = `${keyPrefix}${pattern}`;
    let deleted = 0;

    try {
        const stream = client.scanStream({ match, count: 200 });

        for await (const keys of stream) {
            if (keys && keys.length > 0) {
                const n = await client.del(keys);
                deleted += n;
            }
        }

        if (DEBUG_CACHE) {
            console.log(`[ResponseCache] Invalidated ${deleted} keys matching "${pattern}"`);
        }
    } catch (err) {
        console.error("[ResponseCache] Error invalidating pattern:", err.message);
    }

    return deleted;
}

/**
 * Clear all cache (memory + Redis pattern)
 */
async function clearAllCache() {
    mem.clear();
    await invalidateByPattern("*");
}

// ============================================================
// EXPORTS
// ============================================================

export {
    responseCache,
    invalidateByPattern,
    clearAllCache,
    makeCacheKey
};

export default responseCache;
