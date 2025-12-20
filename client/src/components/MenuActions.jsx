import React, { useState, useRef } from "react";
import { MoreHorizontal, Lock, Globe, Edit, Trash2, Bookmark, BookmarkCheck } from "lucide-react";

/**
 * MenuActions - Dropdown menu with actions for a post
 * Shows options: toggle visibility, edit, delete, save/unsave
 * @param {Object} props - Component props
 * @param {Function} props.onToggleStatus - Callback to toggle public/private
 * @param {Function} props.onEdit - Callback to edit the post
 * @param {Function} props.onDelete - Callback to delete the post
 * @param {Function} props.onSave - Callback to save/unsave the post
 * @param {boolean} props.isPrivate - Current visibility state (private/public)
 * @param {boolean} props.saved - Saved status
 * @returns {JSX.Element} Menu actions component
 */
export default function MenuActions({ onToggleStatus, onEdit, onDelete, onSave, isPrivate, saved }) {
  // ==================== STATE MANAGEMENT ====================

  const [open, setOpen] = useState(false); // Open/closed state of the menu
  const menuRef = useRef(); // Ref used to detect clicks outside the menu

  // ==================== EFFECTS ====================

  // Close menu when clicking outside
  React.useEffect(() => {
    function handleClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div className="relative" ref={menuRef}>
      <button
        className="p-2 rounded-full hover:bg-gray-200 focus:outline-none"
        onClick={() => setOpen((v) => !v)}
        title="Tùy chọn"
      >
        <MoreHorizontal size={22} />
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-auto bg-white dark:bg-neutral-900 rounded-xl shadow-lg border border-gray-200 dark:border-neutral-800 z-50 flex flex-col py-1 overflow-hidden">
          {onSave && (
            <button
              className="flex items-center gap-1.5 px-3 py-2 hover:bg-gray-100 dark:hover:bg-neutral-800 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap"
              onClick={() => { onSave(); setOpen(false); }}
            >
              {saved ? <BookmarkCheck size={16} className="text-black dark:text-white flex-shrink-0" /> : <Bookmark size={16} className="flex-shrink-0" />}
              <span>{saved ? "Bỏ lưu" : "Lưu bài"}</span>
            </button>
          )}
          <button
            className="flex items-center gap-1.5 px-3 py-2 hover:bg-gray-100 dark:hover:bg-neutral-800 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap"
            onClick={() => { onToggleStatus(); setOpen(false); }}
          >
            {isPrivate ? <Globe size={16} className="flex-shrink-0" /> : <Lock size={16} className="flex-shrink-0" />}
            <span>{isPrivate ? "Công khai" : "Riêng tư"}</span>
          </button>
          <button
            className="flex items-center gap-1.5 px-3 py-2 hover:bg-gray-100 dark:hover:bg-neutral-800 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap"
            onClick={() => { onEdit(); setOpen(false); }}
          >
            <Edit size={16} className="flex-shrink-0" />
            <span>Sửa bài</span>
          </button>
          <button
            className="flex items-center gap-1.5 px-3 py-2 hover:bg-red-100 dark:hover:bg-red-900/20 text-sm text-red-600 dark:text-red-400 whitespace-nowrap"
            onClick={() => { onDelete(); setOpen(false); }}
          >
            <Trash2 size={16} className="flex-shrink-0" />
            <span>Xóa bài</span>
          </button>
        </div>
      )}
    </div>
  );
}
