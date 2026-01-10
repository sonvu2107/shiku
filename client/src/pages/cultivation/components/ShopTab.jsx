/**
 * Shop Tab - Spirit stones shop
 */
import { useState, useEffect, memo, useRef } from 'react';
import { GiCutDiamond } from 'react-icons/gi';
import { FaSortAmountDown, FaSortAmountUp, FaRecycle } from 'react-icons/fa';
import { useCultivation } from '../../../hooks/useCultivation.jsx';
import { RARITY_COLORS, EQUIPMENT_SUBTYPES } from '../utils/constants.js';
import { getItemIcon, IMAGE_COMPONENTS } from '../utils/iconHelpers.js';
import LoadingSkeleton from './LoadingSkeleton.jsx';
import ItemTooltip from './ItemTooltip.jsx';
import Pagination from './Pagination.jsx';

const RARITY_ORDER = {
  common: 1,
  uncommon: 2,
  rare: 3,
  epic: 4,
  legendary: 5,
  mythic: 6
};

const OUTCOME_TRANSLATION = {
  // Common
  'common': 'Bình Thường',
  'small_win': 'May Mắn',
  'lucky_boost': 'Vận Đỏ',

  // Advanced
  'high_materials': 'Bội Thu',
  'technique_find': 'Ngộ Đạo',
  'big_technique_find': 'Đại Ngộ',
  'cosmetic_find': 'Cơ Duyên',

  // Rare/Epic/Legendary
  'rare_technique': 'Kỳ Ngộ',
  'epic_technique': 'Phúc Duyên Thâm Hậu',
  'epic_cosmetics': 'Sắc Nước Hương Trời',
  'jackpot_technique': 'Cơ Duyên Nghịch Thiên',
  'LEGENDARY_JACKPOT': 'Thiên Đạo Chúc Phúc'
};

// ==================== LOOTBOX RESULT MODAL ====================
function LootboxResultModal({ result, onClose }) {
  if (!result) return null;

  const { rewards, rolled } = result;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300"
        onClick={onClose}
      />

      <div className="relative z-10 w-full max-w-lg bg-slate-900 rounded-2xl border border-amber-500/50 shadow-2xl shadow-amber-500/20 overflow-hidden animate-in zoom-in-95 duration-300">

        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-6 text-center border-b border-amber-500/30 relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('/assets/pattern-overlay.png')] opacity-10" />
          <h2 className="text-2xl font-bold text-amber-400 font-title relative z-10">
            {rolled?.boxKey ? 'KHAI MỞ BẢO RƯƠNG' : 'PHẦN THƯỞNG'}
          </h2>
          {rolled?.outcome && (
            <div className="text-xs font-mono text-amber-200/70 mt-1 uppercase tracking-widest relative z-10">
              Kết quả: {OUTCOME_TRANSLATION[rolled.outcome] || rolled.outcome.replace(/_/g, ' ')}
            </div>
          )}
        </div>

        {/* Rewards Grid */}
        <div className="p-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
          <div className="grid grid-cols-4 sm:grid-cols-5 gap-3 justify-center">
            {rewards.map((reward, idx) => {
              // Determine style based on rarity (simple heuristic if not provided)
              const isSpecial = ['technique', 'cosmetic'].includes(reward.type);
              const isEpic = ['cons_epic', 'cons_legendary'].some(p => reward.id.includes(p)) || isSpecial;

              const borderColor = isSpecial ? 'border-purple-500' : isEpic ? 'border-amber-400' : 'border-slate-600';
              const glow = isSpecial ? 'shadow-[0_0_10px_rgba(168,85,247,0.4)]' : isEpic ? 'shadow-[0_0_10px_rgba(251,191,36,0.3)]' : '';

              const ItemIcon = getItemIcon(reward);

              return (
                <div
                  key={idx}
                  className={`relative group bg-slate-800 rounded-lg p-2 border ${borderColor} ${glow} flex flex-col items-center gap-2 animate-in zoom-in-50 duration-500 fill-mode-backwards`}
                  style={{ animationDelay: `${idx * 50}ms` }}
                >
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded bg-black/50 flex items-center justify-center p-1 relative overflow-hidden">
                    {/* Material images - check if reward.id starts with 'mat_' */}
                    {reward.id?.startsWith('mat_') ? (
                      <img
                        src={`/assets/materials/${reward.id}.jpg`}
                        alt={reward.name || reward.id}
                        className="w-full h-full object-cover rounded"
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    ) : IMAGE_COMPONENTS.includes(ItemIcon) ? (
                      <ItemIcon size={28} />
                    ) : (
                      <ItemIcon size={24} className="text-amber-300" />
                    )}

                    <span className="absolute bottom-0 right-0 bg-slate-900 text-[10px] font-bold px-1 rounded-tl text-white">
                      x{reward.qty}
                    </span>
                  </div>

                  {/* Tooltip-ish name */}
                  <div className="text-[10px] text-center leading-tight line-clamp-2 text-slate-300 w-full break-words">
                    {reward.name || reward.id}
                  </div>
                </div>
              );
            })}
          </div>

          {rolled?.duplicateConverted && (
            <div className="mt-6 p-3 bg-indigo-900/30 border border-indigo-500/30 rounded-lg flex items-center gap-3">
              <FaRecycle className="text-indigo-400 text-xl flex-shrink-0" />
              <p className="text-xs text-indigo-200">
                Đã phát hiện vật phẩm trùng lặp! Một số phần thưởng đã được chuyển đổi thành tài nguyên giá trị cao.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-900 border-t border-slate-700 flex justify-center">
          <button
            onClick={onClose}
            className="px-8 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg shadow-lg shadow-amber-900/50 transition-all active:scale-95"
          >
            THU NHẬN
          </button>
        </div>
      </div>
    </div>
  );
}

const ShopTab = memo(function ShopTab() {
  const { shop, loadShop, purchaseItem, loading, cultivation } = useCultivation();
  const [buying, setBuying] = useState(null);
  const [activeCategory, setActiveCategory] = useState('all');
  const [subCategory, setSubCategory] = useState('all');
  const [hoveredItem, setHoveredItem] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [sortOrder, setSortOrder] = useState('asc'); // 'asc' | 'desc'
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  // Modal state for bulk purchase
  const [purchaseModal, setPurchaseModal] = useState(null); // { item, quantity }
  // Modal state for Lootbox Results
  const [lootboxResult, setLootboxResult] = useState(null);

  // Helper to check if item supports bulk purchase
  const isBulkPurchasable = (item) => {
    return ['exp_boost', 'breakthrough_boost', 'consumable'].includes(item.type) && !item.oneTimePurchase && item.type !== 'lootbox';
  };

  // Open purchase modal for bulk-purchasable items
  const openPurchaseModal = (item) => {
    setPurchaseModal({ item, quantity: 1 });
  };

  // Update quantity in modal
  const setModalQuantity = (value) => {
    const qty = Math.max(1, Math.min(99, Math.floor(Number(value)) || 1));
    setPurchaseModal(prev => prev ? { ...prev, quantity: qty } : null);
  };


  // Info mapping for pill/boost effects
  const EFFECT_INFO = {
    exp_boost: {
      title: 'Đan Dược Tu Luyện',
      affects: [
        'Thu thập tu vi thụ động (Passive)',
        'Phần thưởng Bí Cảnh (Dungeon) - Tu Vi',
        'Phiên luyện công pháp (Practice Session)'
      ],
      notes: [
        'Không áp dụng cho Âm Dương click trực tiếp'
      ]
    },
    breakthrough_boost: {
      title: 'Đan Dược Độ Kiếp',
      affects: [
        'Tăng tỷ lệ thành công Độ Kiếp khi bấm Độ Kiếp'
      ],
      notes: [
        'Không tăng Tu Vi hay Linh Thạch'
      ]
    },
    spirit_stones: {
      title: 'Bùa/Linh Thạch (Lucky Charm)',
      affects: [
        'Phần thưởng Bí Cảnh (Dungeon) - Linh Thạch'
      ],
      notes: [
        'Không áp dụng cho Luận Võ Tiên-Ma (Arena PvP)',
        'Không áp dụng cho thưởng nhiệm vụ hay Tu Vi thụ động'
      ]
    }
  };

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

  // Handle click on buy button - open modal for bulk items, direct buy for others
  const handleItemClick = (item) => {
    if (item.type === 'lootbox') {
      // Direct buy & open for lootbox (single for now)
      handleBuy(item.id, 1);
    } else if (isBulkPurchasable(item) && !item.owned) {
      openPurchaseModal(item);
    } else {
      handleBuy(item.id, 1);
    }
  };

  // Handle direct buy (for non-bulk items or from modal)
  const handleBuy = async (itemId, quantity = 1) => {
    setBuying(itemId);
    try {
      const data = await purchaseItem(itemId, quantity);

      if (data && data.rewards) {
        // This was a lootbox open!
        setLootboxResult({
          rewards: data.rewards,
          rolled: data.rolled
        });
      }

      setPurchaseModal(null); // Close modal after successful purchase
    } finally {
      setBuying(null);
    }
  };

  // Handle buy from modal
  const handleModalBuy = () => {
    if (purchaseModal) {
      handleBuy(purchaseModal.item.id, purchaseModal.quantity);
    }
  };


  const toggleSortOrder = () => {
    setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    setCurrentPage(1);
  };

  if (loading || !shop) {
    return <LoadingSkeleton />;
  }

  // Parent Categories
  const parentCategories = [
    { id: 'all', label: 'Tất cả' },
    { id: 'lootbox', label: 'Rương Báu' }, // New Category
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
      { id: 'exp_boost', label: 'Đan Dược Tu Luyện' },
      { id: 'breakthrough_boost', label: 'Đan Dược Độ Kiếp' },
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
    if (category === 'lootbox') return item.type === 'lootbox';

    if (category === 'equipment') {
      return item.type?.startsWith('equipment_');
    }
    if (category === 'cosmetic') {
      return ['avatar_frame', 'profile_effect'].includes(item.type);
    }
    if (category === 'consumable_group') {
      return ['exp_boost', 'breakthrough_boost', 'consumable'].includes(item.type);
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
  }).sort((a, b) => {
    const orderA = RARITY_ORDER[a.rarity] || 0;
    const orderB = RARITY_ORDER[b.rarity] || 0;

    // Sort by rarity
    if (orderA !== orderB) {
      if (sortOrder === 'asc') return orderA - orderB;
      if (sortOrder === 'desc') return orderB - orderA;
    }

    // If rarity is same, sort by price as secondary sort key
    return a.price - b.price;
  });

  return (
    <div className="space-y-3 pb-2">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-gold font-title tracking-wide text-xl lg:text-2xl">VẠN BẢO CÁC</h3>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/50 border border-amber-500/30 rounded-lg">
          <GiCutDiamond size={18} className="text-cyan-400" />
          <span className="text-amber-300 font-mono font-bold">{cultivation?.spiritStones?.toLocaleString() || 0}</span>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        {/* Main Categories - Horizontal scroll on mobile */}
        <div className="-mx-4 px-4 sm:mx-0 sm:px-0 overflow-x-auto pb-2 sm:pb-0 scrollbar-cultivation flex-1 w-full sm:w-auto">
          <div className="flex gap-2 min-w-max sm:flex-wrap sm:min-w-0">
            {parentCategories.map(cat => (
              <button
                key={cat.id}
                onClick={() => {
                  setActiveCategory(cat.id);
                  setSubCategory('all'); // Reset sub category when changing parent
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${activeCategory === cat.id
                  ? 'bg-amber-600 border-amber-400 text-white shadow-[0_0_10px_rgba(245,158,11,0.3)]'
                  : 'bg-slate-800 border-slate-600 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
                  }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Sort Button */}
        <button
          onClick={toggleSortOrder}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/50 border border-slate-700 text-slate-300 hover:text-amber-300 hover:border-amber-500/30 transition-all text-xs font-medium whitespace-nowrap"
        >
          {sortOrder === 'asc' ? <FaSortAmountUp /> : <FaSortAmountDown />}
          <span>{sortOrder === 'asc' ? 'Thấp -> Cao' : 'Cao -> Thấp'}</span>
        </button>
      </div>

      {subCategories[activeCategory] && (
        <div className="-mx-4 px-4 sm:mx-0 sm:px-0 overflow-x-auto pb-2 animate-in fade-in slide-in-from-top-2 duration-300 scrollbar-cultivation">
          <div className="flex gap-2 min-w-max sm:flex-wrap sm:min-w-0">
            {subCategories[activeCategory].map(sub => (
              <button
                key={sub.id}
                onClick={() => { setSubCategory(sub.id); setCurrentPage(1); }}
                className={`px-3 py-1 rounded-full text-[11px] font-medium transition-all border ${subCategory === sub.id
                  ? 'bg-slate-700 text-amber-300 border-amber-500/50 shadow-[0_0_8px_rgba(245,158,11,0.2)]'
                  : 'bg-slate-800/30 text-slate-400 border-transparent hover:bg-slate-700/50 hover:text-slate-300'
                  }`}
              >
                {sub.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Effects Mapping Info Panel */}
      {(activeCategory === 'consumable_group') && (
        <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-2">
          {/* EXP Boost */}
          {(['all', 'exp_boost'].includes(subCategory)) && (
            <div className="rounded-xl p-3 border border-amber-500/30 bg-slate-800/40">
              <div className="text-xs font-semibold text-amber-300 mb-1">{EFFECT_INFO.exp_boost.title}</div>
              <ul className="text-[11px] text-slate-300 space-y-1">
                {EFFECT_INFO.exp_boost.affects.map((line, idx) => (
                  <li key={`exp-${idx}`} className="flex items-start gap-1"><span className="text-amber-400">•</span><span>{line}</span></li>
                ))}
              </ul>
              <div className="text-[11px] text-slate-400 mt-2">
                {EFFECT_INFO.exp_boost.notes.map((line, idx) => (
                  <div key={`exp-note-${idx}`}>• {line}</div>
                ))}
              </div>
            </div>
          )}
          {/* Breakthrough Boost */}
          {(['all', 'breakthrough_boost'].includes(subCategory)) && (
            <div className="rounded-xl p-3 border border-purple-500/30 bg-slate-800/40">
              <div className="text-xs font-semibold text-purple-300 mb-1">{EFFECT_INFO.breakthrough_boost.title}</div>
              <ul className="text-[11px] text-slate-300 space-y-1">
                {EFFECT_INFO.breakthrough_boost.affects.map((line, idx) => (
                  <li key={`bt-${idx}`} className="flex items-start gap-1"><span className="text-purple-400">•</span><span>{line}</span></li>
                ))}
              </ul>
              <div className="text-[11px] text-slate-400 mt-2">
                {EFFECT_INFO.breakthrough_boost.notes.map((line, idx) => (
                  <div key={`bt-note-${idx}`}>• {line}</div>
                ))}
              </div>
            </div>
          )}
          {/* Spirit Stones Charm */}
          {(['all', 'consumable'].includes(subCategory)) && (shop.items || []).some(i => i.id === 'lucky_charm') && (
            <div className="rounded-xl p-3 border border-cyan-500/30 bg-slate-800/40">
              <div className="text-xs font-semibold text-cyan-300 mb-1">{EFFECT_INFO.spirit_stones.title}</div>
              <ul className="text-[11px] text-slate-300 space-y-1">
                {EFFECT_INFO.spirit_stones.affects.map((line, idx) => (
                  <li key={`ss-${idx}`} className="flex items-start gap-1"><span className="text-cyan-400">•</span><span>{line}</span></li>
                ))}
              </ul>
              <div className="text-[11px] text-slate-400 mt-2">
                {EFFECT_INFO.spirit_stones.notes.map((line, idx) => (
                  <div key={`ss-note-${idx}`}>• {line}</div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Items Grid */}
      <>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filteredItems?.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((item) => {
            const rarity = RARITY_COLORS[item.rarity] || RARITY_COLORS.common;
            const ItemIcon = getItemIcon(item);

            return (
              <div
                key={item.id}
                className={`relative rounded-xl p-2.5 sm:p-4 flex justify-between items-center group transition-all border ${rarity.bg} ${rarity.border} hover:scale-[1.02] hover:z-50`}
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
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-black border border-amber-500/40 flex items-center justify-center shadow-[0_0_10px_rgba(245,158,11,0.3)] overflow-hidden relative">
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
                      <h4 className={`font-bold text-xs sm:text-sm group-hover:text-amber-400 transition-colors ${rarity.text}`}>
                        {item.name}
                      </h4>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${rarity.bg} ${rarity.text} border ${rarity.border}`}>
                        {rarity.label}
                      </span>
                      {item.subtype && EQUIPMENT_SUBTYPES[item.subtype] && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-700/50 text-slate-300 border border-slate-600/50">
                          {EQUIPMENT_SUBTYPES[item.subtype]}
                        </span>
                      )}
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

                {/* Buy button */}
                <button
                  onClick={() => handleItemClick(item)}
                  disabled={buying === item.id || !item.canAfford || item.owned}
                  className={`flex flex-col items-center justify-center border rounded-lg px-4 py-2 min-w-[85px] transition-all ${item.owned
                    ? 'bg-slate-800 border-slate-600 text-slate-500 cursor-not-allowed'
                    : item.canAfford
                      ? 'bg-gradient-to-b from-amber-600/30 to-amber-800/30 hover:from-amber-500/40 hover:to-amber-700/40 border-amber-500/50'
                      : 'bg-slate-900 border-slate-700 opacity-50 cursor-not-allowed'
                    }`}
                >
                  <span className="text-amber-400 font-mono text-sm font-bold flex items-center gap-1">
                    <GiCutDiamond size={14} /> {item.price.toLocaleString()}
                  </span>
                  <span className="text-[10px] text-slate-300 uppercase mt-1">
                    {item.owned ? 'Đã sở hữu' : buying === item.id ? '...' : item.type === 'lootbox' ? 'Mở Ngay' : 'Mua'}
                  </span>
                </button>
              </div>
            );
          })}
        </div>
        <Pagination
          currentPage={currentPage}
          totalPages={Math.ceil((filteredItems?.length || 0) / itemsPerPage)}
          onPageChange={setCurrentPage}
          itemsPerPage={itemsPerPage}
          totalItems={filteredItems?.length || 0}
        />
      </>

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

      {/* Lootbox Result Modal */}
      {lootboxResult && (
        <LootboxResultModal
          result={lootboxResult}
          onClose={() => setLootboxResult(null)}
        />
      )}

      {/* Purchase Modal for bulk items */}
      {purchaseModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setPurchaseModal(null)}
          />

          {/* Modal Content */}
          <div className="relative z-10 w-full max-w-sm mx-4 bg-gradient-to-b from-slate-800 to-slate-900 rounded-2xl border border-amber-500/30 shadow-2xl shadow-amber-500/10 animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-4 border-b border-slate-700/50">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-black border border-amber-500/40 flex items-center justify-center overflow-hidden">
                  {purchaseModal.item.img ? (
                    <img src={purchaseModal.item.img} alt={purchaseModal.item.name} className="w-full h-full object-cover" />
                  ) : (
                    <GiCutDiamond size={24} className="text-amber-400" />
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-amber-300">{purchaseModal.item.name}</h3>
                  <p className="text-xs text-slate-400">{purchaseModal.item.description?.slice(0, 50)}...</p>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="p-4 space-y-4">
              {/* Quantity selector */}
              <div className="flex items-center justify-between">
                <span className="text-slate-300 text-sm">Số lượng:</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setModalQuantity(purchaseModal.quantity - 1)}
                    disabled={purchaseModal.quantity <= 1}
                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed text-lg font-bold transition-colors"
                  >
                    −
                  </button>
                  <input
                    type="number"
                    min="1"
                    max="99"
                    value={purchaseModal.quantity}
                    onChange={(e) => setModalQuantity(e.target.value)}
                    className="w-14 h-8 text-center bg-slate-800 border border-slate-600 rounded-lg text-amber-300 text-sm font-mono focus:outline-none focus:border-amber-500"
                  />
                  <button
                    onClick={() => setModalQuantity(purchaseModal.quantity + 1)}
                    disabled={purchaseModal.quantity >= 99}
                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed text-lg font-bold transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Quick quantity buttons */}
              <div className="flex gap-2 justify-center">
                {[5, 10, 20, 50].map(qty => (
                  <button
                    key={qty}
                    onClick={() => setModalQuantity(qty)}
                    className={`px-3 py-1 rounded text-xs font-medium transition-all ${purchaseModal.quantity === qty
                      ? 'bg-amber-600 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      }`}
                  >
                    x{qty}
                  </button>
                ))}
              </div>

              {/* Total price */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/50 border border-slate-700">
                <span className="text-slate-300">Tổng cộng:</span>
                <span className="flex items-center gap-2 text-amber-400 font-bold text-lg">
                  <GiCutDiamond size={18} />
                  {(purchaseModal.item.price * purchaseModal.quantity).toLocaleString()}
                </span>
              </div>

              {/* Balance check */}
              {(cultivation?.spiritStones || 0) < (purchaseModal.item.price * purchaseModal.quantity) && (
                <p className="text-xs text-red-400 text-center">Không đủ linh thạch!</p>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-700/50 flex gap-3">
              <button
                onClick={() => setPurchaseModal(null)}
                className="flex-1 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-300 font-medium transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={handleModalBuy}
                disabled={buying || (cultivation?.spiritStones || 0) < (purchaseModal.item.price * purchaseModal.quantity)}
                className="flex-1 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {buying ? '...' : `Mua x${purchaseModal.quantity}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

export default ShopTab;
