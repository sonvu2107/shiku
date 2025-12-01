import React, { useState, useRef } from "react";
import { createPortal } from "react-dom";

/**
 * Cảnh giới Tu Tiên với màu sắc tương ứng
 */
const CULTIVATION_REALMS = [
  { level: 1, name: "Phàm Nhân", color: "#9CA3AF", minExp: 0 },
  { level: 2, name: "Luyện Khí", color: "#10B981", minExp: 100 },
  { level: 3, name: "Trúc Cơ", color: "#3B82F6", minExp: 1000 },
  { level: 4, name: "Kim Đan", color: "#F59E0B", minExp: 5000 },
  { level: 5, name: "Nguyên Anh", color: "#8B5CF6", minExp: 15000 },
  { level: 6, name: "Hóa Thần", color: "#EC4899", minExp: 40000 },
  { level: 7, name: "Luyện Hư", color: "#14B8A6", minExp: 100000 },
  { level: 8, name: "Đại Thừa", color: "#F97316", minExp: 250000 },
  { level: 9, name: "Độ Kiếp", color: "#EF4444", minExp: 500000 },
  { level: 10, name: "Tiên Nhân", color: "#FFD700", minExp: 1000000 }
];

/**
 * CultivationBadge - Hiển thị badge cảnh giới tu tiên
 * @param {Object} cultivation - Thông tin cultivation từ user hoặc API
 * @param {number} cultivation.realmLevel - Level cảnh giới (1-10)
 * @param {string} cultivation.realmName - Tên cảnh giới
 * @param {number} cultivation.exp - Tu vi (exp)
 * @param {string} size - Kích thước badge: 'sm', 'md', 'lg'
 */
export default function CultivationBadge({ cultivation, size = "sm" }) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const badgeRef = useRef(null);

  // Return null if no cultivation data
  if (!cultivation) return null;

  // Lấy thông tin realm từ level hoặc từ exp
  let realm;
  if (cultivation.realmLevel) {
    realm = CULTIVATION_REALMS.find(r => r.level === cultivation.realmLevel);
  } else if (cultivation.exp !== undefined) {
    // Tính realm từ exp
    realm = [...CULTIVATION_REALMS].reverse().find(r => cultivation.exp >= r.minExp);
  } else if (cultivation.realm) {
    // Từ object realm
    realm = CULTIVATION_REALMS.find(r => r.level === cultivation.realm.level);
  }

  if (!realm) {
    realm = CULTIVATION_REALMS[0]; // Default: Phàm Nhân
  }

  const realmName = cultivation.realmName || realm.name;
  const realmColor = cultivation.realm?.color || realm.color;

  // Handle mouse events
  const handleMouseEnter = (e) => {
    if (!badgeRef.current) return;
    
    const rect = badgeRef.current.getBoundingClientRect();
    const tooltipX = rect.left + rect.width / 2;
    const tooltipY = rect.top - 8;
    
    setTooltipPosition({ x: tooltipX, y: tooltipY });
    setShowTooltip(true);
  };

  const handleMouseLeave = () => {
    setShowTooltip(false);
  };

  // Size classes
  const sizeClasses = {
    sm: "text-[10px] px-1.5 py-0.5",
    md: "text-xs px-2 py-1",
    lg: "text-sm px-3 py-1.5"
  };

  return (
    <>
      <span
        ref={badgeRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={`inline-flex items-center gap-1 rounded-full font-bold tracking-wide cursor-default ${sizeClasses[size]}`}
        style={{
          backgroundColor: `${realmColor}20`,
          color: realmColor,
          border: `1px solid ${realmColor}40`
        }}
      >
        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: realmColor }}></span>
        <span>{realmName}</span>
      </span>

      {/* Tooltip with exp info */}
      {showTooltip && createPortal(
        <div 
          className="fixed bg-black/90 text-white text-xs px-3 py-2 rounded-lg shadow-lg whitespace-nowrap pointer-events-none z-[9999] backdrop-blur-sm"
          style={{
            left: `${tooltipPosition.x}px`,
            top: `${tooltipPosition.y}px`,
            transform: 'translate(-50%, -100%)'
          }}
        >
          <div className="font-bold" style={{ color: realmColor }}>{realmName}</div>
          {cultivation.exp !== undefined && (
            <div className="text-gray-400 text-[10px] mt-0.5">
              Tu Vi: {cultivation.exp?.toLocaleString()}
            </div>
          )}
        </div>,
        document.body
      )}
    </>
  );
}
