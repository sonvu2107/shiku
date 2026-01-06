/**
 * Inventory Tab - Display and manage inventory items
 */
import { useState, useEffect, memo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCultivation } from '../../../hooks/useCultivation.jsx';
import { RARITY_COLORS, SHOP_ITEM_DATA, EQUIPMENT_SUBTYPES } from '../utils/constants.js';
import { getItemIcon, IMAGE_COMPONENTS, ITEM_TYPE_LABELS } from '../utils/iconHelpers.js';
import LoadingSkeleton from './LoadingSkeleton.jsx';
import ItemTooltip from './ItemTooltip.jsx';
import Pagination from './Pagination.jsx';

// Loot Box Result Modal - Phong cách tu tiên
const LootboxResultModal = memo(({ result, onClose }) => {
  if (!result) return null;

  const rarityStyles = {
    common: {
      bg: 'from-stone-800/95 via-stone-900/95 to-stone-800/95',
      border: 'border-stone-500/50',
      text: 'text-stone-300',
      glow: '',
      accent: 'bg-stone-600'
    },
    uncommon: {
      bg: 'from-emerald-900/95 via-stone-900/95 to-emerald-900/95',
      border: 'border-emerald-500/50',
      text: 'text-emerald-300',
      glow: 'shadow-[0_0_30px_rgba(16,185,129,0.3)]',
      accent: 'bg-emerald-600'
    },
    rare: {
      bg: 'from-sky-900/95 via-slate-900/95 to-sky-900/95',
      border: 'border-sky-400/50',
      text: 'text-sky-300',
      glow: 'shadow-[0_0_40px_rgba(56,189,248,0.4)]',
      accent: 'bg-sky-500'
    },
    epic: {
      bg: 'from-purple-900/95 via-slate-900/95 to-purple-900/95',
      border: 'border-purple-400/60',
      text: 'text-purple-300',
      glow: 'shadow-[0_0_50px_rgba(168,85,247,0.5)]',
      accent: 'bg-purple-500'
    },
    legendary: {
      bg: 'from-amber-800/95 via-orange-900/95 to-amber-800/95',
      border: 'border-amber-400/70',
      text: 'text-amber-200',
      glow: 'shadow-[0_0_60px_rgba(251,191,36,0.6)]',
      accent: 'bg-gradient-to-r from-amber-500 to-orange-500'
    }
  };

  const styles = rarityStyles[result.rarity] || rarityStyles.common;
  const rarityLabel = {
    common: 'Phàm Phẩm',
    uncommon: 'Tinh Phẩm',
    rare: 'Trân Phẩm',
    epic: 'Cực Phẩm',
    legendary: 'Thần Phẩm'
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0, rotateX: -15 }}
        animate={{ scale: 1, opacity: 1, rotateX: 0 }}
        exit={{ scale: 0.8, opacity: 0 }}
        transition={{ type: 'spring', damping: 20, stiffness: 200 }}
        className={`relative bg-gradient-to-b ${styles.bg} border ${styles.border} rounded-lg p-1 max-w-xs w-full ${styles.glow}`}
        onClick={e => e.stopPropagation()}
      >
        {/* Viền trang trí */}
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-24 h-1 bg-gradient-to-r from-transparent via-amber-500/80 to-transparent" />
        <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-24 h-1 bg-gradient-to-r from-transparent via-amber-500/80 to-transparent" />

        {/* Main content */}
        <div className="bg-slate-900/60 rounded-md p-5 border border-amber-900/30">
          {/* Header */}
          <div className="text-center mb-4">
            <p className="text-xs text-amber-400/80 tracking-[0.3em] uppercase font-medium">Khai Bảo Thành Công</p>
          </div>

          {/* Icon với hiệu ứng */}
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.15, type: 'spring', damping: 12 }}
            className="relative mb-5"
          >
            {/* Vòng sáng nền */}
            {(result.rarity === 'legendary' || result.rarity === 'epic') && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className={`w-28 h-28 rounded-full ${result.rarity === 'legendary' ? 'bg-amber-500/20' : 'bg-purple-500/20'} blur-xl animate-pulse`} />
              </div>
            )}

            <div className={`w-20 h-20 mx-auto rounded-lg bg-gradient-to-br from-slate-800 to-slate-900 border-2 ${styles.border} flex items-center justify-center relative overflow-hidden`}>
              {/* Hiệu ứng ánh sáng cho legendary */}
              {result.rarity === 'legendary' && (
                <>
                  <div className="absolute inset-0 bg-gradient-to-t from-amber-500/30 to-transparent animate-pulse" />
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(251,191,36,0.3),transparent_60%)]" />
                </>
              )}
              {(() => {
                const ItemIcon = getItemIcon(result);
                return IMAGE_COMPONENTS.includes(ItemIcon) ? (
                  <ItemIcon size={40} />
                ) : (
                  <ItemIcon size={32} className={styles.text} />
                );
              })()}
            </div>
          </motion.div>

          {/* Tên vật phẩm */}
          <motion.h3
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className={`text-lg font-bold ${styles.text} text-center mb-2 font-title`}
          >
            {result.name}
          </motion.h3>

          {/* Độ hiếm */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.35 }}
            className="flex justify-center mb-3"
          >
            <span className={`px-3 py-1 ${styles.accent} rounded text-xs font-bold text-white tracking-wider`}>
              {rarityLabel[result.rarity] || result.rarity}
            </span>
          </motion.div>

          {/* Mô tả */}
          {result.description && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.45 }}
              className="text-xs text-slate-400 text-center leading-relaxed mb-4 px-2"
            >
              {result.description}
            </motion.p>
          )}

          {/* Nút đóng */}
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            onClick={onClose}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full py-2 bg-gradient-to-r from-amber-600/20 via-amber-500/30 to-amber-600/20 hover:from-amber-600/30 hover:via-amber-500/40 hover:to-amber-600/30 border border-amber-500/40 rounded text-amber-300 text-sm font-medium transition-all"
          >
            Xác Nhận
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
});


const InventoryTab = memo(function InventoryTab() {
  const { cultivation, equip, unequip, equipEquipment, unequipEquipment, repairEquipment, previewRepairAll, repairAllEquipment, useItem, loading } = useCultivation();
  const [equipping, setEquipping] = useState(null);
  const [repairing, setRepairing] = useState(null);
  const [repairingAll, setRepairingAll] = useState(false);
  const [repairAllPreview, setRepairAllPreview] = useState(null);
  const [activeCategory, setActiveCategory] = useState('all');
  const [activeSubCategory, setActiveSubCategory] = useState('all');
  const [hoveredItem, setHoveredItem] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [lootboxResult, setLootboxResult] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [rewardsAnimation, setRewardsAnimation] = useState([]); // Animation state
  const [equippedExpanded, setEquippedExpanded] = useState(false); // Collapsible equipped section
  const itemsPerPage = 12;
  const isProcessingRef = useRef(false); // Sync ref to prevent double-clicks

  // Load preview chi phí tu bổ tất cả khi component mount
  useEffect(() => {
    const loadRepairPreview = async () => {
      try {
        const response = await previewRepairAll();
        // API trả về { success, data: { needsRepair, totalCost, canAfford, ... } }
        if (response?.success && response?.data) {
          setRepairAllPreview(response.data);
        } else if (response?.needsRepair !== undefined) {
          // Fallback nếu response là data trực tiếp
          setRepairAllPreview(response);
        }
      } catch (err) {
        // Silently fail - nút sẽ không hiển thị
      }
    };
    if (cultivation?.inventory?.length > 0) {
      loadRepairPreview();
    }
  }, [cultivation?.inventory, previewRepairAll]);

  // Handler tu bổ tất cả
  const handleRepairAll = async () => {
    if (repairingAll || !repairAllPreview?.needsRepair) return;
    setRepairingAll(true);
    try {
      await repairAllEquipment();
      // Refresh preview sau khi repair
      const response = await previewRepairAll();
      if (response?.success && response?.data) {
        setRepairAllPreview(response.data);
      } else if (response?.needsRepair !== undefined) {
        setRepairAllPreview(response);
      }
    } catch (err) {
      // Silently fail
    } finally {
      setRepairingAll(false);
    }
  };

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

  const handleUse = async (itemId, e) => {
    e?.preventDefault();
    e?.stopPropagation();

    // Capture click position before async op
    let startPos = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    if (e && e.currentTarget) {
      const rect = e.currentTarget.getBoundingClientRect();
      startPos = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    }

    if (isProcessingRef.current) return;
    isProcessingRef.current = true;

    setEquipping(itemId);
    try {
      if (useItem) {
        const result = await useItem(itemId);

        // Trigger FlyingReward if there is a direct reward (exp/money)
        if (result?.reward) {
          const { type, amount, spiritStones, exp } = result.reward;
          const rewards = [];

          if (type === 'exp' || exp > 0) rewards.push({ type: 'exp', amount: amount || exp });
          if (type === 'money' || type === 'spirit_stones' || spiritStones > 0) rewards.push({ type: 'stone', amount: amount || spiritStones });

          if (rewards.length > 0) {
            setRewardsAnimation(prev => [...prev, {
              id: Date.now(),
              startPos,
              rewards
            }]);
          }
        }

        // Kiểm tra nếu là loot box result
        if (result?.reward?.type === 'lootbox' && result?.reward?.droppedItem) {
          setLootboxResult(result.reward.droppedItem);
        }
      }
    } finally {
      setEquipping(null);
      isProcessingRef.current = false;
    }
  };

  if (loading || !cultivation) {
    return <LoadingSkeleton />;
  }

  const inventory = cultivation.inventory || [];
  const equipped = cultivation.equipped || {};

  // Parent Categories (matching ShopTab)
  const parentCategories = [
    { id: 'all', label: 'Tất cả' },
    { id: 'equipment', label: 'Trang Bị' },
    { id: 'decoration', label: 'Trang Trí' },
    { id: 'consumable_group', label: 'Vật Phẩm' },
    { id: 'companion', label: 'Đồng Hành' }
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
    decoration: [
      { id: 'all', label: 'Tất cả' },
      { id: 'title', label: 'Danh Hiệu' },
      { id: 'badge', label: 'Huy Hiệu' },
      { id: 'avatar_frame', label: 'Khung Avatar' },
      { id: 'profile_effect', label: 'Hiệu Ứng' }
    ],
    consumable_group: [
      { id: 'all', label: 'Tất cả' },
      { id: 'exp_boost', label: 'Đan Dược' },
      { id: 'breakthrough_boost', label: 'Độ Kiếp Đan' },
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
    if (category === 'equipment') return item.type?.startsWith('equipment_');
    if (category === 'decoration') return ['title', 'badge', 'avatar_frame', 'profile_effect'].includes(item.type);
    if (category === 'consumable_group') return ['exp_boost', 'breakthrough_boost', 'consumable'].includes(item.type);
    if (category === 'companion') return ['pet', 'mount'].includes(item.type);
    // Direct type match
    return item.type === category;
  };

  const filteredItems = inventory.filter(item => {
    // First filter by parent category
    if (!checkCategory(item, activeCategory)) return false;

    // Then filter by sub category if applicable
    if (subCategories[activeCategory] && activeSubCategory !== 'all') {
      return item.type === activeSubCategory;
    }
    return true;
  });

  // Check if item is equipped
  const isItemEquipped = (item) => {
    if (item.type === 'title') return equipped.title === item.itemId;
    if (item.type === 'badge') return equipped.badge === item.itemId;
    if (item.type === 'avatar_frame') return equipped.avatarFrame === item.itemId;
    if (item.type === 'profile_effect') return equipped.profileEffect === item.itemId;
    if (item.type === 'pet') return equipped.pet === item.itemId;
    if (item.type === 'mount') return equipped.mount === item.itemId;

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
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="font-bold text-gold font-title tracking-wide text-xl lg:text-2xl">TÚI ĐỒ</h3>
        <div className="flex items-center gap-3">
          {/* Nút Tu Bổ Tất Cả */}
          {repairAllPreview && repairAllPreview.needsRepair > 0 && (
            <motion.button
              onClick={handleRepairAll}
              disabled={repairingAll || !repairAllPreview.canAfford}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${repairAllPreview.canAfford
                ? 'bg-amber-900/30 hover:bg-amber-800/50 border-amber-500/30 text-amber-300'
                : 'bg-slate-800/50 border-slate-600/30 text-slate-500 cursor-not-allowed'
                }`}
              whileTap={repairAllPreview.canAfford ? { scale: 0.95 } : {}}
              title={!repairAllPreview.canAfford ? `Cần ${repairAllPreview.totalCost.toLocaleString()} linh thạch` : ''}
            >
              {repairingAll ? (
                <span className="animate-pulse">Đang tu bổ...</span>
              ) : (
                <>
                  <span>Tu Bổ Tất Cả ({repairAllPreview.needsRepair})</span>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] ${repairAllPreview.canAfford ? 'bg-amber-800/50 text-amber-200' : 'bg-red-900/50 text-red-300'
                    }`}>
                    {repairAllPreview.totalCost.toLocaleString()} linh thạch
                  </span>
                </>
              )}
            </motion.button>
          )}
        </div>
      </div>

      {/* Equipped Items Summary - Collapsible */}
      {(equipped.title || equipped.badge || equipped.avatarFrame || equipped.profileEffect ||
        equipped.weapon || equipped.magicTreasure || equipped.helmet || equipped.chest ||
        equipped.shoulder || equipped.gloves || equipped.boots || equipped.belt ||
        equipped.ring || equipped.necklace || equipped.earring || equipped.bracelet || equipped.powerItem) && (
          <div className="bg-gradient-to-r from-emerald-900/20 to-teal-900/20 border border-emerald-500/30 rounded-xl overflow-hidden">
            {/* Collapsible Header */}
            <button
              onClick={() => setEquippedExpanded(!equippedExpanded)}
              className="w-full flex items-center justify-between px-3 py-2 hover:bg-emerald-900/20 transition-colors"
            >
              <span className="text-xs text-emerald-400 uppercase tracking-wider">
                Đang trang bị
              </span>
              <svg
                className={`w-4 h-4 text-emerald-400 transition-transform duration-200 ${equippedExpanded ? 'rotate-180' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Collapsible Content */}
            <AnimatePresence>
              {equippedExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="flex flex-wrap gap-2 px-3 pb-3">
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
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

      {/* Parent Category Filter - Horizontal scroll on mobile */}
      <div className="-mx-4 px-4 sm:mx-0 sm:px-0 overflow-x-auto pb-2 scrollbar-hide">
        <div className="flex gap-2 min-w-max sm:flex-wrap sm:min-w-0">
          {parentCategories.map(cat => {
            // Count items for this category
            const count = cat.id === 'all'
              ? inventory.length
              : inventory.filter(i => checkCategory(i, cat.id)).length;
            if (count === 0 && cat.id !== 'all') return null;
            return (
              <button
                key={cat.id}
                onClick={() => {
                  setActiveCategory(cat.id);
                  setActiveSubCategory('all');
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${activeCategory === cat.id
                  ? 'bg-emerald-600 border-emerald-400 text-white shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                  : 'bg-slate-800 border-slate-600 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
                  }`}
              >
                {cat.label}
                {count > 0 && <span className="ml-1 opacity-60">({count})</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Sub Category Filter - Only show when parent has sub categories */}
      {subCategories[activeCategory] && (
        <div className="-mx-4 px-4 sm:mx-0 sm:px-0 overflow-x-auto pb-2 animate-in fade-in slide-in-from-top-2 duration-300 scrollbar-hide">
          <div className="flex gap-2 min-w-max sm:flex-wrap sm:min-w-0">
            {subCategories[activeCategory].map(sub => {
              const count = sub.id === 'all'
                ? inventory.filter(i => checkCategory(i, activeCategory)).length
                : inventory.filter(i => i.type === sub.id).length;
              if (count === 0 && sub.id !== 'all') return null;
              return (
                <button
                  key={sub.id}
                  onClick={() => { setActiveSubCategory(sub.id); setCurrentPage(1); }}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all border ${activeSubCategory === sub.id
                    ? 'bg-amber-600 border-amber-400 text-white shadow-[0_0_8px_rgba(245,158,11,0.3)]'
                    : 'bg-slate-800 border-slate-600 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
                    }`}
                >
                  {sub.label}
                  {count > 0 && <span className="ml-1 opacity-60">({count})</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {filteredItems.length === 0 ? (
        <div className="h-48 flex flex-col items-center justify-center text-slate-500 opacity-50">
          <span className="text-4xl mb-2"></span>
          <p className="text-xs uppercase tracking-widest">
            {activeCategory === 'all' ? 'Túi trống rỗng' : 'Không có vật phẩm loại này'}
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredItems.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((item, index) => {
              const shopItem = SHOP_ITEM_DATA[item.itemId];
              // Rarity priority: item.rarity -> metadata.rarity -> SHOP_ITEM_DATA.rarity -> common
              const rarityKey = item.rarity || item.metadata?.rarity || shopItem?.rarity || 'common';

              const rarity = RARITY_COLORS[rarityKey] || RARITY_COLORS.common;
              const typeInfo = ITEM_TYPE_LABELS[item.type] || { label: 'Khác', color: 'text-slate-300' };
              const equipped = isItemEquipped(item);
              const consumable = isConsumable(item.type);
              const ItemIcon = getItemIcon(item);

              return (
                <div
                  key={item._id || `${item.itemId}-${index}`}
                  className={`relative rounded-xl p-4 flex justify-between items-center transition-all border ${rarity.bg} ${rarity.border} ${equipped ? 'ring-2 ring-emerald-500/50' : ''} hover:scale-[1.02] hover:z-50`}
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
                        <h4 className={`font-bold text-sm ${rarity.text}`}>
                          {item.name}
                        </h4>
                        <span className="bg-slate-700/50 text-slate-300 text-[10px] px-1.5 py-0.5 rounded font-mono">
                          x{item.quantity || 1}
                        </span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${rarity.bg} ${rarity.text} border ${rarity.border}`}>
                          {rarity.label}
                        </span>
                        {(item.subtype || item.metadata?.subtype) && EQUIPMENT_SUBTYPES[item.subtype || item.metadata?.subtype] && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-700/50 text-slate-300 border border-slate-600/50">
                            {EQUIPMENT_SUBTYPES[item.subtype || item.metadata?.subtype]}
                          </span>
                        )}
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
                      {/* Hiển thị độ bền cho equipment */}
                      {item.type?.startsWith('equipment_') && (item.metadata?.durability || item.durability) && (() => {
                        const durability = item.metadata?.durability || item.durability;
                        const current = durability.current ?? durability;
                        const max = durability.max ?? 100;
                        const percentage = Math.round((current / max) * 100);
                        const durabilityColor = percentage > 50 ? 'bg-emerald-500' : percentage > 20 ? 'bg-amber-500' : 'bg-red-500';
                        const durabilityTextColor = percentage > 50 ? 'text-emerald-400' : percentage > 20 ? 'text-amber-400' : 'text-red-400';

                        const isBroken = current <= 0;

                        return (
                          <div className="mt-1.5">
                            <div className="flex justify-between items-center text-[10px] mb-0.5">
                              <span className="text-slate-500">Độ Bền</span>
                              <span className={isBroken ? 'text-red-500 font-bold' : durabilityTextColor}>{current}/{max}</span>
                            </div>
                            <div className="h-1 bg-slate-700 rounded-full overflow-hidden">
                              <div
                                className={`h-full ${isBroken ? 'bg-red-600' : durabilityColor} transition-all duration-300`}
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                            {isBroken ? (
                              <p className="text-[9px] text-red-500 font-bold mt-0.5 animate-pulse">Đã hư hỏng! Chỉ số không được áp dụng</p>
                            ) : percentage <= 20 && (
                              <p className="text-[9px] text-red-400 mt-0.5">Cần tu bổ!</p>
                            )}
                          </div>
                        );
                      })()}
                      {/* Hiển thị chi tiết cho đan dược và vật phẩm tiêu hao */}
                      {(item.type === 'exp_boost' || item.type === 'consumable' || item.type === 'breakthrough_boost') && (() => {
                        const metadata = item.metadata || {};
                        const shopItemData = SHOP_ITEM_DATA[item.itemId] || {};
                        const effects = [];

                        // Hiệu ứng tăng exp
                        if (metadata.expBoost || metadata.exp_boost || shopItemData.multiplier) {
                          const boost = metadata.expBoost || metadata.exp_boost || shopItemData.multiplier;
                          effects.push({ label: 'Tăng Tu Vi', value: `x${boost}`, color: 'text-green-400' });
                        }
                        if (metadata.expMultiplier) {
                          effects.push({ label: 'Nhân Tu Vi', value: `x${metadata.expMultiplier}`, color: 'text-green-400' });
                        }
                        if (metadata.flatExp || shopItemData.expReward) {
                          const exp = metadata.flatExp || shopItemData.expReward;
                          effects.push({ label: 'Tu Vi', value: `+${exp.toLocaleString()}`, color: 'text-green-400' });
                        }

                        // Thời gian hiệu lực
                        if (metadata.duration || shopItemData.duration) {
                          const dur = metadata.duration || shopItemData.duration;
                          const hours = Math.floor(dur / 60);
                          const minutes = dur % 60;
                          const durationText = hours > 0 ? `${hours}h${minutes > 0 ? ` ${minutes}p` : ''}` : `${minutes} phút`;
                          effects.push({ label: 'Thời gian', value: durationText, color: 'text-cyan-400' });
                        }

                        // Breakthrough boost - check both metadata and shopItemData
                        if (metadata.breakthroughBoost || metadata.breakthrough_boost || shopItemData.breakthroughBonus) {
                          const boost = metadata.breakthroughBonus || metadata.breakthroughBoost || metadata.breakthrough_boost || shopItemData.breakthroughBonus;
                          effects.push({ label: 'Tăng Độ Kiếp', value: `+${boost}%`, color: 'text-purple-400' });
                        }

                        // Hiệu ứng hồi phục
                        if (metadata.healHp || metadata.heal_hp) {
                          effects.push({ label: 'Hồi Khí Huyết', value: `+${(metadata.healHp || metadata.heal_hp).toLocaleString()}`, color: 'text-pink-400' });
                        }
                        if (metadata.healMana || metadata.heal_mana) {
                          effects.push({ label: 'Hồi Chân Nguyên', value: `+${(metadata.healMana || metadata.heal_mana).toLocaleString()}`, color: 'text-blue-400' });
                        }

                        // Tăng stats tạm thời
                        if (metadata.attackBoost) {
                          effects.push({ label: 'Tấn Công', value: `+${metadata.attackBoost}`, color: 'text-red-400' });
                        }
                        if (metadata.defenseBoost) {
                          effects.push({ label: 'Phòng Thủ', value: `+${metadata.defenseBoost}`, color: 'text-blue-400' });
                        }

                        if (effects.length === 0) return null;

                        return (
                          <div className="mt-2 space-y-1 text-xs">
                            {effects.map((effect, idx) => (
                              <div key={idx} className="flex justify-between">
                                <span className="text-slate-500">{effect.label}:</span>
                                <span className={effect.color}>{effect.value}</span>
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                      {/* Hiển thị stats cho linh thú (pet) và tọa kỵ (mount) */}
                      {(item.type === 'pet' || item.type === 'mount') && (() => {
                        const metadata = item.metadata || {};
                        const effects = [];

                        // Pet bonuses - kiểm tra cả ở metadata và item level
                        const expBonus = metadata.expBonus ?? item.expBonus;
                        const spiritStoneBonus = metadata.spiritStoneBonus ?? item.spiritStoneBonus;
                        const questExpBonus = metadata.questExpBonus ?? item.questExpBonus;

                        if (expBonus) {
                          effects.push({ label: 'Tăng Tu Vi', value: `+${Math.round(expBonus * 100)}%`, color: 'text-green-400' });
                        }
                        if (spiritStoneBonus) {
                          effects.push({ label: 'Tăng Linh Thạch', value: `+${Math.round(spiritStoneBonus * 100)}%`, color: 'text-amber-400' });
                        }
                        if (questExpBonus) {
                          effects.push({ label: 'Tăng Exp Nhiệm Vụ', value: `+${Math.round(questExpBonus * 100)}%`, color: 'text-cyan-400' });
                        }

                        // Mount/Pet stats - kiểm tra cả ở metadata.stats và item.stats
                        // Fallback: nếu không có stats trong metadata, lấy từ SHOP_ITEM_DATA
                        const fallbackStats = (SHOP_ITEM_DATA[item.itemId]) ? SHOP_ITEM_DATA[item.itemId].stats : {};
                        const stats = metadata.stats || item.stats || fallbackStats || {};
                        const statLabels = {
                          attack: 'Tấn Công',
                          defense: 'Phòng Thủ',
                          qiBlood: 'Khí Huyết',
                          speed: 'Tốc Độ',
                          criticalRate: 'Chí Mạng',
                          dodge: 'Né Tránh',
                          penetration: 'Xuyên Thấu',
                          resistance: 'Kháng Cự',
                          lifesteal: 'Hấp Huyết',
                          regeneration: 'Hồi Phục',
                          luck: 'Vận Khí'
                        };

                        Object.entries(stats).forEach(([key, value]) => {
                          if (value && statLabels[key]) {
                            effects.push({
                              label: statLabels[key],
                              value: `+${Math.round(value * 100)}%`,
                              color: 'text-purple-400'
                            });
                          }
                        });

                        if (effects.length === 0) return null;

                        return (
                          <div className="mt-2 space-y-1 text-xs">
                            {effects.map((effect, idx) => (
                              <div key={idx} className="flex justify-between">
                                <span className="text-slate-500">{effect.label}:</span>
                                <span className={effect.color}>{effect.value}</span>
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                      <p className={`text-[10px] mt-1 ${typeInfo.color}`}>{typeInfo.label}</p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <motion.button
                      onClick={(e) => consumable ? handleUse(item.itemId, e) : handleEquip(item, equipped)}
                      disabled={!!equipping || !!repairing}
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
                    {/* Nút Tu Bổ cho equipment có độ bền < 100% */}
                    {item.type?.startsWith('equipment_') && (() => {
                      const durability = item.metadata?.durability || item.durability;
                      if (!durability) return null;
                      const current = durability.current ?? durability;
                      const max = durability.max ?? 100;
                      if (current >= max) return null;

                      // Tính chi phí tu bổ (đã giảm 60%)
                      const durabilityToRepair = max - current;
                      const rarity = item.metadata?.rarity || 'common';
                      const REPAIR_COST = { common: 1, uncommon: 1, rare: 2, epic: 4, legendary: 10, mythic: 20 };
                      const costPerPoint = REPAIR_COST[rarity] || 2;
                      const repairCost = durabilityToRepair * costPerPoint;
                      const canAfford = (cultivation?.spiritStones || 0) >= repairCost;

                      const handleRepair = async (e) => {
                        e.stopPropagation();
                        const equipmentId = item.metadata?._id || item.itemId;
                        setRepairing(equipmentId);
                        try {
                          await repairEquipment(equipmentId);
                          // Refresh preview sau khi repair
                          const preview = await previewRepairAll();
                          setRepairAllPreview(preview);
                        } catch (err) {
                          // Error handled by hook notification
                        } finally {
                          setRepairing(null);
                        }
                      };

                      return (
                        <motion.button
                          onClick={handleRepair}
                          disabled={!!repairing || !!equipping || !canAfford}
                          className={`rounded-lg px-3 py-1.5 text-[10px] font-bold transition-all border flex flex-col items-center gap-0.5 ${canAfford
                            ? 'bg-amber-900/30 hover:bg-amber-800/50 border-amber-500/30 text-amber-300'
                            : 'bg-slate-800/50 border-slate-600/30 text-slate-500 cursor-not-allowed'
                            }`}
                          whileTap={canAfford ? { scale: 0.95 } : {}}
                          title={!canAfford ? `Cần ${repairCost.toLocaleString()} linh thạch` : ''}
                        >
                          <span>{repairing === (item.metadata?._id || item.itemId) ? 'Đang tu bổ...' : 'Tu Bổ'}</span>
                          <span className={`text-[9px] ${canAfford ? 'text-amber-400/70' : 'text-red-400/70'}`}>
                            {repairCost.toLocaleString()} linh thạch
                          </span>
                        </motion.button>
                      );
                    })()}
                  </div>
                </div>
              );
            })}
          </div>
          <Pagination
            currentPage={currentPage}
            totalPages={Math.ceil(filteredItems.length / itemsPerPage)}
            onPageChange={setCurrentPage}
            itemsPerPage={itemsPerPage}
            totalItems={filteredItems.length}
          />
        </>
      )}

      {/* Tooltip Portal */}
      {hoveredItem && (
        <ItemTooltip
          item={hoveredItem}
          stats={hoveredItem.metadata?.stats || hoveredItem.stats}
          position={tooltipPosition}
        />
      )}

      {/* Rewards Animation */}
      {rewardsAnimation.map(anim => (
        <FlyingReward
          key={anim.id}
          startPos={anim.startPos}
          rewards={anim.rewards}
          onComplete={() => setRewardsAnimation(prev => prev.filter(p => p.id !== anim.id))}
        />
      ))}

      {/* Loot Box Result Modal */}
      <AnimatePresence>
        {lootboxResult && (
          <LootboxResultModal
            result={lootboxResult}
            onClose={() => setLootboxResult(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
});

export default InventoryTab;

