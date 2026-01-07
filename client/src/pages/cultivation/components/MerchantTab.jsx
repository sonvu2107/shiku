import { useState, useMemo, memo } from 'react';
import { useCultivation } from '../../../hooks/useCultivation.jsx';
import { getItemIcon, IMAGE_COMPONENTS } from '../utils/iconHelpers.js';
import { RARITY_COLORS } from '../utils/constants.js';
import LoadingSkeleton from './LoadingSkeleton.jsx';
import ItemTooltip from './ItemTooltip.jsx';
import Pagination from './Pagination.jsx';

const MerchantTab = memo(function MerchantTab() {
  const { cultivation, sellItems, loading } = useCultivation();
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [selling, setSelling] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hoveredItem, setHoveredItem] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const itemsPerPage = 8;

  if (loading || !cultivation) return <LoadingSkeleton />;

  const inventory = cultivation.inventory || [];
  const equipped = cultivation.equipped || {};

  // Create a Set of all equipped item IDs for fast lookup
  const equippedItemIds = useMemo(() => {
    const ids = new Set();
    if (equipped) {
      Object.values(equipped).forEach(val => {
        if (val) ids.add(val.toString());
      });
    }
    return ids;
  }, [equipped]);

  // Filter: Unequipped Equipment ONLY
  const filteredItems = useMemo(() => {
    return inventory.filter(item => {
      // Must be equipment
      if (!item.type || !item.type.startsWith('equipment_')) return false;

      // Must NOT be equipped (check flag AND check equipped slots)
      if (item.equipped) return false;
      if (equippedItemIds.has(item.itemId)) return false;

      return true;
    });
  }, [inventory, equippedItemIds]);

  // Sell Price Calculation
  const getSellPrice = (item) => {
    if (item.type?.startsWith('equipment_')) {
      const rarity = item.rarity || item.metadata?.rarity || 'common';
      const level = item.level || item.metadata?.level || 1;
      const multipliers = { common: 1, uncommon: 2, rare: 5, epic: 10, legendary: 50, mythic: 100 };
      const multiplier = multipliers[rarity] || 1;
      return Math.floor(level * multiplier * 100);
    }
    return 0;
  };

  const toggleSelection = (itemId) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      newSelected.add(itemId);
    }
    setSelectedItems(newSelected);
  };

  const handleSellSelected = async () => {
    if (selectedItems.size === 0 || selling) return;
    let totalValue = 0;
    inventory.forEach(item => {
      if (selectedItems.has(item.itemId)) {
        totalValue += getSellPrice(item);
      }
    });

    if (!window.confirm(`Bạn có chắc muốn bán ${selectedItems.size} trang bị với giá ${totalValue.toLocaleString()} Linh Thạch?`)) {
      return;
    }

    setSelling(true);
    try {
      await sellItems(Array.from(selectedItems));
      setSelectedItems(new Set());
    } finally {
      setSelling(false);
    }
  };

  const handleMouseEnter = (item, e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltipPosition({
      x: rect.right, y: rect.top,
      left: rect.left, right: rect.right,
      top: rect.top, bottom: rect.bottom
    });
    setHoveredItem(item);
  };

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-center justify-between bg-slate-900/50 p-3 rounded-xl border border-slate-800">
        <div className="flex flex-col">
          <h3 className="font-bold text-amber-500 font-title text-lg uppercase tracking-wide">Thương Nhân</h3>
          <p className="text-xs text-slate-500">Thu mua trang bị không dùng</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              if (selectedItems.size === filteredItems.length) setSelectedItems(new Set());
              else setSelectedItems(new Set(filteredItems.map(i => i.itemId)));
            }}
            className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-xs text-white transition-colors border border-slate-600"
          >
            {selectedItems.size === filteredItems.length ? 'Bỏ chọn' : 'Chọn tất cả'}
          </button>
          <button
            onClick={handleSellSelected}
            disabled={selectedItems.size === 0 || selling}
            className={`px-3 py-1.5 sm:px-4 rounded text-xs sm:text-sm font-bold uppercase transition-all ${selectedItems.size > 0
              ? 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white shadow-[0_0_15px_rgba(245,158,11,0.4)]'
              : 'bg-slate-700 text-slate-500 cursor-not-allowed'
              }`}
          >
            {selling ? 'Đang bán...' : 'Bán Ngay'}
          </button>
        </div>
      </div>

      {/* Stats Summary */}
      {selectedItems.size > 0 && (
        <div className="bg-amber-900/20 border border-amber-500/30 rounded-lg p-2 flex justify-between items-center px-4">
          <span className="text-xs text-amber-200">Đã chọn: <b className="text-white">{selectedItems.size}</b> món</span>
          <span className="text-sm font-bold text-amber-400">
            Tổng: {
              Array.from(selectedItems).reduce((sum, id) => {
                const item = inventory.find(i => i.itemId === id);
                return sum + (item ? getSellPrice(item) : 0);
              }, 0).toLocaleString()
            } Linh Thạch
          </span>
        </div>
      )}

      {/* List Items Grid */}
      {filteredItems.length === 0 ? (
        <div className="h-64 flex flex-col items-center justify-center text-slate-500 border-2 border-dashed border-slate-800 rounded-xl bg-slate-900/30">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 12H4" />
          </svg>
          <p className="text-sm font-medium">Không có trang bị nào để bán</p>
          <p className="text-xs opacity-60 mt-1">(Chỉ thu mua trang bị trong túi đồ, không bao gồm đồ đang mặc)</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pb-20">
          {filteredItems.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((item, index) => {
            const rarityKey = item.rarity || item.metadata?.rarity || 'common';
            const rarity = RARITY_COLORS[rarityKey] || RARITY_COLORS.common;
            const ItemIcon = getItemIcon(item);
            const isSelected = selectedItems.has(item.itemId);

            return (
              <div
                key={item.itemId}
                onClick={() => toggleSelection(item.itemId)}
                className={`relative rounded-xl p-2.5 sm:p-3 flex justify-between items-center border transition-all cursor-pointer group select-none ${rarity.bg} ${rarity.border} ${isSelected ? 'ring-2 ring-amber-500 bg-amber-900/20' : 'hover:bg-slate-800/80 hover:scale-[1.01]'
                  }`}
                onMouseEnter={(e) => handleMouseEnter(item, e)}
                onMouseLeave={() => setHoveredItem(null)}
              >
                {/* Checkbox */}
                <div className="mr-3 flex-shrink-0">
                  <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${isSelected ? 'bg-amber-500 border-amber-500' : 'border-slate-500 bg-slate-800 group-hover:border-slate-400'}`}>
                    {isSelected && <span className="text-white text-xs font-bold">✓</span>}
                  </div>
                </div>

                {/* Item Info */}
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-black border border-amber-500/40 flex items-center justify-center overflow-hidden flex-shrink-0 shadow-sm">
                    {(item.metadata?.img || item.img) ? (
                      <img src={item.metadata?.img || item.img} className="w-full h-full object-cover" />
                    ) : (
                      IMAGE_COMPONENTS.includes(ItemIcon) ? <ItemIcon size={24} /> : <ItemIcon size={20} className="text-amber-300" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h4 className={`font-bold text-xs sm:text-sm truncate ${rarity.text}`}>{item.name}</h4>
                      <span className={`text-[9px] px-1 py-0.5 rounded ${rarity.bg} ${rarity.text} border ${rarity.border} flex-shrink-0`}>{rarity.label}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-amber-300 font-mono bg-amber-900/40 px-1.5 rounded">+{getSellPrice(item).toLocaleString()} Linh Thạch</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {filteredItems.length > 0 && (
        <Pagination
          currentPage={currentPage}
          totalItems={filteredItems.length}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
        />
      )}

      {hoveredItem && (
        <ItemTooltip item={hoveredItem} position={tooltipPosition} />
      )}
    </div>
  );
});

export default MerchantTab;