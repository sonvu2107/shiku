import { useState, useEffect, useRef } from "react";
import { api, uploadImage } from "../api";
import { motion, AnimatePresence } from "framer-motion";
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
  Image as ImageIcon,
  Settings,
  Sparkles,
  Shield
} from "lucide-react";
import { cn } from "../utils/cn";

// Spotlight Card component
const SpotlightCard = ({ children, className = "" }) => {
  const divRef = useRef(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [opacity, setOpacity] = useState(0);

  const handleMouseMove = (e) => {
    if (!divRef.current) return;
    const div = divRef.current;
    const rect = div.getBoundingClientRect();
    setPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  return (
    <div
      ref={divRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setOpacity(1)}
      onMouseLeave={() => setOpacity(0)}
      className={cn(
        "relative overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/50 p-6 transition-all duration-300 hover:shadow-lg",
        className
      )}
    >
      <div
        className="pointer-events-none absolute -inset-px opacity-0 transition duration-300"
        style={{
          opacity,
          background: `radial-gradient(400px circle at ${position.x}px ${position.y}px, rgba(150,150,150,0.1), transparent 40%)`,
        }}
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
};

/**
 * ProfileCustomization - Profile customization component
 * Includes appearance and privacy settings only (fields overlapping with the edit form are omitted)
 */
export default function ProfileCustomization({ user, onUpdate, onClose }) {
  // ==================== STATE MANAGEMENT ====================
  
  const [activeTab, setActiveTab] = useState("appearance"); // appearance, privacy
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  
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
  
  // Display badge type state (role or cultivation)
  const [displayBadgeType, setDisplayBadgeType] = useState("role");
  
  // Upload states
  const [uploadingCover, setUploadingCover] = useState(false);
  const [previewCover, setPreviewCover] = useState("");

  // ==================== EFFECTS ====================
  
  useEffect(() => {
    if (user) {
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
      
      setDisplayBadgeType(user.displayBadgeType || "role");
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
      const { url } = await uploadImage(file);
      // Update coverUrl in user profile
      await api("/api/auth/update-profile", {
        method: "PUT",
        body: { coverUrl: url }
      });
      setPreviewCover(url);
      onUpdate?.();
    } catch (error) {
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
      const updateData = {};
      
      // Appearance - check if any appearance setting has changed
      const appearanceChanged = (
        appearance.profileTheme !== (user.profileTheme || "default") ||
        appearance.profileLayout !== (user.profileLayout || "classic") ||
        appearance.useCoverImage !== (user.useCoverImage === true)
      );
      
      if (appearanceChanged) {
        updateData.profileTheme = appearance.profileTheme;
        updateData.profileLayout = appearance.profileLayout;
        updateData.useCoverImage = appearance.useCoverImage;
      }
      
      // Privacy - only include if changed
      Object.keys(privacy).forEach(key => {
        const currentValue = user[key] !== false;
        if (privacy[key] !== currentValue) {
          updateData[key] = privacy[key];
        }
      });
      
      // Display badge type - check if changed
      if (displayBadgeType !== (user.displayBadgeType || "role")) {
        updateData.displayBadgeType = displayBadgeType;
      }
      
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
      onUpdate?.();
      
      setTimeout(() => {
        onClose?.();
      }, 1500);
    } catch (error) {
      setError("Lỗi cập nhật: " + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  // Track if there are unsaved changes
  const hasUnsavedChanges = () => {
    return (
      appearance.profileTheme !== (user.profileTheme || "default") ||
      appearance.profileLayout !== (user.profileLayout || "classic") ||
      appearance.useCoverImage !== (user.useCoverImage === true) ||
      displayBadgeType !== (user.displayBadgeType || "role") ||
      Object.keys(privacy).some(key => privacy[key] !== (user[key] !== false))
    );
  };

  // ==================== RENDER ====================
  
  if (!user) return null;

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-2 md:p-4 backdrop-blur-sm" data-profile-customization-modal>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white/90 dark:bg-neutral-900/90 backdrop-blur-xl rounded-3xl shadow-2xl w-full max-w-4xl max-h-[95vh] md:max-h-[90vh] flex flex-col border border-neutral-200 dark:border-neutral-800"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-neutral-200 dark:border-neutral-800 bg-white/50 dark:bg-neutral-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-neutral-100 dark:bg-neutral-800 rounded-lg">
              <Settings className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
            </div>
            <h2 className="text-xl md:text-2xl font-black text-neutral-900 dark:text-white">Tùy chỉnh giao diện</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-colors text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl p-2">
          <div className="flex gap-2">
            {[
              { id: "appearance", label: "Giao diện", icon: Palette },
              { id: "privacy", label: "Riêng tư", icon: Eye }
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 px-6 py-3 font-bold transition-all duration-300 rounded-full",
                  activeTab === id
                    ? "bg-black dark:bg-white text-white dark:text-black shadow-md"
                    : "text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200 hover:bg-black/5 dark:hover:bg-white/10"
                )}
              >
                <Icon className="w-5 h-5" />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 flex-1 overflow-y-auto bg-white dark:bg-neutral-900 min-h-0">
          <AnimatePresence mode="wait">
            {/* Appearance Tab */}
            {activeTab === "appearance" && (
              <motion.div
                key="appearance"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                {/* Cover Photo */}
                <SpotlightCard>
                  <label className="block text-sm font-bold uppercase text-neutral-500 mb-4">
                    Ảnh bìa
                  </label>
                  <div className="relative group">
                    <div className="w-full h-32 md:h-40 bg-neutral-100 dark:bg-neutral-800 rounded-xl overflow-hidden border border-neutral-200 dark:border-neutral-700">
                      {previewCover ? (
                        <img
                          src={previewCover}
                          alt="Cover preview"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-neutral-400 dark:text-neutral-500">
                          <ImageIcon className="w-8 h-8" />
                        </div>
                      )}
                    </div>
                    <label className="absolute inset-0 bg-black/50 dark:bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-xl">
                      <div className="flex flex-col items-center gap-2">
                        <Camera className="w-6 h-6 text-white" />
                        <span className="text-white text-xs font-bold">Tải ảnh lên</span>
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleCoverUpload}
                        disabled={uploadingCover}
                      />
                    </label>
                    {uploadingCover && (
                      <div className="absolute inset-0 bg-black/70 dark:bg-black/80 flex items-center justify-center rounded-xl">
                        <div className="flex flex-col items-center gap-2">
                          <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <div className="text-white text-sm font-bold">Đang tải...</div>
                        </div>
                      </div>
                    )}
                  </div>
                </SpotlightCard>

                {/* Theme Selection */}
                <SpotlightCard>
                  <label className="block text-sm font-bold uppercase text-neutral-500 mb-4">
                    Chọn theme màu sắc
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {themes.map((theme) => (
                      <button
                        key={theme.id}
                        onClick={() => setAppearance(prev => ({ ...prev, profileTheme: theme.id }))}
                        className={cn(
                          "p-4 rounded-xl border-2 transition-all bg-white dark:bg-neutral-800",
                          appearance.profileTheme === theme.id
                            ? "border-black dark:border-white ring-2 ring-neutral-200 dark:ring-neutral-700 shadow-lg"
                            : "border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600"
                        )}
                      >
                        <div
                          className="w-full h-8 rounded-lg mb-2 shadow-sm"
                          style={{ backgroundColor: theme.colors.primary }}
                        ></div>
                        <div className="text-sm font-bold text-neutral-900 dark:text-white">{theme.name}</div>
                      </button>
                    ))}
                  </div>
                </SpotlightCard>

                {/* Cover Display Option */}
                <SpotlightCard>
                  <label className="block text-sm font-bold uppercase text-neutral-500 mb-4">
                    Hiển thị ảnh bìa
                  </label>
                  <div className="space-y-3">
                    <label className="flex items-center gap-3 cursor-pointer p-4 rounded-xl border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors">
                      <input
                        type="radio"
                        name="coverDisplay"
                        checked={appearance.useCoverImage}
                        onChange={() => setAppearance(prev => ({ ...prev, useCoverImage: true }))}
                        className="w-4 h-4 text-black dark:text-white border-neutral-300 dark:border-neutral-600 focus:ring-black dark:focus:ring-white"
                      />
                      <ImageIcon className="w-5 h-5 text-neutral-400 dark:text-neutral-500" />
                      <span className="text-neutral-700 dark:text-neutral-300 font-medium">Hiển thị ảnh bìa đã upload</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer p-4 rounded-xl border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors">
                      <input
                        type="radio"
                        name="coverDisplay"
                        checked={!appearance.useCoverImage}
                        onChange={() => setAppearance(prev => ({ ...prev, useCoverImage: false }))}
                        className="w-4 h-4 text-black dark:text-white border-neutral-300 dark:border-neutral-600 focus:ring-black dark:focus:ring-white"
                      />
                      <Palette className="w-5 h-5 text-neutral-400 dark:text-neutral-500" />
                      <span className="text-neutral-700 dark:text-neutral-300 font-medium">Hiển thị màu theme</span>
                    </label>
                  </div>
                </SpotlightCard>

                {/* Layout Selection */}
                <SpotlightCard>
                  <label className="block text-sm font-bold uppercase text-neutral-500 mb-4">
                    Chọn layout profile
                  </label>
                  <div className="grid grid-cols-1 gap-4">
                    {layouts.map((layout) => (
                      <button
                        key={layout.id}
                        onClick={() => setAppearance(prev => ({ ...prev, profileLayout: layout.id }))}
                        className={cn(
                          "p-4 rounded-xl border-2 text-left transition-all bg-white dark:bg-neutral-800",
                          appearance.profileLayout === layout.id
                            ? "border-black dark:border-white ring-2 ring-neutral-200 dark:ring-neutral-700 shadow-lg"
                            : "border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600"
                        )}
                      >
                        <div className="font-bold text-neutral-900 dark:text-white mb-1">{layout.name}</div>
                        <div className="text-sm text-neutral-500 dark:text-neutral-400">{layout.description}</div>
                      </button>
                    ))}
                  </div>
                </SpotlightCard>
              </motion.div>
            )}

            {/* Privacy Tab */}
            {activeTab === "privacy" && (
              <motion.div
                key="privacy"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                <div className="text-sm text-neutral-600 dark:text-neutral-400 mb-4 p-4 bg-neutral-50 dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700">
                  Chọn thông tin nào sẽ hiển thị công khai trên profile của bạn
                </div>

                {/* Contact Info */}
                <SpotlightCard>
                  <h3 className="font-bold text-neutral-900 dark:text-white mb-4">Thông tin liên hệ</h3>
                  <div className="space-y-3">
                    {[
                      { key: "showEmail", label: "Email", icon: Mail },
                      { key: "showPhone", label: "Số điện thoại", icon: Phone }
                    ].map(({ key, label, icon: Icon }) => (
                      <div key={key} className="flex items-center justify-between p-3 rounded-xl border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors">
                        <div className="flex items-center gap-3">
                          <Icon className="w-5 h-5 text-neutral-400 dark:text-neutral-500" />
                          <span className="text-neutral-700 dark:text-neutral-300 font-medium">{label}</span>
                        </div>
                        <button
                          onClick={() => setPrivacy(prev => ({ ...prev, [key]: !prev[key] }))}
                          className={cn(
                            "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                            privacy[key] ? "bg-black dark:bg-white" : "bg-neutral-200 dark:bg-neutral-700"
                          )}
                        >
                          <span
                            className={cn(
                              "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                              privacy[key] ? "translate-x-6" : "translate-x-1"
                            )}
                          />
                        </button>
                      </div>
                    ))}
                  </div>
                </SpotlightCard>

                {/* Personal Info */}
                <SpotlightCard>
                  <h3 className="font-bold text-neutral-900 dark:text-white mb-4">Thông tin cá nhân</h3>
                  <div className="space-y-3">
                    {[
                      { key: "showBirthday", label: "Ngày sinh", icon: Calendar },
                      { key: "showJoinDate", label: "Ngày tham gia", icon: Calendar },
                      { key: "showLocation", label: "Địa chỉ", icon: MapPin },
                      { key: "showWebsite", label: "Website", icon: Globe },
                      { key: "showHobbies", label: "Sở thích", icon: Heart }
                    ].map(({ key, label, icon: Icon }) => (
                      <div key={key} className="flex items-center justify-between p-3 rounded-xl border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors">
                        <div className="flex items-center gap-3">
                          <Icon className="w-5 h-5 text-neutral-400 dark:text-neutral-500" />
                          <span className="text-neutral-700 dark:text-neutral-300 font-medium">{label}</span>
                        </div>
                        <button
                          onClick={() => setPrivacy(prev => ({ ...prev, [key]: !prev[key] }))}
                          className={cn(
                            "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                            privacy[key] ? "bg-black dark:bg-white" : "bg-neutral-200 dark:bg-neutral-700"
                          )}
                        >
                          <span
                            className={cn(
                              "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                              privacy[key] ? "translate-x-6" : "translate-x-1"
                            )}
                          />
                        </button>
                      </div>
                    ))}
                  </div>
                </SpotlightCard>

                {/* Social Features */}
                <SpotlightCard>
                  <h3 className="font-bold text-neutral-900 dark:text-white mb-4">Tính năng xã hội</h3>
                  <div className="space-y-3">
                    {[
                      { key: "showFriends", label: "Danh sách bạn bè", icon: Users },
                      { key: "showPosts", label: "Bài đăng", icon: FileText }
                    ].map(({ key, label, icon: Icon }) => (
                      <div key={key} className="flex items-center justify-between p-3 rounded-xl border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors">
                        <div className="flex items-center gap-3">
                          <Icon className="w-5 h-5 text-neutral-400 dark:text-neutral-500" />
                          <span className="text-neutral-700 dark:text-neutral-300 font-medium">{label}</span>
                        </div>
                        <button
                          onClick={() => setPrivacy(prev => ({ ...prev, [key]: !prev[key] }))}
                          className={cn(
                            "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                            privacy[key] ? "bg-black dark:bg-white" : "bg-neutral-200 dark:bg-neutral-700"
                          )}
                        >
                          <span
                            className={cn(
                              "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                              privacy[key] ? "translate-x-6" : "translate-x-1"
                            )}
                          />
                        </button>
                      </div>
                    ))}
                  </div>
                </SpotlightCard>

                {/* Badge Display Type */}
                <SpotlightCard>
                  <h3 className="font-bold text-neutral-900 dark:text-white mb-2">Hiển thị danh hiệu</h3>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-4">
                    Chọn loại danh hiệu hiển thị bên cạnh tên của bạn
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {/* Role option */}
                    <button
                      onClick={() => setDisplayBadgeType("role")}
                      className={cn(
                        "relative p-4 rounded-xl border-2 transition-all duration-200",
                        displayBadgeType === "role"
                          ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                          : "border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600"
                      )}
                    >
                      <div className="flex flex-col items-center gap-2">
                        <div className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center",
                          displayBadgeType === "role"
                            ? "bg-blue-500 text-white"
                            : "bg-neutral-100 dark:bg-neutral-800 text-neutral-500"
                        )}>
                          <Shield className="w-5 h-5" />
                        </div>
                        <span className={cn(
                          "font-bold text-sm",
                          displayBadgeType === "role"
                            ? "text-blue-600 dark:text-blue-400"
                            : "text-neutral-700 dark:text-neutral-300"
                        )}>
                          Vai trò
                        </span>
                        <span className="text-xs text-neutral-500 dark:text-neutral-400 text-center">
                          Hiển thị Admin, Mod, User...
                        </span>
                      </div>
                      {displayBadgeType === "role" && (
                        <div className="absolute top-2 right-2 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                    </button>

                    {/* Cultivation option */}
                    <button
                      onClick={() => setDisplayBadgeType("cultivation")}
                      className={cn(
                        "relative p-4 rounded-xl border-2 transition-all duration-200",
                        displayBadgeType === "cultivation"
                          ? "border-purple-500 bg-purple-50 dark:bg-purple-900/20"
                          : "border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600"
                      )}
                    >
                      <div className="flex flex-col items-center gap-2">
                        <div className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center",
                          displayBadgeType === "cultivation"
                            ? "bg-gradient-to-br from-purple-500 to-amber-500 text-white"
                            : "bg-neutral-100 dark:bg-neutral-800 text-neutral-500"
                        )}>
                          <Sparkles className="w-5 h-5" />
                        </div>
                        <span className={cn(
                          "font-bold text-sm",
                          displayBadgeType === "cultivation"
                            ? "text-purple-600 dark:text-purple-400"
                            : "text-neutral-700 dark:text-neutral-300"
                        )}>
                          Cảnh giới
                        </span>
                        <span className="text-xs text-neutral-500 dark:text-neutral-400 text-center">
                          Hiển thị Tu Tiên cảnh giới
                        </span>
                      </div>
                      {displayBadgeType === "cultivation" && (
                        <div className="absolute top-2 right-2 w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center">
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                    </button>
                  </div>
                </SpotlightCard>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between p-6 border-t border-neutral-200 dark:border-neutral-800 bg-white/50 dark:bg-neutral-900/50 gap-3 md:gap-0">
          <div className="text-sm text-neutral-500 dark:text-neutral-400">
            {activeTab === "appearance" && "Tùy chỉnh giao diện profile"}
            {activeTab === "privacy" && "Cài đặt quyền riêng tư"}
            {hasUnsavedChanges() && (
              <span className="ml-2 text-orange-600 dark:text-orange-400 font-bold">
                • Có thay đổi chưa lưu
              </span>
            )}
          </div>
          <div className="flex gap-3 w-full md:w-auto">
            <button
              onClick={onClose}
              className="flex-1 md:flex-none px-6 py-2.5 text-neutral-700 dark:text-neutral-300 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors font-bold text-sm"
            >
              Hủy
            </button>
            <button
              onClick={handleSave}
              disabled={loading || !hasUnsavedChanges()}
              className="flex-1 md:flex-none px-6 py-2.5 bg-black dark:bg-white text-white dark:text-black rounded-xl hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity flex items-center justify-center gap-2 font-bold text-sm"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white dark:border-black border-t-transparent rounded-full animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Lưu thay đổi
            </button>
          </div>
        </div>

        {/* Messages */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="absolute top-4 right-4 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-300 px-4 py-3 rounded-xl shadow-lg z-50"
            >
              {error}
            </motion.div>
          )}
          {success && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="absolute top-4 right-4 bg-green-100 dark:bg-green-900/30 border border-green-400 dark:border-green-600 text-green-700 dark:text-green-300 px-4 py-3 rounded-xl shadow-lg z-50"
            >
              {success}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
