import React, { useState, useEffect, useRef, useCallback } from "react";
import { getUserSuggestions } from "../utils/mentions";
import { useNavigate } from "react-router-dom";
import Avatar from "./Avatar";

/**
 * MentionAutocomplete - Dropdown suggestions component when typing @mentions
 * @param {Object} props
 * @param {string} props.value - Current value of the textarea/input
 * @param {number} props.cursorPosition - Cursor position inside the textarea
 * @param {Function} props.onSelect - Callback when selecting a user (user, insertPosition) => void
 * @param {Function} props.onClose - Callback when closing the autocomplete
 */
export default function MentionAutocomplete({ value, cursorPosition, onSelect, onClose }) {
  const [suggestions, setSuggestions] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const dropdownRef = useRef(null);

  // Extract the mention query from the current cursor position
  const getMentionQuery = useCallback(() => {
    if (!value || cursorPosition === undefined) return null;

    // Find the nearest @ before the cursor
    const textBeforeCursor = value.substring(0, cursorPosition);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');

    if (lastAtIndex === -1) return null;

    // Check if there are spaces or special characters between @ and the cursor
    const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);
    const wordBoundaryMatch = textAfterAt.match(/^[\p{L}\p{N}_]+(?:\s+[\p{L}\p{N}_]+)*/u);

    if (!wordBoundaryMatch) return null;

    const query = wordBoundaryMatch[0];

    // Only show if query is not too long (avoid spam)
    if (query.length > 30) return null;

    return { query, startPosition: lastAtIndex };
  }, [value, cursorPosition]);

  // Fetch suggestions when the mention query changes
  useEffect(() => {
    const mentionInfo = getMentionQuery();

    if (!mentionInfo || !mentionInfo.query.trim()) {
      setSuggestions([]);
      setSelectedIndex(0);
      return;
    }

    let cancelled = false;
    setLoading(true);

    const fetchSuggestions = async () => {
      try {
        const users = await getUserSuggestions(mentionInfo.query);
        if (!cancelled) {
          setSuggestions(users);
          setSelectedIndex(0);
          setLoading(false);
        }
      } catch (error) {
        console.error("[ERROR][MentionAutocomplete] Failed to fetch suggestions:", error);
        if (!cancelled) {
          setSuggestions([]);
          setLoading(false);
        }
      }
    };

    // Debounce to avoid sending too many requests
    const timeoutId = setTimeout(fetchSuggestions, 200);

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [getMentionQuery]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (suggestions.length === 0) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((prev) => (prev + 1) % suggestions.length);
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length);
          break;
        case "Enter":
        case "Tab":
          if (suggestions[selectedIndex]) {
            e.preventDefault();
            handleSelectUser(suggestions[selectedIndex]);
          }
          break;
        case "Escape":
          e.preventDefault();
          onClose?.();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [suggestions, selectedIndex, onClose]);

  // Handle select user
  const handleSelectUser = (user) => {
    const mentionInfo = getMentionQuery();
    if (!mentionInfo) return;

    // Find the end position of the mention (including @ and query)
    const endPosition = mentionInfo.startPosition + 1 + mentionInfo.query.length;

    onSelect?.(user, mentionInfo.startPosition, endPosition);
    onClose?.();
  };

  // Handle view profile
  const handleViewProfile = (e, user) => {
    e.stopPropagation();
    e.preventDefault();
    if (user && user._id) {
      navigate(`/user/${user._id}`);
      onClose?.();
    }
  };

  const mentionInfo = getMentionQuery();

  // Do not display if there is no query or suggestions
  if (!mentionInfo || !mentionInfo.query.trim() || suggestions.length === 0) {
    return null;
  }

  return (
    <div
      ref={dropdownRef}
      className="absolute z-50 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-xl max-h-64 overflow-y-auto min-w-[280px]"
      style={{ bottom: "100%", marginBottom: "4px" }}
    >
      {loading && (
        <div className="px-4 py-3 text-sm text-neutral-500 dark:text-neutral-400 text-center">
          Đang tải...
        </div>
      )}

      {!loading && suggestions.length === 0 && (
        <div className="px-4 py-3 text-sm text-neutral-500 dark:text-neutral-400 text-center">
          Không tìm thấy người dùng
        </div>
      )}

      {!loading && suggestions.map((user, index) => (
        <div
          key={user._id}
          className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${index === selectedIndex
            ? "bg-blue-50 dark:bg-blue-900/20"
            : "hover:bg-neutral-100 dark:hover:bg-neutral-700"
            }`}
          onMouseEnter={() => setSelectedIndex(index)}
          onClick={() => handleSelectUser(user)}
        >
          <Avatar
            src={user.avatarUrl}
            name={user.name || 'User'}
            size={32}
            className="flex-shrink-0"
          />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-neutral-900 dark:text-white truncate">
              {user.name}
            </div>
            {user.nickname && (
              <div className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                @{user.nickname}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={(e) => handleViewProfile(e, user)}
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline px-2 py-1 flex-shrink-0"
            title="Xem profile"
          >
            Xem
          </button>
        </div>
      ))}
    </div>
  );
}

