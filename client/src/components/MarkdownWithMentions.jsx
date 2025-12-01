import React from "react";
import ReactMarkdown from "react-markdown";
import { useNavigate } from "react-router-dom";
import { parseMentions } from "../utils/mentions";

/**
 * MarkdownWithMentions - Component combine ReactMarkdown with @mentions
 * Renders markdown content but replaces mentions with clickable links
 * @param {string} content - Markdown content
 * @param {Array} mentionedUsers - Array of user objects with _id, name, avatarUrl
 */
export default function MarkdownWithMentions({ content, mentionedUsers = [] }) {
  const navigate = useNavigate();

  if (!content) return null;

  // Create a user map for quick lookup
  const userMap = new Map();
  mentionedUsers.forEach(user => {
    if (user && user._id) {
      const nameLower = user.name?.toLowerCase().trim() || '';
      const emailLocal = user.email?.split('@')[0]?.toLowerCase() || '';
      if (nameLower) userMap.set(nameLower, user);
      if (emailLocal) userMap.set(emailLocal, user);
    }
  });

  // Parse content and replace mentions with links before passing to ReactMarkdown
  const processContent = (text) => {
    if (!text) return text;

    // Parse mentions
    const parts = parseMentions(text);
    
    // Convert mentions to markdown links that navigate to profile
    return parts.map((part, index) => {
      if (part.type === "text") {
        return part.content;
      }
      
      if (part.type === "mention") {
        const username = part.username.trim().toLowerCase();
        let user = userMap.get(username);
        
        // Try partial match (first word)
        if (!user && username.includes(' ')) {
          const firstName = username.split(/\s+/)[0];
          user = userMap.get(firstName);
        }
        
        // Try to find user by matching name start
        if (!user) {
          for (const [key, u] of userMap.entries()) {
            if (key.startsWith(username) || username.startsWith(key)) {
              user = u;
              break;
            }
          }
        }
        
        if (user && user._id) {
          // Use markdown link format that will be handled by ReactMarkdown
          // Use a special URL format to identify mentions
          return `[@${part.username}](/user/${user._id}/mention)`;
        }
        
        // If user not found, still make it a link but to search
        return `[@${part.username}](/search?q=${encodeURIComponent(part.username)})`;
      }
      
      return '';
    }).join('');
  };

  // Custom link component for ReactMarkdown to handle profile navigation
  const components = {
    a: ({ href, children, ...props }) => {
      // Check if this is a mention link (contains /user/ and /mention)
      if (href && href.includes('/user/') && href.includes('/mention')) {
        // Extract user ID from URL
        const userIdMatch = href.match(/\/user\/([^/]+)/);
        if (userIdMatch) {
          return (
            <span
              {...props}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                navigate(`/user/${userIdMatch[1]}`);
              }}
              className="text-blue-600 dark:text-blue-400 hover:underline font-medium cursor-pointer"
            >
              {children}
            </span>
          );
        }
      }
      // Regular links
      return (
        <a {...props} href={href} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">
          {children}
        </a>
      );
    }
  };

  const processedContent = processContent(content);

  return (
    <ReactMarkdown components={components}>
      {processedContent}
    </ReactMarkdown>
  );
}

