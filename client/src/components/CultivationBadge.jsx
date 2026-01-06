import React, { useState, useRef, memo } from "react";
import { createPortal } from "react-dom";

/**
 * Cảnh giới Tu Tiên với màu sắc và gradient tương ứng (v2 - 14 levels)
 */
const CULTIVATION_REALMS = [
  { level: 1, name: "Phàm Nhân", color: "#9CA3AF", gradient: "from-gray-400 to-gray-500", minExp: 0 },
  { level: 2, name: "Luyện Khí", color: "#10B981", gradient: "from-emerald-400 to-emerald-600", minExp: 100 },
  { level: 3, name: "Trúc Cơ", color: "#3B82F6", gradient: "from-blue-400 to-blue-600", minExp: 1000 },
  { level: 4, name: "Kim Đan", color: "#9A6B1A", gradient: "from-amber-500 to-amber-700", minExp: 5000 },
  { level: 5, name: "Nguyên Anh", color: "#8B5CF6", gradient: "from-violet-400 to-violet-600", minExp: 15000 },
  { level: 6, name: "Hóa Thần", color: "#EC4899", gradient: "from-pink-400 to-pink-600", minExp: 40000 },
  { level: 7, name: "Luyện Hư", color: "#14B8A6", gradient: "from-teal-400 to-teal-600", minExp: 100000 },
  { level: 8, name: "Hợp Thể", color: "#22C55E", gradient: "from-green-400 to-green-600", minExp: 250000 },
  { level: 9, name: "Đại Thừa", color: "#F97316", gradient: "from-orange-400 to-orange-600", minExp: 500000 },
  { level: 10, name: "Chân Tiên", color: "#60A5FA", gradient: "from-sky-400 to-sky-600", minExp: 1000000 },
  { level: 11, name: "Kim Tiên", color: "#FACC15", gradient: "from-yellow-300 via-amber-400 to-yellow-500", minExp: 3000000 },
  { level: 12, name: "Tiên Vương", color: "#A855F7", gradient: "from-purple-400 to-purple-600", minExp: 7000000 },
  { level: 13, name: "Tiên Đế", color: "#EF4444", gradient: "from-red-500 to-red-700", minExp: 15000000 },
  { level: 14, name: "Thiên Đế", color: "#FF00FF", gradient: "from-fuchsia-400 via-purple-500 to-fuchsia-600", minExp: 30000000 }
];

/**
 * CultivationBadge - Hiển thị badge cảnh giới tu tiên đẹp mắt
 * @param {Object} cultivation - Thông tin cultivation từ user hoặc API
 * @param {number} cultivation.realmLevel - Level cảnh giới (1-10)
 * @param {string} cultivation.realmName - Tên cảnh giới
 * @param {number} cultivation.exp - Tu vi (exp)
 * @param {string} size - Kích thước badge: 'sm', 'md', 'lg'
 * @param {string} variant - Kiểu hiển thị: 'default' (tên + chấm) | 'minimal' (chỉ tên) | 'gradient' (gradient đẹp)
 */
const CultivationBadge = memo(function CultivationBadge({
  cultivation,
  size = "sm",
  variant = "gradient"
}) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const badgeRef = useRef(null);

  // Return null if no cultivation data
  if (!cultivation) return null;

  // Lấy thông tin realm từ level
  // QUAN TRỌNG: Luôn ưu tiên realmLevel vì cảnh giới chỉ thay đổi khi độ kiếp (breakthrough)
  // KHÔNG tính realm từ exp vì user có thể có đủ exp nhưng chưa độ kiếp lên cấp mới
  let realm;
  
  // Ưu tiên 1: realmLevel trực tiếp (từ cultivationCache hoặc cultivation object)
  if (cultivation.realmLevel && cultivation.realmLevel > 0) {
    realm = CULTIVATION_REALMS.find(r => r.level === cultivation.realmLevel);
  } 
  // Ưu tiên 2: realm.level (từ full cultivation object)
  else if (cultivation.realm?.level) {
    realm = CULTIVATION_REALMS.find(r => r.level === cultivation.realm.level);
  }
  // Fallback: Phàm Nhân (level 1)
  // KHÔNG tính từ exp để tránh hiển thị sai cảnh giới
  
  if (!realm) {
    realm = CULTIVATION_REALMS[0]; // Default: Phàm Nhân
  }

  // Ưu tiên realmName từ data nếu có, nếu không thì dùng từ realm lookup
  const realmName = cultivation.realmName || realm.name;
  // Color lấy từ realm lookup (không dùng cultivation.realm?.color vì cultivationCache không có)
  const realmColor = realm.color;
  const realmGradient = realm.gradient;

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

  // Size classes cho các variant
  const sizeConfig = {
    sm: {
      text: "text-[10px]",
      padding: "px-2 py-0.5",
      font: "font-semibold"
    },
    md: {
      text: "text-xs",
      padding: "px-2.5 py-1",
      font: "font-bold"
    },
    lg: {
      text: "text-sm",
      padding: "px-3 py-1.5",
      font: "font-bold"
    }
  };

  const sizeClass = sizeConfig[size] || sizeConfig.sm;

  // Render theo variant
  const renderBadge = () => {
    switch (variant) {
      case 'minimal':
        // Chỉ tên, màu đơn giản
        return (
          <span
            className={`inline-flex items-center ${sizeClass.text} ${sizeClass.font} tracking-wide`}
            style={{ color: realmColor }}
          >
            {realmName}
          </span>
        );

      case 'default':
        // Tên + chấm tròn
        return (
          <span
            className={`inline-flex items-center gap-1 rounded-full ${sizeClass.text} ${sizeClass.padding} ${sizeClass.font} tracking-wide cursor-default`}
            style={{
              backgroundColor: `${realmColor}15`,
              color: realmColor,
              border: `1px solid ${realmColor}30`
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: realmColor }}></span>
            <span>{realmName}</span>
          </span>
        );

      case 'gradient':
      default:
        // Gradient đẹp - mặc định
        return (
          <span
            className={`inline-flex items-center gap-1 rounded-full bg-gradient-to-r ${realmGradient} text-white ${sizeClass.text} ${sizeClass.padding} ${sizeClass.font} tracking-wide cursor-default shadow-sm`}
            style={{
              textShadow: '0 1px 2px rgba(0,0,0,0.2)'
            }}
          >
            <span>{realmName}</span>
          </span>
        );
    }
  };

  return (
    <>
      <span
        ref={badgeRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="inline-flex flex-shrink-0"
      >
        {renderBadge()}
      </span>

      {/* Tooltip with exp info */}
      {showTooltip && createPortal(
        <div
          className="fixed bg-neutral-900/95 text-white text-xs px-3 py-2 rounded-lg shadow-xl whitespace-nowrap pointer-events-none z-[9999] backdrop-blur-sm border border-neutral-700/50"
          style={{
            left: `${tooltipPosition.x}px`,
            top: `${tooltipPosition.y}px`,
            transform: 'translate(-50%, -100%)'
          }}
        >
          <div className={`font-bold bg-gradient-to-r ${realmGradient} bg-clip-text text-transparent`}>
            {realmName}
          </div>
          {cultivation.exp !== undefined && (
            <div className="text-gray-400 text-[10px] mt-1 flex items-center gap-1">
              <span className="text-amber-400">✦</span>
              Tu Vi: {cultivation.exp?.toLocaleString()}
            </div>
          )}
        </div>,
        document.body
      )}
    </>
  );
});

export default CultivationBadge;
