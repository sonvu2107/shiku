/**
 * Weapon Slot Component - Display equipment slot
 */
import { memo, useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { RARITY_COLORS } from '../utils/constants.js';
import { getItemIcon, IMAGE_COMPONENTS } from '../utils/iconHelpers.js';
import { useCultivation } from '../../../hooks/useCultivation.jsx';

const WeaponSlot = memo(function WeaponSlot({ slotName, slotType, icon: Icon, iconColor, cultivation, compact = false }) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [unequipping, setUnequipping] = useState(false);
  const [shouldAnimate, setShouldAnimate] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const prevEquippedIdRef = useRef(null);
  const slotRef = useRef(null);
  const { unequipEquipment } = useCultivation();

  // Map slotType to equipped slot names (direct mapping)
  const equippedSlotName = slotType;
  const equippedId = cultivation?.equipped?.[equippedSlotName];

  // Tìm equipment trong inventory dựa trên equipped slot
  // equippedId có thể là ObjectId object hoặc string
  const equippedWeapon = equippedId
    ? cultivation?.inventory?.find(item => {
      // Convert tất cả về string để so sánh
      const itemIdStr = item.itemId?.toString() || item.itemId;
      const equippedIdStr = equippedId?.toString?.() || equippedId?.toString() || String(equippedId);

      // So sánh trực tiếp
      if (itemIdStr === equippedIdStr) return true;

      // So sánh với metadata._id
      if (item.metadata?._id) {
        const metadataIdStr = item.metadata._id?.toString?.() || item.metadata._id?.toString() || String(item.metadata._id);
        if (metadataIdStr === equippedIdStr) return true;
      }

      // So sánh với _id nếu có
      if (item._id) {
        const itemIdStr2 = item._id?.toString?.() || item._id?.toString() || String(item._id);
        if (itemIdStr2 === equippedIdStr) return true;
      }

      return false;
    })
    : null;

  const rarity = equippedWeapon
    ? (RARITY_COLORS[equippedWeapon.rarity || equippedWeapon.metadata?.rarity] || RARITY_COLORS.common)
    : null;
  const ItemIcon = equippedWeapon ? getItemIcon(equippedWeapon) : null;

  // Tính toán stats bonus từ equipment
  const getWeaponStats = () => {
    if (!equippedWeapon) return null;
    // Ưu tiên metadata.stats, sau đó stats trực tiếp
    const stats = equippedWeapon.metadata?.stats || equippedWeapon.stats || null;
    // Đảm bảo stats là object hợp lệ
    if (stats && typeof stats === 'object' && !Array.isArray(stats)) {
      return stats;
    }
    return null;
  };

  const weaponStats = getWeaponStats();

  // Detect equipment changes và trigger animation
  useEffect(() => {
    const currentEquippedId = equippedWeapon?.itemId?.toString() ||
      equippedWeapon?.metadata?._id?.toString() ||
      equippedWeapon?._id?.toString() ||
      null;

    if (currentEquippedId && currentEquippedId !== prevEquippedIdRef.current) {
      // Equipment đã thay đổi - trigger animation
      setShouldAnimate(true);
      prevEquippedIdRef.current = currentEquippedId;

      // Reset animation flag sau khi animation hoàn thành
      const timer = setTimeout(() => {
        setShouldAnimate(false);
      }, 500);

      return () => clearTimeout(timer);
    } else if (!currentEquippedId) {
      prevEquippedIdRef.current = null;
    }
  }, [equippedWeapon]);

  // Compact mode styles
  const containerClass = compact
    ? `relative bg-black/40 border ${equippedWeapon ? rarity?.border || 'border-amber-500/30' : 'border-slate-700/50 border-dashed'} rounded-lg p-2 transition-all hover:scale-[1.02] hover:z-[100] group overflow-hidden`
    : `relative bg-black/40 border-2 ${equippedWeapon ? rarity?.border || 'border-amber-500/30' : 'border-slate-700/50 border-dashed'} rounded-xl p-3 md:p-4 transition-all hover:scale-[1.02] hover:z-[100] group overflow-hidden`;

  const iconContainerClass = compact
    ? `relative inline-flex items-center justify-center w-10 h-10 lg:w-12 lg:h-12 rounded-lg bg-black/60 border ${equippedWeapon ? rarity?.border || 'border-amber-500/40' : 'border-slate-600/50'} mb-1 group-hover:border-amber-500/60 transition-colors overflow-hidden`
    : `relative inline-flex items-center justify-center w-16 h-16 rounded-full bg-black/60 border ${equippedWeapon ? rarity?.border || 'border-amber-500/40' : 'border-slate-600/50'} mb-2 group-hover:border-amber-500/60 transition-colors overflow-hidden`;

  const iconSize = compact ? 14 : 20;

  // Calculate tooltip position based on slot element
  const updateTooltipPosition = () => {
    if (slotRef.current) {
      const rect = slotRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const tooltipWidth = 300; // max-w-xs (~320px) 
      const tooltipMaxHeight = Math.min(400, viewportHeight * 0.7);
      const margin = 12;

      // Horizontal position: try right first, then left, then center
      let left;
      const spaceOnRight = viewportWidth - rect.right - margin;
      const spaceOnLeft = rect.left - margin;

      if (spaceOnRight >= tooltipWidth) {
        // Enough space on right
        left = rect.right + margin;
      } else if (spaceOnLeft >= tooltipWidth) {
        // Enough space on left
        left = rect.left - tooltipWidth - margin;
      } else {
        // Center horizontally
        left = Math.max(margin, (viewportWidth - tooltipWidth) / 2);
      }

      // Ensure left doesn't go off screen
      left = Math.max(margin, Math.min(left, viewportWidth - tooltipWidth - margin));

      // Vertical position: try to align with slot, but keep within viewport
      let top = rect.top;

      // If tooltip would go below viewport, move it up
      if (top + tooltipMaxHeight > viewportHeight - margin) {
        top = viewportHeight - tooltipMaxHeight - margin;
      }

      // Ensure top doesn't go above viewport
      top = Math.max(margin, top);

      setTooltipPosition({ top, left });
    }
  };

  return (
    <motion.div
      ref={slotRef}
      className={containerClass}
      onMouseEnter={() => {
        // Only hover on desktop
        if (window.innerWidth >= 768 && equippedWeapon && weaponStats) {
          updateTooltipPosition();
          setShowTooltip(true);
        }
      }}
      onMouseLeave={() => {
        // Only hover-hide on desktop
        if (window.innerWidth >= 768) {
          setShowTooltip(false);
        }
      }}
      onClick={(e) => {
        // Click to toggle on mobile, or click to show on desktop
        if (equippedWeapon && weaponStats) {
          e.stopPropagation();
          updateTooltipPosition();
          if (window.innerWidth < 768) {
            // Mobile: toggle on click
            setShowTooltip(prev => !prev);
          }
        }
      }}
      initial={false}
      animate={shouldAnimate && equippedWeapon ? {
        scale: [1, 1.05, 1],
        boxShadow: [
          '0 0 0px rgba(245,158,11,0)',
          '0 0 20px rgba(245,158,11,0.5)',
          '0 0 0px rgba(245,158,11,0)'
        ]
      } : {}}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      {/* Slot Header */}
      <div className="text-center mb-1">
        <div className={iconContainerClass}>
          {/* Hiển thị ảnh equipment */}
          {(equippedWeapon?.metadata?.img || equippedWeapon?.img) ? (
            <img
              src={equippedWeapon.metadata?.img || equippedWeapon.img}
              alt={equippedWeapon.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
          ) : null}
          {/* Fallback icon */}
          <div className={`absolute inset-0 flex items-center justify-center ${(equippedWeapon?.metadata?.img || equippedWeapon?.img) ? 'hidden' : ''}`}>
            {equippedWeapon && ItemIcon ? (
              IMAGE_COMPONENTS.includes(ItemIcon) ? (
                <ItemIcon size={compact ? 18 : 24} />
              ) : (
                <ItemIcon size={iconSize} className={iconColor} />
              )
            ) : (
              <Icon size={iconSize} className={`${iconColor} opacity-50`} />
            )}
          </div>
        </div>
        <p className={`${compact ? 'text-[8px]' : 'text-[10px]'} text-slate-400 uppercase tracking-wider font-medium truncate`}>{slotName}</p>
      </div>

      {/* Weapon Info - Compact mode only shows name */}
      {equippedWeapon ? (
        <div className={compact ? "text-center" : "space-y-2"}>
          <div className="text-center">
            <h4 className={`${compact ? 'text-[9px]' : 'text-xs'} font-bold ${rarity?.text || 'text-amber-300'} truncate leading-tight`}>
              {equippedWeapon.name}
            </h4>
            {!compact && (equippedWeapon.rarity || equippedWeapon.metadata?.rarity) && (
              <span className={`text-[9px] px-1.5 py-0.5 rounded ${rarity?.bg || 'bg-slate-800/50'} ${rarity?.text || 'text-slate-300'} border ${rarity?.border || 'border-slate-600'}`}>
                {(() => {
                  const rarityValue = equippedWeapon.rarity || equippedWeapon.metadata?.rarity;
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
          </div>

          {/* Stats Bonuses - Only show in non-compact mode */}
          {!compact && weaponStats && (
            <div className="space-y-1 pt-2 border-t border-white/10">
              {Object.entries(weaponStats)
                .filter(([key, value]) => {
                  // Bỏ qua elemental_damage (là object/Map)
                  if (key === 'elemental_damage') return false;
                  // Chỉ hiển thị stats có giá trị > 0 và là number (không phải object/array)
                  return value != null &&
                    value !== 0 &&
                    typeof value === 'number' &&
                    !isNaN(value) &&
                    isFinite(value);
                })
                .slice(0, 5) // Hiển thị tối đa 5 stats đầu tiên
                .map(([stat, value]) => {
                  const statLabels = {
                    attack: { label: 'Tấn Công', color: 'text-red-300' },
                    defense: { label: 'Phòng Thủ', color: 'text-blue-300' },
                    hp: { label: 'Khí Huyết', color: 'text-green-300' },
                    qiBlood: { label: 'Khí Huyết', color: 'text-pink-300' },
                    zhenYuan: { label: 'Chân Nguyên', color: 'text-purple-300' },
                    speed: { label: 'Tốc Độ', color: 'text-cyan-300' },
                    crit_rate: { label: 'Chí Mạng', color: 'text-yellow-300' },
                    criticalRate: { label: 'Chí Mạng', color: 'text-yellow-300' },
                    crit_damage: { label: 'Sát Thương Chí Mạng', color: 'text-yellow-400' },
                    dodge: { label: 'Né Tránh', color: 'text-green-300' },
                    evasion: { label: 'Né Tránh', color: 'text-green-300' },
                    penetration: { label: 'Xuyên Thấu', color: 'text-orange-300' },
                    resistance: { label: 'Kháng Cự', color: 'text-teal-300' },
                    luck: { label: 'Vận Khí', color: 'text-indigo-300' }
                  };
                  const statInfo = statLabels[stat] || { label: stat, color: 'text-slate-300' };
                  // Đảm bảo value là number trước khi format
                  const numValue = typeof value === 'number' ? value : (typeof value === 'string' ? parseFloat(value) : 0);
                  const displayValue = numValue > 0 ? `+${numValue.toLocaleString()}` : numValue.toLocaleString();
                  const suffix = (stat === 'crit_rate' || stat === 'criticalRate' || stat === 'crit_damage' || stat === 'dodge' || stat === 'evasion') ? '%' : '';

                  return (
                    <div key={stat} className="flex justify-between items-center text-[9px]">
                      <span className="text-slate-400 truncate">{statInfo.label}:</span>
                      <span className={`font-mono font-bold ${statInfo.color}`}>
                        {displayValue}{suffix}
                      </span>
                    </div>
                  );
                })}
            </div>
          )}

          {/* Nút Tháo trang bị - Only show in non-compact mode */}
          {!compact && (
            <motion.button
              onClick={async (e) => {
                e.stopPropagation();
                setUnequipping(true);
                try {
                  await unequipEquipment(slotType);
                } catch (error) {
                  console.error('Error unequipping:', error);
                } finally {
                  setUnequipping(false);
                }
              }}
              disabled={unequipping}
              className="w-full mt-2 px-3 py-1.5 bg-red-900/30 hover:bg-red-800/50 border border-red-500/30 text-red-300 rounded-lg text-xs font-bold uppercase transition-all disabled:opacity-50"
              whileTap={{ scale: 0.95 }}
            >
              {unequipping ? 'Đang tháo...' : 'Tháo'}
            </motion.button>
          )}
        </div>
      ) : (
        <div className={`text-center ${compact ? 'py-0.5' : 'py-2'}`}>
          <p className={`${compact ? 'text-[7px]' : 'text-[9px]'} text-slate-500 italic`}>{compact ? 'Trống' : 'Chưa trang bị'}</p>
        </div>
      )}

      {/* Hover Effect */}
      <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-amber-500/0 to-amber-500/0 group-hover:from-amber-500/5 group-hover:to-amber-500/5 transition-all pointer-events-none"></div>

      {/* Tooltip Modal - Using Portal to render outside component tree */}
      {showTooltip && equippedWeapon && weaponStats && createPortal(
        <>
          {/* Backdrop - only on mobile */}
          <div
            className="fixed inset-0 bg-black/50 z-[9998] md:hidden"
            onClick={() => setShowTooltip(false)}
          />

          {/* Tooltip Content */}
          <div
            className={`fixed z-[9999] 
              ${window.innerWidth < 768 ? 'left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100vw-32px)]' : 'w-[300px]'}
              max-w-xs max-h-[80vh] md:max-h-[400px] overflow-y-auto
              bg-slate-900/95 backdrop-blur-sm
              border-2 border-amber-500/60 
              rounded-xl p-3 md:p-4 
              shadow-2xl`}
            style={window.innerWidth >= 768 ? {
              left: `${tooltipPosition.left}px`,
              top: `${tooltipPosition.top}px`,
            } : {}}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
              onClick={() => setShowTooltip(false)}
            >
              ✕
            </button>

            {/* Header với ảnh và tên */}
            <div className="flex items-start gap-2 md:gap-3 mb-2 md:mb-3 pb-2 md:pb-3 border-b border-amber-500/40">
              {(equippedWeapon.metadata?.img || equippedWeapon.img) && (
                <img
                  src={equippedWeapon.metadata?.img || equippedWeapon.img}
                  alt={equippedWeapon.name}
                  className="w-12 h-12 md:w-14 md:h-14 object-cover rounded-lg border-2 border-amber-500/50 shadow-lg flex-shrink-0"
                />
              )}
              <div className="flex-1 min-w-0 pr-6 md:pr-0">
                <h4 className={`text-sm md:text-base font-bold mb-1 ${rarity?.text || 'text-amber-300'} truncate`}>
                  {equippedWeapon.name}
                </h4>
                <div className="flex items-center gap-1 md:gap-2 flex-wrap">
                  {(equippedWeapon.metadata?.rarity || equippedWeapon.rarity) && (
                    <span className={`text-[9px] md:text-[10px] px-1.5 md:px-2 py-0.5 rounded ${rarity?.bg || 'bg-slate-800/50'} ${rarity?.text || 'text-slate-300'} border ${rarity?.border || 'border-slate-600'} font-semibold`}>
                      {(() => {
                        const rarityValue = equippedWeapon.rarity || equippedWeapon.metadata?.rarity;
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
                </div>
              </div>
            </div>

            {/* Thông số */}
            <div className="space-y-2">
              <p className="text-xs md:text-sm text-amber-400 font-bold flex items-center gap-2">
                <span className="w-1 h-3 md:h-4 bg-amber-500 rounded"></span>
                Thông Số
              </p>
              <div className="space-y-1 bg-slate-800/30 rounded-lg p-2">
                {Object.entries(weaponStats)
                  .filter(([key, value]) => {
                    if (key === 'elemental_damage') return false;
                    return value != null &&
                      value !== 0 &&
                      typeof value === 'number' &&
                      !isNaN(value) &&
                      isFinite(value);
                  })
                  .slice(0, 8)
                  .map(([stat, value]) => {
                    const statLabels = {
                      attack: { label: 'Tấn Công', color: 'text-red-400' },
                      defense: { label: 'Phòng Thủ', color: 'text-blue-400' },
                      hp: { label: 'Khí Huyết', color: 'text-green-400' },
                      qiBlood: { label: 'Khí Huyết', color: 'text-pink-400' },
                      zhenYuan: { label: 'Chân Nguyên', color: 'text-purple-400' },
                      speed: { label: 'Tốc Độ', color: 'text-cyan-400' },
                      crit_rate: { label: 'Chí Mạng', color: 'text-yellow-400' },
                      criticalRate: { label: 'Chí Mạng', color: 'text-yellow-400' },
                      crit_damage: { label: 'ST Chí Mạng', color: 'text-yellow-300' },
                      penetration: { label: 'Xuyên Thấu', color: 'text-orange-400' },
                      evasion: { label: 'Né Tránh', color: 'text-green-400' },
                      dodge: { label: 'Né Tránh', color: 'text-green-400' },
                      hit_rate: { label: 'Chính Xác', color: 'text-blue-300' },
                      energy_regen: { label: 'Hồi Phục', color: 'text-purple-300' },
                      lifesteal: { label: 'Hút Máu', color: 'text-red-300' }
                    };
                    const statInfo = statLabels[stat] || { label: stat, color: 'text-slate-300' };
                    const numValue = typeof value === 'number' ? value : parseFloat(value) || 0;
                    const displayValue = numValue > 0 ? `+${numValue.toLocaleString()}` : numValue.toLocaleString();
                    const suffix = (stat === 'crit_rate' || stat === 'criticalRate' || stat === 'crit_damage' || stat === 'dodge' || stat === 'evasion' || stat === 'hit_rate') ? '%' : '';

                    return (
                      <div key={stat} className="flex justify-between items-center text-xs md:text-sm py-0.5">
                        <span className="text-slate-300">{statInfo.label}:</span>
                        <span className={`font-mono font-bold ${statInfo.color}`}>
                          {displayValue}{suffix}
                        </span>
                      </div>
                    );
                  })}
              </div>

              {/* Elemental damage */}
              {weaponStats.elemental_damage && Object.keys(weaponStats.elemental_damage).length > 0 && (
                <div className="pt-2 border-t border-amber-500/30">
                  <p className="text-xs md:text-sm text-amber-400 font-bold mb-1 flex items-center gap-2">
                    <span className="w-1 h-3 md:h-4 bg-amber-500 rounded"></span>
                    Thuộc Tính
                  </p>
                  <div className="space-y-1 bg-slate-800/30 rounded-lg p-2">
                    {Object.entries(weaponStats.elemental_damage)
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
                          <div key={element} className="flex justify-between items-center text-xs md:text-sm py-0.5">
                            <span className="text-slate-300">{elementInfo.label}:</span>
                            <span className={`font-mono font-bold ${elementInfo.color}`}>
                              +{value.toLocaleString()}
                            </span>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* Special effect */}
              {(equippedWeapon.metadata?.special_effect || equippedWeapon.special_effect) && (
                <div className="pt-2 border-t border-amber-500/30">
                  <p className="text-xs md:text-sm text-amber-400 font-bold mb-1">Đặc Biệt</p>
                  <p className="text-xs text-slate-300 italic bg-slate-800/30 rounded-lg p-2 leading-relaxed">
                    {equippedWeapon.metadata?.special_effect || equippedWeapon.special_effect}
                  </p>
                </div>
              )}
            </div>
          </div>
        </>,
        document.body
      )}
    </motion.div>
  );
});

export default WeaponSlot;

