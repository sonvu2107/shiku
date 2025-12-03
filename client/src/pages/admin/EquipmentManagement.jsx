/**
 * Equipment Management Page - Admin Only
 * Quản lý equipment: thêm, sửa, xóa, filter
 */
import { useState, useEffect, memo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit, Trash2, Search, X, Save, ArrowLeft, Upload, Image as ImageIcon, Loader2 } from 'lucide-react';
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

const EquipmentManagement = memo(function EquipmentManagement() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [equipments, setEquipments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState(getInitialFormData());
  const [filters, setFilters] = useState({
    type: '',
    rarity: '',
    search: '',
    is_active: 'true'
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
    console.log('[EquipmentManagement] Component mounted');
    console.log('[EquipmentManagement] Filters:', filters);
    console.log('[EquipmentManagement] Equipments count:', equipments.length);
  }, []);

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
      console.log('[EquipmentManagement] Response:', response);
      
      if (response.success) {
        setEquipments(response.data || []);
        setPagination(prev => ({ ...prev, ...response.pagination }));
        console.log('[EquipmentManagement] Loaded', response.data?.length || 0, 'equipments');
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
      const payload = {
        ...formData,
        stats: {
          ...formData.stats,
          elemental_damage: Object.fromEntries(
            Object.entries(formData.stats.elemental_damage).filter(([_, v]) => v > 0)
          )
        }
      };
      
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

  return (
    <div className="min-h-screen bg-[#050511] text-slate-200 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header với nút Trở về và Thêm Equipment */}
        <div className="sticky top-0 z-40 bg-[#050511]/95 backdrop-blur-sm border-b-2 border-amber-500/50 pb-4 mb-6 -mx-6 px-6 pt-2">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {/* Nút Trở về */}
              <button
                onClick={() => navigate('/admin')}
                className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-all shadow-md hover:shadow-lg"
                title="Trở về Admin Dashboard"
              >
                <ArrowLeft size={20} />
                <span className="hidden sm:inline">Trở về</span>
              </button>
              <h1 className="text-2xl sm:text-3xl font-bold text-amber-400 drop-shadow-lg">
                Rèn Trang Bị
              </h1>
            </div>
            <button
              onClick={() => {
                resetForm();
                setShowForm(true);
              }}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white rounded-lg transition-all shadow-lg hover:shadow-xl font-bold text-sm uppercase tracking-wide whitespace-nowrap"
              style={{ zIndex: 50 }}
            >
              <Plus size={20} />
              <span>Thêm Trang Bị</span>
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-slate-800/50 rounded-xl p-4 mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm mb-2">Tìm kiếm</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                placeholder="Tên trang bị..."
                className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-200"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm mb-2">Loại</label>
            <select
              value={filters.type}
              onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
              className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-200"
            >
              <option value="">Tất cả</option>
              {Object.entries(EQUIPMENT_TYPES).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm mb-2">Độ Hiếm</label>
            <select
              value={filters.rarity}
              onChange={(e) => setFilters(prev => ({ ...prev, rarity: e.target.value }))}
              className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-200"
            >
              <option value="">Tất cả</option>
              {RARITY_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm mb-2">Trạng Thái</label>
            <select
              value={filters.is_active}
              onChange={(e) => setFilters(prev => ({ ...prev, is_active: e.target.value }))}
              className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-200"
            >
              <option value="true">Đang Hoạt Động</option>
              <option value="false">Vô Hiệu Hóa</option>
              <option value="">Tất cả</option>
            </select>
          </div>
        </div>

        {/* Equipment List */}
        {loading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-amber-400"></div>
            <p className="mt-4 text-slate-400">Đang tải danh sách trang bị...</p>
          </div>
        )}
        
        {!loading && equipments.length === 0 && (
          <div className="text-center py-12 bg-slate-800/30 rounded-xl border border-slate-700">
            <p className="text-slate-400 mb-4">Chưa có trang bị nào</p>
            <button
              onClick={() => {
                resetForm();
                setShowForm(true);
              }}
              className="inline-flex items-center gap-2 px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors font-medium"
            >
              <Plus size={20} />
              <span>Thêm Trang Bị Đầu Tiên</span>
            </button>
          </div>
        )}
        
        {!loading && equipments.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {equipments.map((eq) => (
              <motion.div
                key={eq._id}
                className="bg-slate-800/50 rounded-xl p-4 border border-slate-700 hover:border-amber-500/50 transition-colors"
                whileHover={{ scale: 1.02 }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-bold text-lg" style={{ color: RARITY_OPTIONS.find(r => r.value === eq.rarity)?.color }}>
                      {eq.name}
                    </h3>
                    <p className="text-sm text-slate-400">{EQUIPMENT_TYPES[eq.type]}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(eq)}
                      className="p-2 hover:bg-slate-700 rounded transition-colors"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(eq._id)}
                      className="p-2 hover:bg-red-900/50 rounded transition-colors text-red-400"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Level:</span>
                    <span>{eq.level_required}</span>
                  </div>
                  {eq.price > 0 && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Giá:</span>
                      <span className="text-amber-400">{eq.price.toLocaleString()} Linh Thạch</span>
                    </div>
                  )}
                  {eq.stats && (
                    <>
                      {eq.stats.attack > 0 && (
                        <div className="flex justify-between">
                          <span className="text-slate-400">Tấn Công:</span>
                          <span className="text-red-400">+{eq.stats.attack}</span>
                        </div>
                      )}
                      {eq.stats.defense > 0 && (
                        <div className="flex justify-between">
                          <span className="text-slate-400">Phòng Thủ:</span>
                          <span className="text-blue-400">+{eq.stats.defense}</span>
                        </div>
                      )}
                      {eq.stats.hp > 0 && (
                        <div className="flex justify-between">
                          <span className="text-slate-400">Khí Huyết:</span>
                          <span className="text-green-400">+{eq.stats.hp}</span>
                        </div>
                      )}
                    </>
                  )}
                </div>
                
                {!eq.is_active && (
                  <div className="mt-2 text-xs text-red-400">Đã vô hiệu hóa</div>
                )}
              </motion.div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="flex justify-center gap-2 mt-6">
            <button
              onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
              disabled={pagination.page === 1}
              className="px-4 py-2 bg-slate-800 rounded-lg disabled:opacity-50"
            >
              Trước
            </button>
            <span className="px-4 py-2">
              Trang {pagination.page} / {pagination.pages}
            </span>
            <button
              onClick={() => setPagination(prev => ({ ...prev, page: Math.min(prev.pages, prev.page + 1) }))}
              disabled={pagination.page === pagination.pages}
              className="px-4 py-2 bg-slate-800 rounded-lg disabled:opacity-50"
            >
              Sau
            </button>
          </div>
        )}

        {/* Form Modal */}
        <AnimatePresence>
          {showForm && (
            <motion.div
              className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={(e) => e.target === e.currentTarget && resetForm()}
            >
              <motion.div
                className="bg-slate-900 rounded-xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
              >
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold">
                    {editingId ? 'Sửa Trang Bị' : 'Thêm Trang Bị Mới'}
                  </h2>
                  <button
                    onClick={resetForm}
                    className="p-2 hover:bg-slate-800 rounded transition-colors"
                  >
                    <X size={24} />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Basic Info */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm mb-2">Tên *</label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => updateFormData('name', e.target.value)}
                        required
                        className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm mb-2">Loại *</label>
                      <select
                        value={formData.type}
                        onChange={(e) => updateFormData('type', e.target.value)}
                        required
                        className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg"
                      >
                        {Object.entries(EQUIPMENT_TYPES).map(([value, label]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                    </div>
                    
                    {(formData.type === 'weapon' || formData.type === 'armor') && (
                      <div>
                        <label className="block text-sm mb-2">Phân Loại</label>
                        <select
                          value={formData.subtype}
                          onChange={(e) => updateFormData('subtype', e.target.value)}
                          className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg"
                        >
                          <option value="">Không có</option>
                          {formData.type === 'weapon' && Object.entries(WEAPON_SUBTYPES).map(([value, label]) => (
                            <option key={value} value={value}>{label}</option>
                          ))}
                          {formData.type === 'armor' && Object.entries(ARMOR_SUBTYPES).map(([value, label]) => (
                            <option key={value} value={value}>{label}</option>
                          ))}
                        </select>
                      </div>
                    )}
                    
                    <div>
                      <label className="block text-sm mb-2">Độ Hiếm *</label>
                      <select
                        value={formData.rarity}
                        onChange={(e) => updateFormData('rarity', e.target.value)}
                        required
                        className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg"
                      >
                        {RARITY_OPTIONS.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm mb-2">Cấp Yêu Cầu</label>
                      <input
                        type="number"
                        value={formData.level_required}
                        onChange={(e) => updateFormData('level_required', parseInt(e.target.value) || 1)}
                        min="1"
                        className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm mb-2">Giá Bán (Linh Thạch)</label>
                      <input
                        type="number"
                        value={formData.price}
                        onChange={(e) => updateFormData('price', parseInt(e.target.value) || 0)}
                        min="0"
                        placeholder="0 = không bán"
                        className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm mb-2">Hình Ảnh</label>
                      
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
                          className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
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
                            className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors text-sm"
                          >
                            <ImageIcon size={18} />
                            <span>Xem ảnh</span>
                          </a>
                        )}
                      </div>
                      
                      <p className="text-xs text-slate-400 mt-2">
                        Chọn ảnh để upload (JPG, PNG, GIF - tối đa 5MB)
                      </p>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm mb-2">Mô Tả</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => updateFormData('description', e.target.value)}
                      rows="3"
                      className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg"
                    />
                  </div>

                  {/* Stats */}
                  <div className="border-t border-slate-700 pt-4">
                    <h3 className="text-lg font-bold mb-3">Thông Số</h3>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm mb-2">Tấn Công</label>
                        <input
                          type="number"
                          value={formData.stats.attack}
                          onChange={(e) => updateFormData('stats.attack', parseFloat(e.target.value) || 0)}
                          className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm mb-2">Phòng Thủ</label>
                        <input
                          type="number"
                          value={formData.stats.defense}
                          onChange={(e) => updateFormData('stats.defense', parseFloat(e.target.value) || 0)}
                          className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm mb-2">Khí Huyết</label>
                        <input
                          type="number"
                          value={formData.stats.hp}
                          onChange={(e) => updateFormData('stats.hp', parseFloat(e.target.value) || 0)}
                          className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg"
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
                          className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm mb-2">Sát Thương Chí Mạng (%)</label>
                        <input
                          type="number"
                          value={(formData.stats.crit_damage * 100).toFixed(2)}
                          onChange={(e) => updateFormData('stats.crit_damage', (parseFloat(e.target.value) || 0) / 100)}
                          step="0.01"
                          max="100"
                          className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm mb-2">Tốc Độ</label>
                        <input
                          type="number"
                          value={formData.stats.speed}
                          onChange={(e) => updateFormData('stats.speed', parseFloat(e.target.value) || 0)}
                          className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg"
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
                      className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg"
                    />
                  </div>

                  <div className="flex gap-4">
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors disabled:opacity-50"
                    >
                      <Save size={20} />
                      {loading ? 'Đang lưu...' : 'Lưu'}
                    </button>
                    <button
                      type="button"
                      onClick={resetForm}
                      className="px-6 py-3 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
                    >
                      Hủy
                    </button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
});

export default EquipmentManagement;

