import React from 'react';

/**
 * Utility function to parse text and convert URLs to clickable links
 * @param {string} text - The text to parse
 * @param {Object} options - Options for link styling
 * @param {string} options.linkClassName - Custom className for links (default: blue link style)
 * @returns {Array|string} Array of React elements (text and links) or original text if no URLs
 */
export function parseLinks(text, options = {}) {
  if (!text || typeof text !== 'string') return text;

  // Improved URL regex pattern - matches http, https, www, and common domains
  // Excludes trailing punctuation like periods, commas, etc.
  const urlRegex = /(https?:\/\/[^\s<>"']+|www\.[^\s<>"']+|[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+[^\s<>"']*)/g;
  
  const parts = [];
  let lastIndex = 0;
  let match;
  const matches = [];

  // Collect all matches first
  while ((match = urlRegex.exec(text)) !== null) {
    matches.push({
      index: match.index,
      url: match[0],
      length: match[0].length
    });
  }

  // If no URLs found, return original text
  if (matches.length === 0) {
    return text;
  }

  // Process matches
  matches.forEach((match, idx) => {
    // Add text before the URL
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }

    // Process the URL - remove trailing punctuation
    let url = match.url;
    // Remove trailing punctuation (except if it's part of the URL like .com)
    url = url.replace(/[.,;:!?]+$/, '');
    
    let href = url;

    // Add protocol if missing
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      href = 'https://' + url;
    }

    // Default link className - can be overridden via options
    const defaultLinkClassName = options.linkClassName || "text-blue-400 dark:text-blue-300 hover:text-blue-300 dark:hover:text-blue-200 underline break-all";

    // Create link element
    parts.push(
      <a
        key={`link-${match.index}-${idx}`}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={defaultLinkClassName}
        onClick={(e) => {
          e.stopPropagation(); // Prevent event bubbling
        }}
      >
        {url}
      </a>
    );

    lastIndex = match.index + match.length;
  });

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts;
}

