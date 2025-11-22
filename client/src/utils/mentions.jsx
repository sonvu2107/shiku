import React from "react";

/**
 * Parse @mentions from text and convert to JSX elements
 * @param {string} text - The text content
 * @param {Object} options - Options for rendering
 * @param {Function} options.onMentionClick - Function to handle mention clicks
 * @returns {Array} Array of JSX elements and strings
 */
export function parseMentions(text) {
  if (!text || typeof text !== "string") {
    return [{ type: "text", content: text || "" }];
  }

  // Regex to match @mentions
  // Matches @ followed by one or more words (Unicode letters including Vietnamese, numbers, underscores)
  // Stops when encountering space followed by non-word character or end of string
  // Example: "@Sơn Vũ xin chào" only matches "@Sơn Vũ"
  // Supports Vietnamese characters: àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ
  const mentionRegex = /@([\p{L}\p{N}_]+(?:\s+[\p{L}\p{N}_]+)*?)(?=\s+[^\p{L}\p{N}_\s]|\s{2,}|\s*[.,!?;:()\[\]{}"']|$)/gu;
  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = mentionRegex.exec(text)) !== null) {
    // Add text before mention
    if (match.index > lastIndex) {
      parts.push({
        type: "text",
        content: text.substring(lastIndex, match.index)
      });
    }

    // Add mention
    parts.push({
      type: "mention",
      username: match[1],
      fullMatch: match[0]
    });

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push({
      type: "text",
      content: text.substring(lastIndex)
    });
  }

  // If no mentions found, return the whole text as a single part
  if (parts.length === 0) {
    return [{ type: "text", content: text }];
  }

  return parts;
}

/**
 * Render mentions in text as clickable links
 * @param {string} text - The text content
 * @param {Array} mentionedUsers - Array of user objects with _id, name, avatarUrl
 * @param {Function} onMentionClick - Function to handle mention clicks (user) => void
 * @returns {Array} Array of React elements
 */
export function renderMentions(text, mentionedUsers = [], onMentionClick = null) {
  if (!text) return null;

  const parts = parseMentions(text);
  const userMap = new Map();
  
  // Create a map of username (from email) or name to user object
  mentionedUsers.forEach(user => {
    if (user && user._id) {
      const nameLower = (user.name || '').toLowerCase().trim();
      const emailLocal = (user.email?.split('@')[0] || '').toLowerCase();
      
      // Map exact name match
      if (nameLower) {
        userMap.set(nameLower, user);
        
        // Map first name (for partial matching)
        const firstName = nameLower.split(/\s+/)[0];
        if (firstName && firstName !== nameLower) {
          userMap.set(firstName, user);
        }
      }
      
      // Map email local part
      if (emailLocal) {
        userMap.set(emailLocal, user);
      }
    }
  });

  return parts.map((part, index) => {
    if (part.type === "text") {
      return <span key={index}>{part.content}</span>;
    }
    
    if (part.type === "mention") {
      const mentionUsername = part.username.trim().toLowerCase();
      let user = userMap.get(mentionUsername);
      
      // If no exact match, try partial matching
      if (!user) {
        // Try first word match
        const firstWord = mentionUsername.split(/\s+/)[0];
        if (firstWord) {
          user = userMap.get(firstWord);
        }
        
        // Try reverse: check if mention starts with any mapped name
        if (!user) {
          for (const [key, u] of userMap.entries()) {
            if (key.startsWith(mentionUsername) || mentionUsername.startsWith(key)) {
              user = u;
              break;
            }
          }
        }
      }
      
      if (user && onMentionClick) {
        return (
          <span
            key={index}
            className="text-blue-600 dark:text-blue-400 hover:underline font-medium cursor-pointer"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onMentionClick(user);
            }}
            title={`Xem profile của ${user.name || mentionUsername}`}
          >
            {part.fullMatch}
          </span>
        );
      }
      
      // If user not found or no click handler, still show as styled text (might be loading or user doesn't exist)
      return (
        <span 
          key={index} 
          className="text-blue-600 dark:text-blue-400 font-medium"
          title={onMentionClick ? "Người dùng không tồn tại hoặc đã bị xóa" : undefined}
        >
          {part.fullMatch}
        </span>
      );
    }
    
    return null;
  });
}

/**
 * Get user suggestions for autocomplete
 * @param {string} query - Search query
 * @returns {Promise<Array>} Array of user objects
 */
export async function getUserSuggestions(query) {
  if (!query || query.trim().length === 0) {
    return [];
  }

  try {
    const { api } = await import("../api");
    const response = await api(`/api/users/suggestions?q=${encodeURIComponent(query)}&limit=10`);
    return response.users || [];
  } catch (error) {
    console.error("[ERROR][MENTIONS] Failed to fetch user suggestions:", error);
    return [];
  }
}

/**
 * Extract mention usernames from text
 * @param {string} text - The text content
 * @returns {Array} Array of usernames (without @)
 */
export function extractMentionUsernames(text) {
  if (!text || typeof text !== "string") {
    return [];
  }

  const mentionRegex = /@([\p{L}\p{N}_]+(?:\s+[\p{L}\p{N}_]+)*?)(?=\s+[^\p{L}\p{N}_\s]|\s{2,}|\s*[.,!?;:()\[\]{}"']|$)/gu;
  const usernames = new Set();
  let match;

  while ((match = mentionRegex.exec(text)) !== null) {
    // Normalize: trim spaces, lowercase (preserves Vietnamese diacritics)
    const username = match[1].trim().toLowerCase();
    if (username.length > 0 && username.length <= 30) {
      usernames.add(username);
    }
  }

  return Array.from(usernames);
}

