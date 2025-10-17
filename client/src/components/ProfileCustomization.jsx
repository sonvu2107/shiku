import { useState, useEffect } from "react";
import { api, uploadImage } from "../api";
import { 
  Palette, 
  Layout, 
  Eye, 
  EyeOff, 
  Upload, 
  Save, 
  X, 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Globe, 
  Calendar, 
  Heart, 
  Users, 
  FileText, 
  Camera,
  Image as ImageIcon
} from "lucide-react";

/**
 * ProfileCustomization - Component tùy chỉnh profile
 * Bao gồm theme, layout, privacy settings và thông tin cá nhân
 * @param {Object} props - Component props
 * @param {Object} props.user - Thông tin user hiện tại
 * @param {Function} props.onUpdate - Callback khi cập nhật thành công
 * @param {Function} props.onClose - Callback đóng modal
 * @returns {JSX.Element} Component profile customization
 */
export default function ProfileCustomization({ user, onUpdate, onClose }) {
  // ==================== STATE MANAGEMENT ====================
  
  const [activeTab, setActiveTab] = useState("personal"); // personal, appearance, privacy
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  
  // Personal info state
  const [personalInfo, setPersonalInfo] = useState({
    bio: "",
    nickname: "",
    location: "",
    website: "",
    phone: "",
    coverUrl: ""
  });
  
  // Appearance state
  const [appearance, setAppearance] = useState({
    profileTheme: "default",
    profileLayout: "classic",
    useCoverImage: true
  });
  
  // Privacy state
  const [privacy, setPrivacy] = useState({
    showEmail: false,
    showPhone: false,
    showBirthday: true,
    showJoinDate: true,
    showLocation: true,
    showWebsite: true,
    showHobbies: true,
    showFriends: true,
    showPosts: true
  });
  
  // Upload states
  const [uploadingCover, setUploadingCover] = useState(false);
  const [previewCover, setPreviewCover] = useState("");

  // ==================== EFFECTS ====================
  
  useEffect(() => {
    if (user) {
      setPersonalInfo({
        bio: user.bio || "",
        nickname: user.nickname || "",
        location: user.location || "",
        website: user.website || "",
        phone: user.phone || "",
        coverUrl: user.coverUrl || ""
      });
      
      setAppearance({
        profileTheme: user.profileTheme || "default",
        profileLayout: user.profileLayout || "classic",
        useCoverImage: user.useCoverImage === true
      });
      
      setPrivacy({
        showEmail: user.showEmail || false,
        showPhone: user.showPhone || false,
        showBirthday: user.showBirthday !== false,
        showJoinDate: user.showJoinDate !== false,
        showLocation: user.showLocation !== false,
        showWebsite: user.showWebsite !== false,
        showHobbies: user.showHobbies !== false,
        showFriends: user.showFriends !== false,
        showPosts: user.showPosts !== false
      });
      
      setPreviewCover(user.coverUrl || "");
    }
  }, [user]);

  // ==================== THEME CONFIGURATIONS ====================
  
  const themes = [
    { id: "default", name: "Mặc định", colors: { primary: "#3b82f6", secondary: "#1e40af" } },
    { id: "dark", name: "Tối", colors: { primary: "#1f2937", secondary: "#111827" } },
    { id: "blue", name: "Xanh dương", colors: { primary: "#2563eb", secondary: "#1d4ed8" } },
    { id: "green", name: "Xanh lá", colors: { primary: "#059669", secondary: "#047857" } },
    { id: "purple", name: "Tím", colors: { primary: "#7c3aed", secondary: "#6d28d9" } },
    { id: "pink", name: "Hồng", colors: { primary: "#db2777", secondary: "#be185d" } },
    { id: "orange", name: "Cam", colors: { primary: "#ea580c", secondary: "#c2410c" } }
  ];
  
  const layouts = [
    { id: "classic", name: "Cổ điển", description: "Layout truyền thống với sidebar" },
    { id: "modern", name: "Hiện đại", description: "Layout phẳng, tối giản" },
    { id: "minimal", name: "Tối giản", description: "Chỉ hiển thị thông tin cần thiết" },
    { id: "creative", name: "Sáng tạo", description: "Layout độc đáo với hiệu ứng" }
  ];

  // ==================== HANDLERS ====================
  
  const handleCoverUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploadingCover(true);
    setError("");
    try {
      // Use uploadImage utility instead of direct API call
      const { url } = await uploadImage(file);
      
      setPersonalInfo(prev => ({ ...prev, coverUrl: url }));
      setPreviewCover(url);
    } catch (error) {
      // Silent handling for cover upload error
      setError("Lỗi upload ảnh bìa: " + error.message);
    } finally {
      setUploadingCover(false);
    }
  };
  

  const handleSave = async () => {
    setLoading(true);
    setError("");
    setSuccess("");
    
    try {
      // Prepare update data with only changed fields
      const updateData = {};
      
      // Personal info - only include if changed
      if (personalInfo.bio !== (user.bio || "")) {
        updateData.bio = personalInfo.bio;
      }
      if (personalInfo.nickname !== (user.nickname || "")) {
        updateData.nickname = personalInfo.nickname;
      }
      if (personalInfo.location !== (user.location || "")) {
        updateData.location = personalInfo.location;
      }
      if (personalInfo.coverUrl !== (user.coverUrl || "")) {
        updateData.coverUrl = personalInfo.coverUrl;
      }
      
      // Website - validate and include if changed
      if (personalInfo.website !== (user.website || "")) {
        if (personalInfo.website && personalInfo.website.trim() !== "") {
          if (!personalInfo.website.startsWith('http://') && !personalInfo.website.startsWith('https://')) {
            updateData.website = `https://${personalInfo.website}`;
          } else {
            updateData.website = personalInfo.website;
          }
        } else {
          updateData.website = personalInfo.website;
        }
      }
      
      // Phone - validate and include if changed
      if (personalInfo.phone !== (user.phone || "")) {
        if (personalInfo.phone && personalInfo.phone.trim() !== "") {
          const phoneRegex = /^[\+]?[0-9\s\-\(\)]{10,15}$/;
          if (!phoneRegex.test(personalInfo.phone)) {
            setError("Số điện thoại không hợp lệ");
            setLoading(false);
            return;
          }
        }
        updateData.phone = personalInfo.phone;
      }
      
      // Appearance - check if any appearance setting has changed
      const appearanceChanged = (
        appearance.profileTheme !== (user.profileTheme || "default") ||
        appearance.profileLayout !== (user.profileLayout || "classic") ||
        appearance.useCoverImage !== (user.useCoverImage === true)
      );
      
      // If any appearance setting changed, include all of them
      if (appearanceChanged) {
        updateData.profileTheme = appearance.profileTheme;
        updateData.profileLayout = appearance.profileLayout;
        updateData.useCoverImage = appearance.useCoverImage;
        
      }
      
      // Privacy - only include if changed
      Object.keys(privacy).forEach(key => {
        const currentValue = user[key] !== false; // Default to true for most privacy settings
        if (privacy[key] !== currentValue) {
          updateData[key] = privacy[key];
        }
      });
      
      // Only send request if there are changes
      if (Object.keys(updateData).length === 0) {
        setError("Không có thay đổi nào để lưu");
        setLoading(false);
        return;
      }
      
      
      await api("/api/auth/update-profile", {
        method: "PUT",
        body: updateData
      });
      
      setSuccess("Cập nhật profile thành công!");
      
      // Force immediate update
      onUpdate?.();
      
      setTimeout(() => {
        onClose?.();
      }, 1500);
    } catch (error) {
      // Silent handling for update error
      setError("Lỗi cập nhật: " + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  // Track if there are unsaved changes
  const hasUnsavedChanges = () => {
    return (
      personalInfo.bio !== (user.bio || "") ||
      personalInfo.nickname !== (user.nickname || "") ||
      personalInfo.location !== (user.location || "") ||
      personalInfo.coverUrl !== (user.coverUrl || "") ||
      personalInfo.website !== (user.website || "") ||
      personalInfo.phone !== (user.phone || "") ||
      appearance.profileTheme !== (user.profileTheme || "default") ||
      appearance.profileLayout !== (user.profileLayout || "classic") ||
      appearance.useCoverImage !== (user.useCoverImage === true) ||
      Object.keys(privacy).some(key => privacy[key] !== (user[key] !== false))
    );
  };


  // ==================== RENDER ====================
  
  if (!user) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 md:p-4">
      <style>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[95vh] md:max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 md:p-6 border-b border-gray-200">
          <h2 className="text-lg md:text-2xl font-bold text-gray-900">Tùy chỉnh Profile</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 md:w-6 md:h-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 overflow-x-auto scrollbar-hide">
          {[
            { id: "personal", label: "Thông tin", icon: User },
            { id: "appearance", label: "Giao diện", icon: Palette },
            { id: "privacy", label: "Riêng tư", icon: Eye }
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-1 md:gap-2 px-3 md:px-6 py-3 md:py-4 font-medium transition-colors whitespace-nowrap flex-shrink-0 ${
                activeTab === id
                  ? "text-blue-600 border-b-2 border-blue-600"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Icon className="w-4 h-4 md:w-5 md:h-5" />
              <span className="text-sm md:text-base">{label}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-4 md:p-6 max-h-80 md:max-h-96 overflow-y-auto">
          {/* Personal Info Tab */}
          {activeTab === "personal" && (
            <div className="space-y-6">
              {/* Cover Photo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ảnh bìa
                </label>
                <div className="relative">
                  <div className="w-full h-32 bg-gray-100 rounded-lg overflow-hidden">
                    {previewCover ? (
                      <img
                        src={previewCover}
                        alt="Cover preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <ImageIcon className="w-8 h-8" />
                      </div>
                    )}
                  </div>
                  <label className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity cursor-pointer">
                    <Camera className="w-6 h-6 text-white" />
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleCoverUpload}
                      disabled={uploadingCover}
                    />
                  </label>
                  {uploadingCover && (
                    <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                      <div className="text-white">Đang tải...</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Bio */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tiểu sử
                </label>
                <textarea
                  value={personalInfo.bio}
                  onChange={(e) => setPersonalInfo(prev => ({ ...prev, bio: e.target.value }))}
                  placeholder="Hãy kể về bản thân..."
                  className="w-full h-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  maxLength={500}
                />
                <div className="text-right text-sm text-gray-500 mt-1">
                  {personalInfo.bio.length}/500
                </div>
              </div>

              {/* Nickname */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <User className="w-4 h-4 inline mr-1" />
                  Biệt danh
                </label>
                <input
                  type="text"
                  value={personalInfo.nickname}
                  onChange={(e) => setPersonalInfo(prev => ({ ...prev, nickname: e.target.value }))}
                  placeholder="Nhập biệt danh của bạn..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  maxLength={30}
                />
                <div className="text-right text-sm text-gray-500 mt-1">
                  {personalInfo.nickname.length}/30
                </div>
              </div>

              {/* Location */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <MapPin className="w-4 h-4 inline mr-1" />
                  Địa chỉ
                </label>
                <input
                  type="text"
                  value={personalInfo.location}
                  onChange={(e) => setPersonalInfo(prev => ({ ...prev, location: e.target.value }))}
                  placeholder="Thành phố, Quốc gia"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Website */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Globe className="w-4 h-4 inline mr-1" />
                  Website
                </label>
                <input
                  type="url"
                  value={personalInfo.website}
                  onChange={(e) => setPersonalInfo(prev => ({ ...prev, website: e.target.value }))}
                  placeholder="https://example.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Phone className="w-4 h-4 inline mr-1" />
                  Số điện thoại
                </label>
                <input
                  type="tel"
                  value={personalInfo.phone}
                  onChange={(e) => setPersonalInfo(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="+84 123 456 789"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          )}

          {/* Appearance Tab */}
          {activeTab === "appearance" && (
            <div className="space-y-6">
              {/* Theme Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-4">
                  Chọn theme màu sắc
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {themes.map((theme) => (
                    <button
                      key={theme.id}
                      onClick={() => setAppearance(prev => ({ ...prev, profileTheme: theme.id }))}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        appearance.profileTheme === theme.id
                          ? "border-blue-500 ring-2 ring-blue-200"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div
                        className="w-full h-8 rounded mb-2"
                        style={{ backgroundColor: theme.colors.primary }}
                      ></div>
                      <div className="text-sm font-medium text-gray-900">{theme.name}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Cover Display Option */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-4">
                  Hiển thị ảnh bìa
                </label>
                <div className="space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="coverDisplay"
                      checked={appearance.useCoverImage}
                      onChange={() => setAppearance(prev => ({ ...prev, useCoverImage: true }))}
                      className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                    />
                    <ImageIcon className="w-5 h-5 text-gray-400" />
                    <span className="text-gray-700">Hiển thị ảnh bìa đã upload</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="coverDisplay"
                      checked={!appearance.useCoverImage}
                      onChange={() => setAppearance(prev => ({ ...prev, useCoverImage: false }))}
                      className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                    />
                    <Palette className="w-5 h-5 text-gray-400" />
                    <span className="text-gray-700">Hiển thị màu theme</span>
                  </label>
                </div>
              </div>

              {/* Layout Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-4">
                  Chọn layout profile
                </label>
                <div className="grid grid-cols-1 gap-4">
                  {layouts.map((layout) => (
                    <button
                      key={layout.id}
                      onClick={() => setAppearance(prev => ({ ...prev, profileLayout: layout.id }))}
                      className={`p-4 rounded-lg border-2 text-left transition-all ${
                        appearance.profileLayout === layout.id
                          ? "border-blue-500 ring-2 ring-blue-200"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div className="font-medium text-gray-900 mb-1">{layout.name}</div>
                      <div className="text-sm text-gray-500">{layout.description}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Privacy Tab */}
          {activeTab === "privacy" && (
            <div className="space-y-6">
              <div className="text-sm text-gray-600 mb-4">
                Chọn thông tin nào sẽ hiển thị công khai trên profile của bạn
              </div>

              {/* Contact Info */}
              <div className="space-y-4">
                <h3 className="font-medium text-gray-900">Thông tin liên hệ</h3>
                {[
                  { key: "showEmail", label: "Email", icon: Mail },
                  { key: "showPhone", label: "Số điện thoại", icon: Phone }
                ].map(({ key, label, icon: Icon }) => (
                  <div key={key} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Icon className="w-5 h-5 text-gray-400" />
                      <span className="text-gray-700">{label}</span>
                    </div>
                    <button
                      onClick={() => setPrivacy(prev => ({ ...prev, [key]: !prev[key] }))}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        privacy[key] ? "bg-blue-600" : "bg-gray-200"
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          privacy[key] ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>
                ))}
              </div>

              {/* Personal Info */}
              <div className="space-y-4">
                <h3 className="font-medium text-gray-900">Thông tin cá nhân</h3>
                {[
                  { key: "showBirthday", label: "Ngày sinh", icon: Calendar },
                  { key: "showJoinDate", label: "Ngày tham gia", icon: Calendar },
                  { key: "showLocation", label: "Địa chỉ", icon: MapPin },
                  { key: "showWebsite", label: "Website", icon: Globe },
                  { key: "showHobbies", label: "Sở thích", icon: Heart }
                ].map(({ key, label, icon: Icon }) => (
                  <div key={key} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Icon className="w-5 h-5 text-gray-400" />
                      <span className="text-gray-700">{label}</span>
                    </div>
                    <button
                      onClick={() => setPrivacy(prev => ({ ...prev, [key]: !prev[key] }))}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        privacy[key] ? "bg-blue-600" : "bg-gray-200"
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          privacy[key] ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>
                ))}
              </div>

              {/* Social Features */}
              <div className="space-y-4">
                <h3 className="font-medium text-gray-900">Tính năng xã hội</h3>
                {[
                  { key: "showFriends", label: "Danh sách bạn bè", icon: Users },
                  { key: "showPosts", label: "Bài đăng", icon: FileText }
                ].map(({ key, label, icon: Icon }) => (
                  <div key={key} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Icon className="w-5 h-5 text-gray-400" />
                      <span className="text-gray-700">{label}</span>
                    </div>
                    <button
                      onClick={() => setPrivacy(prev => ({ ...prev, [key]: !prev[key] }))}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        privacy[key] ? "bg-blue-600" : "bg-gray-200"
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          privacy[key] ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between p-4 md:p-6 border-t border-gray-200 bg-gray-50 gap-3 md:gap-0">
          <div className="text-xs md:text-sm text-gray-500">
            {activeTab === "personal" && "Cập nhật thông tin cá nhân"}
            {activeTab === "appearance" && "Tùy chỉnh giao diện profile"}
            {activeTab === "privacy" && "Cài đặt quyền riêng tư"}
            {hasUnsavedChanges() && (
              <span className="ml-2 text-orange-600 font-medium">
                • Có thay đổi chưa lưu
              </span>
            )}
          </div>
          <div className="flex gap-2 md:gap-3 w-full md:w-auto">
            <button
              onClick={onClose}
              className="flex-1 md:flex-none px-3 md:px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm"
            >
              Hủy
            </button>
            <button
              onClick={handleSave}
              disabled={loading || !hasUnsavedChanges()}
              className="flex-1 md:flex-none px-3 md:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 text-sm"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Lưu thay đổi
            </button>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="absolute top-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}
        {success && (
          <div className="absolute top-4 right-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
            {success}
          </div>
        )}
      </div>
    </div>
  );
}
