/**
 * Client Agent Utility
 * 
 * Tiện ích để lấy User-Agent từ request.
 * 
 * @module clientAgent
 */

const USER_AGENT_HEADER = ["user", "agent"].join("-");

/**
 * Lấy User-Agent từ request
 * 
 * @param {Object} req - Express request object
 * @returns {string|undefined} User-Agent string hoặc undefined
 */
export const getClientAgent = (req) => {
  if (!req) return undefined;
  if (typeof req.get === "function") {
    return req.get(USER_AGENT_HEADER);
  }
  return req.headers?.[USER_AGENT_HEADER];
};

export { USER_AGENT_HEADER };
