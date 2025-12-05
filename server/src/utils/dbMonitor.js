/**
 * Database Monitoring Utility
 * 
 * Monitor và logging cho MongoDB:
 * - Connection pool statistics
 * - Slow query detection và logging
 * - Query explain plan logging
 * - Database health metrics
 * 
 * @module dbMonitor
 */

import mongoose from 'mongoose';

// ============================================================
// CONFIGURATION
// ============================================================

const config = {
  // Slow query threshold (milliseconds)
  slowQueryThreshold: parseInt(process.env.SLOW_QUERY_THRESHOLD) || 1000,
  
  // Enable query explain logging
  enableExplain: process.env.ENABLE_QUERY_EXPLAIN === 'true',
  
  // Enable slow query logging
  enableSlowQueryLogging: process.env.ENABLE_SLOW_QUERY_LOG !== 'false',
  
  // Log all queries (for debugging)
  logAllQueries: process.env.LOG_ALL_QUERIES === 'true',
  
  // Sampling rate for explain (0-1)
  explainSampleRate: parseFloat(process.env.EXPLAIN_SAMPLE_RATE) || 0.1
};

// ============================================================
// STATISTICS TRACKING
// ============================================================

const stats = {
  queries: {
    total: 0,
    slow: 0,
    errors: 0
  },
  slowQueries: [],
  connectionPool: {
    lastChecked: null,
    stats: null
  }
};

// ============================================================
// CONNECTION POOL MONITORING
// ============================================================

/**
 * Lấy thống kê connection pool
 * @returns {Object} Pool statistics
 */
function getPoolStats() {
  const connection = mongoose.connection;
  
  if (!connection || connection.readyState !== 1) {
    return {
      status: 'disconnected',
      readyState: connection?.readyState,
      readyStateText: getReadyStateText(connection?.readyState)
    };
  }

  try {
    const db = connection.db;
    
    return {
      status: 'connected',
      readyState: connection.readyState,
      readyStateText: getReadyStateText(connection.readyState),
      host: connection.host,
      port: connection.port,
      name: connection.name,
      // MongoDB driver pool info (if available)
      options: {
        maxPoolSize: connection.options?.maxPoolSize || 'N/A',
        minPoolSize: connection.options?.minPoolSize || 'N/A'
      }
    };
  } catch (err) {
    return {
      status: 'error',
      error: err.message
    };
  }
}

/**
 * Convert readyState to text
 */
function getReadyStateText(state) {
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
    99: 'uninitialized'
  };
  return states[state] || 'unknown';
}

/**
 * Monitor connection events
 */
function setupConnectionMonitoring() {
  const connection = mongoose.connection;

  connection.on('connected', () => {
    console.log('[DB Monitor] MongoDB connected');
    stats.connectionPool.stats = getPoolStats();
    stats.connectionPool.lastChecked = new Date();
  });

  connection.on('disconnected', () => {
    console.warn('[DB Monitor] MongoDB disconnected');
  });

  connection.on('error', (err) => {
    console.error('[DB Monitor] MongoDB error:', err.message);
    stats.queries.errors++;
  });

  connection.on('reconnected', () => {
    console.log('[DB Monitor] MongoDB reconnected');
  });

  // Log pool size periodically
  if (process.env.NODE_ENV !== 'production') {
    const poolStatsInterval = setInterval(() => {
      stats.connectionPool.stats = getPoolStats();
      stats.connectionPool.lastChecked = new Date();
    }, 60000); // Every minute
    if (poolStatsInterval.unref) poolStatsInterval.unref();
  }
}

// ============================================================
// SLOW QUERY LOGGING
// ============================================================

/**
 * Log slow query với details
 * @param {string} operation - Query operation (find, aggregate, etc.)
 * @param {string} collection - Collection name
 * @param {number} duration - Duration in ms
 * @param {Object} query - Query details
 */
function logSlowQuery(operation, collection, duration, query = {}) {
  if (!config.enableSlowQueryLogging) return;
  
  const logEntry = {
    timestamp: new Date().toISOString(),
    operation,
    collection,
    duration,
    query: JSON.stringify(query).substring(0, 500), // Truncate long queries
    threshold: config.slowQueryThreshold
  };

  console.warn(`[SLOW QUERY] ${operation} on ${collection} took ${duration}ms`, logEntry);

  // Keep last 100 slow queries
  stats.slowQueries.unshift(logEntry);
  if (stats.slowQueries.length > 100) {
    stats.slowQueries.pop();
  }
}

// ============================================================
// QUERY WRAPPER WITH MONITORING
// ============================================================

/**
 * Wrap một query với timing và monitoring
 * @param {string} name - Query name for logging
 * @param {Function} queryFn - Async function thực hiện query
 * @param {Object} options - Options { collection, explain }
 * @returns {Promise<any>} Query result
 */
async function monitoredQuery(name, queryFn, options = {}) {
  const { collection = 'unknown', explain = false } = options;
  
  const startTime = Date.now();
  stats.queries.total++;

  try {
    // Log all queries if enabled
    if (config.logAllQueries) {
      console.log(`[Query] Starting: ${name} on ${collection}`);
    }

    const result = await queryFn();
    
    const duration = Date.now() - startTime;

    // Check if slow
    if (duration > config.slowQueryThreshold) {
      stats.queries.slow++;
      logSlowQuery(name, collection, duration);
    }

    // Log if enabled
    if (config.logAllQueries) {
      console.log(`[Query] Completed: ${name} in ${duration}ms`);
    }

    return result;

  } catch (error) {
    const duration = Date.now() - startTime;
    stats.queries.errors++;
    
    console.error(`[Query Error] ${name} on ${collection} failed after ${duration}ms:`, error.message);
    throw error;
  }
}

/**
 * Run explain on a query (for debugging)
 * @param {mongoose.Model} model - Mongoose model
 * @param {Object} filter - Query filter
 * @param {Object} options - Query options
 * @returns {Promise<Object>} Explain result
 */
async function explainQuery(model, filter, options = {}) {
  if (!config.enableExplain) {
    return null;
  }

  try {
    const explain = await model.find(filter)
      .limit(options.limit || 1)
      .sort(options.sort || {})
      .explain('executionStats');

    const executionStats = explain?.executionStats || explain;

    return {
      planSummary: executionStats.stage,
      executionTimeMs: executionStats.executionTimeMillis,
      totalDocsExamined: executionStats.totalDocsExamined,
      totalKeysExamined: executionStats.totalKeysExamined,
      nReturned: executionStats.nReturned,
      indexUsed: executionStats.inputStage?.indexName || 'COLLSCAN',
      recommendation: getExplainRecommendation(executionStats)
    };

  } catch (err) {
    console.warn('[DB Monitor] Explain failed:', err.message);
    return null;
  }
}

/**
 * Get recommendation from explain stats
 */
function getExplainRecommendation(stats) {
  const recommendations = [];

  // Check for collection scan
  if (stats.stage === 'COLLSCAN' || stats.inputStage?.stage === 'COLLSCAN') {
    recommendations.push('Consider adding an index - query is doing full collection scan');
  }

  // Check for high docs examined ratio
  if (stats.totalDocsExamined > 0 && stats.nReturned > 0) {
    const ratio = stats.totalDocsExamined / stats.nReturned;
    if (ratio > 10) {
      recommendations.push(`High scan ratio (${ratio.toFixed(1)}x) - index may not be optimal`);
    }
  }

  // Check for slow execution
  if (stats.executionTimeMillis > 100) {
    recommendations.push('Query is slow (>100ms) - consider optimization');
  }

  return recommendations.length > 0 ? recommendations : ['Query seems optimized'];
}

// ============================================================
// AGGREGATION MONITORING
// ============================================================

/**
 * Wrap aggregation với monitoring
 * @param {mongoose.Model} model - Mongoose model
 * @param {Array} pipeline - Aggregation pipeline
 * @param {Object} options - Options
 * @returns {Promise<Array>} Aggregation result
 */
async function monitoredAggregate(model, pipeline, options = {}) {
  const { name = 'aggregate' } = options;
  const collection = model.collection?.name || model.modelName;
  
  return monitoredQuery(name, async () => {
    return model.aggregate(pipeline);
  }, { collection });
}

// ============================================================
// HEALTH CHECK
// ============================================================

/**
 * Get database health summary
 * @returns {Object} Health summary
 */
function getHealth() {
  const connection = mongoose.connection;
  
  return {
    status: connection.readyState === 1 ? 'healthy' : 'unhealthy',
    connection: getPoolStats(),
    queries: {
      total: stats.queries.total,
      slow: stats.queries.slow,
      errors: stats.queries.errors,
      slowPercentage: stats.queries.total > 0 
        ? ((stats.queries.slow / stats.queries.total) * 100).toFixed(2) + '%'
        : '0%'
    },
    recentSlowQueries: stats.slowQueries.slice(0, 10),
    config: {
      slowQueryThreshold: config.slowQueryThreshold,
      explainEnabled: config.enableExplain
    }
  };
}

/**
 * Reset statistics
 */
function resetStats() {
  stats.queries = { total: 0, slow: 0, errors: 0 };
  stats.slowQueries = [];
  console.log('[DB Monitor] Statistics reset');
}

// ============================================================
// EXPORTS
// ============================================================

export {
  setupConnectionMonitoring,
  getPoolStats,
  monitoredQuery,
  monitoredAggregate,
  explainQuery,
  logSlowQuery,
  getHealth,
  resetStats,
  config as monitorConfig
};

export default {
  setup: setupConnectionMonitoring,
  poolStats: getPoolStats,
  query: monitoredQuery,
  aggregate: monitoredAggregate,
  explain: explainQuery,
  health: getHealth,
  reset: resetStats
};
