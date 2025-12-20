import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Upload, 
  X, 
  Users, 
  MapPin, 
  Tag, 
  Settings, 
  Lock, 
  Unlock, 
  Eye, 
  EyeOff,
  AlertCircle
} from 'lucide-react';
import { api } from '../api';

/**
 * GroupCreator Component - Modal/Form to create a new group
 * Includes form input, image upload, and permission settings
 * 
 * @param {boolean} isOpen - Modal open state
 * @param {Function} onClose - Callback when modal is closed
 * @param {Function} onSuccess - Callback when creation is successful
 */
const GroupCreator = ({ isOpen, onClose, onSuccess }) => {
  const navigate = useNavigate();
  
  // Form data
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'public',
    joinApproval: 'anyone',
    postPermissions: 'all_members',
    commentPermissions: 'all_members',
    allowMemberInvites: true,
    showMemberList: true,
    searchable: true,
    tags: '',
    location: {
      name: '',
      coordinates: null
    }
  });

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [avatar, setAvatar] = useState(null);
  const [coverImage, setCoverImage] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [coverPreview, setCoverPreview] = useState(null);

  // Validation errors
  const [errors, setErrors] = useState({});

  // Steps configuration
  const steps = [
    { id: 1, title: 'Thông tin cơ bản', description: 'Tên và mô tả nhóm' },
    { id: 2, title: 'Cài đặt quyền hạn', description: 'Quyền truy cập và đăng bài' },
    { id: 3, title: 'Hình ảnh', description: 'Ảnh đại diện và bìa' },
    { id: 4, title: 'Thông tin bổ sung', description: 'Tags và vị trí' }
  ];

  // Handle input change
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  // Handle location change
  const handleLocationChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      location: {
        ...prev.location,
        [name]: value
      }
    }));
  };

  // Handle file upload
  const handleFileUpload = (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Vui lòng chọn file ảnh');
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Kích thước file không được vượt quá 5MB');
      return;
    }

    if (type === 'avatar') {
      setAvatar(file);
      const reader = new FileReader();
      reader.onload = (e) => setAvatarPreview(e.target.result);
      reader.readAsDataURL(file);
    } else if (type === 'cover') {
      setCoverImage(file);
      const reader = new FileReader();
      reader.onload = (e) => setCoverPreview(e.target.result);
      reader.readAsDataURL(file);
    }
  };

  // Remove uploaded file
  const removeFile = (type) => {
    if (type === 'avatar') {
      setAvatar(null);
      setAvatarPreview(null);
    } else if (type === 'cover') {
      setCoverImage(null);
      setCoverPreview(null);
    }
  };

  // Validate form
  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Tên nhóm là bắt buộc';
    } else if (formData.name.length > 100) {
      newErrors.name = 'Tên nhóm không được quá 100 ký tự';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Mô tả nhóm là bắt buộc';
    } else if (formData.description.length > 500) {
      newErrors.description = 'Mô tả không được quá 500 ký tự';
    }

    if (formData.tags) {
      const tags = formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag);
      if (tags.length > 10) {
        newErrors.tags = 'Không được quá 10 tags';
      }
      for (const tag of tags) {
        if (tag.length > 20) {
          newErrors.tags = 'Mỗi tag không được quá 20 ký tự';
          break;
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const submitData = new FormData();
      
      // Add form data
      submitData.append('name', formData.name);
      submitData.append('description', formData.description);
      submitData.append('type', formData.type);
      submitData.append('joinApproval', formData.joinApproval);
      submitData.append('postPermissions', formData.postPermissions);
      submitData.append('commentPermissions', formData.commentPermissions);
      submitData.append('allowMemberInvites', formData.allowMemberInvites);
      submitData.append('showMemberList', formData.showMemberList);
      submitData.append('searchable', formData.searchable);
      submitData.append('tags', JSON.stringify(formData.tags));
      
      if (formData.location.name) {
        submitData.append('location', JSON.stringify(formData.location));
      }

      // Add files
      if (avatar) {
        submitData.append('avatar', avatar);
      }
      if (coverImage) {
        submitData.append('coverImage', coverImage);
      }

      const response = await api('/api/groups', {
        method: 'POST',
        body: submitData
      });

      if (response.success) {
        if (onSuccess) {
          onSuccess(response.data);
        }
        onClose();
        navigate(`/groups/${response.data._id}`);
      } else {
        setError(response.message || 'Không thể tạo nhóm');
      }
    } catch (error) {
      setError(error.message || error.response?.data?.message || 'Không thể tạo nhóm');
    } finally {
      setLoading(false);
    }
  };

  // Handle modal close
  const handleClose = () => {
    if (loading) return;
    
    // Reset form
    setFormData({
      name: '',
      description: '',
      type: 'public',
      joinApproval: 'anyone',
      postPermissions: 'all_members',
      commentPermissions: 'all_members',
      allowMemberInvites: true,
      showMemberList: true,
      searchable: true,
      tags: '',
      location: {
        name: '',
        coordinates: null
      }
    });
    setCurrentStep(1);
    setError(null);
    setErrors({});
    setAvatar(null);
    setCoverImage(null);
    setAvatarPreview(null);
    setCoverPreview(null);
    
    onClose();
  };

  // Next step
  const nextStep = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  // Previous step
  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Tạo nhóm mới</h2>
            <p className="text-sm text-gray-600">Bước {currentStep} / {steps.length}: {steps[currentStep - 1].description}</p>
          </div>
          <button
            onClick={handleClose}
            disabled={loading}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  currentStep >= step.id 
                    ? 'bg-black text-white' 
                    : 'bg-gray-200 text-gray-600'
                }`}>
                  {step.id}
                </div>
                <div className="ml-2 hidden sm:block">
                  <p className={`text-sm font-medium ${
                    currentStep >= step.id ? 'text-black dark:text-white' : 'text-gray-500'
                  }`}>
                    {step.title}
                  </p>
                </div>
                {index < steps.length - 1 && (
                  <div className={`w-12 h-0.5 mx-4 ${
                    currentStep > step.id ? 'bg-black' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[60vh]">
          {/* Step 1: Basic Info */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tên nhóm <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Nhập tên nhóm..."
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.name ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600">{errors.name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mô tả
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Mô tả về nhóm của bạn..."
                  rows={4}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.description ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                <p className="mt-1 text-sm text-gray-500">
                  {formData.description.length}/500 ký tự
                </p>
                {errors.description && (
                  <p className="mt-1 text-sm text-red-600">{errors.description}</p>
                )}
              </div>
            </div>
          )}

          {/* Step 2: Settings */}
          {currentStep === 2 && (
            <div className="space-y-8">
              {/* Group Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Loại nhóm
                </label>
                <div className="space-y-3">
                  {[
                    { value: 'public', label: 'Công khai', icon: Unlock, desc: 'Mọi người có thể tìm thấy và tham gia' },
                    { value: 'private', label: 'Riêng tư', icon: Lock, desc: 'Chỉ thành viên mới thấy nội dung' },
                    { value: 'secret', label: 'Bí mật', icon: EyeOff, desc: 'Chỉ thành viên mới tìm thấy nhóm' }
                  ].map((type) => {
                    const Icon = type.icon;
                    return (
                      <label key={type.value} className="flex items-center gap-4 p-4 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                        <input
                          type="radio"
                          name="type"
                          value={type.value}
                          checked={formData.type === type.value}
                          onChange={handleInputChange}
                          className="w-4 h-4 text-black dark:text-white border-gray-300 focus:ring-blue-500 focus:ring-2"
                        />
                        <Icon className="w-6 h-6 text-gray-500 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 text-base">{type.label}</p>
                          <p className="text-sm text-gray-600 mt-1">{type.desc}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Join Approval */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Ai có thể tham gia?
                </label>
                <select
                  name="joinApproval"
                  value={formData.joinApproval}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900 text-base"
                >
                  <option value="anyone">Bất kỳ ai</option>
                  <option value="admin_approval">Cần duyệt</option>
                  <option value="invite_only">Chỉ mời</option>
                </select>
              </div>

              {/* Post Permissions */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Ai có thể đăng bài?
                </label>
                <select
                  name="postPermissions"
                  value={formData.postPermissions}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900 text-base"
                >
                  <option value="all_members">Tất cả thành viên</option>
                  <option value="moderators_and_admins">Điều hành viên và quản trị viên</option>
                  <option value="admins_only">Chỉ quản trị viên</option>
                </select>
              </div>

              {/* Comment Permissions */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Ai có thể bình luận?
                </label>
                <select
                  name="commentPermissions"
                  value={formData.commentPermissions}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900 text-base"
                >
                  <option value="all_members">Tất cả thành viên</option>
                  <option value="members_only">Chỉ thành viên</option>
                  <option value="admins_only">Chỉ quản trị viên</option>
                </select>
              </div>

              {/* Additional Settings */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Cài đặt bổ sung
                </label>
                <div className="space-y-4">
                  <label className="flex items-center gap-4 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      name="allowMemberInvites"
                      checked={formData.allowMemberInvites}
                      onChange={handleInputChange}
                      className="w-4 h-4 text-black dark:text-white border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                    />
                    <span className="text-base text-gray-700">Cho phép thành viên mời người khác</span>
                  </label>

                  <label className="flex items-center gap-4 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      name="showMemberList"
                      checked={formData.showMemberList}
                      onChange={handleInputChange}
                      className="w-4 h-4 text-black dark:text-white border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                    />
                    <span className="text-base text-gray-700">Hiển thị danh sách thành viên</span>
                  </label>

                  <label className="flex items-center gap-4 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      name="searchable"
                      checked={formData.searchable}
                      onChange={handleInputChange}
                      className="w-4 h-4 text-black dark:text-white border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                    />
                    <span className="text-base text-gray-700">Cho phép tìm kiếm nhóm</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Images */}
          {currentStep === 3 && (
            <div className="space-y-6">
              {/* Avatar */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ảnh đại diện
                </label>
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
                    {avatarPreview ? (
                      <img src={avatarPreview} alt="Avatar preview" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gray-300 flex items-center justify-center">
                        <Users className="w-8 h-8 text-gray-500" />
                      </div>
                    )}
                  </div>
                  <div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileUpload(e, 'avatar')}
                      className="hidden"
                      id="avatar-upload"
                    />
                    <label
                      htmlFor="avatar-upload"
                      className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 cursor-pointer text-sm"
                    >
                      <Upload className="w-4 h-4 inline mr-2" />
                      Chọn ảnh
                    </label>
                    {avatar && (
                      <button
                        type="button"
                        onClick={() => removeFile('avatar')}
                        className="ml-2 px-3 py-1 text-red-600 hover:bg-red-50 rounded text-sm"
                      >
                        <X className="w-4 h-4 inline mr-1" />
                        Xóa
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Cover Image */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ảnh bìa
                </label>
                <div className="space-y-2">
                  <div className="w-full h-32 rounded-lg overflow-hidden bg-gray-200">
                    {coverPreview ? (
                      <img src={coverPreview} alt="Cover preview" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gray-300 flex items-center justify-center">
                        <Users className="w-12 h-12 text-gray-500" />
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileUpload(e, 'cover')}
                      className="hidden"
                      id="cover-upload"
                    />
                    <label
                      htmlFor="cover-upload"
                      className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 cursor-pointer text-sm"
                    >
                      <Upload className="w-4 h-4 inline mr-2" />
                      Chọn ảnh bìa
                    </label>
                    {coverImage && (
                      <button
                        type="button"
                        onClick={() => removeFile('cover')}
                        className="px-3 py-2 text-red-600 hover:bg-red-50 rounded text-sm"
                      >
                        <X className="w-4 h-4 inline mr-1" />
                        Xóa
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Additional Info */}
          {currentStep === 4 && (
            <div className="space-y-4">
              {/* Tags */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tags
                </label>
                <input
                  type="text"
                  name="tags"
                  value={formData.tags}
                  onChange={handleInputChange}
                  placeholder="Công nghệ, Học tập, Thể thao... (cách nhau bởi dấu phẩy)"
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.tags ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                <p className="mt-1 text-sm text-gray-500">
                  Tối đa 10 tags, mỗi tag không quá 20 ký tự
                </p>
                {errors.tags && (
                  <p className="mt-1 text-sm text-red-600">{errors.tags}</p>
                )}
              </div>

              {/* Location */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Vị trí
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.location.name}
                  onChange={handleLocationChange}
                  placeholder="Thành phố, quốc gia..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t bg-gray-50">
          <div className="flex gap-2">
            {currentStep > 1 && (
              <button
                type="button"
                onClick={prevStep}
                disabled={loading}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                Quay lại
              </button>
            )}
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              Hủy
            </button>
            
            {currentStep < steps.length ? (
              <button
                type="button"
                onClick={nextStep}
                disabled={loading}
                className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50"
              >
                Tiếp theo
              </button>
            ) : (
              <button
                type="submit"
                disabled={loading}
                onClick={handleSubmit}
                className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50"
              >
                {loading ? 'Đang tạo...' : 'Tạo nhóm'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GroupCreator;
