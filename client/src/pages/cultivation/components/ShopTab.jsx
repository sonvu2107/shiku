/**
 * Shop Tab - Spirit stones shop
 */
import { useState, useEffect, memo, useRef } from 'react';
import { useCultivation } from '../../../hooks/useCultivation.jsx';
import { RARITY_COLORS } from '../utils/constants.js';
import { getItemIcon, IMAGE_COMPONENTS } from '../utils/iconHelpers.js';
import LoadingSkeleton from './LoadingSkeleton.jsx';
import ItemTooltip from './ItemTooltip.jsx';

const ShopTab = memo(function ShopTab() {
  const { shop, loadShop, purchaseItem, loading } = useCultivation();
  const [buying, setBuying] = useState(null);
  const [activeCategory, setActiveCategory] = useState('all');
  const [subCategory, setSubCategory] = useState('all');
  const [hoveredItem, setHoveredItem] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    loadShop();
  }, [loadShop]);

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

  const handleBuy = async (itemId) => {
    setBuying(itemId);
    try {
      await purchaseItem(itemId);
    } finally {
      setBuying(null);
    }
  };

  if (loading || !shop) {
    return <LoadingSkeleton />;
  }

  // Parent Categories
  const parentCategories = [
    { id: 'all', label: 'Tất cả' },
    { id: 'equipment', label: 'Trang Bị' },
    { id: 'technique', label: 'Công Pháp' },
    { id: 'title', label: 'Danh Hiệu' },
    { id: 'badge', label: 'Huy Hiệu' },
    { id: 'cosmetic', label: 'Ngoại Trang' }, // Gộp Avatar Frame, Effect
    { id: 'consumable_group', label: 'Vật Phẩm' }, // Gộp Đan Dược, Vật Phẩm
    { id: 'companion', label: 'Đồng Hành' } // Gộp Linh Thú, Tọa Kỵ
  ];

  // Sub Categories mapping
  const subCategories = {
    equipment: [
        { id: 'all', label: 'Tất cả' },
        { id: 'equipment_weapon', label: 'Vũ Khí' },
        { id: 'equipment_armor', label: 'Giáp' },
        { id: 'equipment_accessory', label: 'Trang Sức' },
        { id: 'equipment_magic_treasure', label: 'Pháp Bảo' },
        { id: 'equipment_power_item', label: 'Linh Khí' }
    ],
    cosmetic: [
        { id: 'all', label: 'Tất cả' },
        { id: 'avatar_frame', label: 'Khung Avatar' },
        { id: 'profile_effect', label: 'Hiệu Ứng' }
    ],
    consumable_group: [
        { id: 'all', label: 'Tất cả' },
        { id: 'exp_boost', label: 'Đan Dược' },
        { id: 'consumable', label: 'Tiêu Hao' }
    ],
    companion: [
        { id: 'all', label: 'Tất cả' },
        { id: 'pet', label: 'Linh Thú' },
        { id: 'mount', label: 'Tọa Kỵ' }
    ]
  };

  // Helper to check item type against category
  const checkCategory = (item, category) => {
    if (category === 'all') return true;
    
    if (category === 'equipment') {
      return item.type?.startsWith('equipment_');
    }
    if (category === 'cosmetic') {
      return ['avatar_frame', 'profile_effect'].includes(item.type);
    }
    if (category === 'consumable_group') {
      return ['exp_boost', 'consumable'].includes(item.type);
    }
    if (category === 'companion') {
      return ['pet', 'mount'].includes(item.type);
    }
    return item.type === category;
  };

  const filteredItems = shop.items?.filter(item => {
    // First filter by parent category
    if (!checkCategory(item, activeCategory)) return false;

    // Then filter by sub category if applicable
    if (subCategories[activeCategory] && subCategory !== 'all') {
        return item.type === subCategory;
    }

    return true;
  });

  return (
    <div className="space-y-3 pb-2">
      <h3 className="font-bold text-gold font-title tracking-wide text-xl lg:text-2xl">VẠN BẢO CÁC</h3>

      {/* Main Categories */}
      <div className="flex flex-wrap gap-2 pb-2 border-b border-white/10 mb-2">
        {parentCategories.map(cat => (
          <button
            key={cat.id}
            onClick={() => {
                setActiveCategory(cat.id);
                setSubCategory('all'); // Reset sub category when changing parent
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${activeCategory === cat.id
              ? 'bg-amber-600/30 border border-amber-500/50 text-amber-300'
              : 'bg-slate-800/50 border border-slate-700 text-slate-400 hover:text-slate-300'
              }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Sub Categories (Only show if active category has children) */}
      {subCategories[activeCategory] && (
        <div className="flex flex-wrap gap-2 pb-2 animate-in fade-in slide-in-from-top-2 duration-300">
           {subCategories[activeCategory].map(sub => (
               <button
                key={sub.id}
                onClick={() => setSubCategory(sub.id)}
                className={`px-3 py-1 rounded-full text-[11px] font-medium transition-all ${subCategory === sub.id
                  ? 'bg-slate-700 text-amber-300 border border-amber-500/30'
                  : 'bg-slate-800/30 text-slate-400 border border-transparent hover:bg-slate-700/50'
                }`}
               >
                   {sub.label}
               </button>
           ))}
        </div>
      )}

      {/* Items Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filteredItems?.map((item) => {
          const rarity = RARITY_COLORS[item.rarity] || RARITY_COLORS.common;
          const ItemIcon = getItemIcon(item);

          return (
            <div
              key={item.id}
              className={`relative rounded-xl p-4 flex justify-between items-center group transition-all border ${rarity.bg} ${rarity.border} hover:scale-[1.02] hover:z-50`}
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
                <div className="w-10 h-10 rounded-full bg-black border border-amber-500/40 flex items-center justify-center shadow-[0_0_10px_rgba(245,158,11,0.3)] overflow-hidden relative">
                  {item.img ? (
                    <img
                      src={item.img}
                      alt={item.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        // Hide image and show icon fallback
                        e.target.style.display = 'none';
                        const fallback = e.target.nextElementSibling;
                        if (fallback) {
                          fallback.style.display = 'flex';
                        }
                      }}
                    />
                  ) : null}
                  <div className={`absolute inset-0 flex items-center justify-center ${item.img ? 'hidden' : ''}`}>
                    {IMAGE_COMPONENTS.includes(ItemIcon) ? (
                      <ItemIcon size={28} />
                    ) : (
                      <ItemIcon size={20} className="text-amber-300" />
                    )}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h4 className={`font-bold text-sm group-hover:text-amber-400 transition-colors ${rarity.text}`}>
                      {item.name}
                    </h4>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${rarity.bg} ${rarity.text} border ${rarity.border}`}>
                      {rarity.label}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 leading-tight">{item.description}</p>
                  {/* Hiển thị stats cho equipment */}
                  {item.type?.startsWith('equipment_') && item.stats && (
                    <div className="mt-2 space-y-1 text-xs">
                      {item.stats.attack > 0 && (
                        <div className="flex justify-between">
                          <span className="text-slate-500">Tấn Công:</span>
                          <span className="text-red-400">+{item.stats.attack}</span>
                        </div>
                      )}
                      {item.stats.defense > 0 && (
                        <div className="flex justify-between">
                          <span className="text-slate-500">Phòng Thủ:</span>
                          <span className="text-blue-400">+{item.stats.defense}</span>
                        </div>
                      )}
                      {item.stats.hp > 0 && (
                        <div className="flex justify-between">
                          <span className="text-slate-500">Khí Huyết:</span>
                          <span className="text-green-400">+{item.stats.hp}</span>
                        </div>
                      )}
                      {item.level_required > 1 && (
                        <div className="flex justify-between">
                          <span className="text-slate-500">Yêu cầu:</span>
                          <span className="text-amber-400">Level {item.level_required}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <button
                onClick={() => handleBuy(item.id)}
                disabled={buying === item.id || !item.canAfford || item.owned}
                className={`flex flex-col items-center justify-center border rounded-lg px-4 py-2 min-w-[85px] transition-all ${item.owned
                  ? 'bg-slate-800 border-slate-600 text-slate-500 cursor-not-allowed'
                  : item.canAfford
                    ? 'bg-gradient-to-b from-amber-600/30 to-amber-800/30 hover:from-amber-500/40 hover:to-amber-700/40 border-amber-500/50'
                    : 'bg-slate-900 border-slate-700 opacity-50 cursor-not-allowed'
                  }`}
              >
                <span className="text-amber-400 font-mono text-sm font-bold flex items-center gap-1">
                  💎 {item.price}
                </span>
                <span className="text-[10px] text-slate-300 uppercase mt-1">
                  {item.owned ? 'Đã sở hữu' : buying === item.id ? '...' : 'Mua'}
                </span>
              </button>
            </div>
          );
        })}
      </div>

      {filteredItems?.length === 0 && (
        <div className="h-48 flex flex-col items-center justify-center text-slate-500">
          <p className="text-xs uppercase tracking-widest">Không có vật phẩm</p>
        </div>
      )}

      {/* Tooltip Portal */}
      {hoveredItem && (
        <ItemTooltip 
          item={hoveredItem} 
          stats={hoveredItem.stats || hoveredItem.metadata?.stats} 
          position={tooltipPosition} 
        />
      )}
    </div>
  );
});

export default ShopTab;
