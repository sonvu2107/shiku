import React from "react";
import ReactMarkdown from "react-markdown";
import remarkBreaks from "remark-breaks";
import { useNavigate } from "react-router-dom";
import { parseMentions } from "../utils/mentions";

/**
 * Escape markdown special characters trong text để tránh vỡ syntax
 * @param {string} text - Text cần escape
 * @returns {string} Text đã được escape
 */
const escapeMarkdown = (text) =>
  text.replace(/([_*[\]()\\])/g, '\\$1');

/**
 * MarkdownWithMentions - Component combine ReactMarkdown with @mentions
 * Renders markdown content but replaces mentions with clickable links
 * @param {string} content - Markdown content
 * @param {Array} mentionedUsers - Array of user objects with _id, name, avatarUrl
 */
export default function MarkdownWithMentions({ content, mentionedUsers = [] }) {
  const navigate = useNavigate();

  if (!content) return null;

  // Normalize newlines (Windows/mobile có thể dùng \r\n)
  const normalizedContent = content.replace(/\r\n/g, '\n');

  // Create a user map for quick lookup (exact match only)
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

        // Priority 1: Exact match by name or email
        let user = userMap.get(username);

        // Priority 2: Try first word match (cho tên có nhiều từ)
        if (!user && username.includes(' ')) {
          const firstName = username.split(/\s+/)[0];
          user = userMap.get(firstName);
        }

        // Priority 3: One-way startsWith - chỉ kiểm tra key.startsWith(username)
        // Không làm ngược lại để tránh link nhầm người
        if (!user) {
          for (const [key, u] of userMap.entries()) {
            if (key.startsWith(username)) {
              user = u;
              break;
            }
          }
        }

        // Escape username để tránh vỡ markdown syntax
        const safeUsername = escapeMarkdown(part.username);

        if (user && user._id) {
          // Use markdown link format that will be handled by ReactMarkdown
          // Use a special URL format to identify mentions
          return `[@${safeUsername}](/user/${user._id}/mention)`;
        }

        // If user not found, still make it a link but to search
        return `[@${safeUsername}](/search?q=${encodeURIComponent(part.username)})`;
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
              role="link"
              tabIndex={0}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                navigate(`/user/${userIdMatch[1]}`);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  e.stopPropagation();
                  navigate(`/user/${userIdMatch[1]}`);
                }
              }}
              className="text-black dark:text-white hover:underline font-medium cursor-pointer"
            >
              {children}
            </span>
          );
        }
      }
      // Regular links
      return (
        <a {...props} href={href} target="_blank" rel="noopener noreferrer" className="text-black dark:text-white hover:underline">
          {children}
        </a>
      );
    }
  };

  const processedContent = processContent(normalizedContent);

  return (
    <ReactMarkdown remarkPlugins={[remarkBreaks]} components={components}>
      {processedContent}
    </ReactMarkdown>
  );
}
