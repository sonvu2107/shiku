import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Link, useNavigate } from "react-router-dom";
import { 
  Menu, 
  X, 
  Home, 
  Users, 
  UserCheck, 
  MessageCircle, 
  Bell, 
  Settings, 
  LogOut,
  User,
  Crown,
  Compass,
  Calendar,
  Image,
  Bookmark,
  LifeBuoy
} from "lucide-react";
import { removeAuthToken } from "../utils/auth.js";
import { api } from "../api.js";

/**
 * MobileMenu - Component menu hamburger cho mobile
 * Hiển thị navigation menu dạng slide-out trên mobile
 * @param {Object} user - Thông tin user hiện tại
 * @param {Function} setUser - Function để set user state
 */
export default function MobileMenu({ user, setUser }) {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  // Lock body scroll when menu is open
  useEffect(() => {
    if (isOpen) {
      // Save current scroll position
      const scrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';
    } else {
      // Restore scroll position
      const scrollY = document.body.style.top;
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.style.overflow = '';
      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY || '0') * -1);
      }
    }

    return () => {
      // Cleanup on unmount
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleLogout = async () => {
    try {
      await api("/api/auth/logout", { method: "POST" });
    } catch (err) {
      // Silent handling for logout error
    }
    
    removeAuthToken();
    if (setUser) setUser(null);
    navigate("/");
    setIsOpen(false);
  };

  const menuItems = user ? [
    { icon: Home, label: "Trang chủ", path: "/", show: true },
    { icon: Compass, label: "Khám phá", path: "/explore", show: true },
    { icon: Calendar, label: "Sự kiện", path: "/events", show: true },
    { icon: Image, label: "Media", path: "/media", show: true },
    { icon: Bookmark, label: "Bài đã lưu", path: "/saved", show: true },
  { icon: Users, label: "Bạn bè", path: "/friends", show: true },
  { icon: UserCheck, label: "Nhóm", path: "/groups", show: true },
  { icon: MessageCircle, label: "Chat", path: "/chat", show: false },
  { icon: Bell, label: "Thông báo", path: "/notifications", show: false },
    { icon: User, label: "Trang cá nhân", path: "/profile", show: true },
    { icon: Settings, label: "Cài đặt", path: "/settings", show: true },
    { icon: LifeBuoy, label: "Trợ giúp", path: "/support", show: true },
    { icon: Crown, label: "Admin", path: "/admin", show: user.role === "admin", isAdmin: true },
  ] : [
    { icon: Home, label: "Trang chủ", path: "/", show: true },
    { icon: Compass, label: "Khám phá", path: "/explore", show: true },
    { icon: Calendar, label: "Sự kiện", path: "/events", show: true },
    { icon: Image, label: "Media", path: "/media", show: true },
  ];

  // Render menu drawer outside Navbar using Portal to avoid stacking context issues
  const menuContent = isOpen && typeof document !== 'undefined' ? createPortal(
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-[9999] md:hidden"
        onClick={() => setIsOpen(false)}
        style={{ pointerEvents: 'auto' }}
      />

      {/* Slide-out Menu - Dark mode support */}
      <div 
        className={`fixed top-0 left-0 h-full w-64 bg-white dark:bg-gray-800 shadow-2xl z-[10000] transform transition-transform duration-300 ease-in-out md:hidden flex flex-col ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ 
          willChange: 'transform',
          isolation: 'isolate', // Tạo stacking context riêng
          pointerEvents: isOpen ? 'auto' : 'none', // Chỉ cho phép tương tác khi mở
          contain: 'layout style paint', // Tối ưu rendering
          backfaceVisibility: 'hidden', // Tối ưu transform
          WebkitBackfaceVisibility: 'hidden'
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Menu</h2>
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
            aria-label="Đóng menu"
          >
            <X size={20} />
          </button>
        </div>

        {/* User Info */}
        {user && (
          <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
            <div className="flex items-center gap-2.5">
              <img
                src={user.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&length=2&background=cccccc&color=222222`}
                alt={user.name}
                className="w-10 h-10 rounded-full border border-gray-300 dark:border-gray-600"
              />
              <div className="min-w-0 flex-1">
                <div className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">{user.name}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.email}</div>
              </div>
            </div>
          </div>
        )}

        {/* Menu Items - Scrollable Area */}
        <div className="flex-1 overflow-y-auto min-h-0">
          <nav className="py-1">
            {menuItems.map((item) => {
              if (!item.show) return null;
              
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center gap-2.5 px-3 py-2.5 transition-colors touch-target font-medium text-sm ${
                    item.isAdmin 
                      ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 border-l-4 border-red-500 dark:border-red-400' 
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <Icon size={18} />
                  <span className="flex-1 truncate">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer Actions */}
        {user && (
          <div className="p-3 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
            <button
              onClick={handleLogout}
              className="flex items-center gap-2.5 w-full px-3 py-2.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors touch-target font-medium text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 rounded-lg"
              aria-label="Đăng xuất"
            >
              <LogOut size={18} />
              <span>Đăng xuất</span>
            </button>
          </div>
        )}

        {!user && (
          <div className="p-3 border-t border-gray-200 dark:border-gray-700 space-y-2 flex-shrink-0">
            <Link
              to="/login"
              onClick={() => setIsOpen(false)}
              className="block w-full btn-outline text-center py-2.5 font-medium text-sm"
              aria-label="Đăng nhập"
            >
              Đăng nhập
            </Link>
            <Link
              to="/register"
              onClick={() => setIsOpen(false)}
              className="block w-full btn text-center py-2.5 font-medium text-sm"
              aria-label="Đăng ký"
            >
              Đăng ký
            </Link>
          </div>
        )}
      </div>
    </>,
    document.body
  ) : null;

  return (
    <>
      {/* Menu Button - Compact for mobile */}
      <button
        onClick={() => setIsOpen(true)}
        className="md:hidden p-1.5 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors relative z-[10000]"
        aria-label="Mở menu"
        style={{ touchAction: 'manipulation' }}
      >
        <Menu size={18} />
      </button>

      {/* Render menu via Portal */}
      {menuContent}
    </>
  );
}
