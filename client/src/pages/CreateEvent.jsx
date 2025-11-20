import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { Calendar, MapPin, Users, Tag, ArrowLeft, Save, Image, X, Globe, Lock } from "lucide-react";
import { useToast } from "../components/Toast";
import ImageUpload from "../components/ImageUpload";
import { PageLayout, PageHeader, SpotlightCard } from "../components/ui/DesignSystem";
import { motion } from "framer-motion";

/**
 * CreateEvent - Trang tạo sự kiện mới (Monochrome Luxury Style)
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
      showError(error.message || "Có lỗi xảy ra khi tạo sự kiện");
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageLayout>
      {/* Back Button */}
      <button
        onClick={() => navigate("/events")}
        className="group flex items-center gap-2 text-neutral-500 hover:text-black dark:hover:text-white mb-6 transition-colors"
      >
        <div className="p-2 rounded-full bg-neutral-100 dark:bg-neutral-900 group-hover:bg-neutral-200 dark:group-hover:bg-neutral-800 transition-colors">
          <ArrowLeft size={20} />
        </div>
        <span className="font-medium">Quay lại</span>
      </button>

      {/* Header */}
      <PageHeader 
        title="Tạo sự kiện mới" 
        subtitle="Tạo sự kiện để mời mọi người tham gia"
      />

      {/* Form */}
      <motion.form 
        onSubmit={handleSubmit} 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-3xl mx-auto space-y-6"
      >
        {/* Title */}
        <SpotlightCard>
          <label htmlFor="title" className="block text-sm font-bold text-neutral-500 uppercase tracking-wider mb-3">
            Tiêu đề sự kiện *
          </label>
          <input
            type="text"
            id="title"
            name="title"
            value={formData.title}
            onChange={handleChange}
            className={`w-full px-4 py-3 bg-transparent border rounded-3xl focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent transition-all ${
              errors.title ? "border-red-500" : "border-neutral-200 dark:border-neutral-800"
            } text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500`}
            placeholder="Nhập tiêu đề sự kiện"
          />
          {errors.title && (
            <p className="mt-2 text-sm text-red-500">{errors.title}</p>
          )}
        </SpotlightCard>

        {/* Description */}
        <SpotlightCard>
          <label htmlFor="description" className="block text-sm font-bold text-neutral-500 uppercase tracking-wider mb-3">
            Mô tả sự kiện *
          </label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows={6}
            className={`w-full px-4 py-3 bg-transparent border rounded-3xl focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent transition-all resize-none ${
              errors.description ? "border-red-500" : "border-neutral-200 dark:border-neutral-800"
            } text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500`}
            placeholder="Mô tả chi tiết về sự kiện..."
          />
          {errors.description && (
            <p className="mt-2 text-sm text-red-500">{errors.description}</p>
          )}
        </SpotlightCard>

        {/* Cover Image */}
        <SpotlightCard>
          <label className="block text-sm font-bold text-neutral-500 uppercase tracking-wider mb-3">
            <Image className="inline w-4 h-4 mr-2" />
            Ảnh bìa sự kiện
          </label>
          {formData.coverImage ? (
            <div className="relative rounded-3xl overflow-hidden">
              <img
                src={formData.coverImage}
                alt="Cover preview"
                className="w-full h-64 object-cover"
              />
              <button
                type="button"
                onClick={handleRemoveCoverImage}
                className="absolute top-4 right-4 p-2 bg-black/80 dark:bg-white/80 backdrop-blur-md text-white dark:text-black rounded-full hover:bg-black dark:hover:bg-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>
          ) : (
            <ImageUpload
              onUpload={handleCoverImageUpload}
              accept="image/*"
              className="w-full h-48 border-2 border-dashed border-neutral-200 dark:border-neutral-800 rounded-3xl flex items-center justify-center hover:border-neutral-300 dark:hover:border-neutral-700 transition-colors cursor-pointer"
            >
              <div className="text-center">
                <Image className="mx-auto h-12 w-12 text-neutral-400 dark:text-neutral-600" />
                <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400 font-medium">Tải lên ảnh bìa</p>
                <p className="text-xs text-neutral-500 dark:text-neutral-500">PNG, JPG, GIF (tối đa 10MB)</p>
              </div>
            </ImageUpload>
          )}
        </SpotlightCard>

        {/* Date and Time */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <SpotlightCard>
            <label htmlFor="date" className="block text-sm font-bold text-neutral-500 uppercase tracking-wider mb-3">
              <Calendar className="inline w-4 h-4 mr-2" />
              Ngày diễn ra *
            </label>
            <input
              type="date"
              id="date"
              name="date"
              value={formData.date}
              onChange={handleChange}
              min={new Date().toISOString().split('T')[0]}
              className={`w-full px-4 py-3 bg-transparent border rounded-3xl focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent transition-all ${
                errors.date ? "border-red-500" : "border-neutral-200 dark:border-neutral-800"
              } text-neutral-900 dark:text-white`}
            />
            {errors.date && (
              <p className="mt-2 text-sm text-red-500">{errors.date}</p>
            )}
          </SpotlightCard>

          <SpotlightCard>
            <label htmlFor="time" className="block text-sm font-bold text-neutral-500 uppercase tracking-wider mb-3">
              <Calendar className="inline w-4 h-4 mr-2" />
              Giờ diễn ra
            </label>
            <input
              type="time"
              id="time"
              name="time"
              value={formData.time}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-transparent border border-neutral-200 dark:border-neutral-800 rounded-3xl focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent transition-all text-neutral-900 dark:text-white"
            />
          </SpotlightCard>
        </div>

        {/* Location */}
        <SpotlightCard>
          <label htmlFor="location" className="block text-sm font-bold text-neutral-500 uppercase tracking-wider mb-3">
            <MapPin className="inline w-4 h-4 mr-2" />
            Địa điểm
          </label>
          <input
            type="text"
            id="location"
            name="location"
            value={formData.location}
            onChange={handleChange}
            className="w-full px-4 py-3 bg-transparent border border-neutral-200 dark:border-neutral-800 rounded-3xl focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent transition-all text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500"
            placeholder="Nhập địa điểm tổ chức sự kiện"
          />
        </SpotlightCard>

        {/* Max Attendees */}
        <SpotlightCard>
          <label htmlFor="maxAttendees" className="block text-sm font-bold text-neutral-500 uppercase tracking-wider mb-3">
            <Users className="inline w-4 h-4 mr-2" />
            Số người tham gia tối đa
          </label>
          <input
            type="number"
            id="maxAttendees"
            name="maxAttendees"
            value={formData.maxAttendees}
            onChange={handleChange}
            min="1"
            className={`w-full px-4 py-3 bg-transparent border rounded-3xl focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent transition-all ${
              errors.maxAttendees ? "border-red-500" : "border-neutral-200 dark:border-neutral-800"
            } text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500`}
            placeholder="Để trống nếu không giới hạn"
          />
          {errors.maxAttendees && (
            <p className="mt-2 text-sm text-red-500">{errors.maxAttendees}</p>
          )}
        </SpotlightCard>

        {/* Tags */}
        <SpotlightCard>
          <label htmlFor="tags" className="block text-sm font-bold text-neutral-500 uppercase tracking-wider mb-3">
            <Tag className="inline w-4 h-4 mr-2" />
            Tags
          </label>
          <input
            type="text"
            id="tags"
            name="tags"
            value={formData.tags}
            onChange={handleChange}
            className="w-full px-4 py-3 bg-transparent border border-neutral-200 dark:border-neutral-800 rounded-3xl focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent transition-all text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500"
            placeholder="Ví dụ: hội thảo, công nghệ, networking"
          />
        </SpotlightCard>

        {/* Public/Private */}
        <SpotlightCard>
          <div className="flex items-start gap-4">
            <div className="flex items-center h-5">
              <input
                type="checkbox"
                id="isPublic"
                name="isPublic"
                checked={formData.isPublic}
                onChange={handleChange}
                className="w-5 h-5 rounded border-neutral-300 dark:border-neutral-700 text-black dark:text-white focus:ring-2 focus:ring-black dark:focus:ring-white"
              />
            </div>
            <div className="flex-1">
              <label htmlFor="isPublic" className="flex items-center gap-2 text-sm font-semibold text-neutral-900 dark:text-white cursor-pointer">
                {formData.isPublic ? <Globe size={18} /> : <Lock size={18} />}
                <span>Sự kiện {formData.isPublic ? 'công khai' : 'riêng tư'}</span>
              </label>
              <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                {formData.isPublic 
                  ? "Mọi người có thể tìm thấy và tham gia sự kiện này"
                  : "Chỉ những người được mời mới có thể tham gia"}
              </p>
            </div>
          </div>
        </SpotlightCard>

        {/* Submit Error */}
        {errors.submit && (
          <SpotlightCard className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/10">
            <p className="text-sm text-red-600 dark:text-red-400">{errors.submit}</p>
          </SpotlightCard>
        )}

        {/* Submit Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 pt-4">
          <button
            type="button"
            onClick={() => navigate("/events")}
            className="flex-1 px-6 py-3 border border-neutral-200 dark:border-neutral-800 rounded-full text-neutral-700 dark:text-neutral-300 font-semibold hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            Hủy
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 px-6 py-3 bg-black dark:bg-white text-white dark:text-black rounded-full font-bold hover:scale-[1.02] active:scale-[0.98] transition-transform shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-white dark:border-black"></div>
            ) : (
              <>
                <Save size={20} />
                Tạo sự kiện
              </>
            )}
          </button>
        </div>
      </motion.form>
    </PageLayout>
  );
}
