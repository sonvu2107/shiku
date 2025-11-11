import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Home, 
  Compass,
  Calendar,
  Image,
  Bookmark,
  Users, 
  UserCheck,
  User,
  Settings,
  Crown,
  Search,
  LogOut
} from 'lucide-react';
import { removeAuthToken } from '../utils/auth';
import { api } from '../api';
import { getCachedRole, loadRoles } from '../utils/roleCache';

/**
 * LeftSidebar - Sidebar trái với dark theme
 * Tái sử dụng menu items từ MobileMenu
 * Bao gồm logo, search, navigation menu, badges, Go Pro, user profile
 */
export default function LeftSidebar({ user, setUser }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [roleLabel, setRoleLabel] = useState('Basic Member');

  // Load role label
  useEffect(() => {
    const updateRoleLabel = async () => {
      if (!user || !user.role) {
        setRoleLabel('Basic Member');
        return;
      }

      // Nếu role là object (có displayName)
      if (typeof user.role === 'object' && user.role.displayName) {
        setRoleLabel(user.role.displayName);
        return;
      }

      // Nếu role là string, lấy role name
      const roleName = typeof user.role === 'string' ? user.role : (user.role.name || 'user');

      // Xử lý các role mặc định
      if (roleName === 'user') {
        setRoleLabel('Người dùng');
        return;
      }
      if (roleName === 'admin') {
        setRoleLabel('Admin');
        return;
      }

      // Thử lấy từ cache hoặc load từ API
      try {
        const cachedRole = getCachedRole(roleName);
        if (cachedRole && cachedRole.displayName) {
          setRoleLabel(cachedRole.displayName);
        } else {
          // Load roles và tìm displayName
          const roles = await loadRoles();
          const roleData = roles[roleName];
          if (roleData && roleData.displayName) {
            setRoleLabel(roleData.displayName);
          } else {
            // Fallback: capitalize first letter
            setRoleLabel(roleName.charAt(0).toUpperCase() + roleName.slice(1));
          }
        }
      } catch (err) {
        // Fallback: capitalize first letter
        setRoleLabel(roleName.charAt(0).toUpperCase() + roleName.slice(1));
      }
    };

    updateRoleLabel();
  }, [user?.role]);

  const handleLogout = async () => {
    try {
      await api("/api/auth/logout", { method: "POST" });
    } catch (err) {
      // Silent handling for logout error
    }
    
    removeAuthToken();
    if (setUser) setUser(null);
    navigate("/");
  };

  // Navigation menu items - tái sử dụng từ MobileMenu
  const menuItems = user ? [
    { icon: Home, label: "Trang chủ", path: "/", show: true, exact: true },
    { icon: Compass, label: "Khám phá", path: "/explore", show: true },
    { icon: Calendar, label: "Sự kiện", path: "/events", show: true },
    { icon: Image, label: "Media", path: "/media", show: true },
    { icon: Bookmark, label: "Bài đã lưu", path: "/saved", show: true },
    { icon: Users, label: "Bạn bè", path: "/friends", show: true },
    { icon: UserCheck, label: "Nhóm", path: "/groups", show: true },
    { icon: User, label: "Trang cá nhân", path: "/profile", show: true },
    { icon: Settings, label: "Cài đặt", path: "/settings", show: true },
    { icon: Crown, label: "Admin", path: "/admin", show: user.role === "admin", isAdmin: true },
  ] : [
    { icon: Home, label: "Trang chủ", path: "/", show: true, exact: true },
    { icon: Compass, label: "Khám phá", path: "/explore", show: true },
    { icon: Calendar, label: "Sự kiện", path: "/events", show: true },
    { icon: Image, label: "Media", path: "/media", show: true },
  ];

  const isActive = (path, exact = false) => {
    if (exact) {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <div className="hidden lg:flex fixed left-0 top-0 h-screen w-64 bg-neutral-900 dark:bg-neutral-950 border-r border-neutral-800 dark:border-neutral-900 flex-col z-40">
      {/* Logo Section */}
      <div className="px-1 pt-3 pb-1 border-b border-neutral-800 dark:border-neutral-900 flex-shrink-0 flex justify-center items-center">
        <Link 
          to="/" 
          className="flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity"
          onClick={(e) => {
            // Scroll to top khi click vào logo
            if (location.pathname === '/') {
              e.preventDefault();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            } else {
              // Nếu không ở trang chủ, navigate và scroll to top sau khi load
              setTimeout(() => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }, 100);
            }
          }}
        >
          <img
            src="/assets/Shiku-logo-1.png"
            alt="Shiku Logo"
            width={88}
            height={88}
            className="h-16 w-auto"
            loading="eager"
            fetchpriority="high"
          />
        </Link>
      </div>

      {/* Search Bar */}
      <div className="px-4 py-2 border-b border-neutral-800 dark:border-neutral-900 flex-shrink-0">
        <form onSubmit={handleSearch} className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            placeholder="Search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-neutral-800 dark:bg-neutral-900 border border-neutral-700 dark:border-neutral-800 rounded-xl text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-transparent transition-all text-sm"
          />
        </form>
      </div>

      {/* Navigation Menu - Scrollable với scroll ẩn */}
      <div className="flex-1 overflow-y-auto py-4 scrollbar-hide">
        <nav className="space-y-1 px-3">
          {menuItems
            .filter(item => item.show)
            .map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path, item.exact);
            
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                  item.isAdmin
                    ? 'text-red-400 hover:bg-red-900/20 border-l-4 border-red-500'
                    : active
                    ? 'bg-neutral-800 dark:bg-neutral-800 text-white'
                    : 'text-neutral-300 hover:bg-neutral-800/50 hover:text-white'
                }`}
              >
                <Icon size={20} />
                <span className="font-medium text-sm flex-1">{item.label}</span>
              </Link>
            );
          })}
        </nav>

      </div>

      {/* User Profile Section */}
      {user && (
        <div className="px-4 py-4 border-t border-neutral-800 dark:border-neutral-900 flex-shrink-0">
          <div className="flex items-center gap-3">
            <img
              src={user.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&length=2&background=ffffff&color=000000&size=40`}
              alt={user.name}
              width={40}
              height={40}
              className="w-10 h-10 rounded-full object-cover border border-neutral-700"
              loading="lazy"
            />
            <div className="flex-1 min-w-0">
              <p className="text-white font-medium text-sm truncate">{user.name}</p>
              <p className="text-neutral-400 text-xs truncate">{roleLabel}</p>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 rounded-full text-neutral-400 hover:bg-neutral-800 hover:text-white transition-colors"
              title="Đăng xuất"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

