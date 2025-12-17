/**
 * Inventory Tab - Display and manage inventory items
 */
import { useState, memo } from 'react';
import { motion } from 'framer-motion';
import { useCultivation } from '../../../hooks/useCultivation.jsx';
import { RARITY_COLORS } from '../utils/constants.js';
import { getItemIcon, IMAGE_COMPONENTS, ITEM_TYPE_LABELS } from '../utils/iconHelpers.js';
import LoadingSkeleton from './LoadingSkeleton.jsx';
import ItemTooltip from './ItemTooltip.jsx';

const InventoryTab = memo(function InventoryTab() {
  const { cultivation, equip, unequip, equipEquipment, unequipEquipment, useItem, loading } = useCultivation();
  const [equipping, setEquipping] = useState(null);
  const [activeCategory, setActiveCategory] = useState('all');
  const [hoveredItem, setHoveredItem] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  const handleMouseEnter = (item, e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltipPosition({
      x: rect.right,
      y: rect.top,
      left: rect.left,
      right: rect.right,
      top: rect.top,
      bottom: rect.bottom
    });
    setHoveredItem(item);
  };

  const handleMouseLeave = () => {
    setHoveredItem(null);
  };

  const handleEquip = async (item, isEquipped) => {
    setEquipping(item.itemId);
    try {
      // Nếu là equipment, dùng equipEquipment/unequipEquipment
      if (item.type?.startsWith('equipment_')) {
        const equipmentType = item.metadata?.equipmentType || item.type.replace('equipment_', '');
        let slot = null;

        // Xác định slot dựa trên equipment type và subtype
        if (equipmentType === 'weapon') {
          slot = 'weapon';
        } else if (equipmentType === 'magic_treasure') {
          slot = 'magicTreasure';
        } else if (equipmentType === 'armor') {
          const subtype = item.metadata?.subtype;
          if (subtype === 'helmet') slot = 'helmet';
          else if (subtype === 'chest') slot = 'chest';
          else if (subtype === 'shoulder') slot = 'shoulder';
          else if (subtype === 'gloves') slot = 'gloves';
          else if (subtype === 'boots') slot = 'boots';
          else if (subtype === 'belt') slot = 'belt';
        } else if (equipmentType === 'accessory') {
          const subtype = item.metadata?.subtype;
          if (subtype === 'ring') slot = 'ring';
          else if (subtype === 'necklace') slot = 'necklace';
          else if (subtype === 'earring') slot = 'earring';
          else if (subtype === 'bracelet') slot = 'bracelet';
          else slot = 'ring'; // Default to ring
        } else if (equipmentType === 'power_item') {
          slot = 'powerItem';
        }

        if (isEquipped) {
          // Unequip từ slot
          await unequipEquipment(slot);
        } else {
          // Equip vào slot
          const equipmentId = item.metadata?._id || item.itemId;
          await equipEquipment(equipmentId, slot);
        }
      } else {
        // Các item thông thường (title, badge, etc.)
        if (isEquipped) {
          await unequip(item.itemId);
        } else {
          await equip(item.itemId);
        }
      }
    } finally {
      setEquipping(null);
    }
  };

  const handleUse = async (itemId) => {
    setEquipping(itemId);
    try {
      if (useItem) {
        await useItem(itemId);
      }
    } finally {
      setEquipping(null);
    }
  };

  if (loading || !cultivation) {
    return <LoadingSkeleton />;
  }

  const inventory = cultivation.inventory || [];
  const equipped = cultivation.equipped || {};

  // Group items by type
  const categories = [
    { id: 'all', label: 'Tất cả', icon: null },
    { id: 'equipment_weapon', label: 'Vũ Khí', icon: null },
    { id: 'equipment_armor', label: 'Giáp', icon: null },
    { id: 'equipment_accessory', label: 'Trang Sức', icon: null },
    { id: 'equipment_magic_treasure', label: 'Pháp Bảo', icon: null },
    { id: 'equipment_power_item', label: 'Linh Khí', icon: null },
    { id: 'title', label: 'Danh Hiệu', icon: null },
    { id: 'badge', label: 'Huy Hiệu', icon: null },
    { id: 'avatar_frame', label: 'Khung Avatar', icon: null },
    { id: 'profile_effect', label: 'Hiệu Ứng', icon: null },
    { id: 'exp_boost', label: 'Đan Dược', icon: null },
    { id: 'consumable', label: 'Vật Phẩm', icon: null },
    { id: 'pet', label: 'Linh Thú', icon: null },
    { id: 'mount', label: 'Tọa Kỵ', icon: null }
  ];

  const filteredItems = activeCategory === 'all'
    ? inventory
    : inventory.filter(item => {
      if (activeCategory.startsWith('equipment_')) {
        return item.type === activeCategory;
      }
      return item.type === activeCategory;
    });

  // Check if item is equipped
  const isItemEquipped = (item) => {
    if (item.type === 'title') return equipped.title === item.itemId;
    if (item.type === 'badge') return equipped.badge === item.itemId;
    if (item.type === 'avatar_frame') return equipped.avatarFrame === item.itemId;
    if (item.type === 'profile_effect') return equipped.profileEffect === item.itemId;

    // Check equipment slots
    if (item.type?.startsWith('equipment_')) {
      const equipmentType = item.metadata?.equipmentType || item.type.replace('equipment_', '');
      // So sánh với cả itemId và metadata._id
      const itemIdStr = item.itemId?.toString() || String(item.itemId);
      const metadataIdStr = item.metadata?._id?.toString?.() || item.metadata?._id?.toString() || String(item.metadata?._id || '');

      // Helper function để so sánh ID
      const compareId = (equippedId) => {
        if (!equippedId) return false;
        const equippedIdStr = equippedId?.toString?.() || equippedId?.toString() || String(equippedId);
        return equippedIdStr === itemIdStr || equippedIdStr === metadataIdStr;
      };

      // Map equipment types to equipped slots
      if (equipmentType === 'weapon') return compareId(equipped.weapon);
      if (equipmentType === 'magic_treasure') return compareId(equipped.magicTreasure);
      if (equipmentType === 'armor') {
        const subtype = item.metadata?.subtype;
        if (subtype === 'helmet') return compareId(equipped.helmet);
        if (subtype === 'chest') return compareId(equipped.chest);
        if (subtype === 'shoulder') return compareId(equipped.shoulder);
        if (subtype === 'gloves') return compareId(equipped.gloves);
        if (subtype === 'boots') return compareId(equipped.boots);
        if (subtype === 'belt') return compareId(equipped.belt);
      }
      if (equipmentType === 'accessory') {
        const subtype = item.metadata?.subtype;
        if (subtype === 'ring') return compareId(equipped.ring);
        if (subtype === 'necklace') return compareId(equipped.necklace);
        if (subtype === 'earring') return compareId(equipped.earring);
        if (subtype === 'bracelet') return compareId(equipped.bracelet);
      }
      if (equipmentType === 'power_item') return compareId(equipped.powerItem);
    }

    return item.equipped;
  };

  // Check if item is consumable (can be used)
  const isConsumable = (type) => ['exp_boost', 'consumable'].includes(type);

  return (
    <div className="space-y-3 pb-2">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-gold font-title tracking-wide text-xl lg:text-2xl">TÚI ĐỒ</h3>
        <span className="text-sm text-slate-400">
          {inventory.length} vật phẩm
        </span>
      </div>

      {/* Equipped Items Summary */}
      {(equipped.title || equipped.badge || equipped.avatarFrame || equipped.profileEffect ||
        equipped.weapon || equipped.magicTreasure || equipped.helmet || equipped.chest ||
        equipped.shoulder || equipped.gloves || equipped.boots || equipped.belt ||
        equipped.ring || equipped.necklace || equipped.earring || equipped.bracelet || equipped.powerItem) && (
          <div className="bg-gradient-to-r from-emerald-900/20 to-teal-900/20 border border-emerald-500/30 rounded-xl p-3">
            <p className="text-xs text-emerald-400 mb-2 uppercase tracking-wider">Đang trang bị</p>
            <div className="flex flex-wrap gap-2">
              {equipped.title && (
                <span className="px-2 py-1 bg-amber-900/30 border border-amber-500/30 rounded text-xs text-amber-300">
                  {inventory.find(i => i.itemId === equipped.title)?.name || equipped.title}
                </span>
              )}
              {equipped.badge && (
                <span className="px-2 py-1 bg-cyan-900/30 border border-cyan-500/30 rounded text-xs text-cyan-300">
                  {inventory.find(i => i.itemId === equipped.badge)?.name || equipped.badge}
                </span>
              )}
              {equipped.avatarFrame && (
                <span className="px-2 py-1 bg-purple-900/30 border border-purple-500/30 rounded text-xs text-purple-300">
                  {inventory.find(i => i.itemId === equipped.avatarFrame)?.name || equipped.avatarFrame}
                </span>
              )}
              {equipped.profileEffect && (
                <span className="px-2 py-1 bg-pink-900/30 border border-pink-500/30 rounded text-xs text-pink-300">
                  {inventory.find(i => i.itemId === equipped.profileEffect)?.name || equipped.profileEffect}
                </span>
              )}
              {/* Equipment items */}
              {equipped.weapon && (
                <span className="px-2 py-1 bg-red-900/30 border border-red-500/30 rounded text-xs text-red-300">
                  {inventory.find(i => i.itemId === equipped.weapon?.toString())?.name || 'Vũ Khí'}
                </span>
              )}
              {equipped.magicTreasure && (
                <span className="px-2 py-1 bg-blue-900/30 border border-blue-500/30 rounded text-xs text-blue-300">
                  {inventory.find(i => i.itemId === equipped.magicTreasure?.toString())?.name || 'Pháp Bảo'}
                </span>
              )}
              {equipped.helmet && (
                <span className="px-2 py-1 bg-slate-700/30 border border-slate-500/30 rounded text-xs text-slate-300">
                  {inventory.find(i => i.itemId === equipped.helmet?.toString())?.name || 'Mũ'}
                </span>
              )}
              {equipped.chest && (
                <span className="px-2 py-1 bg-slate-700/30 border border-slate-500/30 rounded text-xs text-slate-300">
                  {inventory.find(i => i.itemId === equipped.chest?.toString())?.name || 'Giáp Ngực'}
                </span>
              )}
              {equipped.ring && (
                <span className="px-2 py-1 bg-yellow-900/30 border border-yellow-500/30 rounded text-xs text-yellow-300">
                  {inventory.find(i => i.itemId === equipped.ring?.toString())?.name || 'Nhẫn'}
                </span>
              )}
              {equipped.necklace && (
                <span className="px-2 py-1 bg-yellow-900/30 border border-yellow-500/30 rounded text-xs text-yellow-300">
                  {inventory.find(i => i.itemId === equipped.necklace?.toString())?.name || 'Dây Chuyền'}
                </span>
              )}
              {equipped.powerItem && (
                <span className="px-2 py-1 bg-purple-900/30 border border-purple-500/30 rounded text-xs text-purple-300">
                  {inventory.find(i => i.itemId === equipped.powerItem?.toString())?.name || 'Linh Khí'}
                </span>
              )}
            </div>
          </div>
        )}

      {/* Category Filter - Horizontal scroll on mobile */}
      <div className="-mx-4 px-4 sm:mx-0 sm:px-0 overflow-x-auto pb-2 scrollbar-hide">
        <div className="flex gap-2 min-w-max sm:flex-wrap sm:min-w-0">
          {categories.map(cat => {
            const count = cat.id === 'all' ? inventory.length : inventory.filter(i => i.type === cat.id).length;
            if (count === 0 && cat.id !== 'all') return null;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${activeCategory === cat.id
                  ? 'bg-emerald-600/30 border border-emerald-500/50 text-emerald-300'
                  : 'bg-slate-800/50 border border-slate-700 text-slate-400 hover:text-slate-300'
                  }`}
              >
                {cat.icon && <span className="mr-1.5 inline-flex items-center">{cat.icon}</span>}
                {cat.label}
                {count > 0 && <span className="ml-1 opacity-60">({count})</span>}
              </button>
            );
          })}
        </div>
      </div>

      {filteredItems.length === 0 ? (
        <div className="h-48 flex flex-col items-center justify-center text-slate-500 opacity-50">
          <span className="text-4xl mb-2"></span>
          <p className="text-xs uppercase tracking-widest">
            {activeCategory === 'all' ? 'Túi trống rỗng' : 'Không có vật phẩm loại này'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filteredItems.map((item, index) => {
            const rarity = RARITY_COLORS[item.rarity] || RARITY_COLORS.common;
            const typeInfo = ITEM_TYPE_LABELS[item.type] || { label: 'Khác', color: 'text-slate-300' };
            const equipped = isItemEquipped(item);
            const consumable = isConsumable(item.type);
            const ItemIcon = getItemIcon(item);

            return (
              <div
                key={item._id || `${item.itemId}-${index}`}
                className={`relative rounded-xl p-4 flex justify-between items-center transition-all border ${equipped
                  ? 'bg-emerald-900/30 border-emerald-500/50 ring-1 ring-emerald-500/30'
                  : `${rarity.bg} ${rarity.border}`
                  } hover:scale-[1.02] hover:z-50`}
                onMouseEnter={(e) => handleMouseEnter(item, e)}
                onMouseLeave={handleMouseLeave}
                onMouseMove={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  setTooltipPosition({
                    x: rect.right,
                    y: rect.top,
                    left: rect.left,
                    right: rect.right,
                    top: rect.top,
                    bottom: rect.bottom
                  });
                }}
              >
                <div className="flex items-start gap-3 flex-1 mr-3">
                  <div className="relative w-10 h-10 rounded-full bg-black border border-amber-500/40 flex items-center justify-center shadow-[0_0_8px_rgba(245,158,11,0.25)] overflow-hidden">
                    {(item.metadata?.img || item.img) ? (
                      <img
                        src={item.metadata?.img || item.img}
                        alt={item.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    ) : null}
                    <div className={`absolute inset-0 flex items-center justify-center ${(item.metadata?.img || item.img) ? 'hidden' : ''}`}>
                      {IMAGE_COMPONENTS.includes(ItemIcon) ? (
                        <ItemIcon size={28} />
                      ) : (
                        <ItemIcon size={20} className="text-amber-300" />
                      )}
                    </div>
                    {equipped && (
                      <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full flex items-center justify-center text-[8px] z-10">✓</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h4 className={`font-bold text-sm ${equipped ? 'text-emerald-300' : rarity.text}`}>
                        {item.name}
                      </h4>
                      <span className="bg-slate-700/50 text-slate-300 text-[10px] px-1.5 py-0.5 rounded font-mono">
                        x{item.quantity || 1}
                      </span>
                      {equipped && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          Đang dùng
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 leading-tight">{item.description || item.metadata?.description || ''}</p>
                    {/* Hiển thị stats cho equipment */}
                    {item.type?.startsWith('equipment_') && (item.metadata?.stats || item.stats) && (() => {
                      const stats = item.metadata?.stats || item.stats || {};
                      const statLabels = {
                        attack: { label: 'Tấn Công', color: 'text-red-400' },
                        defense: { label: 'Phòng Thủ', color: 'text-blue-400' },
                        hp: { label: 'Khí Huyết', color: 'text-green-400' },
                        qiBlood: { label: 'Khí Huyết', color: 'text-pink-400' },
                        zhenYuan: { label: 'Chân Nguyên', color: 'text-purple-400' },
                        speed: { label: 'Tốc Độ', color: 'text-cyan-400' },
                        crit_rate: { label: 'Chí Mạng', color: 'text-yellow-400' },
                        criticalRate: { label: 'Chí Mạng', color: 'text-yellow-400' },
                        crit_damage: { label: 'Sát Thương Chí Mạng', color: 'text-yellow-300' },
                        dodge: { label: 'Né Tránh', color: 'text-green-400' },
                        evasion: { label: 'Né Tránh', color: 'text-green-400' },
                        penetration: { label: 'Xuyên Thấu', color: 'text-orange-400' },
                        hit_rate: { label: 'Chính Xác', color: 'text-blue-300' },
                        resistance: { label: 'Kháng Cự', color: 'text-teal-400' },
                        luck: { label: 'Vận Khí', color: 'text-indigo-400' }
                      };

                      const statsToShow = Object.entries(stats)
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
                        .slice(0, 5); // Hiển thị tối đa 5 stats đầu tiên

                      if (statsToShow.length === 0) return null;

                      return (
                        <div className="text-[10px] text-slate-400 mt-1 space-y-0.5">
                          {statsToShow.map(([stat, value]) => {
                            const statInfo = statLabels[stat] || { label: stat, color: 'text-slate-400' };
                            // Đảm bảo value là number trước khi format
                            const numValue = typeof value === 'number' ? value : (typeof value === 'string' ? parseFloat(value) : 0);
                            const displayValue = numValue > 0 ? `+${numValue.toLocaleString()}` : numValue.toLocaleString();
                            const suffix = (stat === 'crit_rate' || stat === 'criticalRate' || stat === 'crit_damage' || stat === 'dodge' || stat === 'evasion' || stat === 'hit_rate') ? '%' : '';

                            return (
                              <p key={stat}>
                                {statInfo.label}: <span className={statInfo.color}>{displayValue}{suffix}</span>
                              </p>
                            );
                          })}
                        </div>
                      );
                    })()}
                    <p className={`text-[10px] mt-1 ${typeInfo.color}`}>{typeInfo.label}</p>
                  </div>
                </div>
                <motion.button
                  onClick={() => consumable ? handleUse(item.itemId) : handleEquip(item, equipped)}
                  disabled={equipping === item.itemId}
                  className={`rounded-lg px-4 py-2 text-xs font-bold uppercase transition-all min-w-[70px] ${consumable
                    ? 'bg-orange-900/30 hover:bg-orange-800/50 border border-orange-500/30 text-orange-300'
                    : equipped
                      ? 'bg-red-900/30 hover:bg-red-800/50 border border-red-500/30 text-red-300'
                      : 'bg-emerald-900/30 hover:bg-emerald-800/50 border border-emerald-500/30 text-emerald-300'
                    }`}
                  whileTap={{ scale: 0.95 }}
                >
                  {equipping === item.itemId ? '...' : consumable ? 'Dùng' : equipped ? 'Tháo' : 'Trang bị'}
                </motion.button>
              </div>
            );
          })}
        </div>
      )}

      {/* Tooltip Portal */}
      {hoveredItem && (
        <ItemTooltip
          item={hoveredItem}
          stats={hoveredItem.metadata?.stats || hoveredItem.stats}
          position={tooltipPosition}
        />
      )}
    </div>
  );
});

export default InventoryTab;

