/**
 * Equipment Management Page - Admin Only
 * Quản lý equipment: thêm, sửa, xóa, filter
 */
import { useState, useEffect, memo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit, Trash2, Search, X, Save, ArrowLeft, Upload, Image as ImageIcon, Loader2, RefreshCw, Zap, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api';
import { RARITY_COLORS } from '../cultivation/utils/constants';

const EQUIPMENT_TYPES = {
  weapon: 'Vũ Khí',
  magic_treasure: 'Pháp Bảo',
  armor: 'Giáp - Khải',
  accessory: 'Trang Sức',
  power_item: 'Linh Thạch - Châu - Ấn',
  pill: 'Đan Dược'
};

const WEAPON_SUBTYPES = {
  sword: 'Kiếm',
  saber: 'Đao',
  spear: 'Thương',
  bow: 'Cung',
  fan: 'Quạt',
  flute: 'Sáo / Tiêu',
  brush: 'Bút Pháp',
  dual_sword: 'Song Kiếm',
  flying_sword: 'Linh Kiếm Phi Hành'
};

const ARMOR_SUBTYPES = {
  helmet: 'Mũ/Trâm',
  chest: 'Giáp Ngực',
  shoulder: 'Vai Giáp',
  gloves: 'Hộ Thủ',
  boots: 'Hộ Cước',
  belt: 'Đai Lưng'
};

const ACCESSORY_SUBTYPES = {
  ring: 'Nhẫn',
  necklace: 'Dây Chuyền',
  earring: 'Bông Tai',
  bracelet: 'Vòng Tay'
};

const POWER_ITEM_SUBTYPES = {
  spirit_stone: 'Linh Thạch',
  spirit_pearl: 'Linh Châu',
  spirit_seal: 'Linh Ấn'
};

const RARITY_OPTIONS = [
  { value: 'common', label: 'Phàm Phẩm', color: RARITY_COLORS.common },
  { value: 'uncommon', label: 'Tinh Phẩm', color: RARITY_COLORS.uncommon },
  { value: 'rare', label: 'Hiếm Có', color: RARITY_COLORS.rare },
  { value: 'epic', label: 'Cực Phẩm', color: RARITY_COLORS.epic },
  { value: 'legendary', label: 'Thần Bảo', color: RARITY_COLORS.legendary },
  { value: 'mythic', label: 'Tiên Bảo', color: RARITY_COLORS.mythic || '#FFD700' }
];

const ELEMENTAL_TYPES = {
  fire: 'Hỏa',
  ice: 'Băng',
  wind: 'Phong',
  thunder: 'Lôi',
  earth: 'Thổ',
  water: 'Thủy',
  light: 'Quang',
  dark: 'Ám'
};

// Hệ số nhân theo phẩm chất (điều chỉnh cân bằng: max ×6 thay vì ×10)
const RARITY_MULTIPLIERS = {
  common: 1.0,
  uncommon: 1.4,
  rare: 2.0,
  epic: 3.0,
  legendary: 4.5,
  mythic: 6.0
};

// Bonus Crit Rate theo phẩm chất (flat, không nhân)
const CRIT_RATE_BONUS = {
  common: 0,
  uncommon: 0.01,
  rare: 0.02,
  epic: 0.03,
  legendary: 0.04,
  mythic: 0.05
};

// Chỉ số cơ bản theo loại trang bị (fallback nếu không có subtype)
const BASE_STATS = {
  weapon: { attack: 50, defense: 0, hp: 0, crit_rate: 0.02, crit_damage: 0.1, speed: 5, price: 500 },
  magic_treasure: { attack: 30, defense: 10, hp: 100, crit_rate: 0.03, crit_damage: 0.15, speed: 0, price: 800 },
  armor: { attack: 0, defense: 40, hp: 200, crit_rate: 0, crit_damage: 0, speed: 0, price: 600 },
  accessory: { attack: 15, defense: 15, hp: 50, crit_rate: 0.05, crit_damage: 0.2, speed: 3, price: 400 },
  power_item: { attack: 25, defense: 5, hp: 80, crit_rate: 0.02, crit_damage: 0.1, speed: 2, price: 350 },
  pill: { attack: 10, defense: 10, hp: 150, crit_rate: 0.01, crit_damage: 0.05, speed: 5, price: 200 }
};

// Chỉ số chi tiết theo SUBTYPE - các loại khác nhau có stats khác nhau
const SUBTYPE_STATS = {
  // === VŨ KHÍ ===
  sword: { attack: 50, defense: 5, hp: 0, crit_rate: 0.03, crit_damage: 0.12, speed: 5, price: 500 },      // Kiếm: cân bằng
  saber: { attack: 65, defense: 0, hp: 0, crit_rate: 0.02, crit_damage: 0.15, speed: 3, price: 550 },      // Đao: mạnh attack, chậm
  spear: { attack: 55, defense: 0, hp: 0, crit_rate: 0.02, crit_damage: 0.10, speed: 6, price: 480 },      // Thương: tầm xa, nhanh
  bow: { attack: 45, defense: 0, hp: 0, crit_rate: 0.06, crit_damage: 0.20, speed: 4, price: 520 },        // Cung: crit cao
  fan: { attack: 35, defense: 10, hp: 50, crit_rate: 0.04, crit_damage: 0.15, speed: 7, price: 600 },      // Quạt: hỗ trợ, nhanh
  flute: { attack: 30, defense: 5, hp: 80, crit_rate: 0.03, crit_damage: 0.12, speed: 8, price: 650 },     // Sáo: hỗ trợ, HP
  brush: { attack: 40, defense: 15, hp: 60, crit_rate: 0.04, crit_damage: 0.18, speed: 5, price: 700 },    // Bút: cân bằng sát thương/trợ
  dual_sword: { attack: 70, defense: 0, hp: 0, crit_rate: 0.05, crit_damage: 0.18, speed: 8, price: 650 }, // Song kiếm: DPS cao
  flying_sword: { attack: 60, defense: 0, hp: 0, crit_rate: 0.04, crit_damage: 0.15, speed: 10, price: 800 }, // Linh kiếm: nhanh nhất

  // === GIÁP ===
  helmet: { attack: 0, defense: 25, hp: 150, crit_rate: 0, crit_damage: 0, speed: 0, price: 400 },         // Mũ: HP cao
  chest: { attack: 0, defense: 60, hp: 250, crit_rate: 0, crit_damage: 0, speed: 0, price: 700 },          // Giáp ngực: phòng thủ cao nhất
  shoulder: { attack: 5, defense: 35, hp: 100, crit_rate: 0, crit_damage: 0, speed: 2, price: 500 },       // Vai: một chút attack
  gloves: { attack: 10, defense: 20, hp: 50, crit_rate: 0.02, crit_damage: 0.08, speed: 3, price: 450 },   // Găng: thêm crit
  boots: { attack: 0, defense: 30, hp: 80, crit_rate: 0, crit_damage: 0, speed: 8, price: 550 },           // Giày: tốc độ cao
  belt: { attack: 5, defense: 25, hp: 120, crit_rate: 0.01, crit_damage: 0.05, speed: 2, price: 400 },     // Đai: HP

  // === TRANG SỨC ===
  ring: { attack: 20, defense: 5, hp: 30, crit_rate: 0.04, crit_damage: 0.15, speed: 2, price: 500 },      // Nhẫn: damage + crit
  necklace: { attack: 15, defense: 15, hp: 80, crit_rate: 0.03, crit_damage: 0.12, speed: 3, price: 550 }, // Dây chuyền: cân bằng
  earring: { attack: 10, defense: 10, hp: 40, crit_rate: 0.06, crit_damage: 0.25, speed: 4, price: 500 },  // Bông tai: crit cao nhất
  bracelet: { attack: 15, defense: 20, hp: 60, crit_rate: 0.02, crit_damage: 0.10, speed: 5, price: 450 }, // Vòng tay: phòng thủ

  // === LINH THẠCH / CHÂU / ẤN ===
  spirit_stone: { attack: 30, defense: 5, hp: 50, crit_rate: 0.02, crit_damage: 0.10, speed: 3, price: 350 },  // Linh thạch: attack
  spirit_pearl: { attack: 15, defense: 20, hp: 100, crit_rate: 0.03, crit_damage: 0.12, speed: 2, price: 400 }, // Linh châu: defense + HP
  spirit_seal: { attack: 25, defense: 10, hp: 70, crit_rate: 0.04, crit_damage: 0.15, speed: 4, price: 450 }   // Linh ấn: cân bằng + crit
};

const EquipmentManagement = memo(function EquipmentManagement() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [equipments, setEquipments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [cleaningUp, setCleaningUp] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState(getInitialFormData());
  const [filters, setFilters] = useState({
    type: '',
    rarity: '',
    search: '',
    is_active: 'true',
    source: ''  // '' = all, 'admin' = admin-created, 'user' = user-crafted
  });
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 0 });

  function getInitialFormData() {
    return {
      name: '',
      type: 'weapon',
      subtype: '',
      rarity: 'common',
      level_required: 1,
      price: 0,
      img: '',
      description: '',
      stats: {
        attack: 0,
        defense: 0,
        hp: 0,
        crit_rate: 0,
        crit_damage: 0,
        penetration: 0,
        speed: 0,
        evasion: 0,
        hit_rate: 0,
        elemental_damage: {}
      },
      special_effect: '',
      skill_bonus: 0,
      energy_regen: 0,
      lifesteal: 0,
      true_damage: 0,
      buff_duration: 0,
      is_active: true
    };
  }

  useEffect(() => {
    loadEquipments();
  }, [filters, pagination.page]);

  // Debug: Log khi component mount
  useEffect(() => {
  }, []);

  // Tính toán chỉ số đề xuất dựa trên loại, phân loại và phẩm chất
  const calculateSuggestedStats = (type, subtype, rarity, levelRequired = 1) => {
    // Ưu tiên dùng stats theo subtype, fallback về type
    const baseStats = (subtype && SUBTYPE_STATS[subtype])
      ? SUBTYPE_STATS[subtype]
      : (BASE_STATS[type] || BASE_STATS.weapon);

    const multiplier = RARITY_MULTIPLIERS[rarity] || 1;
    const critBonus = CRIT_RATE_BONUS[rarity] || 0;
    const levelMultiplier = 1 + (levelRequired - 1) * 0.1; // +10% mỗi level

    return {
      stats: {
        attack: Math.round(baseStats.attack * multiplier * levelMultiplier),
        defense: Math.round(baseStats.defense * multiplier * levelMultiplier),
        hp: Math.round(baseStats.hp * multiplier * levelMultiplier),
        // Crit Rate: base + flat bonus (không nhân multiplier để tránh vượt cap)
        crit_rate: Math.round((baseStats.crit_rate + critBonus) * 100) / 100,
        // Crit Damage: có thể nhân theo rarity (ít nguy hiểm hơn crit rate)
        crit_damage: Math.round(baseStats.crit_damage * multiplier * 100) / 100,
        speed: Math.round(baseStats.speed * multiplier * levelMultiplier),
        penetration: 0,
        evasion: 0,
        hit_rate: 0,
        elemental_damage: {}
      },
      price: Math.round(baseStats.price * multiplier * levelMultiplier)
    };
  };

  // Áp dụng stats tự động (có tính subtype)
  const applyAutoBalance = () => {
    const suggested = calculateSuggestedStats(formData.type, formData.subtype, formData.rarity, formData.level_required);
    setFormData(prev => ({
      ...prev,
      stats: { ...prev.stats, ...suggested.stats },
      price: suggested.price
    }));
  };

  // Ẩn navbar và floating dock
  useEffect(() => {
    // Ẩn navbar
    const navbar = document.querySelector('nav');
    if (navbar) navbar.style.display = 'none';

    // Ẩn floating dock
    const floatingDock = document.querySelector('[class*="fixed bottom-6"]');
    if (floatingDock) floatingDock.style.display = 'none';

    // Cleanup: hiển thị lại khi unmount
    return () => {
      if (navbar) navbar.style.display = '';
      if (floatingDock) floatingDock.style.display = '';
    };
  }, []);

  const loadEquipments = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...Object.fromEntries(Object.entries(filters).filter(([_, v]) => v !== '' && v !== null && v !== undefined))
      });

      console.log('[EquipmentManagement] Loading equipments with params:', params.toString());
      const response = await api(`/api/equipment/admin/list?${params}`);
      if (response.success) {
        setEquipments(response.data || []);
        setPagination(prev => ({ ...prev, ...response.pagination }));
      } else {
        console.error('[EquipmentManagement] API returned success=false');
        setEquipments([]);
      }
    } catch (error) {
      console.error('[EquipmentManagement] Error loading equipments:', error);
      alert('Lỗi khi tải danh sách trang bị: ' + (error.message || 'Lỗi không xác định'));
      setEquipments([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Filter out stats with value 0 to keep payload clean
      const filteredStats = {};
      Object.entries(formData.stats).forEach(([key, value]) => {
        if (key === 'elemental_damage') {
          // Filter elemental damage to only include non-zero values
          const filteredElemental = Object.fromEntries(
            Object.entries(value).filter(([_, v]) => v > 0)
          );
          if (Object.keys(filteredElemental).length > 0) {
            filteredStats.elemental_damage = filteredElemental;
          }
        } else if (value > 0) {
          filteredStats[key] = value;
        }
      });

      const payload = {
        name: formData.name,
        type: formData.type,
        subtype: formData.subtype || null,
        rarity: formData.rarity,
        level_required: formData.level_required,
        price: formData.price,
        img: formData.img || null,
        description: formData.description,
        stats: filteredStats,
        special_effect: formData.special_effect || null,
        skill_bonus: formData.skill_bonus > 0 ? formData.skill_bonus : 0,
        energy_regen: formData.energy_regen > 0 ? formData.energy_regen : 0,
        lifesteal: formData.lifesteal > 0 ? formData.lifesteal : 0,
        true_damage: formData.true_damage > 0 ? formData.true_damage : 0,
        buff_duration: formData.buff_duration > 0 ? formData.buff_duration : 0,
        is_active: formData.is_active
      };

      console.log('[EquipmentManagement] Submitting payload:', JSON.stringify(payload, null, 2));

      if (editingId) {
        await api(`/api/equipment/admin/${editingId}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
        alert('Cập nhật trang bị thành công!');
      } else {
        await api('/api/equipment/admin/create', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
        alert('Tạo trang bị thành công!');
      }

      resetForm();
      loadEquipments();
    } catch (error) {
      console.error('Error saving equipment:', error);
      alert('Lỗi khi lưu trang bị: ' + (error.message || 'Lỗi không xác định'));
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (equipment) => {
    setFormData({
      name: equipment.name || '',
      type: equipment.type || 'weapon',
      subtype: equipment.subtype || '',
      rarity: equipment.rarity || 'common',
      level_required: equipment.level_required || 1,
      price: equipment.price || 0,
      img: equipment.img || '',
      description: equipment.description || '',
      stats: {
        attack: equipment.stats?.attack || 0,
        defense: equipment.stats?.defense || 0,
        hp: equipment.stats?.hp || 0,
        crit_rate: equipment.stats?.crit_rate || 0,
        crit_damage: equipment.stats?.crit_damage || 0,
        penetration: equipment.stats?.penetration || 0,
        speed: equipment.stats?.speed || 0,
        evasion: equipment.stats?.evasion || 0,
        hit_rate: equipment.stats?.hit_rate || 0,
        elemental_damage: equipment.stats?.elemental_damage || {}
      },
      special_effect: equipment.special_effect || '',
      skill_bonus: equipment.skill_bonus || 0,
      energy_regen: equipment.energy_regen || 0,
      lifesteal: equipment.lifesteal || 0,
      true_damage: equipment.true_damage || 0,
      buff_duration: equipment.buff_duration || 0,
      is_active: equipment.is_active !== false
    });
    setEditingId(equipment._id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Bạn có chắc muốn xóa trang bị này?')) return;

    try {
      await api(`/api/equipment/admin/${id}`, { method: 'DELETE' });
      alert('Xóa trang bị thành công!');
      loadEquipments();
    } catch (error) {
      console.error('Error deleting equipment:', error);
      alert('Lỗi khi xóa trang bị: ' + (error.message || 'Lỗi không xác định'));
    }
  };

  const resetForm = () => {
    setFormData(getInitialFormData());
    setEditingId(null);
    setShowForm(false);
  };

  const updateFormData = (field, value) => {
    if (field.startsWith('stats.')) {
      const statField = field.split('.')[1];
      setFormData(prev => ({
        ...prev,
        stats: { ...prev.stats, [statField]: value }
      }));
    } else if (field.startsWith('elemental_damage.')) {
      const element = field.split('.')[1];
      setFormData(prev => ({
        ...prev,
        stats: {
          ...prev.stats,
          elemental_damage: {
            ...prev.stats.elemental_damage,
            [element]: parseFloat(value) || 0
          }
        }
      }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  const handleCleanup = async () => {
    if (!confirm('Bạn có chắc muốn dọn dẹp tất cả trang bị đã xóa khỏi túi đồ người dùng?')) return;

    setCleaningUp(true);
    try {
      const response = await api('/api/equipment/admin/cleanup', { method: 'POST' });
      if (response.success) {
        alert(response.message);
        loadEquipments();
      } else {
        alert('Lỗi: ' + (response.message || 'Không thể dọn dẹp'));
      }
    } catch (error) {
      console.error('Cleanup error:', error);
      alert('Lỗi khi dọn dẹp: ' + (error.message || 'Vui lòng thử lại'));
    } finally {
      setCleaningUp(false);
    }
  };

  // State cho bulk rebalance
  const [rebalancing, setRebalancing] = useState(false);

  // Bulk rebalance tất cả equipment
  const handleBulkRebalance = async () => {
    if (!confirm('Cảnh báo: Thao tác này sẽ cập nhật chỉ số của TẤT CẢ trang bị dựa trên công thức cân bằng.\n\nBạn có chắc chắn muốn tiếp tục?')) return;

    setRebalancing(true);
    try {
      const response = await api('/api/equipment/admin/bulk-rebalance', { method: 'POST' });
      if (response.success) {
        alert(response.message);
        loadEquipments();
      } else {
        alert('Lỗi: ' + (response.message || 'Không thể cân bằng'));
      }
    } catch (error) {
      console.error('Bulk rebalance error:', error);
      alert('Lỗi khi cân bằng: ' + (error.message || 'Vui lòng thử lại'));
    } finally {
      setRebalancing(false);
    }
  };

  // State cho auto-generate
  const [showAutoGenerate, setShowAutoGenerate] = useState(false);
  const [autoGenerating, setAutoGenerating] = useState(false);
  const [autoGenForm, setAutoGenForm] = useState({
    type: 'weapon',
    subtype: '',
    rarity: 'common',
    level_required: 1,
    element: '',
    customName: '',
    description: '',
    special_effect: ''
  });

  const ELEMENT_OPTIONS = [
    { value: '', label: 'Không có' },
    { value: 'fire', label: '🔥 Hỏa' },
    { value: 'ice', label: '❄️ Băng' },
    { value: 'wind', label: '💨 Phong' },
    { value: 'thunder', label: '⚡ Lôi' },
    { value: 'earth', label: '🌍 Thổ' },
    { value: 'water', label: '💧 Thủy' }
  ];

  const handleAutoGenerate = async () => {
    setAutoGenerating(true);
    try {
      const payload = {
        type: autoGenForm.type,
        subtype: autoGenForm.subtype || null,
        rarity: autoGenForm.rarity,
        level_required: autoGenForm.level_required,
        element: autoGenForm.element || null,
        customName: autoGenForm.customName || null,
        description: autoGenForm.description || null,
        special_effect: autoGenForm.special_effect || null
      };

      const response = await api('/api/equipment/admin/auto-generate', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      if (response.success) {
        alert(response.message);
        setShowAutoGenerate(false);
        setAutoGenForm({
          type: 'weapon',
          subtype: '',
          rarity: 'common',
          level_required: 1,
          element: '',
          customName: '',
          description: '',
          special_effect: ''
        });
        loadEquipments();
      } else {
        alert('Lỗi: ' + (response.message || response.error || 'Không thể tạo'));
      }
    } catch (error) {
      console.error('Auto-generate error:', error);
      alert('Lỗi khi tạo trang bị: ' + (error.message || 'Vui lòng thử lại'));
    } finally {
      setAutoGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-black text-neutral-900 dark:text-neutral-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="sticky top-0 z-40 bg-white/95 dark:bg-black/95 backdrop-blur-sm border-b border-neutral-200 dark:border-neutral-800 pb-4 mb-6 -mx-6 px-6 pt-2">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/admin')}
                className="flex items-center gap-2 px-4 py-2 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-xl transition-all"
                title="Trở về Admin Dashboard"
              >
                <ArrowLeft size={20} />
                <span className="hidden sm:inline">Trở về</span>
              </button>
              <h1 className="text-2xl sm:text-3xl font-bold text-neutral-900 dark:text-white">
                Quản Lý Trang Bị
              </h1>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={handleBulkRebalance}
                disabled={rebalancing}
                className="flex items-center gap-2 px-4 py-2.5 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-400 rounded-xl transition-all text-sm font-medium disabled:opacity-50"
                title="Tự động cân bằng tất cả trang bị theo phẩm chất"
              >
                {rebalancing ? <Loader2 size={18} className="animate-spin" /> : <Zap size={18} />}
                <span className="hidden sm:inline">Đồng bộ tất cả</span>
              </button>
              <button
                onClick={handleCleanup}
                disabled={cleaningUp}
                className="flex items-center gap-2 px-4 py-2.5 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-400 rounded-xl transition-all text-sm font-medium disabled:opacity-50"
                title="Dọn dẹp trang bị đã xóa khỏi túi đồ"
              >
                {cleaningUp ? <Loader2 size={18} className="animate-spin" /> : <RefreshCw size={18} />}
                <span className="hidden sm:inline">Dọn dẹp</span>
              </button>
              <button
                onClick={() => setShowAutoGenerate(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl transition-all text-sm font-bold"
                title="Tự động tạo trang bị với stats theo công thức"
              >
                <Sparkles size={18} />
                <span className="hidden sm:inline">Tạo Tự Động</span>
              </button>
              <button
                onClick={() => {
                  resetForm();
                  setShowForm(true);
                }}
                className="flex items-center gap-2 px-5 py-2.5 bg-black dark:bg-white text-white dark:text-black rounded-xl transition-all font-bold text-sm hover:opacity-80"
              >
                <Plus size={18} />
                <span>Thêm Trang Bị</span>
              </button>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-neutral-50 dark:bg-neutral-900 rounded-2xl p-4 mb-6 grid grid-cols-1 md:grid-cols-4 gap-4 border border-neutral-200 dark:border-neutral-800">
          <div>
            <label className="block text-xs font-bold uppercase text-neutral-500 mb-2">Tìm kiếm</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
              <input
                type="text"
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                placeholder="Tên trang bị..."
                className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-neutral-100 outline-none focus:ring-2 focus:ring-neutral-400 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-neutral-500 mb-2">Loại</label>
            <select
              value={filters.type}
              onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
              className="w-full px-4 py-2.5 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-neutral-100 outline-none focus:ring-2 focus:ring-neutral-400 transition-all cursor-pointer"
            >
              <option value="">Tất cả</option>
              {Object.entries(EQUIPMENT_TYPES).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-neutral-500 mb-2">Độ Hiếm</label>
            <select
              value={filters.rarity}
              onChange={(e) => setFilters(prev => ({ ...prev, rarity: e.target.value }))}
              className="w-full px-4 py-2.5 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-neutral-100 outline-none focus:ring-2 focus:ring-neutral-400 transition-all cursor-pointer"
            >
              <option value="">Tất cả</option>
              {RARITY_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-neutral-500 mb-2">Trạng Thái</label>
            <select
              value={filters.is_active}
              onChange={(e) => setFilters(prev => ({ ...prev, is_active: e.target.value }))}
              className="w-full px-4 py-2.5 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-neutral-100 outline-none focus:ring-2 focus:ring-neutral-400 transition-all cursor-pointer"
            >
              <option value="true">Đang Hoạt Động</option>
              <option value="false">Vô Hiệu Hóa</option>
              <option value="">Tất cả</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-neutral-500 mb-2">Nguồn Gốc</label>
            <select
              value={filters.source}
              onChange={(e) => setFilters(prev => ({ ...prev, source: e.target.value }))}
              className="w-full px-4 py-2.5 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-neutral-100 outline-none focus:ring-2 focus:ring-neutral-400 transition-all cursor-pointer"
            >
              <option value="">Tất cả</option>
              <option value="admin">Admin Tạo</option>
              <option value="user">User Luyện Chế</option>
            </select>
          </div>
        </div>

        {/* Equipment List */}
        {loading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-black dark:border-white"></div>
            <p className="mt-4 text-neutral-500">Đang tải danh sách trang bị...</p>
          </div>
        )}

        {!loading && equipments.length === 0 && (
          <div className="text-center py-12 bg-neutral-50 dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800">
            <p className="text-neutral-500 mb-4">Chưa có trang bị nào</p>
            <button
              onClick={() => {
                resetForm();
                setShowForm(true);
              }}
              className="inline-flex items-center gap-2 px-6 py-3 bg-black dark:bg-white text-white dark:text-black rounded-xl transition-colors font-bold hover:opacity-80"
            >
              <Plus size={20} />
              <span>Thêm Trang Bị Đầu Tiên</span>
            </button>
          </div>
        )}

        {!loading && equipments.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {equipments.map((eq) => (
              <motion.div
                key={eq._id}
                className="bg-white dark:bg-neutral-900 rounded-2xl p-4 border border-neutral-200 dark:border-neutral-800 hover:border-neutral-400 dark:hover:border-neutral-600 transition-all hover:shadow-lg"
                whileHover={{ y: -2 }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-base truncate" style={{ color: RARITY_OPTIONS.find(r => r.value === eq.rarity)?.color }}>
                      {eq.name}
                    </h3>
                    <p className="text-xs text-neutral-500">{EQUIPMENT_TYPES[eq.type]}</p>
                    {/* Creator badge */}
                    {eq.created_by && (
                      <p className="text-[10px] text-amber-500 truncate">
                        {eq.description?.includes('tế luyện') || eq.description?.includes('luyện chế') ? '⚒️ ' : '👑 '}
                        {eq.created_by.displayName || eq.created_by.username || 'System'}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-1 ml-2">
                    <button
                      onClick={() => handleEdit(eq)}
                      className="p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
                    >
                      <Edit size={14} className="text-neutral-500" />
                    </button>
                    <button
                      onClick={() => handleDelete(eq._id)}
                      className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    >
                      <Trash2 size={14} className="text-red-500" />
                    </button>
                  </div>
                </div>

                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Level:</span>
                    <span className="font-medium">{eq.level_required}</span>
                  </div>
                  {eq.price > 0 && (
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Giá:</span>
                      <span className="font-medium">{eq.price.toLocaleString()}</span>
                    </div>
                  )}
                  {eq.stats && (
                    <>
                      {eq.stats.attack > 0 && (
                        <div className="flex justify-between">
                          <span className="text-neutral-500">Tấn Công:</span>
                          <span className="text-red-500 font-medium">+{eq.stats.attack}</span>
                        </div>
                      )}
                      {eq.stats.defense > 0 && (
                        <div className="flex justify-between">
                          <span className="text-neutral-500">Phòng Thủ:</span>
                          <span className="text-black dark:text-white font-medium">+{eq.stats.defense}</span>
                        </div>
                      )}
                      {eq.stats.hp > 0 && (
                        <div className="flex justify-between">
                          <span className="text-neutral-500">Khí Huyết:</span>
                          <span className="text-green-500 font-medium">+{eq.stats.hp}</span>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {!eq.is_active && (
                  <div className="mt-2 text-xs text-red-500 font-medium">Đã vô hiệu hóa</div>
                )}
              </motion.div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="flex justify-center items-center gap-3 mt-6">
            <button
              onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
              disabled={pagination.page === 1}
              className="px-4 py-2 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-xl disabled:opacity-50 font-medium text-sm transition-colors"
            >
              Trước
            </button>
            <span className="px-4 py-2 text-sm font-medium text-neutral-600 dark:text-neutral-400">
              Trang {pagination.page} / {pagination.pages}
            </span>
            <button
              onClick={() => setPagination(prev => ({ ...prev, page: Math.min(prev.pages, prev.page + 1) }))}
              disabled={pagination.page === pagination.pages}
              className="px-4 py-2 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-xl disabled:opacity-50 font-medium text-sm transition-colors"
            >
              Sau
            </button>
          </div>
        )}

        {/* Form Modal */}
        <AnimatePresence>
          {showForm && (
            <motion.div
              className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={(e) => e.target === e.currentTarget && resetForm()}
            >
              <motion.div
                className="bg-white dark:bg-neutral-900 rounded-2xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-neutral-200 dark:border-neutral-800 shadow-2xl"
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-neutral-900 dark:text-white">
                    {editingId ? 'Sửa Trang Bị' : 'Thêm Trang Bị Mới'}
                  </h2>
                  <button
                    onClick={resetForm}
                    className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition-colors"
                  >
                    <X size={20} className="text-neutral-500" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Basic Info */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase text-neutral-500 mb-2">Tên *</label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => updateFormData('name', e.target.value)}
                        required
                        className="w-full px-4 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl outline-none focus:ring-2 focus:ring-neutral-400 transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase text-neutral-500 mb-2">Loại *</label>
                      <select
                        value={formData.type}
                        onChange={(e) => updateFormData('type', e.target.value)}
                        required
                        className="w-full px-4 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl outline-none focus:ring-2 focus:ring-neutral-400 transition-all"
                      >
                        {Object.entries(EQUIPMENT_TYPES).map(([value, label]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                    </div>

                    {(formData.type === 'weapon' || formData.type === 'armor' || formData.type === 'accessory' || formData.type === 'power_item') && (
                      <div>
                        <label className="block text-xs font-bold uppercase text-neutral-500 mb-2">Phân Loại</label>
                        <select
                          value={formData.subtype}
                          onChange={(e) => updateFormData('subtype', e.target.value)}
                          className="w-full px-4 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl outline-none focus:ring-2 focus:ring-neutral-400 transition-all"
                        >
                          <option value="">Không có</option>
                          {formData.type === 'weapon' && Object.entries(WEAPON_SUBTYPES).map(([value, label]) => (
                            <option key={value} value={value}>{label}</option>
                          ))}
                          {formData.type === 'armor' && Object.entries(ARMOR_SUBTYPES).map(([value, label]) => (
                            <option key={value} value={value}>{label}</option>
                          ))}
                          {formData.type === 'accessory' && Object.entries(ACCESSORY_SUBTYPES).map(([value, label]) => (
                            <option key={value} value={value}>{label}</option>
                          ))}
                          {formData.type === 'power_item' && Object.entries(POWER_ITEM_SUBTYPES).map(([value, label]) => (
                            <option key={value} value={value}>{label}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-bold uppercase text-neutral-500 mb-2">Độ Hiếm *</label>
                      <select
                        value={formData.rarity}
                        onChange={(e) => updateFormData('rarity', e.target.value)}
                        required
                        className="w-full px-4 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl outline-none focus:ring-2 focus:ring-neutral-400 transition-all"
                      >
                        {RARITY_OPTIONS.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase text-neutral-500 mb-2">Cấp Yêu Cầu</label>
                      <input
                        type="number"
                        value={formData.level_required}
                        onChange={(e) => updateFormData('level_required', parseInt(e.target.value) || 1)}
                        min="1"
                        className="w-full px-4 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl outline-none focus:ring-2 focus:ring-neutral-400 transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase text-neutral-500 mb-2">Giá Bán (Linh Thạch)</label>
                      <input
                        type="number"
                        value={formData.price}
                        onChange={(e) => updateFormData('price', parseInt(e.target.value) || 0)}
                        min="0"
                        placeholder="0 = không bán"
                        className="w-full px-4 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl outline-none focus:ring-2 focus:ring-neutral-400 transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase text-neutral-500 mb-2">Hình Ảnh</label>

                      {/* Preview ảnh */}
                      {formData.img && (
                        <div className="mb-3 relative">
                          <img
                            src={formData.img}
                            alt="Xem trước trang bị"
                            className="w-full h-48 object-contain bg-slate-900 rounded-lg border border-slate-700"
                            onError={(e) => {
                              e.target.style.display = 'none';
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => updateFormData('img', '')}
                            className="absolute top-2 right-2 p-1 bg-red-600 hover:bg-red-700 rounded-full text-white"
                            title="Xóa ảnh"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      )}

                      {/* Upload button */}
                      <div className="flex items-center gap-3">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;

                            // Validate file type
                            if (!file.type.startsWith('image/')) {
                              alert('Vui lòng chọn file hình ảnh');
                              return;
                            }

                            // Validate file size (5MB max)
                            const maxSize = 5 * 1024 * 1024;
                            if (file.size > maxSize) {
                              alert('File quá lớn. Kích thước tối đa là 5MB');
                              return;
                            }

                            setUploadingImage(true);
                            try {
                              const formData = new FormData();
                              formData.append('file', file);

                              // Use the upload API endpoint
                              const response = await api('/api/uploads', {
                                method: 'POST',
                                body: formData
                              });

                              // Response format: { success: true, url: "...", type: "image" }
                              if (response && response.url) {
                                updateFormData('img', response.url);
                                alert('Ảnh đã được tải lên thành công!');
                              } else {
                                throw new Error(response?.message || 'Tải lên thất bại');
                              }
                            } catch (error) {
                              console.error('Upload error:', error);
                              alert('Có lỗi xảy ra khi tải lên ảnh: ' + (error.message || 'Vui lòng thử lại'));
                            } finally {
                              setUploadingImage(false);
                              // Reset input
                              if (fileInputRef.current) {
                                fileInputRef.current.value = '';
                              }
                            }
                          }}
                          className="hidden"
                        />

                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploadingImage}
                          className="flex items-center gap-2 px-4 py-2 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-colors text-sm font-medium"
                        >
                          {uploadingImage ? (
                            <>
                              <Loader2 size={18} className="animate-spin" />
                              <span>Đang tải lên...</span>
                            </>
                          ) : (
                            <>
                              <Upload size={18} />
                              <span>{formData.img ? 'Thay đổi ảnh' : 'Tải ảnh lên'}</span>
                            </>
                          )}
                        </button>

                        {formData.img && (
                          <a
                            href={formData.img}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-4 py-2 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-xl transition-colors text-sm font-medium"
                          >
                            <ImageIcon size={18} />
                            <span>Xem ảnh</span>
                          </a>
                        )}
                      </div>

                      <p className="text-xs text-neutral-500 mt-2">
                        Chọn ảnh để upload (JPG, PNG, GIF - tối đa 5MB)
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase text-neutral-500 mb-2">Mô Tả</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => updateFormData('description', e.target.value)}
                      rows="3"
                      className="w-full px-4 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl outline-none focus:ring-2 focus:ring-neutral-400 transition-all"
                    />
                  </div>

                  {/* Stats */}
                  <div className="border-t border-neutral-200 dark:border-neutral-800 pt-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-base font-bold text-neutral-900 dark:text-white">Thông Số</h3>
                      <button
                        type="button"
                        onClick={applyAutoBalance}
                        className="flex items-center gap-2 px-3 py-1.5 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-lg transition-colors text-xs font-medium"
                        title="Tự động điền chỉ số dựa trên loại và phẩm chất"
                      >
                        <RefreshCw size={14} />
                        Tự động cân bằng
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm mb-2">Tấn Công</label>
                        <input
                          type="number"
                          value={formData.stats.attack || ''}
                          onChange={(e) => updateFormData('stats.attack', e.target.value === '' ? 0 : parseFloat(e.target.value))}
                          placeholder="0"
                          className="w-full px-4 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl outline-none focus:ring-2 focus:ring-neutral-400 transition-all"
                        />
                      </div>

                      <div>
                        <label className="block text-sm mb-2">Phòng Thủ</label>
                        <input
                          type="number"
                          value={formData.stats.defense || ''}
                          onChange={(e) => updateFormData('stats.defense', e.target.value === '' ? 0 : parseFloat(e.target.value))}
                          placeholder="0"
                          className="w-full px-4 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl outline-none focus:ring-2 focus:ring-neutral-400 transition-all"
                        />
                      </div>

                      <div>
                        <label className="block text-sm mb-2">Khí Huyết</label>
                        <input
                          type="number"
                          value={formData.stats.hp || ''}
                          onChange={(e) => updateFormData('stats.hp', e.target.value === '' ? 0 : parseFloat(e.target.value))}
                          placeholder="0"
                          className="w-full px-4 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl outline-none focus:ring-2 focus:ring-neutral-400 transition-all"
                        />
                      </div>

                      <div>
                        <label className="block text-sm mb-2">Tỷ Lệ Chí Mạng (%)</label>
                        <input
                          type="number"
                          value={(formData.stats.crit_rate * 100).toFixed(2)}
                          onChange={(e) => updateFormData('stats.crit_rate', (parseFloat(e.target.value) || 0) / 100)}
                          step="0.01"
                          max="100"
                          className="w-full px-4 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl outline-none focus:ring-2 focus:ring-neutral-400 transition-all"
                        />
                      </div>

                      <div>
                        <label className="block text-sm mb-2">Sát Thương Chí Mạng (%)</label>
                        <input
                          type="number"
                          value={(formData.stats.crit_damage * 100).toFixed(2)}
                          onChange={(e) => updateFormData('stats.crit_damage', (parseFloat(e.target.value) || 0) / 100)}
                          step="0.01"
                          min="0"
                          className="w-full px-4 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl outline-none focus:ring-2 focus:ring-neutral-400 transition-all"
                        />
                      </div>

                      <div>
                        <label className="block text-sm mb-2">Tốc Độ</label>
                        <input
                          type="number"
                          value={formData.stats.speed || ''}
                          onChange={(e) => updateFormData('stats.speed', e.target.value === '' ? 0 : parseFloat(e.target.value))}
                          placeholder="0"
                          className="w-full px-4 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl outline-none focus:ring-2 focus:ring-neutral-400 transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Special Effects */}
                  <div>
                    <label className="block text-sm mb-2">Hiệu Ứng Đặc Biệt</label>
                    <textarea
                      value={formData.special_effect}
                      onChange={(e) => updateFormData('special_effect', e.target.value)}
                      rows="2"
                      placeholder="VD: Tăng 15% sát thương băng khi Khí Huyết dưới 50%"
                      className="w-full px-4 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl outline-none focus:ring-2 focus:ring-neutral-400 transition-all"
                    />
                  </div>

                  <div className="flex gap-4 pt-4 border-t border-neutral-200 dark:border-neutral-800">
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-black dark:bg-white text-white dark:text-black rounded-xl transition-all disabled:opacity-50 font-bold hover:opacity-80"
                    >
                      <Save size={18} />
                      {loading ? 'Đang lưu...' : 'Lưu Trang Bị'}
                    </button>
                    <button
                      type="button"
                      onClick={resetForm}
                      className="px-6 py-3 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-xl transition-colors font-medium"
                    >
                      Hủy
                    </button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Auto-Generate Modal */}
        <AnimatePresence>
          {showAutoGenerate && (
            <motion.div
              className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={(e) => e.target === e.currentTarget && setShowAutoGenerate(false)}
            >
              <motion.div
                className="bg-white dark:bg-neutral-900 rounded-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto border border-neutral-200 dark:border-neutral-800 shadow-2xl"
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
              >
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <Sparkles size={24} className="text-amber-500" />
                    <h2 className="text-xl font-bold text-neutral-900 dark:text-white">
                      Tạo Trang Bị Tự Động
                    </h2>
                  </div>
                  <button
                    onClick={() => setShowAutoGenerate(false)}
                    className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition-colors"
                  >
                    <X size={20} className="text-neutral-500" />
                  </button>
                </div>

                <div className="space-y-4">
                  {/* Type & Subtype */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase text-neutral-500 mb-2">Loại *</label>
                      <select
                        value={autoGenForm.type}
                        onChange={(e) => setAutoGenForm(prev => ({ ...prev, type: e.target.value, subtype: '' }))}
                        className="w-full px-4 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl outline-none focus:ring-2 focus:ring-amber-400 transition-all"
                      >
                        {Object.entries(EQUIPMENT_TYPES).map(([value, label]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase text-neutral-500 mb-2">Phân Loại</label>
                      <select
                        value={autoGenForm.subtype}
                        onChange={(e) => setAutoGenForm(prev => ({ ...prev, subtype: e.target.value }))}
                        className="w-full px-4 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl outline-none focus:ring-2 focus:ring-amber-400 transition-all"
                      >
                        <option value="">Không có</option>
                        {autoGenForm.type === 'weapon' && Object.entries(WEAPON_SUBTYPES).map(([value, label]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                        {autoGenForm.type === 'armor' && Object.entries(ARMOR_SUBTYPES).map(([value, label]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                        {autoGenForm.type === 'accessory' && Object.entries(ACCESSORY_SUBTYPES).map(([value, label]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                        {autoGenForm.type === 'power_item' && Object.entries(POWER_ITEM_SUBTYPES).map(([value, label]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Rarity & Level */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase text-neutral-500 mb-2">Độ Hiếm *</label>
                      <select
                        value={autoGenForm.rarity}
                        onChange={(e) => setAutoGenForm(prev => ({ ...prev, rarity: e.target.value }))}
                        className="w-full px-4 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl outline-none focus:ring-2 focus:ring-amber-400 transition-all"
                      >
                        {RARITY_OPTIONS.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase text-neutral-500 mb-2">Cấp Yêu Cầu</label>
                      <input
                        type="number"
                        value={autoGenForm.level_required}
                        onChange={(e) => setAutoGenForm(prev => ({ ...prev, level_required: parseInt(e.target.value) || 1 }))}
                        min="1"
                        max="100"
                        className="w-full px-4 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl outline-none focus:ring-2 focus:ring-amber-400 transition-all"
                      />
                    </div>
                  </div>

                  {/* Element */}
                  <div>
                    <label className="block text-xs font-bold uppercase text-neutral-500 mb-2">Nguyên Tố (Tùy chọn)</label>
                    <select
                      value={autoGenForm.element}
                      onChange={(e) => setAutoGenForm(prev => ({ ...prev, element: e.target.value }))}
                      className="w-full px-4 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl outline-none focus:ring-2 focus:ring-amber-400 transition-all"
                    >
                      {ELEMENT_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Custom Name */}
                  <div>
                    <label className="block text-xs font-bold uppercase text-neutral-500 mb-2">Tên Tùy Chỉnh (Để trống = tự đặt)</label>
                    <input
                      type="text"
                      value={autoGenForm.customName}
                      onChange={(e) => setAutoGenForm(prev => ({ ...prev, customName: e.target.value }))}
                      placeholder="Ví dụ: Thần Long Kiếm"
                      className="w-full px-4 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl outline-none focus:ring-2 focus:ring-amber-400 transition-all"
                    />
                  </div>

                  {/* Special Effect */}
                  <div>
                    <label className="block text-xs font-bold uppercase text-neutral-500 mb-2">Hiệu Ứng Đặc Biệt (Tùy chọn)</label>
                    <textarea
                      value={autoGenForm.special_effect}
                      onChange={(e) => setAutoGenForm(prev => ({ ...prev, special_effect: e.target.value }))}
                      placeholder="Ví dụ: Tăng 10% sát thương khi HP dưới 50%"
                      rows={2}
                      className="w-full px-4 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl outline-none focus:ring-2 focus:ring-amber-400 transition-all resize-none"
                    />
                  </div>

                  {/* Info Box */}
                  <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-4">
                    <p className="text-sm text-amber-800 dark:text-amber-200">
                      <strong>Lưu ý:</strong> Stats sẽ được tự động tính dựa trên công thức cân bằng:
                    </p>
                    <ul className="text-xs text-amber-700 dark:text-amber-300 mt-2 space-y-1">
                      <li>• Loại & Phân loại → Stats cơ bản</li>
                      <li>• Độ hiếm → Hệ số nhân (Common ×1 → Mythic ×10)</li>
                      <li>• Cấp → Cộng thêm 5% mỗi cấp</li>
                      <li>• Nguyên tố → Thêm sát thương thuộc tính</li>
                    </ul>
                  </div>

                  {/* Buttons */}
                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={handleAutoGenerate}
                      disabled={autoGenerating}
                      className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl transition-colors font-bold disabled:opacity-50"
                    >
                      {autoGenerating ? (
                        <Loader2 size={18} className="animate-spin" />
                      ) : (
                        <Sparkles size={18} />
                      )}
                      {autoGenerating ? 'Đang tạo...' : 'Tạo Trang Bị'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAutoGenerate(false)}
                      className="px-6 py-3 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-xl transition-colors font-medium"
                    >
                      Hủy
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
});

export default EquipmentManagement;

