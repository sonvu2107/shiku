import React, { useState, useEffect, useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Home,
  Compass,
  Calendar,
  Image,
  Users,
  UserCheck,
  LogOut,
  LogIn,
  UserPlus,
  ChevronLeft,
  ChevronRight,
  FileText,
  Heart,
  Eye,
  HelpCircle,
  Sparkles,
  Search,
  Crown
} from 'lucide-react';
import { removeAuthToken } from '../utils/auth';
import { invalidateUserCache } from '../utils/userCache';
import { api } from '../api';
import { getCachedRole, loadRoles } from '../utils/roleCache';
import { useUserStats } from '../hooks/useUserStats';
import UserAvatar, { UserTitle } from './UserAvatar';

/**
 * LeftSidebar - Modern Social Media Style
 * Optimized for visual appeal and UX
 */
function LeftSidebar({ user, setUser }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [roleLabel, setRoleLabel] = useState('Member');

  // Lấy stats của user
  const userId = user?.id || user?._id;
  const { data: stats } = useUserStats(userId);

  const displayStats = useMemo(() => stats || {
    postCount: 0,
    friendCount: 0,
    likeCount: 0,
    viewCount: 0
  }, [stats]);

  // Xử lý state collapse
  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      return localStorage.getItem('sidebarCollapsed') === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    document.body.setAttribute('data-sidebar-collapsed', isCollapsed);
    document.documentElement.style.setProperty('--sidebar-width', isCollapsed ? '72px' : '280px');
    try {
      localStorage.setItem('sidebarCollapsed', String(isCollapsed));
    } catch { }
  }, [isCollapsed]);

  // Xử lý Role Label
  useEffect(() => {
    const updateRoleLabel = async () => {
      if (!user?.role) return;

      if (typeof user.role === 'object' && user.role.displayName) {
        setRoleLabel(user.role.displayName);
        return;
      }
      const roleName = typeof user.role === 'string' ? user.role : (user.role.name || 'user');

      const roleMap = { 'user': 'Thành viên', 'admin': 'Quản trị viên' };
      if (roleMap[roleName]) {
        setRoleLabel(roleMap[roleName]);
        return;
      }

      try {
        const cachedRole = getCachedRole(roleName);
        if (cachedRole?.displayName) {
          setRoleLabel(cachedRole.displayName);
        } else {
          const roles = await loadRoles();
          setRoleLabel(roles[roleName]?.displayName || roleName);
        }
      } catch {
        setRoleLabel(roleName);
      }
    };
    updateRoleLabel();
  }, [user?.role]);

  // Logout Logic
  const handleLogout = async () => {
    try { await api("/api/auth/logout", { method: "POST" }); } catch { }

    // Cleanup services
    const cleanupPromises = [
      (async () => {
        try {
          const { default: socketService } = await import('../socket');
          if (socketService?.disconnect) socketService.disconnect();
        } catch (err) { console.warn('Socket cleanup failed:', err); }
      })(),
      (async () => {
        try {
          const { heartbeatManager } = await import('../services/heartbeatManager');
          if (heartbeatManager?.stop) heartbeatManager.stop();
        } catch (err) { console.warn('Heartbeat cleanup failed:', err); }
      })(),
      (async () => {
        try {
          const { stopKeepAlive } = await import('../utils/keepalive');
          if (stopKeepAlive) stopKeepAlive();
        } catch (err) { console.warn('Keepalive cleanup failed:', err); }
      })()
    ];

    await Promise.race([
      Promise.allSettled(cleanupPromises),
      new Promise(resolve => setTimeout(resolve, 2000))
    ]);

    removeAuthToken();
    invalidateUserCache();
    if (setUser) setUser(null);
    navigate("/");
    window.location.reload();
  };

  // Menu Config
  const menuItems = useMemo(() => {
    const common = [
      { icon: Home, label: "Trang chủ", path: "/", exact: true },
      { icon: Compass, label: "Khám phá", path: "/explore" },
      { icon: Sparkles, label: "Tu Tiên Giới", path: "/cultivation", highlight: true },
      { icon: Image, label: "Thư viện", path: "/media" },
      { icon: UserCheck, label: "Cộng đồng", path: "/groups" },
      { icon: Calendar, label: "Sự kiện", path: "/events" },
    ];

    const adminItems = user?.role === 'admin' ? [
      { icon: Crown, label: "Quản trị", path: "/admin", isAdmin: true }
    ] : [];

    if (!user) {
      return [
        { icon: Home, label: "Trang chủ", path: "/", exact: true },
        { icon: Compass, label: "Khám phá", path: "/explore" },
        { icon: Image, label: "Thư viện", path: "/media" },
        { icon: HelpCircle, label: "Hỗ trợ", path: "/support" },
      ];
    }
    return [...common, ...adminItems];
  }, [user]);

  const isActive = (path, exact) => exact ? location.pathname === path : location.pathname.startsWith(path);

  // NavItem Component
  const NavItem = ({ item }) => {
    const active = isActive(item.path, item.exact);
    const Icon = item.icon;

    return (
      <Link
        to={item.path}
        className={`
          relative flex items-center group transition-all duration-300 ease-out
          ${isCollapsed ? 'justify-center w-12 h-12 rounded-2xl mx-auto mb-2' : 'gap-4 px-4 py-3 rounded-2xl mx-2 mb-1'}
          ${item.isAdmin
            ? active
              ? 'bg-red-500/20 text-red-400 font-semibold'
              : 'text-red-400/70 hover:bg-red-500/10 hover:text-red-400'
            : active
              ? item.highlight
                ? 'bg-gradient-to-r from-purple-600/20 to-indigo-600/20 text-purple-400 shadow-[0_0_20px_rgba(168,85,247,0.15)]'
                : 'bg-white/10 text-white font-semibold'
              : 'text-neutral-400 hover:bg-neutral-800/50 hover:text-neutral-200'
          }
        `}
      >
        <div className={`relative transition-transform duration-300 ${active ? 'scale-110' : 'group-hover:scale-110'}`}>
          <Icon size={24} strokeWidth={active ? 2.5 : 2} />
          {isCollapsed && active && (
            <span className="absolute -right-1 -top-1 w-2.5 h-2.5 bg-current rounded-full ring-2 ring-neutral-900" />
          )}
        </div>

        {!isCollapsed && (
          <span className={`text-[15px] tracking-wide ${active ? 'font-bold' : 'font-medium'}`}>
            {item.label}
          </span>
        )}

        {/* Hover Tooltip cho Collapsed State */}
        {isCollapsed && (
          <div className="absolute left-full ml-4 px-3 py-1.5 bg-neutral-800 text-white text-sm font-medium rounded-lg opacity-0 group-hover:opacity-100 translate-x-[-10px] group-hover:translate-x-0 transition-all duration-200 pointer-events-none whitespace-nowrap z-50 shadow-xl border border-neutral-700">
            {item.label}
            <div className="absolute left-0 top-1/2 -translate-x-1 -translate-y-1/2 w-2 h-2 bg-neutral-800 rotate-45 border-l border-b border-neutral-700"></div>
          </div>
        )}
      </Link>
    );
  };

  const StatItem = ({ icon: Icon, value, label, colorClass }) => (
    <div className="flex flex-col items-center group cursor-default">
      <div className={`p-2 rounded-full bg-neutral-800/50 mb-1 transition-colors ${colorClass}`}>
        <Icon size={16} />
      </div>
      <span className="text-sm font-bold text-white">{value > 999 ? '999+' : value.toLocaleString('vi-VN')}</span>
      <span className="text-[10px] text-neutral-500 uppercase font-medium tracking-wider">{label}</span>
    </div>
  );

  return (
    <div
      className={`
        hidden lg:flex flex-col fixed left-0 top-0 h-screen z-50
        bg-neutral-950 border-r border-neutral-800/60
        transition-all duration-300 ease-[cubic-bezier(0.2,0,0,1)]
        ${isCollapsed ? 'w-[72px]' : 'w-[280px]'}
      `}
    >
      {/* Toggle Button - Centered on edge */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-1/2 -translate-y-1/2 z-50 p-1.5 bg-neutral-800 dark:bg-neutral-700 border border-neutral-700 dark:border-neutral-600 rounded-full text-neutral-300 hover:text-white hover:bg-neutral-700 dark:hover:bg-neutral-600 transition-all duration-200 shadow-lg"
        aria-label={isCollapsed ? "Mở rộng sidebar" : "Thu gọn sidebar"}
        title={isCollapsed ? "Mở rộng" : "Thu gọn"}
      >
        {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>

      {/* 1. Logo Section */}
      <div className={`px-1 pt-3 pb-1 border-b border-neutral-800 dark:border-neutral-900 flex-shrink-0 flex justify-center items-center transition-all duration-300 ${isCollapsed ? 'px-2' : ''}`}>
        <Link
          to="/"
          className="flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity"
          onClick={(e) => {
            if (location.pathname === '/') {
              e.preventDefault();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            } else {
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
            fetchPriority="high"
          />
        </Link>
      </div>

      {/* 2. Search Bar - Minimalist */}
      <div className={`flex-shrink-0 mt-4 mb-4 transition-all duration-300 ${isCollapsed ? 'px-2' : 'px-4'}`}>
        <button
          onClick={() => navigate('/explore?focus=search')}
          className={`
            w-full flex items-center bg-neutral-900/80 border border-neutral-800 hover:border-neutral-700 
            text-neutral-400 hover:text-white transition-all duration-200 group
            ${isCollapsed ? 'justify-center h-10 w-10 rounded-xl mx-auto' : 'gap-3 px-4 py-2.5 rounded-xl'}
          `}
        >
          <Search size={20} className="group-hover:text-sky-400 transition-colors" />
          {!isCollapsed && <span className="text-sm font-medium">Tìm kiếm...</span>}
        </button>
      </div>

      {/* 3. Main Navigation */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-neutral-800 scrollbar-track-transparent py-2">
        {menuItems.map((item) => <NavItem key={item.path} item={item} />)}
      </nav>

      {/* 4. Stats & Profile Footer */}
      <div className="flex-shrink-0 border-t border-neutral-800/60 bg-neutral-900/20 backdrop-blur-sm">

        {/* User Stats - Only show when expanded and not on Home */}
        {user && !isCollapsed && location.pathname !== '/' && (
          <div className="grid grid-cols-4 gap-2 px-4 py-4 border-b border-neutral-800/40">
            <StatItem icon={FileText} value={displayStats.postCount} label="Bài" colorClass="group-hover:text-blue-400 group-hover:bg-blue-400/10" />
            <StatItem icon={Users} value={displayStats.friendCount} label="Bạn" colorClass="group-hover:text-green-400 group-hover:bg-green-400/10" />
            <StatItem icon={Heart} value={displayStats.likeCount} label="Thích" colorClass="group-hover:text-rose-400 group-hover:bg-rose-400/10" />
            <StatItem icon={Eye} value={displayStats.viewCount} label="Xem" colorClass="group-hover:text-amber-400 group-hover:bg-amber-400/10" />
          </div>
        )}

        {/* User Profile / Login Action */}
        <div className={`p-3 ${isCollapsed ? 'flex justify-center' : ''}`}>
          {user ? (
            <div className={`
              flex items-center rounded-xl transition-colors duration-200
              ${isCollapsed ? 'flex-col gap-3 w-full' : 'gap-3 p-2 hover:bg-neutral-800/50'}
            `}>
              <UserAvatar
                user={user}
                size={isCollapsed ? 40 : 44}
                showBadge={!isCollapsed}
                onClick={() => navigate('/profile')}
                className="cursor-pointer ring-2 ring-transparent hover:ring-neutral-700 transition-all rounded-full"
              />

              {!isCollapsed && (
                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => navigate('/profile')}>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-white truncate">{user.name}</h4>
                    {user.cultivationCache?.realmName && (user.displayBadgeType === 'realm' || user.displayBadgeType === 'both') && (
                      <div className="w-2 h-2 rounded-full bg-gradient-to-tr from-purple-500 to-pink-500 animate-pulse" title={user.cultivationCache.realmName} />
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-neutral-400">
                    <span className="truncate max-w-[100px]">{roleLabel}</span>
                    {(user.displayBadgeType === 'title' || user.displayBadgeType === 'both') && <UserTitle user={user} className="scale-90 origin-left" />}
                  </div>
                </div>
              )}

              <button
                onClick={handleLogout}
                className={`
                  p-2 text-neutral-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors
                  ${isCollapsed ? 'w-10 h-10 flex items-center justify-center' : ''}
                `}
                title="Đăng xuất"
              >
                <LogOut size={20} />
              </button>
            </div>
          ) : (
            // Guest View
            <div className={`flex flex-col gap-2 ${isCollapsed ? 'items-center' : ''}`}>
              <Link to="/login" className={`flex items-center justify-center bg-white text-black font-bold rounded-xl hover:bg-neutral-200 transition-colors ${isCollapsed ? 'w-10 h-10 p-0' : 'w-full py-2.5'}`}>
                {isCollapsed ? <LogIn size={20} /> : "Đăng nhập"}
              </Link>
              <Link to="/register" className={`flex items-center justify-center bg-neutral-800 text-white font-bold rounded-xl hover:bg-neutral-700 transition-colors ${isCollapsed ? 'w-10 h-10 p-0' : 'w-full py-2.5'}`}>
                {isCollapsed ? <UserPlus size={20} /> : "Đăng ký"}
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default React.memo(LeftSidebar, (prev, next) => {
  return prev.user?._id === next.user?._id && prev.user?.role === next.user?.role;
});
