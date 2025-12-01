/**
 * Cursor Pagination Utility
 * 
 * Cursor-based pagination thay vì offset pagination:
 * - Hiệu suất tốt hơn với large datasets
 * - Không bị lỗi khi có data changes giữa các pages
 * - Hỗ trợ realtime updates
 * 
 * @module cursorPagination
 */

import mongoose from 'mongoose';

// ============================================================
// CURSOR ENCODING/DECODING
// ============================================================

/**
 * Encode cursor từ document
 * Cursor chứa: timestamp + id để đảm bảo unique
 * 
 * @param {Object} doc - Document object
 * @param {string} sortField - Field để sort (default: createdAt)
 * @returns {string} Encoded cursor
 */
function encodeCursor(doc, sortField = 'createdAt') {
  if (!doc) return null;
  
  const cursor = {
    id: doc._id.toString(),
    v: doc[sortField] instanceof Date 
      ? doc[sortField].toISOString() 
      : doc[sortField],
    f: sortField
  };
  
  return Buffer.from(JSON.stringify(cursor)).toString('base64');
}

/**
 * Decode cursor
 * 
 * @param {string} cursorStr - Encoded cursor string
 * @returns {Object|null} Decoded cursor object
 */
function decodeCursor(cursorStr) {
  if (!cursorStr) return null;
  
  try {
    const decoded = JSON.parse(Buffer.from(cursorStr, 'base64').toString('utf8'));
    
    // Validate cursor structure
    if (!decoded.id || !decoded.v) {
      console.warn('[Cursor] Invalid cursor structure');
      return null;
    }
    
    return {
      id: decoded.id,
      value: decoded.v,
      field: decoded.f || 'createdAt'
    };
  } catch (err) {
    console.warn('[Cursor] Failed to decode cursor:', err.message);
    return null;
  }
}

// ============================================================
// CURSOR QUERY BUILDERS
// ============================================================

/**
 * Build query condition cho cursor pagination
 * 
 * @param {Object} cursor - Decoded cursor
 * @param {string} direction - 'next' hoặc 'prev'
 * @param {number} sortDirection - 1 (asc) hoặc -1 (desc)
 * @returns {Object} MongoDB query condition
 */
function buildCursorCondition(cursor, direction = 'next', sortDirection = -1) {
  if (!cursor) return {};
  
  const field = cursor.field;
  const cursorValue = field === 'createdAt' ? new Date(cursor.value) : cursor.value;
  const cursorId = new mongoose.Types.ObjectId(cursor.id);
  
  // Determine comparison operator based on sort direction and navigation direction
  // For descending sort (newest first):
  //   - next page: get items LESS THAN cursor
  //   - prev page: get items GREATER THAN cursor
  // For ascending sort:
  //   - next page: get items GREATER THAN cursor
  //   - prev page: get items LESS THAN cursor
  
  const isForward = direction === 'next';
  const useGreaterThan = (sortDirection === 1 && isForward) || (sortDirection === -1 && !isForward);
  
  const operator = useGreaterThan ? '$gt' : '$lt';
  
  // Use compound condition to handle equal values
  // (value > cursor) OR (value == cursor AND id > cursorId)
  return {
    $or: [
      { [field]: { [operator]: cursorValue } },
      {
        [field]: cursorValue,
        _id: { [operator]: cursorId }
      }
    ]
  };
}

/**
 * Apply cursor pagination to a Mongoose query
 * 
 * @param {mongoose.Query} query - Mongoose query
 * @param {Object} options - Pagination options
 * @returns {mongoose.Query} Modified query
 */
function applyCursorPagination(query, options = {}) {
  const {
    cursor = null,
    limit = 20,
    direction = 'next',
    sortField = 'createdAt',
    sortDirection = -1
  } = options;

  const decoded = decodeCursor(cursor);
  
  if (decoded) {
    const condition = buildCursorCondition(decoded, direction, sortDirection);
    query.where(condition);
  }
  
  // Always add secondary sort by _id for consistency
  query.sort({ [sortField]: sortDirection, _id: sortDirection });
  query.limit(limit + 1); // Fetch one extra to check if there are more
  
  return query;
}

// ============================================================
// HIGH-LEVEL PAGINATION FUNCTION
// ============================================================

/**
 * Execute paginated query với cursor
 * 
 * @param {mongoose.Model} model - Mongoose model
 * @param {Object} filter - Query filter
 * @param {Object} options - Pagination options
 * @returns {Promise<Object>} Paginated result
 */
async function paginateWithCursor(model, filter = {}, options = {}) {
  const {
    cursor = null,
    limit = 20,
    direction = 'next',
    sortField = 'createdAt',
    sortDirection = -1,
    select = null,
    populate = null,
    lean = true
  } = options;

  // Build query
  let query = model.find(filter);
  
  // Apply cursor pagination
  applyCursorPagination(query, {
    cursor,
    limit,
    direction,
    sortField,
    sortDirection
  });
  
  // Apply select
  if (select) {
    query.select(select);
  }
  
  // Apply populate
  if (populate) {
    if (Array.isArray(populate)) {
      populate.forEach(p => query.populate(p));
    } else {
      query.populate(populate);
    }
  }
  
  // Apply lean
  if (lean) {
    query.lean();
  }
  
  // Execute
  const items = await query.exec();
  
  // Check if there are more items
  const hasMore = items.length > limit;
  if (hasMore) {
    items.pop(); // Remove the extra item
  }
  
  // Generate cursors
  const firstItem = items[0];
  const lastItem = items[items.length - 1];
  
  return {
    items,
    pageInfo: {
      hasNextPage: direction === 'next' ? hasMore : cursor !== null,
      hasPreviousPage: direction === 'prev' ? hasMore : cursor !== null,
      startCursor: firstItem ? encodeCursor(firstItem, sortField) : null,
      endCursor: lastItem ? encodeCursor(lastItem, sortField) : null,
      count: items.length
    }
  };
}

/**
 * Paginate aggregation với cursor
 * 
 * @param {mongoose.Model} model - Mongoose model
 * @param {Array} pipeline - Aggregation pipeline (without pagination stages)
 * @param {Object} options - Pagination options
 * @returns {Promise<Object>} Paginated result
 */
async function paginateAggregateWithCursor(model, pipeline = [], options = {}) {
  const {
    cursor = null,
    limit = 20,
    direction = 'next',
    sortField = 'createdAt',
    sortDirection = -1
  } = options;

  const decoded = decodeCursor(cursor);
  
  // Build pagination stages
  const paginationStages = [];
  
  // Add cursor condition if exists
  if (decoded) {
    const condition = buildCursorCondition(decoded, direction, sortDirection);
    paginationStages.push({ $match: condition });
  }
  
  // Add sort
  paginationStages.push({
    $sort: { [sortField]: sortDirection, _id: sortDirection }
  });
  
  // Add limit
  paginationStages.push({ $limit: limit + 1 });
  
  // Combine pipelines
  const fullPipeline = [...pipeline, ...paginationStages];
  
  // Execute
  const items = await model.aggregate(fullPipeline);
  
  // Check for more
  const hasMore = items.length > limit;
  if (hasMore) {
    items.pop();
  }
  
  // Generate cursors
  const firstItem = items[0];
  const lastItem = items[items.length - 1];
  
  return {
    items,
    pageInfo: {
      hasNextPage: direction === 'next' ? hasMore : cursor !== null,
      hasPreviousPage: direction === 'prev' ? hasMore : cursor !== null,
      startCursor: firstItem ? encodeCursor(firstItem, sortField) : null,
      endCursor: lastItem ? encodeCursor(lastItem, sortField) : null,
      count: items.length
    }
  };
}

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

/**
 * Convert offset pagination params to cursor (for migration)
 * Không recommended cho production, chỉ để backward compatibility
 * 
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @param {Date} referenceDate - Reference timestamp
 * @returns {string} Approximate cursor
 */
function offsetToCursor(page, limit, referenceDate = new Date()) {
  console.warn('[Cursor] offsetToCursor is deprecated, use real cursor pagination');
  
  // Create a synthetic cursor based on approximate time offset
  // This is NOT accurate but provides backward compatibility
  const offsetMs = (page - 1) * limit * 60000; // Assume 1 item per minute
  const cursorDate = new Date(referenceDate.getTime() - offsetMs);
  
  return encodeCursor({
    _id: new mongoose.Types.ObjectId(),
    createdAt: cursorDate
  });
}

/**
 * Parse pagination params from request
 * Supports both cursor and offset for backward compatibility
 * 
 * @param {Object} query - Request query params
 * @returns {Object} Parsed pagination options
 */
function parsePaginationParams(query) {
  const {
    cursor,
    after, // Alias for cursor (GraphQL style)
    before, // Cursor for previous page
    first, // Limit (GraphQL style)
    last, // Limit for previous page
    limit = 20,
    page, // Legacy offset pagination
    sort = 'createdAt',
    order = 'desc'
  } = query;

  const effectiveCursor = cursor || after || before;
  const effectiveLimit = parseInt(first || last || limit) || 20;
  const direction = before || last ? 'prev' : 'next';
  const sortDirection = order === 'asc' ? 1 : -1;

  // If page is provided, log deprecation warning
  if (page && !effectiveCursor) {
    console.warn('[Cursor] Offset pagination (page param) is deprecated, use cursor');
  }

  return {
    cursor: effectiveCursor,
    limit: Math.min(Math.max(effectiveLimit, 1), 100), // Cap at 100
    direction,
    sortField: sort,
    sortDirection,
    // Legacy support
    legacyPage: page ? parseInt(page) : null
  };
}

// ============================================================
// EXPORTS
// ============================================================

export {
  encodeCursor,
  decodeCursor,
  buildCursorCondition,
  applyCursorPagination,
  paginateWithCursor,
  paginateAggregateWithCursor,
  offsetToCursor,
  parsePaginationParams
};

export default {
  encode: encodeCursor,
  decode: decodeCursor,
  paginate: paginateWithCursor,
  paginateAggregate: paginateAggregateWithCursor,
  parseParams: parsePaginationParams
};
