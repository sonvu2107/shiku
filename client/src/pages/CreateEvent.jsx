import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { Calendar, MapPin, Users, Tag, ArrowLeft, Save, Image, X } from "lucide-react";
import { useToast } from "../components/Toast";
import ImageUpload from "../components/ImageUpload";

/**
 * CreateEvent - Trang tạo sự kiện mới
 * Form để người dùng tạo sự kiện và lưu vào MongoDB
 */
export default function CreateEvent() {
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    coverImage: null,
    date: "",
    time: "",
    location: "",
    maxAttendees: "",
    isPublic: true,
    tags: ""
  });
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ""
      }));
    }
  };

  const handleCoverImageUpload = (imageUrl) => {
    setFormData(prev => ({
      ...prev,
      coverImage: imageUrl
    }));
  };

  const handleRemoveCoverImage = () => {
    setFormData(prev => ({
      ...prev,
      coverImage: null
    }));
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = "Tiêu đề sự kiện là bắt buộc";
    }

    if (!formData.description.trim()) {
      newErrors.description = "Mô tả sự kiện là bắt buộc";
    }

    if (!formData.date) {
      newErrors.date = "Ngày diễn ra là bắt buộc";
    } else {
      const eventDate = new Date(`${formData.date}T${formData.time || "00:00"}`);
      if (eventDate <= new Date()) {
        newErrors.date = "Ngày diễn ra phải trong tương lai";
      }
    }

    if (formData.maxAttendees && (isNaN(formData.maxAttendees) || formData.maxAttendees < 1)) {
      newErrors.maxAttendees = "Số người tham gia tối đa phải là số dương";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      // Combine date and time
      const eventDateTime = new Date(`${formData.date}T${formData.time || "00:00"}`);
      
      // Prepare tags array
      const tags = formData.tags
        ? formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag)
        : [];

      const eventData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        coverImage: formData.coverImage,
        date: eventDateTime.toISOString(),
        location: formData.location.trim(),
        maxAttendees: formData.maxAttendees ? parseInt(formData.maxAttendees) : null,
        isPublic: formData.isPublic,
        tags
      };

      const response = await api("/api/events", {
        method: "POST",
        body: JSON.stringify(eventData)
      });

      if (response.success) {
        showSuccess("Tạo sự kiện thành công!");
        navigate("/events");
      } else {
        throw new Error(response.message || "Có lỗi xảy ra khi tạo sự kiện");
      }
    } catch (error) {
      console.error("Error creating event:", error);
      showError(error.message || "Có lỗi xảy ra khi tạo sự kiện");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pt-20">
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate("/events")}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft size={20} />
            Quay lại
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Tạo sự kiện mới</h1>
          <p className="text-gray-600 mt-2">Tạo sự kiện để mời mọi người tham gia</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
              Tiêu đề sự kiện *
            </label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none ${
                errors.title ? "border-red-500" : "border-gray-300"
              }`}
              placeholder="Nhập tiêu đề sự kiện"
            />
            {errors.title && (
              <p className="mt-1 text-sm text-red-600">{errors.title}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
              Mô tả sự kiện *
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={4}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none ${
                errors.description ? "border-red-500" : "border-gray-300"
              }`}
              placeholder="Mô tả chi tiết về sự kiện..."
            />
            {errors.description && (
              <p className="mt-1 text-sm text-red-600">{errors.description}</p>
            )}
          </div>

          {/* Cover Image */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Image className="inline w-4 h-4 mr-1" />
              Ảnh bìa sự kiện
            </label>
            {formData.coverImage ? (
              <div className="relative">
                <img
                  src={formData.coverImage}
                  alt="Cover preview"
                  className="w-full h-48 object-cover rounded-lg border"
                />
                <button
                  type="button"
                  onClick={handleRemoveCoverImage}
                  className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <ImageUpload
                onUpload={handleCoverImageUpload}
                accept="image/*"
                className="w-full h-48 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center hover:border-gray-400 transition-colors"
              >
                <div className="text-center">
                  <Image className="mx-auto h-12 w-12 text-gray-400" />
                  <p className="mt-2 text-sm text-gray-600">Tải lên ảnh bìa</p>
                  <p className="text-xs text-gray-500">PNG, JPG, GIF tối đa 10MB</p>
                </div>
              </ImageUpload>
            )}
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="inline w-4 h-4 mr-1" />
                Ngày diễn ra *
              </label>
              <input
                type="date"
                id="date"
                name="date"
                value={formData.date}
                onChange={handleChange}
                min={new Date().toISOString().split('T')[0]}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none ${
                  errors.date ? "border-red-500" : "border-gray-300"
                }`}
              />
              {errors.date && (
                <p className="mt-1 text-sm text-red-600">{errors.date}</p>
              )}
            </div>

            <div>
              <label htmlFor="time" className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="inline w-4 h-4 mr-1" />
                Giờ diễn ra
              </label>
              <input
                type="time"
                id="time"
                name="time"
                value={formData.time}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>
          </div>

          {/* Location */}
          <div>
            <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-2">
              <MapPin className="inline w-4 h-4 mr-1" />
              Địa điểm
            </label>
            <input
              type="text"
              id="location"
              name="location"
              value={formData.location}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              placeholder="Nhập địa điểm tổ chức sự kiện"
            />
          </div>

          {/* Max Attendees */}
          <div>
            <label htmlFor="maxAttendees" className="block text-sm font-medium text-gray-700 mb-2">
              <Users className="inline w-4 h-4 mr-1" />
              Số người tham gia tối đa
            </label>
            <input
              type="number"
              id="maxAttendees"
              name="maxAttendees"
              value={formData.maxAttendees}
              onChange={handleChange}
              min="1"
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none ${
                errors.maxAttendees ? "border-red-500" : "border-gray-300"
              }`}
              placeholder="Để trống nếu không giới hạn"
            />
            {errors.maxAttendees && (
              <p className="mt-1 text-sm text-red-600">{errors.maxAttendees}</p>
            )}
          </div>

          {/* Tags */}
          <div>
            <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-2">
              <Tag className="inline w-4 h-4 mr-1" />
              Tags (cách nhau bởi dấu phẩy)
            </label>
            <input
              type="text"
              id="tags"
              name="tags"
              value={formData.tags}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              placeholder="Ví dụ: hội thảo, công nghệ, networking"
            />
          </div>

          {/* Public/Private */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="isPublic"
              name="isPublic"
              checked={formData.isPublic}
              onChange={handleChange}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="isPublic" className="ml-2 block text-sm text-gray-700">
              Sự kiện công khai (mọi người có thể tìm thấy và tham gia)
            </label>
          </div>

          {/* Submit Error */}
          {errors.submit && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-600">{errors.submit}</p>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              type="button"
              onClick={() => navigate("/events")}
              className="flex-1 px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 btn flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <>
                  <Save size={20} />
                  Tạo sự kiện
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
