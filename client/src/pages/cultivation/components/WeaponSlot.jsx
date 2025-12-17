/**
 * Weapon Slot Component - Display equipment slot
 */
import { memo, useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { RARITY_COLORS } from '../utils/constants.js';
import { getItemIcon, IMAGE_COMPONENTS } from '../utils/iconHelpers.js';
import { useCultivation } from '../../../hooks/useCultivation.jsx';

const WeaponSlot = memo(function WeaponSlot({ slotName, slotType, icon: Icon, iconColor, cultivation }) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [unequipping, setUnequipping] = useState(false);
  const [shouldAnimate, setShouldAnimate] = useState(false);
  const prevEquippedIdRef = useRef(null);
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

  return (
    <motion.div
      className={`relative bg-black/40 border-2 ${equippedWeapon ? rarity?.border || 'border-amber-500/30' : 'border-slate-700/50 border-dashed'} rounded-xl p-3 md:p-4 transition-all hover:scale-[1.02] hover:z-[100] group`}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
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
      <div className="text-center mb-2">
        <div className={`relative inline-flex items-center justify-center w-16 h-16 rounded-full bg-black/60 border ${equippedWeapon ? rarity?.border || 'border-amber-500/40' : 'border-slate-600/50'} mb-2 group-hover:border-amber-500/60 transition-colors overflow-hidden`}>
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
                <ItemIcon size={24} />
              ) : (
                <ItemIcon size={20} className={iconColor} />
              )
            ) : (
              <Icon size={20} className={`${iconColor} opacity-50`} />
            )}
          </div>
        </div>
        <p className="text-[10px] text-slate-400 uppercase tracking-[0.15em] font-medium">{slotName}</p>
      </div>

      {/* Weapon Info */}
      {equippedWeapon ? (
        <div className="space-y-2">
          <div className="text-center">
            <h4 className={`text-xs font-bold ${rarity?.text || 'text-amber-300'} mb-1 truncate`}>
              {equippedWeapon.name}
            </h4>
            {(equippedWeapon.rarity || equippedWeapon.metadata?.rarity) && (
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

          {/* Stats Bonuses - Hiển thị tất cả stats có giá trị */}
          {weaponStats && (
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

          {/* Nút Tháo trang bị */}
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
        </div>
      ) : (
        <div className="text-center py-2">
          <p className="text-[9px] text-slate-500 italic">Chưa trang bị</p>
        </div>
      )}

      {/* Hover Effect */}
      <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-amber-500/0 to-amber-500/0 group-hover:from-amber-500/5 group-hover:to-amber-500/5 transition-all pointer-events-none"></div>

      {/* Tooltip hiển thị chi tiết stats khi hover */}
      {showTooltip && equippedWeapon && weaponStats && (
        <div className="absolute z-50 left-full ml-3 top-0 w-72 bg-slate-900 border-2 border-amber-500/60 rounded-xl p-4 shadow-2xl">
          {/* Header với ảnh và tên */}
          <div className="flex items-start gap-3 mb-3 pb-3 border-b border-amber-500/40">
            {(equippedWeapon.metadata?.img || equippedWeapon.img) && (
              <img
                src={equippedWeapon.metadata?.img || equippedWeapon.img}
                alt={equippedWeapon.name}
                className="w-16 h-16 object-cover rounded-lg border-2 border-amber-500/50 shadow-lg"
              />
            )}
            <div className="flex-1 min-w-0">
              <h4 className={`text-base font-bold mb-1 ${rarity?.text || 'text-amber-300'}`}>
                {equippedWeapon.name}
              </h4>
              <div className="flex items-center gap-2 flex-wrap">
                {(equippedWeapon.metadata?.rarity || equippedWeapon.rarity) && (
                  <span className={`text-[10px] px-2 py-0.5 rounded ${rarity?.bg || 'bg-slate-800/50'} ${rarity?.text || 'text-slate-300'} border ${rarity?.border || 'border-slate-600'} font-semibold`}>
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
                {/* Hiển thị loại equipment */}
                {equippedWeapon.metadata?.equipmentType && (
                  <span className="text-[10px] px-2 py-0.5 rounded bg-slate-700/50 text-slate-300 border border-slate-600">
                    {equippedWeapon.metadata.equipmentType === 'weapon' ? 'Vũ Khí' :
                      equippedWeapon.metadata.equipmentType === 'magic_treasure' ? 'Pháp Bảo' :
                        equippedWeapon.metadata.equipmentType === 'armor' ? 'Giáp' :
                          equippedWeapon.metadata.equipmentType === 'accessory' ? 'Trang Sức' :
                            equippedWeapon.metadata.equipmentType === 'power_item' ? 'Linh Khí' :
                              equippedWeapon.metadata.equipmentType}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Thông số */}
          <div className="space-y-2">
            <p className="text-sm text-amber-400 font-bold mb-2 flex items-center gap-2">
              <span className="w-1 h-4 bg-amber-500 rounded"></span>
              Thông Số
            </p>
            <div className="space-y-1.5 bg-slate-800/30 rounded-lg p-2">
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
                  // Đảm bảo value là number trước khi format
                  const numValue = typeof value === 'number' ? value : (typeof value === 'string' ? parseFloat(value) : 0);
                  const displayValue = numValue > 0 ? `+${numValue.toLocaleString()}` : numValue.toLocaleString();
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

            {/* Hiển thị elemental damage nếu có */}
            {weaponStats.elemental_damage && Object.keys(weaponStats.elemental_damage).length > 0 && (
              <div className="pt-3 mt-3 border-t border-amber-500/30">
                <p className="text-sm text-amber-400 font-bold mb-2 flex items-center gap-2">
                  <span className="w-1 h-4 bg-amber-500 rounded"></span>
                  Sát Thương Thuộc Tính
                </p>
                <div className="space-y-1.5 bg-slate-800/30 rounded-lg p-2">
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

            {/* Hiển thị special effect nếu có */}
            {(equippedWeapon.metadata?.special_effect || equippedWeapon.special_effect) && (
              <div className="pt-3 mt-3 border-t border-amber-500/30">
                <p className="text-sm text-amber-400 font-bold mb-2 flex items-center gap-2">
                  <span className="w-1 h-4 bg-amber-500 rounded"></span>
                  Hiệu Ứng Đặc Biệt
                </p>
                <p className="text-sm text-slate-300 italic leading-relaxed bg-slate-800/30 rounded-lg p-2">
                  {equippedWeapon.metadata?.special_effect || equippedWeapon.special_effect}
                </p>
              </div>
            )}

            {/* Hiển thị level requirement nếu có */}
            {(equippedWeapon.metadata?.level_required || equippedWeapon.level_required) && (
              <div className="pt-2 mt-2 text-xs text-slate-400">
                Cấp Yêu Cầu: <span className="text-amber-400 font-semibold">{equippedWeapon.metadata?.level_required || equippedWeapon.level_required}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
});

export default WeaponSlot;

