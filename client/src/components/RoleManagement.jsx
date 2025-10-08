import React, { useState, useEffect } from "react";
import { api } from "../api.js";
import { invalidateRoleCache } from "../utils/roleCache.js";
import {
  Plus,
  Edit,
  Trash2,
  Upload,
  Save,
  X,
  Crown,
  Image as ImageIcon,
  AlertCircle
} from "lucide-react";

/**
 * RoleManagement - Component quản lý role trong admin dashboard
 * Cho phép admin thêm, sửa, xóa role và upload logo cho role
 */
export default function RoleManagement({ onRolesChange = () => {} }) {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  
  // Form states
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    displayName: "",
    description: "",
    iconUrl: ""
  });
  const [uploading, setUploading] = useState(false);

  // Load roles on component mount
  useEffect(() => {
    loadRoles();
  }, []);

  const loadRoles = async () => {
    try {
      setLoading(true);
      const response = await api("/api/admin/roles", { method: "GET" });
      setRoles(response.roles || []);
    } catch (err) {
      setError("Không thể tải danh sách role");
      console.error("Error loading roles:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    // Auto-format role name to lowercase and replace spaces with underscores
    if (name === 'name') {
      const formattedValue = value.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
      setFormData(prev => ({
        ...prev,
        [name]: formattedValue
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError("Chỉ chấp nhận file ảnh");
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setError("Kích thước file không được vượt quá 2MB");
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', file);

      const response = await api('/api/uploads', {
        method: 'POST',
        body: formData,
      });

      setFormData(prev => ({
        ...prev,
        iconUrl: response.url
      }));
      setSuccess("Upload ảnh thành công");
    } catch (err) {
      setError("Lỗi khi upload ảnh");
      console.error("Upload error:", err);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.displayName.trim()) {
      setError("Tên role và tên hiển thị không được để trống");
      return;
    }

    // Validate role name format (only lowercase letters, numbers, hyphens, underscores)
    const namePattern = /^[a-z0-9_-]+$/;
    if (!namePattern.test(formData.name.trim())) {
      setError("Tên role chỉ được chứa chữ thường, số, gạch ngang và gạch dưới");
      return;
    }

    try {
      if (editingRole) {
        // Update existing role
        console.log("Updating role with data:", formData);
        const response = await api(`/api/admin/roles/${editingRole._id}`, {
          method: "PUT",
          body: formData
        });
        console.log("Update response:", response);

        setSuccess(editingRole.isDefault
          ? "Cập nhật hiển thị role thành công (permissions không đổi)"
          : "Cập nhật role thành công"
        );

        await loadRoles();
        // Invalidate global cache
        invalidateRoleCache();
        // Trigger callback immediately after reload
        onRolesChange();
      } else {
        // Create new role
        await api("/api/admin/roles", { method: "POST", body: formData });
        setSuccess("Thêm role mới thành công");
        setShowAddForm(false);
        setEditingRole(null);
        setFormData({
          name: "",
          displayName: "",
          description: "",
          iconUrl: "",
          color: "#3B82F6"
        });
        await loadRoles();
        // Invalidate global cache
        invalidateRoleCache();
        // Trigger callback immediately after reload
        onRolesChange();
      }
    } catch (err) {
      setError(err.message || "Có lỗi xảy ra");
      console.error("Submit error:", err);
    }
  };

  const handleEdit = (role) => {
    console.log("Edit clicked for role:", role.name);
    setEditingRole(role);
    setFormData({
      name: role.name,
      displayName: role.displayName,
      description: role.description || "",
      iconUrl: role.iconUrl || "",
      color: role.color || "#3B82F6"
    });
    setShowAddForm(true);
  };

  const handleDelete = async (roleId) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa role này?")) {
      return;
    }

    try {
      await api(`/api/admin/roles/${roleId}`, { method: "DELETE" });
      setSuccess("Xóa role thành công");
      await loadRoles();
      // Invalidate global cache
      invalidateRoleCache();
      // Trigger callback immediately after reload
      onRolesChange();
    } catch (err) {
      setError(err.message || "Không thể xóa role");
      console.error("Delete error:", err);
    }
  };

  const resetForm = () => {
    setShowAddForm(false);
    setEditingRole(null);
    setFormData({
      name: "",
      displayName: "",
      description: "",
      iconUrl: "",
      color: "#3B82F6"
    });
    setError("");
    setSuccess("");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-2">Đang tải...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Quản lý Role
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Thêm, chỉnh sửa và quản lý các role trong hệ thống
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
        >
          <Plus size={16} />
          Thêm Role
        </button>
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
          <AlertCircle size={16} />
          {error}
        </div>
      )}
      
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
          {success}
        </div>
      )}

      {/* Add/Edit Form */}
      {showAddForm && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              {editingRole ? "Chỉnh sửa Role" : "Thêm Role Mới"}
            </h3>
            <button
              onClick={resetForm}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {editingRole?.isDefault && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 px-4 py-3 rounded-lg flex items-start gap-2">
                <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <strong>Role mặc định:</strong> Bạn có thể thay đổi icon, màu sắc và mô tả, nhưng không thể đổi tên và quyền hạn.
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Tên Role (không dấu, không khoảng trắng)
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="vd: vip, moderator"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={!!editingRole}
                  required
                />
                {editingRole && (
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Không thể thay đổi tên role khi chỉnh sửa
                  </p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Tên Hiển Thị
                </label>
                <input
                  type="text"
                  name="displayName"
                  value={formData.displayName}
                  onChange={handleInputChange}
                  placeholder="vd: VIP Member, Moderator"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Mô Tả
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Mô tả về role này..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Logo/Badge
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    id="image-upload"
                  />
                  <label
                    htmlFor="image-upload"
                    className="flex items-center gap-2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <Upload size={16} />
                    {uploading ? "Đang upload..." : "Chọn ảnh"}
                  </label>
                  {formData.iconUrl && (
                    <img
                      src={formData.iconUrl}
                      alt="Preview"
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
              >
                <Save size={16} />
                {editingRole ? "Cập nhật" : "Thêm"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Roles List */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            Danh Sách Role ({roles.length})
          </h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Mô Tả
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Số Người Dùng
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Logo
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Thao Tác
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {roles.map((role) => (
                <tr key={role._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-6 py-4">
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        {role.displayName}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {role.name}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900 dark:text-white max-w-xs truncate">
                      {role.description || "Không có mô tả"}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {role.userCount || 0} người dùng
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {role.iconUrl ? (
                      <img
                        src={role.iconUrl}
                        alt={role.displayName}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-8 h-8 bg-gray-200 dark:bg-gray-600 rounded-full flex items-center justify-center">
                        <ImageIcon size={16} className="text-gray-400" />
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          console.log("Edit button clicked:", role.name);
                          handleEdit(role);
                        }}
                        className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors rounded hover:bg-blue-50 dark:hover:bg-blue-900/20"
                        title="Chỉnh sửa"
                        type="button"
                      >
                        <Edit size={16} />
                      </button>
                      {!role.isDefault && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(role._id);
                          }}
                          className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors rounded hover:bg-red-50 dark:hover:bg-red-900/20"
                          title="Xóa"
                          type="button"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
