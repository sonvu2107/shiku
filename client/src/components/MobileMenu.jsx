import { useState } from "react";
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
  Image
} from "lucide-react";

/**
 * MobileMenu - Component menu hamburger cho mobile
 * Hiển thị navigation menu dạng slide-out trên mobile
 * @param {Object} user - Thông tin user hiện tại
 * @param {Function} setUser - Function để set user state
 */
export default function MobileMenu({ user, setUser }) {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (err) {
      console.error("Logout error:", err);
    }
    
    localStorage.removeItem("token");
    if (setUser) setUser(null);
    navigate("/");
    setIsOpen(false);
  };

  const menuItems = user ? [
    { icon: Home, label: "Trang chủ", path: "/", show: true },
    { icon: Compass, label: "Khám phá", path: "/explore", show: true },
    { icon: Calendar, label: "Sự kiện", path: "/events", show: true },
    { icon: Image, label: "Media", path: "/media", show: true },
    { icon: Users, label: "Bạn bè", path: "/friends", show: true },
    { icon: UserCheck, label: "Nhóm", path: "/groups", show: true },
    { icon: MessageCircle, label: "Chat", path: "/chat", show: true },
    { icon: Bell, label: "Thông báo", path: "/notifications", show: true },
    { icon: User, label: "Trang cá nhân", path: "/profile", show: true },
    { icon: Settings, label: "Cài đặt", path: "/settings", show: true },
    { icon: Crown, label: "Admin", path: "/admin", show: user.role === "admin", isAdmin: true },
  ] : [
    { icon: Home, label: "Trang chủ", path: "/", show: true },
    { icon: Compass, label: "Khám phá", path: "/explore", show: true },
    { icon: Calendar, label: "Sự kiện", path: "/events", show: true },
    { icon: Image, label: "Media", path: "/media", show: true },
  ];

  return (
    <>
      {/* Hamburger Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="md:hidden p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors touch-target"
        aria-label="Mở menu"
      >
        <Menu size={24} />
      </button>

      {/* Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-50 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Slide-out Menu */}
      <div className={`fixed top-0 left-0 h-full w-80 bg-white shadow-xl z-50 transform transition-transform duration-300 ease-in-out md:hidden flex flex-col ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0">
          <h2 className="text-lg font-semibold text-gray-900">Menu</h2>
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors touch-target"
            aria-label="Đóng menu"
          >
            <X size={20} />
          </button>
        </div>

        {/* User Info */}
        {user && (
          <div className="p-4 border-b border-gray-200 flex-shrink-0">
            <div className="flex items-center gap-3">
              <img
                src={user.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=3b82f6&color=ffffff`}
                alt={user.name}
                className="w-12 h-12 rounded-full border border-gray-300"
              />
              <div>
                <div className="font-medium text-gray-900">{user.name}</div>
                <div className="text-sm text-gray-500">{user.email}</div>
              </div>
            </div>
          </div>
        )}

        {/* Menu Items - Scrollable Area */}
        <div className="flex-1 overflow-y-auto min-h-0">
          <nav className="py-2">
            {menuItems.map((item) => {
              if (!item.show) return null;
              
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 transition-colors touch-target ${
                    item.isAdmin 
                      ? 'text-red-600 hover:bg-red-50 border-l-4 border-red-500' 
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Icon size={20} />
                  <span className="flex-1">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer Actions */}
        {user && (
          <div className="p-4 border-t border-gray-200 flex-shrink-0">
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 w-full px-4 py-3 text-red-600 hover:bg-red-50 transition-colors touch-target"
            >
              <LogOut size={20} />
              <span>Đăng xuất</span>
            </button>
          </div>
        )}

        {!user && (
          <div className="p-4 border-t border-gray-200 space-y-2 flex-shrink-0">
            <Link
              to="/login"
              onClick={() => setIsOpen(false)}
              className="block w-full btn-outline text-center py-3"
            >
              Đăng nhập
            </Link>
            <Link
              to="/register"
              onClick={() => setIsOpen(false)}
              className="block w-full btn text-center py-3"
            >
              Đăng ký
            </Link>
          </div>
        )}
      </div>
    </>
  );
}
