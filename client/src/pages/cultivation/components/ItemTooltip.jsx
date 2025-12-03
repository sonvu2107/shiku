/**
 * Item Tooltip - Display item details and stats
 */
import { memo, useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { RARITY_COLORS } from '../utils/constants.js';

const ItemTooltip = memo(function ItemTooltip({ item, stats, position, onClose }) {
  const tooltipRef = useRef(null);
  const TOOLTIP_WIDTH = 288; // w-72 = 18rem = 288px
  const GAP = 10; // Gap between item and tooltip
  const MARGIN = 10; // Margin from viewport edges

  // Initial position (will be recalculated after render)
  const getInitialPosition = (pos) => {
    if (!pos) return { left: '0px', top: '0px' };
    const itemRight = pos.right !== undefined ? pos.right : pos.x;
    const itemTop = pos.top !== undefined ? pos.top : pos.y;
    return {
      left: `${itemRight + GAP}px`,
      top: `${itemTop}px`
    };
  };

  const [tooltipStyle, setTooltipStyle] = useState(() => getInitialPosition(position));

  // Update initial position when position changes
  useEffect(() => {
    if (position) {
      setTooltipStyle(getInitialPosition(position));
    }
  }, [position]);

  // Calculate position after tooltip is rendered to get actual height
  useEffect(() => {
    if (!position || !item) return;

    // Use requestAnimationFrame to ensure DOM is updated
    requestAnimationFrame(() => {
      if (!tooltipRef.current) return;

      const tooltipElement = tooltipRef.current;
      const tooltipHeight = tooltipElement.offsetHeight;
      const tooltipWidth = tooltipElement.offsetWidth;

    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    // Use rect information if available, otherwise fall back to x, y
    const itemRight = position.right !== undefined ? position.right : position.x;
    const itemLeft = position.left !== undefined ? position.left : position.x - 200; // Estimate item width
    const itemTop = position.top !== undefined ? position.top : position.y;
    const itemBottom = position.bottom !== undefined ? position.bottom : position.y + 100; // Estimate item height

    // Calculate actual position
    let left, top;

    // Check if tooltip would overflow on the right
    const spaceOnRight = windowWidth - itemRight;
    const spaceOnLeft = itemLeft;
    const wouldOverflowRight = spaceOnRight < tooltipWidth + GAP;
    const wouldOverflowLeft = spaceOnLeft < tooltipWidth + GAP;

    // Determine horizontal position
    if (wouldOverflowRight && spaceOnLeft >= tooltipWidth + GAP) {
      // Show on the left side of item
      left = itemLeft - tooltipWidth - GAP;
    } else {
      // Show on the right side of item (default)
      left = itemRight + GAP;
    }

    // Ensure tooltip doesn't go off left edge
    if (left < MARGIN) {
      left = MARGIN;
    }

    // Ensure tooltip doesn't go off right edge
    if (left + tooltipWidth > windowWidth - MARGIN) {
      left = windowWidth - tooltipWidth - MARGIN;
    }

    // Check if tooltip would overflow on the bottom
    const spaceOnBottom = windowHeight - itemTop;
    const spaceOnTop = itemTop;

    // Adjust vertical position based on actual tooltip height
    if (spaceOnBottom < tooltipHeight + MARGIN) {
      // Tooltip would overflow bottom
      if (spaceOnTop >= tooltipHeight + MARGIN) {
        // Show above item if there's enough space
        top = itemTop - tooltipHeight - GAP;
      } else {
        // Not enough space above or below, position to fit in viewport
        const maxTop = windowHeight - tooltipHeight - MARGIN;
        if (maxTop > MARGIN) {
          top = Math.max(itemTop, maxTop);
        } else {
          // Tooltip is taller than viewport, show from top
          top = MARGIN;
        }
      }
    } else {
      // Default: align with top of item
      top = itemTop;
    }

    // Ensure tooltip doesn't go off top edge
    if (top < MARGIN) {
      top = MARGIN;
    }

    // Final check: ensure tooltip doesn't overflow bottom
    if (top + tooltipHeight > windowHeight - MARGIN) {
      top = windowHeight - tooltipHeight - MARGIN;
      // If still doesn't fit, at least show from top
      if (top < MARGIN) {
        top = MARGIN;
      }
    }

      setTooltipStyle({
        left: `${left}px`,
        top: `${top}px`
      });
    });
  }, [position, item]);

  // Recalculate when window resizes
  useEffect(() => {
    const handleResize = () => {
      if (tooltipRef.current && position) {
        // Trigger recalculation by updating style
        const currentStyle = tooltipRef.current.style;
        const temp = currentStyle.left;
        currentStyle.left = temp;
      }
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleResize);
    };
  }, [position]);

  if (!item) return null;

  const rarity = RARITY_COLORS[item.rarity || item.metadata?.rarity] || RARITY_COLORS.common;
  const itemStats = stats || item.metadata?.stats || item.stats;

  return createPortal(
    <div 
      ref={tooltipRef}
      className="fixed z-[9999] w-72 max-h-[calc(100vh-20px)] overflow-y-auto bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-2 border-amber-500/60 rounded-xl p-4 shadow-2xl backdrop-blur-md pointer-events-none custom-scrollbar"
      style={tooltipStyle}
    >
      {/* Header với ảnh và tên */}
      <div className="flex items-start gap-3 mb-3 pb-3 border-b border-amber-500/40">
        {(item.metadata?.img || item.img) && (
          <img
            src={item.metadata?.img || item.img}
            alt={item.name}
            className="w-16 h-16 object-cover rounded-lg border-2 border-amber-500/50 shadow-lg"
          />
        )}
        <div className="flex-1 min-w-0">
          <h4 className={`text-base font-bold mb-1 ${rarity.text || 'text-amber-300'}`}>
            {item.name}
          </h4>
          <div className="flex items-center gap-2 flex-wrap">
            {(item.metadata?.rarity || item.rarity) && (
              <span className={`text-[10px] px-2 py-0.5 rounded ${rarity.bg || 'bg-slate-800/50'} ${rarity.text || 'text-slate-300'} border ${rarity.border || 'border-slate-600'} font-semibold`}>
                {(() => {
                  const rarityValue = item.rarity || item.metadata?.rarity;
                  const rarityMap = {
                    common: 'Phàm Phẩm',
                    uncommon: 'Tinh Phẩm',
                    rare: 'Hiếm Có',
                    epic: 'Cực Phẩm',
                    legendary: 'Thần Bảo',
                    mythic: 'Tiên Bảo'
                  };
                  return rarityMap[rarityValue] || rarityValue || 'Thường';
                })()}
              </span>
            )}
            {/* Hiển thị loại item */}
            {item.metadata?.equipmentType && (
              <span className="text-[10px] px-2 py-0.5 rounded bg-slate-700/50 text-slate-300 border border-slate-600">
                {item.metadata.equipmentType === 'weapon' ? 'Vũ Khí' :
                 item.metadata.equipmentType === 'magic_treasure' ? 'Pháp Bảo' :
                 item.metadata.equipmentType === 'armor' ? 'Giáp' :
                 item.metadata.equipmentType === 'accessory' ? 'Trang Sức' :
                 item.metadata.equipmentType === 'power_item' ? 'Linh Khí' :
                 item.metadata.equipmentType}
              </span>
            )}
          </div>
        </div>
      </div>
      
      {/* Thông số */}
      {itemStats && Object.keys(itemStats).length > 0 && (
      <div className="space-y-2">
        <p className="text-sm text-amber-400 font-bold mb-2 flex items-center gap-2">
          <span className="w-1 h-4 bg-amber-500 rounded"></span>
          Thông Số
        </p>
        <div className="space-y-1.5 bg-slate-800/30 rounded-lg p-2">
          {Object.entries(itemStats)
            .filter(([_, value]) => value && value !== 0 && typeof value !== 'object') // Filter out objects like elemental_damage for now
            .map(([stat, value]) => {
              const statLabels = {
                attack: { label: 'Tấn Công', color: 'text-red-400' },
                defense: { label: 'Phòng Thủ', color: 'text-blue-400' },
                hp: { label: 'Khí Huyết', color: 'text-green-400' },
                qiBlood: { label: 'Khí Huyết', color: 'text-pink-400' },
                zhenYuan: { label: 'Chân Nguyên', color: 'text-purple-400' },
                speed: { label: 'Tốc Độ', color: 'text-cyan-400' },
                crit_rate: { label: 'Tỷ Lệ Chí Mạng', color: 'text-yellow-400' },
                criticalRate: { label: 'Tỷ Lệ Chí Mạng', color: 'text-yellow-400' },
                crit_damage: { label: 'Sát Thương Chí Mạng', color: 'text-yellow-300' },
                penetration: { label: 'Xuyên Thấu', color: 'text-orange-400' },
                evasion: { label: 'Né Tránh', color: 'text-green-400' },
                dodge: { label: 'Né Tránh', color: 'text-green-400' },
                hit_rate: { label: 'Chính Xác', color: 'text-blue-300' },
                energy_regen: { label: 'Hồi Linh Lực', color: 'text-purple-300' },
                lifesteal: { label: 'Hút Máu', color: 'text-red-300' },
                true_damage: { label: 'Sát Thương Chuẩn', color: 'text-red-200' },
                buff_duration: { label: 'Thời Gian Buff', color: 'text-cyan-300' }
              };
              const statInfo = statLabels[stat] || { label: stat, color: 'text-slate-300' };
              const displayValue = typeof value === 'number' 
                ? (value > 0 ? `+${value.toLocaleString()}` : value.toLocaleString())
                : value;
              const suffix = (stat === 'crit_rate' || stat === 'criticalRate' || stat === 'crit_damage' || stat === 'dodge' || stat === 'evasion' || stat === 'hit_rate') ? '%' : '';
              
              return (
                <div key={stat} className="flex justify-between items-center text-sm py-0.5">
                  <span className="text-slate-300 font-medium">{statInfo.label}:</span>
                  <span className={`font-mono font-bold ${statInfo.color} text-right`}>
                    {displayValue}{suffix}
                  </span>
                </div>
              );
            })}
        </div>

        {/* Elemental Damage */}
        {itemStats.elemental_damage && Object.keys(itemStats.elemental_damage).length > 0 && (
          <div className="pt-3 mt-3 border-t border-amber-500/30">
            <p className="text-sm text-amber-400 font-bold mb-2 flex items-center gap-2">
              <span className="w-1 h-4 bg-amber-500 rounded"></span>
              Sát Thương Thuộc Tính
            </p>
            <div className="space-y-1.5 bg-slate-800/30 rounded-lg p-2">
              {Object.entries(itemStats.elemental_damage)
                .filter(([_, value]) => value && value > 0)
                .map(([element, value]) => {
                  const elementLabels = {
                    fire: { label: '🔥 Hỏa', color: 'text-red-400' },
                    ice: { label: '❄️ Băng', color: 'text-cyan-400' },
                    wind: { label: '💨 Phong', color: 'text-green-400' },
                    thunder: { label: '⚡ Lôi', color: 'text-yellow-400' },
                    earth: { label: '🌍 Thổ', color: 'text-amber-400' },
                    water: { label: '💧 Thủy', color: 'text-blue-400' }
                  };
                  const elementInfo = elementLabels[element] || { label: element, color: 'text-slate-300' };
                  return (
                    <div key={element} className="flex justify-between items-center text-sm py-0.5">
                      <span className="text-slate-300 font-medium">{elementInfo.label}:</span>
                      <span className={`font-mono font-bold ${elementInfo.color}`}>
                        +{value.toLocaleString()}
                      </span>
                    </div>
                  );
                })}
            </div>
          </div>
        )}
      </div>
      )}

      {/* Hiển thị special effect nếu có */}
      {(item.metadata?.special_effect || item.special_effect) && (
        <div className="pt-3 mt-3 border-t border-amber-500/30">
          <p className="text-sm text-amber-400 font-bold mb-2 flex items-center gap-2">
            <span className="w-1 h-4 bg-amber-500 rounded"></span>
            Hiệu Ứng Đặc Biệt
          </p>
          <p className="text-sm text-slate-300 italic leading-relaxed bg-slate-800/30 rounded-lg p-2">
            {item.metadata?.special_effect || item.special_effect}
          </p>
        </div>
      )}
      
      {/* Hiển thị description nếu không phải equipment hoặc không có stats */}
      {(!itemStats || Object.keys(itemStats).length === 0) && (item.description || item.metadata?.description) && (
          <div className="pt-3 mt-3 border-t border-amber-500/30">
             <p className="text-sm text-slate-300 italic leading-relaxed">
                {item.description || item.metadata?.description}
             </p>
          </div>
      )}
      
      {/* Hiển thị level requirement nếu có */}
      {(item.metadata?.level_required || item.level_required) && (
        <div className="pt-2 mt-2 text-xs text-slate-400 border-t border-white/10">
          Cấp Yêu Cầu: <span className="text-amber-400 font-semibold">{item.metadata?.level_required || item.level_required}</span>
        </div>
      )}
    </div>,
    document.body
  );
});

export default ItemTooltip;

