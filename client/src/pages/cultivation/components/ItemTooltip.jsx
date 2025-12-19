/**
 * Item Tooltip - Display item details and stats
 */
import { memo, useLayoutEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { RARITY_COLORS, SHOP_ITEM_DATA } from '../utils/constants.js';

const ItemTooltip = memo(function ItemTooltip({ item, stats, position }) {
  const tooltipRef = useRef(null);

  const [tooltipStyle, setTooltipStyle] = useState({
    top: '0px',
    left: '0px',
    opacity: 0,
    visibility: 'hidden'
  });

  useLayoutEffect(() => {
    if (!position || !item || !tooltipRef.current) return;

    const calculatePosition = () => {
      const tooltip = tooltipRef.current;
      const { innerWidth: vw, innerHeight: vh } = window;
      const { width: tw, height: th } = tooltip.getBoundingClientRect();

      // Item boundaries
      const itemRect = {
        left: position.left ?? position.x,
        right: position.right ?? position.x,
        top: position.top ?? position.y,
        bottom: position.bottom ?? position.y,
      };

      const GAP = 12;
      const MARGIN = 16;

      let left = 0;
      let top = 0;

      // 1. Try Right Side
      if (itemRect.right + GAP + tw + MARGIN <= vw) {
        left = itemRect.right + GAP;
        top = itemRect.top;
      }
      // 2. Try Left Side
      else if (itemRect.left - GAP - tw - MARGIN >= 0) {
        left = itemRect.left - GAP - tw;
        top = itemRect.top;
      }
      // 3. Fallback: Determine best horizontal fit
      else {
        const spaceRight = vw - itemRect.right;
        const spaceLeft = itemRect.left;

        if (spaceRight >= spaceLeft) {
          left = vw - tw - MARGIN;
          top = itemRect.bottom + GAP; // Move below if squeezing on side
        } else {
          left = MARGIN;
          top = itemRect.bottom + GAP;
        }
      }

      // Vertical Adjustment (Clamping)
      // If the tooltip bottom goes off-screen
      if (top + th + MARGIN > vh) {
        // Align bottom of tooltip with bottom of viewport (minus margin)
        top = vh - th - MARGIN;
      }

      // If the tooltip top goes off-screen (after bottom adjustment or initially)
      if (top < MARGIN) {
        top = MARGIN;
      }

      setTooltipStyle({
        left: `${left}px`,
        top: `${top}px`,
        opacity: 1,
        visibility: 'visible'
      });
    };

    calculatePosition();

    // Recalculate on scroll/resize
    window.addEventListener('resize', calculatePosition);
    window.addEventListener('scroll', calculatePosition, true);

    return () => {
      window.removeEventListener('resize', calculatePosition);
      window.removeEventListener('scroll', calculatePosition, true);
    };
  }, [position, item]);

  if (!item) return null;

  // Fallback rarity priority: item -> metadata -> shop data
  const shopItem = SHOP_ITEM_DATA[item.itemId];
  const rarityKey = item.rarity || item.metadata?.rarity || shopItem?.rarity || 'common';
  const rarity = RARITY_COLORS[rarityKey] || RARITY_COLORS.common;

  const fallbackStats = (SHOP_ITEM_DATA[item.itemId]) ? SHOP_ITEM_DATA[item.itemId].stats : {};
  const itemStats = stats || item.metadata?.stats || item.stats || fallbackStats;

  return createPortal(
    <div
      ref={tooltipRef}
      className="fixed z-[9999] w-72 max-h-[calc(100vh-20px)] overflow-y-auto bg-slate-900 border-2 border-amber-500/60 rounded-xl p-4 shadow-2xl pointer-events-none custom-scrollbar"
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
                  lifesteal: { label: 'Hấp Huyết', color: 'text-red-300' },
                  regeneration: { label: 'Hồi Phục', color: 'text-teal-400' },
                  resistance: { label: 'Kháng Cự', color: 'text-emerald-400' },
                  luck: { label: 'Vận Khí', color: 'text-indigo-400' },
                  true_damage: { label: 'Sát Thương Chuẩn', color: 'text-red-200' },
                  buff_duration: { label: 'Thời Gian Buff', color: 'text-cyan-300' }
                };
                const statInfo = statLabels[stat] || { label: stat, color: 'text-slate-300' };

                let finalValue = value;
                let suffix = (stat === 'crit_rate' || stat === 'criticalRate' || stat === 'crit_damage' || stat === 'dodge' || stat === 'evasion' || stat === 'hit_rate') ? '%' : '';

                // Mounts, Pets và Techniques lưu stats dưới dạng số thập phân (VD: 0.15 = 15%)
                // Cần nhân 100 và thêm %
                if (['mount', 'pet', 'technique'].includes(item.type)) {
                  if (typeof value === 'number') {
                    // Kiểm tra nếu value <= 1 (để tránh nhân nhầm nếu đã là số nguyên)
                    // Tuy nhiên với mount/pet thì luôn là decimal
                    finalValue = Math.round(value * 100);
                    suffix = '%';
                  }
                }

                const displayValue = typeof finalValue === 'number'
                  ? (finalValue > 0 ? `+${finalValue.toLocaleString()}` : finalValue.toLocaleString())
                  : finalValue;

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

