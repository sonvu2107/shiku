/**
 * Pagination Utility
 * 
 * Utility để thêm pagination vào MongoDB query
 * 
 * @module paginate
 */

/**
 * Thêm skip và limit vào MongoDB query để phân trang
 * 
 * @param {Object} query - MongoDB query object
 * @param {Object} options - Tùy chọn phân trang
 * @param {number} options.page - Số trang (bắt đầu từ 1), mặc định 1
 * @param {number} options.limit - Số lượng items mỗi trang, mặc định 10
 * @returns {Object} Query đã được thêm skip và limit
 */
export function paginate(query, { page = 1, limit = 10 }) {
  const skip = (Math.max(1, page) - 1) * Math.max(1, limit);
  return query.skip(skip).limit(Math.max(1, limit));
}
