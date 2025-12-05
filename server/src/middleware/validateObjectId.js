/**
 * ObjectId Validation Middleware
 * 
 * Middleware để validate ObjectId trong request params
 * Tránh lỗi CastError và bảo vệ khỏi injection
 * 
 * @module validateObjectId
 */

import mongoose from 'mongoose';

/**
 * Factory function tạo middleware validate ObjectId
 * @param {string|string[]} paramNames - Tên param(s) cần validate
 * @returns {Function} Express middleware
 * 
 * @example
 * // Single param
 * router.get('/:conversationId', validateObjectId('conversationId'), handler);
 * 
 * // Multiple params
 * router.get('/:userId/:postId', validateObjectId(['userId', 'postId']), handler);
 */
export const validateObjectId = (paramNames) => {
  const params = Array.isArray(paramNames) ? paramNames : [paramNames];
  
  return (req, res, next) => {
    for (const param of params) {
      const value = req.params[param];
      
      if (!value) {
        continue; // Skip if param doesn't exist (optional param)
      }
      
      if (!mongoose.Types.ObjectId.isValid(value)) {
        return res.status(400).json({ 
          message: `ID không hợp lệ: ${param}`,
          error: 'INVALID_OBJECT_ID'
        });
      }
    }
    
    next();
  };
};

/**
 * Validate ObjectId trong request body
 * @param {string|string[]} fieldNames - Tên field(s) cần validate
 * @returns {Function} Express middleware
 */
export const validateBodyObjectId = (fieldNames) => {
  const fields = Array.isArray(fieldNames) ? fieldNames : [fieldNames];
  
  return (req, res, next) => {
    for (const field of fields) {
      const value = req.body[field];
      
      if (!value) {
        continue; // Skip if field doesn't exist
      }
      
      if (!mongoose.Types.ObjectId.isValid(value)) {
        return res.status(400).json({ 
          message: `ID không hợp lệ: ${field}`,
          error: 'INVALID_OBJECT_ID'
        });
      }
    }
    
    next();
  };
};

/**
 * Validate ObjectId trong query params
 * @param {string|string[]} queryNames - Tên query param(s) cần validate
 * @returns {Function} Express middleware
 */
export const validateQueryObjectId = (queryNames) => {
  const queries = Array.isArray(queryNames) ? queryNames : [queryNames];
  
  return (req, res, next) => {
    for (const query of queries) {
      const value = req.query[query];
      
      if (!value) {
        continue;
      }
      
      // Handle comma-separated IDs
      const ids = value.includes(',') ? value.split(',') : [value];
      
      for (const id of ids) {
        if (!mongoose.Types.ObjectId.isValid(id.trim())) {
          return res.status(400).json({ 
            message: `ID không hợp lệ trong query: ${query}`,
            error: 'INVALID_OBJECT_ID'
          });
        }
      }
    }
    
    next();
  };
};

/**
 * Helper function để check ObjectId (không phải middleware)
 * @param {string} id - ID cần kiểm tra
 * @returns {boolean}
 */
export const isValidObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id);
};

export default validateObjectId;
