import React, { useState, useRef } from "react";
import { MoreVertical, Lock, Globe, Edit, Trash2, Bookmark, BookmarkCheck } from "lucide-react";

/**
 * MenuActions - Menu dropdown với các hành động cho bài viết
 * Hiển thị menu với các tùy chọn: đổi trạng thái, sửa, xóa bài viết, lưu bài
 * @param {Object} props - Component props
 * @param {Function} props.onToggleStatus - Callback đổi trạng thái public/private
 * @param {Function} props.onEdit - Callback sửa bài viết
 * @param {Function} props.onDelete - Callback xóa bài viết
 * @param {Function} props.onSave - Callback lưu/bỏ lưu bài viết
 * @param {boolean} props.isPrivate - Trạng thái hiện tại của bài viết (private/public)
 * @param {boolean} props.saved - Trạng thái đã lưu hay chưa
 * @returns {JSX.Element} Component menu actions
 */
export default function MenuActions({ onToggleStatus, onEdit, onDelete, onSave, isPrivate, saved }) {
  // ==================== STATE MANAGEMENT ====================
  
  const [open, setOpen] = useState(false); // Trạng thái mở/đóng menu
  const menuRef = useRef(); // Ref để detect click outside

  // ==================== EFFECTS ====================
  
  // Đóng menu khi click ra ngoài
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
        <MoreVertical size={22} />
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-44 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 z-50 flex flex-col py-1">
          {onSave && (
            <button
              className="flex items-center gap-2 px-4 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm text-gray-700 dark:text-gray-300"
              onClick={() => { onSave(); setOpen(false); }}
            >
              {saved ? <BookmarkCheck size={16} className="text-blue-500" /> : <Bookmark size={16} />}
              {saved ? "Bỏ lưu" : "Lưu bài"}
            </button>
          )}
          <button
            className="flex items-center gap-2 px-4 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm text-gray-700 dark:text-gray-300"
            onClick={() => { onToggleStatus(); setOpen(false); }}
          >
            {isPrivate ? <Globe size={16} /> : <Lock size={16} />}
            {isPrivate ? "Công khai" : "Riêng tư"}
          </button>
          <button
            className="flex items-center gap-2 px-4 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm text-gray-700 dark:text-gray-300"
            onClick={() => { onEdit(); setOpen(false); }}
          >
            <Edit size={16} /> Sửa bài
          </button>
          <button
            className="flex items-center gap-2 px-4 py-1.5 hover:bg-red-100 dark:hover:bg-red-900/20 text-sm text-red-600 dark:text-red-400"
            onClick={() => { onDelete(); setOpen(false); }}
          >
            <Trash2 size={16} /> Xóa bài
          </button>
        </div>
      )}
    </div>
  );
}
