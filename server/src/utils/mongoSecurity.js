import mongoose from "mongoose";

/**
 * MongoDB Security Utilities
 * Các utility để bảo vệ khỏi NoSQL injection và cải thiện bảo mật database
 */

/**
 * Escape regex special characters để tránh NoSQL injection
 * @param {string} input - Input cần escape
 * @returns {string} - Input đã được escape
 */
export const escapeRegex = (input) => {
  if (typeof input !== 'string') return input;
  
  // Escape các ký tự đặc biệt trong regex
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

/**
 * Sanitize input cho MongoDB query
 * @param {any} input - Input cần sanitize
 * @returns {any} - Input đã được sanitize
 */
export const sanitizeMongoInput = (input) => {
  if (typeof input === 'string') {
    // Escape regex characters
    return escapeRegex(input);
  } else if (typeof input === 'object' && input !== null) {
    if (Array.isArray(input)) {
      return input.map(item => sanitizeMongoInput(item));
    } else {
      const sanitized = {};
      for (const [key, value] of Object.entries(input)) {
        // Escape key names
        const sanitizedKey = escapeRegex(key);
        sanitized[sanitizedKey] = sanitizeMongoInput(value);
      }
      return sanitized;
    }
  }
  return input;
};

/**
 * Tạo safe regex query cho MongoDB
 * @param {string} input - Input cần tạo regex
 * @param {string} options - Regex options (i, m, s)
 * @returns {Object} - Safe regex object
 */
export const createSafeRegex = (input, options = 'i') => {
  if (typeof input !== 'string') {
    throw new Error('Input must be a string');
  }
  
  // Escape special characters
  const escapedInput = escapeRegex(input);
  
  return {
    $regex: escapedInput,
    $options: options
  };
};

/**
 * Tạo safe text search query
 * @param {string} searchTerm - Từ khóa tìm kiếm
 * @param {Array} fields - Các field cần tìm kiếm
 * @returns {Object} - Safe search query
 */
export const createSafeTextSearch = (searchTerm, fields = []) => {
  if (!searchTerm || typeof searchTerm !== 'string') {
    return {};
  }
  
  // Sanitize search term
  const sanitizedTerm = sanitizeMongoInput(searchTerm.trim());
  
  if (sanitizedTerm.length === 0) {
    return {};
  }
  
  // Tạo regex cho từng field
  const regexQueries = fields.map(field => ({
    [field]: createSafeRegex(sanitizedTerm)
  }));
  
  return {
    $or: regexQueries
  };
};

/**
 * Validate ObjectId
 * @param {string} id - ID cần validate
 * @returns {boolean} - True nếu ID hợp lệ
 */
export const isValidObjectId = (id) => {
  if (!id || typeof id !== 'string') return false;
  return mongoose.Types.ObjectId.isValid(id);
};

/**
 * Tạo safe ObjectId filter
 * @param {string} id - ID cần tạo filter
 * @returns {Object} - Safe ObjectId filter
 */
export const createObjectIdFilter = (id) => {
  if (!isValidObjectId(id)) {
    throw new Error('Invalid ObjectId');
  }
  
  return { _id: new mongoose.Types.ObjectId(id) };
};

/**
 * Tạo safe pagination query
 * @param {Object} options - Pagination options
 * @param {number} options.page - Trang hiện tại
 * @param {number} options.limit - Số lượng items per page
 * @param {string} options.sortBy - Field để sort
 * @param {string} options.sortOrder - Thứ tự sort (asc, desc)
 * @returns {Object} - Safe pagination query
 */
export const createPaginationQuery = (options = {}) => {
  const {
    page = 1,
    limit = 20,
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = options;
  
  // Validate và sanitize
  const safePage = Math.max(1, parseInt(page, 10) || 1);
  const safeLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const safeSortBy = escapeRegex(sortBy);
  const safeSortOrder = sortOrder === 'asc' ? 1 : -1;
  
  return {
    skip: (safePage - 1) * safeLimit,
    limit: safeLimit,
    sort: { [safeSortBy]: safeSortOrder }
  };
};

/**
 * Tạo safe date range query
 * @param {Object} options - Date range options
 * @param {Date|string} options.startDate - Ngày bắt đầu
 * @param {Date|string} options.endDate - Ngày kết thúc
 * @param {string} options.field - Field chứa date
 * @returns {Object} - Safe date range query
 */
export const createDateRangeQuery = (options = {}) => {
  const { startDate, endDate, field = 'createdAt' } = options;
  
  if (!startDate && !endDate) {
    return {};
  }
  
  const query = {};
  const safeField = escapeRegex(field);
  
  if (startDate) {
    const start = new Date(startDate);
    if (!isNaN(start.getTime())) {
      query[safeField] = { ...query[safeField], $gte: start };
    }
  }
  
  if (endDate) {
    const end = new Date(endDate);
    if (!isNaN(end.getTime())) {
      query[safeField] = { ...query[safeField], $lte: end };
    }
  }
  
  return query;
};

/**
 * Tạo safe aggregation pipeline
 * @param {Array} stages - Aggregation stages
 * @returns {Array} - Safe aggregation pipeline
 */
export const createSafeAggregation = (stages = []) => {
  return stages.map(stage => {
    if (typeof stage === 'object' && stage !== null) {
      return sanitizeMongoInput(stage);
    }
    return stage;
  });
};

/**
 * Tạo safe update query
 * @param {Object} updateData - Data cần update
 * @param {Array} allowedFields - Các field được phép update
 * @returns {Object} - Safe update query
 */
export const createSafeUpdateQuery = (updateData, allowedFields = []) => {
  if (!updateData || typeof updateData !== 'object') {
    throw new Error('Update data must be an object');
  }
  
  const safeUpdate = {};
  
  for (const [key, value] of Object.entries(updateData)) {
    // Chỉ cho phép update các field được phép
    if (allowedFields.length === 0 || allowedFields.includes(key)) {
      const safeKey = escapeRegex(key);
      safeUpdate[safeKey] = sanitizeMongoInput(value);
    }
  }
  
  return safeUpdate;
};

/**
 * Tạo safe delete query
 * @param {Object} filter - Filter để delete
 * @returns {Object} - Safe delete query
 */
export const createSafeDeleteQuery = (filter = {}) => {
  return sanitizeMongoInput(filter);
};

/**
 * Tạo safe find query
 * @param {Object} filter - Filter để find
 * @returns {Object} - Safe find query
 */
export const createSafeFindQuery = (filter = {}) => {
  return sanitizeMongoInput(filter);
};

/**
 * Validate và sanitize query parameters
 * @param {Object} query - Query parameters
 * @returns {Object} - Sanitized query parameters
 */
export const sanitizeQueryParams = (query = {}) => {
  const sanitized = {};
  
  for (const [key, value] of Object.entries(query)) {
    const safeKey = escapeRegex(key);
    
    if (typeof value === 'string') {
      // Trim và escape string values
      sanitized[safeKey] = escapeRegex(value.trim());
    } else if (typeof value === 'number') {
      // Validate number values
      sanitized[safeKey] = isNaN(value) ? 0 : value;
    } else if (typeof value === 'boolean') {
      // Keep boolean values as is
      sanitized[safeKey] = value;
    } else if (Array.isArray(value)) {
      // Sanitize array values
      sanitized[safeKey] = value.map(item => 
        typeof item === 'string' ? escapeRegex(item.trim()) : item
      );
    }
  }
  
  return sanitized;
};

/**
 * Tạo safe projection cho select fields
 * @param {Array} fields - Các field cần select
 * @returns {Object} - Safe projection object
 */
export const createSafeProjection = (fields = []) => {
  const projection = {};
  
  fields.forEach(field => {
    if (typeof field === 'string') {
      const safeField = escapeRegex(field);
      projection[safeField] = 1;
    }
  });
  
  return projection;
};

/**
 * Tạo safe sort object
 * @param {Object} sortOptions - Sort options
 * @returns {Object} - Safe sort object
 */
export const createSafeSort = (sortOptions = {}) => {
  const sort = {};
  
  for (const [field, direction] of Object.entries(sortOptions)) {
    const safeField = escapeRegex(field);
    const safeDirection = direction === 'asc' ? 1 : -1;
    sort[safeField] = safeDirection;
  }
  
  return sort;
};

/**
 * Tạo safe index cho MongoDB
 * @param {Object} indexFields - Các field cần tạo index
 * @returns {Object} - Safe index object
 */
export const createSafeIndex = (indexFields = {}) => {
  const index = {};
  
  for (const [field, direction] of Object.entries(indexFields)) {
    const safeField = escapeRegex(field);
    const safeDirection = direction === 'asc' ? 1 : -1;
    index[safeField] = safeDirection;
  }
  
  return index;
};
