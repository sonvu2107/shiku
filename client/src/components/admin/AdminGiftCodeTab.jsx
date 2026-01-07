/**
 * AdminGiftCodeTab - Quản lý mã quà tặng
 */
import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Gift, Plus, Edit, Trash2, Search, Copy, Check, X, 
  Calendar, Users, Loader2, AlertCircle, RefreshCw 
} from 'lucide-react';
import { api } from '../../api';
import { cn } from '../../utils/cn';

export default function AdminGiftCodeTab() {
  const [codes, setCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingCode, setEditingCode] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [deleting, setDeleting] = useState(null);

  // Form state
  const [form, setForm] = useState({
    code: '',
    name: '',
    description: '',
    type: 'limited',
    spiritStones: 0,
    exp: 0,
    maxUses: 100,
    startDate: '',
    endDate: '',
    minRealmLevel: 1,
    maxRealmLevel: 999,
    isActive: true
  });
  const [submitting, setSubmitting] = useState(false);

  // Load gift codes
  const loadCodes = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api('/api/cultivation/giftcode/list');
      if (response.success) {
        setCodes(response.data.codes || []);
      }
    } catch (err) {
      setError(err.message || 'Không thể tải danh sách mã');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCodes();
  }, [loadCodes]);

  // Generate random code
  const generateCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setForm(prev => ({ ...prev, code }));
  };

  // Reset form
  const resetForm = () => {
    setForm({
      code: '',
      name: '',
      description: '',
      type: 'limited',
      spiritStones: 0,
      exp: 0,
      maxUses: 100,
      startDate: '',
      endDate: '',
      minRealmLevel: 1,
      maxRealmLevel: 999,
      isActive: true
    });
    setEditingCode(null);
  };

  // Open modal for create/edit
  const openModal = (code = null) => {
    if (code) {
      setEditingCode(code);
      setForm({
        code: code.code,
        name: code.name,
        description: code.description || '',
        type: code.type || 'limited',
        spiritStones: code.rewards?.spiritStones || 0,
        exp: code.rewards?.exp || 0,
        maxUses: code.maxUses || 100,
        startDate: code.startDate ? new Date(code.startDate).toISOString().split('T')[0] : '',
        endDate: code.endDate ? new Date(code.endDate).toISOString().split('T')[0] : '',
        minRealmLevel: code.requirements?.minRealmLevel || 1,
        maxRealmLevel: code.requirements?.maxRealmLevel || 999,
        isActive: code.isActive !== false
      });
    } else {
      resetForm();
    }
    setShowModal(true);
  };

  // Submit form
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.code || !form.name) return;

    setSubmitting(true);
    try {
      const payload = {
        code: form.code.toUpperCase().trim(),
        name: form.name.trim(),
        description: form.description.trim(),
        type: form.type,
        rewards: {
          spiritStones: parseInt(form.spiritStones) || 0,
          exp: parseInt(form.exp) || 0,
          items: []
        },
        maxUses: parseInt(form.maxUses) || 1,
        startDate: form.startDate || undefined,
        endDate: form.endDate || undefined,
        requirements: {
          minRealmLevel: parseInt(form.minRealmLevel) || 1,
          maxRealmLevel: parseInt(form.maxRealmLevel) || 999
        },
        isActive: form.isActive
      };

      if (editingCode) {
        await api(`/api/cultivation/giftcode/${editingCode._id}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
      } else {
        await api('/api/cultivation/giftcode/create', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
      }

      setShowModal(false);
      resetForm();
      loadCodes();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Delete code
  const handleDelete = async (codeId) => {
    if (!window.confirm('Bạn có chắc muốn xóa mã này?')) return;

    setDeleting(codeId);
    try {
      await api(`/api/cultivation/giftcode/${codeId}`, { method: 'DELETE' });
      loadCodes();
    } catch (err) {
      setError(err.message);
    } finally {
      setDeleting(null);
    }
  };

  // Copy code to clipboard
  const copyCode = async (code) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedId(code);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Filter codes
  const filteredCodes = codes.filter(code => 
    code.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    code.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Get status badge
  const getStatusBadge = (code) => {
    if (!code.isActive) {
      return <span className="px-2 py-1 rounded-full text-xs bg-gray-500/20 text-gray-400">Tắt</span>;
    }
    if (code.endDate && new Date(code.endDate) < new Date()) {
      return <span className="px-2 py-1 rounded-full text-xs bg-red-500/20 text-red-400">Hết hạn</span>;
    }
    if (code.usedCount >= code.maxUses) {
      return <span className="px-2 py-1 rounded-full text-xs bg-orange-500/20 text-orange-400">Hết lượt</span>;
    }
    return <span className="px-2 py-1 rounded-full text-xs bg-green-500/20 text-green-400">Hoạt động</span>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-neutral-900 dark:text-white flex items-center gap-2">
            <Gift className="w-6 h-6 text-amber-500" />
            Quản lý mã quà tặng
          </h2>
          <p className="text-neutral-500 dark:text-neutral-400 text-sm mt-1">
            Tạo và quản lý các mã quà tặng cho người chơi
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadCodes}
            className="p-2 rounded-lg bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
          >
            <RefreshCw className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
          </button>
          <button
            onClick={() => openModal()}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-medium transition-colors"
          >
            <Plus className="w-5 h-5" />
            Tạo mã mới
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Tìm kiếm mã..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-neutral-100 dark:bg-neutral-800/50">
          <div className="text-2xl font-bold text-neutral-900 dark:text-white">{codes.length}</div>
          <div className="text-sm text-neutral-500">Tổng mã</div>
        </div>
        <div className="p-4 rounded-xl bg-green-50 dark:bg-green-900/20">
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
            {codes.filter(c => c.isActive && (!c.endDate || new Date(c.endDate) > new Date())).length}
          </div>
          <div className="text-sm text-green-600/70 dark:text-green-400/70">Đang hoạt động</div>
        </div>
        <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20">
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
            {codes.reduce((sum, c) => sum + (c.usedCount || 0), 0)}
          </div>
          <div className="text-sm text-amber-600/70 dark:text-amber-400/70">Lượt sử dụng</div>
        </div>
        <div className="p-4 rounded-xl bg-purple-50 dark:bg-purple-900/20">
          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
            {codes.reduce((sum, c) => sum + (c.rewards?.spiritStones || 0) * (c.usedCount || 0), 0).toLocaleString()}
          </div>
          <div className="text-sm text-purple-600/70 dark:text-purple-400/70">Linh thạch phát</div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-neutral-200 dark:border-neutral-800">
        <table className="w-full">
          <thead className="bg-neutral-100 dark:bg-neutral-800">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">Mã</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">Tên</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">Phần thưởng</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">Sử dụng</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">Trạng thái</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-neutral-500 uppercase tracking-wider">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
            {filteredCodes.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-neutral-500">
                  {searchQuery ? 'Không tìm thấy mã nào' : 'Chưa có mã quà tặng nào'}
                </td>
              </tr>
            ) : (
              filteredCodes.map((code) => (
                <tr key={code._id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <code className="font-mono font-bold text-amber-600 dark:text-amber-400">
                        {code.code}
                      </code>
                      <button
                        onClick={() => copyCode(code.code)}
                        className="p-1 rounded hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
                        title="Copy mã"
                      >
                        {copiedId === code.code ? (
                          <Check className="w-4 h-4 text-green-500" />
                        ) : (
                          <Copy className="w-4 h-4 text-neutral-400" />
                        )}
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-neutral-900 dark:text-white">{code.name}</div>
                    {code.description && (
                      <div className="text-xs text-neutral-500 truncate max-w-[200px]">{code.description}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1 text-sm">
                      {code.rewards?.spiritStones > 0 && (
                        <span className="text-purple-500">💎 {code.rewards.spiritStones.toLocaleString()}</span>
                      )}
                      {code.rewards?.exp > 0 && (
                        <span className="text-blue-500">✨ {code.rewards.exp.toLocaleString()}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4 text-neutral-400" />
                      <span className="text-neutral-600 dark:text-neutral-300">
                        {code.usedCount || 0} / {code.maxUses}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {getStatusBadge(code)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => openModal(code)}
                        className="p-2 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
                        title="Sửa"
                      >
                        <Edit className="w-4 h-4 text-neutral-600 dark:text-neutral-400" />
                      </button>
                      <button
                        onClick={() => handleDelete(code._id)}
                        disabled={deleting === code._id}
                        className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors disabled:opacity-50"
                        title="Xóa"
                      >
                        {deleting === code._id ? (
                          <Loader2 className="w-4 h-4 animate-spin text-red-500" />
                        ) : (
                          <Trash2 className="w-4 h-4 text-red-500" />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl overflow-hidden"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-800">
                <h3 className="text-lg font-bold text-neutral-900 dark:text-white">
                  {editingCode ? 'Sửa mã quà tặng' : 'Tạo mã quà tặng mới'}
                </h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                >
                  <X className="w-5 h-5 text-neutral-500" />
                </button>
              </div>

              {/* Modal Body */}
              <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                {/* Code */}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    Mã code <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={form.code}
                      onChange={(e) => setForm(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                      placeholder="VD: WELCOME2024"
                      className="flex-1 px-4 py-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white uppercase font-mono focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                      maxLength={20}
                      required
                      disabled={!!editingCode}
                    />
                    {!editingCode && (
                      <button
                        type="button"
                        onClick={generateCode}
                        className="px-4 py-2.5 rounded-xl bg-neutral-200 dark:bg-neutral-700 hover:bg-neutral-300 dark:hover:bg-neutral-600 text-neutral-700 dark:text-neutral-300 font-medium transition-colors"
                      >
                        Tạo ngẫu nhiên
                      </button>
                    )}
                  </div>
                </div>

                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    Tên mã <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="VD: Mã chào mừng tân thủ"
                    className="w-full px-4 py-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                    required
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    Mô tả
                  </label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Mô tả chi tiết về mã..."
                    rows={2}
                    className="w-full px-4 py-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50 resize-none"
                  />
                </div>

                {/* Rewards */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                      💎 Linh Thạch
                    </label>
                    <input
                      type="number"
                      value={form.spiritStones}
                      onChange={(e) => setForm(prev => ({ ...prev, spiritStones: e.target.value }))}
                      min={0}
                      className="w-full px-4 py-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                      ✨ Tu Vi (EXP)
                    </label>
                    <input
                      type="number"
                      value={form.exp}
                      onChange={(e) => setForm(prev => ({ ...prev, exp: e.target.value }))}
                      min={0}
                      className="w-full px-4 py-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                    />
                  </div>
                </div>

                {/* Limits */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                      Số lượt dùng tối đa
                    </label>
                    <input
                      type="number"
                      value={form.maxUses}
                      onChange={(e) => setForm(prev => ({ ...prev, maxUses: e.target.value }))}
                      min={1}
                      className="w-full px-4 py-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                      Loại mã
                    </label>
                    <select
                      value={form.type}
                      onChange={(e) => setForm(prev => ({ ...prev, type: e.target.value }))}
                      className="w-full px-4 py-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                    >
                      <option value="one_time">Dùng 1 lần (1 user)</option>
                      <option value="limited">Giới hạn lượt</option>
                      <option value="unlimited">Không giới hạn</option>
                    </select>
                  </div>
                </div>

                {/* Date Range */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                      Ngày bắt đầu
                    </label>
                    <input
                      type="date"
                      value={form.startDate}
                      onChange={(e) => setForm(prev => ({ ...prev, startDate: e.target.value }))}
                      className="w-full px-4 py-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                      Ngày kết thúc
                    </label>
                    <input
                      type="date"
                      value={form.endDate}
                      onChange={(e) => setForm(prev => ({ ...prev, endDate: e.target.value }))}
                      className="w-full px-4 py-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                    />
                  </div>
                </div>

                {/* Realm Requirements */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                      Cảnh giới tối thiểu
                    </label>
                    <input
                      type="number"
                      value={form.minRealmLevel}
                      onChange={(e) => setForm(prev => ({ ...prev, minRealmLevel: e.target.value }))}
                      min={1}
                      max={14}
                      className="w-full px-4 py-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                      Cảnh giới tối đa
                    </label>
                    <input
                      type="number"
                      value={form.maxRealmLevel}
                      onChange={(e) => setForm(prev => ({ ...prev, maxRealmLevel: e.target.value }))}
                      min={1}
                      max={999}
                      className="w-full px-4 py-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                    />
                  </div>
                </div>

                {/* Active Toggle */}
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={form.isActive}
                    onChange={(e) => setForm(prev => ({ ...prev, isActive: e.target.checked }))}
                    className="w-5 h-5 rounded border-neutral-300 dark:border-neutral-600 text-amber-500 focus:ring-amber-500"
                  />
                  <label htmlFor="isActive" className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                    Kích hoạt mã này
                  </label>
                </div>
              </form>

              {/* Modal Footer */}
              <div className="flex justify-end gap-3 px-6 py-4 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-neutral-200 dark:bg-neutral-700 hover:bg-neutral-300 dark:hover:bg-neutral-600 text-neutral-700 dark:text-neutral-300 font-medium transition-colors"
                >
                  Hủy
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting || !form.code || !form.name}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:bg-neutral-400 text-white font-medium transition-colors disabled:cursor-not-allowed"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editingCode ? 'Cập nhật' : 'Tạo mã'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
