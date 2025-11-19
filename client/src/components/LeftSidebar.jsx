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
  LogOut,
  ChevronLeft,
  ChevronRight,
  FileText,
  Heart,
  Eye
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
  const [roleLabel, setRoleLabel] = useState('Basic Member');
  const [stats, setStats] = useState({
    postCount: 0,
    friendCount: 0,
    likeCount: 0,
    viewCount: 0
  });
  
  // Collapse state - load from localStorage
  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      const saved = localStorage.getItem('sidebarCollapsed');
      return saved === 'true';
    } catch {
      return false;
    }
  });

  // Sync sidebar state với body và CSS variables
  useEffect(() => {
    document.body.setAttribute('data-sidebar-collapsed', isCollapsed);
    document.documentElement.style.setProperty('--sidebar-width', isCollapsed ? '64px' : '256px');
    
    try {
      localStorage.setItem('sidebarCollapsed', String(isCollapsed));
    } catch {
      // Ignore localStorage errors
    }
  }, [isCollapsed]);

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

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

  // Load user stats
  useEffect(() => {
    const loadStats = async () => {
      if (!user?._id) return;
      
      try {
        // Try to get stats from user profile
        const data = await api(`/api/users/${user._id}`);
        
        // Get post count
        const postsRes = await api(`/api/posts?author=${user._id}&limit=1`);
        const postCount = postsRes.total || 0;
        
        // Get friend count
        const friendCount = data.user?.friends?.length || 0;
        
        // Try to get likes and views from posts (aggregate)
        // This is a simplified version - you might want to optimize this
        const allPostsRes = await api(`/api/posts?author=${user._id}&limit=100`);
        const allPosts = allPostsRes.items || [];
        const likeCount = allPosts.reduce((sum, post) => sum + (post.emotes?.length || 0), 0);
        const viewCount = allPosts.reduce((sum, post) => sum + (post.views || 0), 0);
        
        setStats({
          postCount,
          friendCount,
          likeCount,
          viewCount
        });
      } catch (err) {
        // Silent handling - use defaults
        console.error('Error loading stats:', err);
      }
    };
    
    loadStats();
  }, [user?._id]);

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

  return (
    <div 
      className={`hidden lg:flex fixed left-0 top-0 h-screen bg-neutral-900 dark:bg-neutral-950 border-r border-neutral-800 dark:border-neutral-900 flex-col z-40 transition-all duration-300 ease-in-out ${
        isCollapsed ? 'w-16' : 'w-64'
      }`}
      onMouseEnter={() => {
        // Optional: Auto-expand on hover when collapsed (uncomment if desired)
        // if (isCollapsed) setIsCollapsed(false);
      }}
    >
      {/* Logo Section */}
      <div className={`px-1 pt-3 pb-1 border-b border-neutral-800 dark:border-neutral-900 flex-shrink-0 flex justify-center items-center transition-all duration-300 ${
        isCollapsed ? 'px-2' : ''
      }`}>
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
            className={`w-auto transition-all duration-300 ${isCollapsed ? 'h-8' : 'h-16'}`}
            loading="eager"
            fetchpriority="high"
          />
        </Link>
      </div>
      
      {/* Toggle Button - Centered */}
      <button
        onClick={toggleCollapse}
        className="absolute -right-3 top-1/2 -translate-y-1/2 z-50 p-1.5 bg-neutral-800 dark:bg-neutral-700 border border-neutral-700 dark:border-neutral-600 rounded-full text-neutral-300 hover:text-white hover:bg-neutral-700 dark:hover:bg-neutral-600 transition-all duration-200 shadow-lg"
        aria-label={isCollapsed ? "Mở rộng sidebar" : "Thu gọn sidebar"}
        title={isCollapsed ? "Mở rộng" : "Thu gọn"}
      >
        {isCollapsed ? (
          <ChevronRight size={16} />
        ) : (
          <ChevronLeft size={16} />
        )}
      </button>

      {/* Navigation Menu - Scrollable với scroll ẩn */}
      <div className="flex-1 overflow-y-auto py-4 scrollbar-hide">
        <nav className={`space-y-1 transition-all duration-300 ${isCollapsed ? 'px-2' : 'px-3'}`}>
          {menuItems
            .filter(item => item.show)
            .map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path, item.exact);
            
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center rounded-xl transition-all duration-200 group relative ${
                  isCollapsed 
                    ? 'justify-center px-2 py-3' 
                    : 'gap-3 px-4 py-3'
                } ${
                  item.isAdmin
                    ? 'text-red-400 hover:bg-red-900/20 border-l-4 border-red-500'
                    : active
                    ? 'bg-neutral-800 dark:bg-neutral-800 text-white'
                    : 'text-neutral-300 hover:bg-neutral-800/50 hover:text-white'
                }`}
                title={isCollapsed ? item.label : undefined}
              >
                <Icon size={20} />
                {!isCollapsed && (
                  <span className="font-medium text-sm flex-1">{item.label}</span>
                )}
                {/* Tooltip khi collapsed */}
                {isCollapsed && (
                  <span className="absolute left-full ml-2 px-3 py-2 bg-neutral-800 dark:bg-neutral-700 text-white text-sm rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 z-50 shadow-lg">
                    {item.label}
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-2 h-2 bg-neutral-800 dark:bg-neutral-700 transform rotate-45"></span>
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

      </div>

      {/* Quick Stats Section */}
      {user && (
        <div className={`border-t border-neutral-800 dark:border-neutral-900 flex-shrink-0 transition-all duration-300 ${
          isCollapsed ? 'px-2 py-3' : 'px-4 py-3'
        }`}>
          {isCollapsed ? (
            <div className="flex flex-col items-center gap-2">
              <div className="flex flex-col items-center gap-1 p-2 rounded-xl bg-neutral-800/50">
                <FileText size={16} className="text-blue-400" />
                <span className="text-xs font-semibold text-white">{stats.postCount > 999 ? '999+' : stats.postCount}</span>
              </div>
              <div className="flex flex-col items-center gap-1 p-2 rounded-xl bg-neutral-800/50">
                <Users size={16} className="text-green-400" />
                <span className="text-xs font-semibold text-white">{stats.friendCount > 999 ? '999+' : stats.friendCount}</span>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {/* Post Count */}
              <Link
                to="/profile"
                className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-neutral-800/50 hover:bg-neutral-800 transition-all duration-200 group"
              >
                <FileText size={18} className="text-blue-400 group-hover:scale-110 transition-transform" />
                <span className="text-lg font-bold text-white">{stats.postCount > 999 ? '999+' : stats.postCount.toLocaleString('vi-VN')}</span>
                <span className="text-xs text-neutral-400">Bài viết</span>
              </Link>
              
              {/* Friend Count */}
              <Link
                to="/friends"
                className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-neutral-800/50 hover:bg-neutral-800 transition-all duration-200 group"
              >
                <Users size={18} className="text-green-400 group-hover:scale-110 transition-transform" />
                <span className="text-lg font-bold text-white">{stats.friendCount > 999 ? '999+' : stats.friendCount.toLocaleString('vi-VN')}</span>
                <span className="text-xs text-neutral-400">Bạn bè</span>
              </Link>
              
              {/* Like Count */}
              <div className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-neutral-800/50">
                <Heart size={18} className="text-red-400" />
                <span className="text-lg font-bold text-white">{stats.likeCount > 999 ? '999+' : stats.likeCount.toLocaleString('vi-VN')}</span>
                <span className="text-xs text-neutral-400">Lượt thích</span>
              </div>
              
              {/* View Count */}
              <div className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-neutral-800/50">
                <Eye size={18} className="text-purple-400" />
                <span className="text-lg font-bold text-white">{stats.viewCount > 999 ? '999+' : stats.viewCount.toLocaleString('vi-VN')}</span>
                <span className="text-xs text-neutral-400">Lượt xem</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* User Profile Section */}
      {user && (
        <div className={`py-4 border-t border-neutral-800 dark:border-neutral-900 flex-shrink-0 transition-all duration-300 ${
          isCollapsed ? 'px-2' : 'px-4'
        }`}>
          {isCollapsed ? (
            <div className="flex flex-col items-center gap-2">
              <img
                src={user.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&length=2&background=ffffff&color=000000&size=40`}
                alt={user.name}
                width={40}
                height={40}
                className="w-10 h-10 rounded-full object-cover border border-neutral-700"
                loading="lazy"
              />
              <button
                onClick={handleLogout}
                className="p-2 rounded-full text-neutral-400 hover:bg-neutral-800 hover:text-white transition-colors"
                title="Đăng xuất"
              >
                <LogOut size={18} />
              </button>
            </div>
          ) : (
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
          )}
        </div>
      )}
    </div>
  );
}

