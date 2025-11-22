import User from "../models/User.js";

/**
 * Parse @mentions from text content
 * Supports formats: @username, @username123, @user_name
 * @param {string} text - The text content to parse
 * @returns {string[]} Array of unique usernames found (without @)
 */
export function parseMentions(text) {
  if (!text || typeof text !== "string") {
    return [];
  }

  // Regex to match @mentions
  // Matches @ followed by one or more words (Unicode letters including Vietnamese, numbers, underscores)
  // Stops when encountering space + new word boundary (not followed by letter/number/underscore) or end of string
  // Example: "@Sơn Vũ xin chào" only matches "@Sơn Vũ" (stops before "xin")
  // Pattern: @ + word(s) + stop when space followed by non-word char or double space
  // Supports Vietnamese characters: àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ
  // Maximum 30 characters per mention
  const mentionRegex = /@([\p{L}\p{N}_]+(?:\s+[\p{L}\p{N}_]+)*?)(?=\s+[^\p{L}\p{N}_\s]|\s{2,}|\s*[.,!?;:()\[\]{}"']|$)/gu;
  
  const matches = text.matchAll(mentionRegex);
  const mentions = new Set();
  
  for (const match of matches) {
    // Normalize: trim spaces, lowercase (preserves Vietnamese diacritics)
    const username = match[1].trim().toLowerCase();
    if (username.length > 0) {
      mentions.add(username);
    }
  }
  
  return Array.from(mentions);
}

/**
 * Extract and resolve user IDs from mentions in text
 * @param {string} text - The text content to parse
 * @returns {Promise<string[]>} Array of user ObjectIds that were mentioned
 */
export async function extractMentionedUsers(text) {
  const usernames = parseMentions(text);
  
  if (usernames.length === 0) {
    return [];
  }

  // Find users by username (case-insensitive, supports Vietnamese)
  // We check both name field and email (local part)
  // Support partial matching: "@Nguyễn" matches "Nguyễn Văn A"
  const escapedUsernames = usernames.map(u => u.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  
  // Create regex patterns for both exact match and starts-with match
  const users = await User.find({
    $or: [
      // Exact match (case-insensitive)
      { name: { $regex: new RegExp(`^${escapedUsernames.join('|')}$`, 'iu') } },
      // Starts with match (for partial mentions like @Nguyễn matching "Nguyễn Văn A")
      { name: { $regex: new RegExp(`^${escapedUsernames.join('|')}`, 'iu') } },
      // Email local part match
      { email: { $regex: new RegExp(`^${escapedUsernames.join('|')}@`, 'iu') } }
    ]
  }).select("_id name email").lean();

  // Create a map for quick lookup
  const userMap = new Map();
  users.forEach(user => {
    const nameLower = user.name.toLowerCase().trim();
    const emailLocal = user.email.split('@')[0].toLowerCase();
    
    // Map exact name match
    userMap.set(nameLower, user._id.toString());
    userMap.set(emailLocal, user._id.toString());
    
    // Map partial matches (first word of name)
    const firstName = nameLower.split(/\s+/)[0];
    if (firstName && firstName !== nameLower) {
      userMap.set(firstName, user._id.toString());
    }
  });

  // Resolve usernames to user IDs, filtering out non-existent users
  const userIds = [];
  for (const username of usernames) {
    const trimmedUsername = username.trim().toLowerCase();
    
    // Try exact match first
    let userId = userMap.get(trimmedUsername);
    
    // If no exact match, try partial match (check if username matches start of any name)
    if (!userId) {
      for (const [key, id] of userMap.entries()) {
        if (key.startsWith(trimmedUsername) || trimmedUsername.startsWith(key)) {
          userId = id;
          break;
        }
      }
    }
    
    if (userId) {
      userIds.push(userId);
    }
  }

  // Remove duplicates and ensure all are strings (ObjectIds)
  return Array.from(new Set(userIds.map(id => id.toString())));
}

/**
 * Convert text with @mentions to HTML with clickable links
 * @param {string} text - The text content
 * @param {Object} options - Options for rendering
 * @param {Function} options.userLink - Function to generate user profile link
 * @returns {string} HTML string with mentions as links
 */
export function renderMentions(text, options = {}) {
  if (!text || typeof text !== "string") {
    return "";
  }

  const userLink = options.userLink || ((username) => `/users/${username}`);
  
  // Replace @mentions with links (supports Unicode/Vietnamese, stops at word boundary)
  const mentionPattern = /@([\p{L}\p{N}_]+(?:\s+[\p{L}\p{N}_]+)*?)(?=\s+[^\p{L}\p{N}_\s]|\s{2,}|\s*[.,!?;:()\[\]{}"']|$)/gu;
  return text.replace(mentionPattern, (match, username) => {
    const trimmedUsername = username.trim();
    const link = userLink(trimmedUsername);
    return `<a href="${link}" class="mention-link" data-username="${trimmedUsername}">${match}</a>`;
  });
}

/**
 * Get user suggestions based on search query
 * Useful for autocomplete in post/comment creation
 * Supports Vietnamese characters and partial matching
 * @param {string} query - Search query (partial username)
 * @param {string} currentUserId - ID of current user (to exclude from results)
 * @param {number} limit - Maximum number of results
 * @returns {Promise<Array>} Array of user objects with _id, name, avatarUrl
 */
export async function getUserSuggestions(query, currentUserId = null, limit = 10) {
  if (!query || query.trim().length === 0) {
    return [];
  }

  const trimmedQuery = query.trim();
  // Escape regex special characters but allow Unicode (Vietnamese)
  const escapedQuery = trimmedQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // Use 'iu' flags: i = case-insensitive, u = unicode support
  const searchRegex = new RegExp(escapedQuery, 'iu');
  
  const queryObj = {
    $or: [
      // Match name (supports Vietnamese)
      { name: searchRegex },
      // Match email (local part)
      { email: searchRegex }
    ]
  };

  // Exclude current user
  if (currentUserId) {
    queryObj._id = { $ne: currentUserId };
  }

  const users = await User.find(queryObj)
    .select("_id name avatarUrl email")
    .limit(limit)
    .lean();

  return users.map(user => ({
    _id: user._id.toString(),
    name: user.name,
    avatarUrl: user.avatarUrl,
    username: user.email.split('@')[0] // Use email local part as username for now
  }));
}

