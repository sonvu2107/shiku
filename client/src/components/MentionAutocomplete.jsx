import React, { useState, useEffect, useRef, useCallback } from "react";
import { getUserSuggestions } from "../utils/mentions";
import { useNavigate } from "react-router-dom";

/**
 * MentionAutocomplete - Component hiển thị dropdown gợi ý khi gõ @
 * @param {Object} props
 * @param {string} props.value - Giá trị hiện tại của textarea/input
 * @param {number} props.cursorPosition - Vị trí con trỏ trong textarea
 * @param {Function} props.onSelect - Callback khi chọn user (user, insertPosition) => void
 * @param {Function} props.onClose - Callback khi đóng autocomplete
 */
export default function MentionAutocomplete({ value, cursorPosition, onSelect, onClose }) {
  const [suggestions, setSuggestions] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const dropdownRef = useRef(null);

  // Extract query từ vị trí hiện tại
  const getMentionQuery = useCallback(() => {
    if (!value || cursorPosition === undefined) return null;
    
    // Tìm @ gần nhất trước cursor
    const textBeforeCursor = value.substring(0, cursorPosition);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    
    if (lastAtIndex === -1) return null;
    
    // Kiểm tra xem có khoảng trắng hoặc ký tự đặc biệt giữa @ và cursor không
    const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);
    const wordBoundaryMatch = textAfterAt.match(/^[\p{L}\p{N}_]+(?:\s+[\p{L}\p{N}_]+)*/u);
    
    if (!wordBoundaryMatch) return null;
    
    const query = wordBoundaryMatch[0];
    
    // Chỉ hiển thị nếu query không quá dài (tránh spam)
    if (query.length > 30) return null;
    
    return { query, startPosition: lastAtIndex };
  }, [value, cursorPosition]);

  // Fetch suggestions khi query thay đổi
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

    // Debounce để tránh quá nhiều requests
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

    // Tìm vị trí kết thúc của mention (bao gồm @ và query)
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
  
  // Không hiển thị nếu không có query hoặc suggestions
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
          className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${
            index === selectedIndex
              ? "bg-blue-50 dark:bg-blue-900/20"
              : "hover:bg-neutral-100 dark:hover:bg-neutral-700"
          }`}
          onMouseEnter={() => setSelectedIndex(index)}
          onClick={() => handleSelectUser(user)}
        >
          <img
            src={user.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || 'User')}&size=32`}
            alt={user.name}
            className="w-8 h-8 rounded-full object-cover flex-shrink-0"
            onError={(e) => {
              e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || 'User')}&size=32`;
            }}
          />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-neutral-900 dark:text-white truncate">
              {user.name}
            </div>
            {user.email && (
              <div className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                {user.email}
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

