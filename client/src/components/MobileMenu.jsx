import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Menu, 
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
  HelpCircle,
  ChevronRight,
  Sparkles,
  Moon,
  Sun
} from "lucide-react";
import { removeAuthToken } from "../utils/auth.js";
import { invalidateUserCache } from "../utils/userCache.js";
import { api } from "../api.js";
import { cn } from "../utils/cn";
import UserAvatar from "./UserAvatar";

/**
 * MobileMenu - Hamburger menu component for mobile (redesigned)
 * Style: Monochrome Luxury & Glassmorphism
 */
export default function MobileMenu({ user, setUser, darkMode, setDarkMode }) {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Lock body scroll when menu is open
  useEffect(() => {
    if (isOpen) {
      const scrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';
    } else {
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
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleLogout = async () => {
    try {
      await api("/api/auth/logout", { method: "POST" });
    } catch (err) {}
    
    // Cleanup all services with robust error handling
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
    
    // Clear all auth data
    removeAuthToken();
    invalidateUserCache();
    
    // Reset user state and redirect
    if (setUser) setUser(null);
    setIsOpen(false);
    navigate("/");
    
    // Force reload to ensure clean state
    window.location.reload();
  };

  const menuItems = user ? [
    { icon: Home, label: "Trang chủ", path: "/", show: true },
    { icon: Compass, label: "Khám phá", path: "/explore", show: true },
    { icon: Sparkles, label: "Tu Tiên", path: "/cultivation", show: true, highlight: true },
    { icon: Calendar, label: "Sự kiện", path: "/events", show: true },
    { icon: Image, label: "Media", path: "/media", show: true },
    { icon: Bookmark, label: "Bài đã lưu", path: "/saved", show: true },
    { icon: Users, label: "Bạn bè", path: "/friends", show: true },
    { icon: UserCheck, label: "Nhóm", path: "/groups", show: true },
    { icon: MessageCircle, label: "Chat", path: "/chat", show: false },
    { icon: Bell, label: "Thông báo", path: "/notifications", show: false },
    { icon: User, label: "Trang cá nhân", path: "/profile", show: true },
    { icon: Settings, label: "Cài đặt", path: "/settings", show: true },
    { icon: HelpCircle, label: "Trợ giúp", path: "/support", show: true },
    { icon: Crown, label: "Admin", path: "/admin", show: user.role === "admin", isAdmin: true },
  ] : [
    { icon: Home, label: "Trang chủ", path: "/", show: true },
    { icon: Compass, label: "Khám phá", path: "/explore", show: true },
    { icon: Calendar, label: "Sự kiện", path: "/events", show: true },
    { icon: Image, label: "Media", path: "/media", show: true },
  ];

  const menuContent = typeof document !== 'undefined' ? createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] md:hidden"
            onClick={() => setIsOpen(false)}
          />

          {/* Drawer */}
          <motion.div 
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed top-0 left-0 h-full w-[75%] max-w-[280px] bg-white/90 dark:bg-black/90 backdrop-blur-2xl shadow-2xl z-[10000] md:hidden flex flex-col border-r border-white/20 dark:border-white/10"
          >
            {/* Header with User Profile */}
            <div className="pt-4 px-5 pb-3 flex-shrink-0">
              {user ? (
                <div className="bg-neutral-100/80 dark:bg-neutral-800/50 p-2.5 rounded-2xl border border-neutral-200 dark:border-neutral-700/50 flex items-center gap-3" onClick={() => { navigate('/profile'); setIsOpen(false); }}>
                  <UserAvatar 
                    user={user}
                    size={40}
                    showFrame={true}
                    showBadge={true}
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-neutral-900 dark:text-white truncate text-sm">{user.name}</h3>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">{user.email}</p>
                  </div>
                  <ChevronRight size={16} className="text-neutral-400" />
                </div>
              ) : (
                <div className="bg-neutral-50 dark:bg-neutral-900 p-3 rounded-2xl border border-dashed border-neutral-300 dark:border-neutral-700 text-center">
                   <p className="text-sm text-neutral-500 mb-3">Tham gia cộng đồng Shiku ngay!</p>
                   <div className="grid grid-cols-2 gap-3">
                      <Link to="/login" onClick={() => setIsOpen(false)} className="py-2 rounded-xl bg-black dark:bg-white text-white dark:text-black text-sm font-bold shadow-lg shadow-black/10">
                         Đăng nhập
                      </Link>
                      <Link to="/register" onClick={() => setIsOpen(false)} className="py-2 rounded-xl bg-white dark:bg-neutral-800 text-black dark:text-white border border-neutral-200 dark:border-neutral-700 text-sm font-bold">
                         Đăng ký
                      </Link>
                   </div>
                </div>
              )}
            </div>

            {/* Menu Items */}
            <div className="flex-1 overflow-y-auto px-4 py-1 no-scrollbar">
              <div className="space-y-1">
                {menuItems.map((item, index) => {
                  if (!item.show) return null;
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setIsOpen(false)}
                      className={cn(
                        "flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-200 group",
                        isActive 
                          ? "bg-black dark:bg-white text-white dark:text-black shadow-md shadow-black/5" 
                          : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-black dark:hover:text-white",
                        item.isAdmin && !isActive && "text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                      )}
                    >
                      <Icon size={20} strokeWidth={isActive ? 2.5 : 2} className={cn("transition-transform group-hover:scale-110", isActive && "scale-110")} />
                      <span className={cn("font-medium text-[15px]", isActive && "font-bold")}>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-neutral-100 dark:border-neutral-800/50 bg-white/50 dark:bg-black/20 backdrop-blur-md space-y-2">
              {/* Dark Mode Toggle */}
              <button
                onClick={() => setDarkMode && setDarkMode(!darkMode)}
                className="flex items-center justify-center gap-2 w-full px-4 py-3.5 text-neutral-600 dark:text-neutral-400 bg-neutral-50 dark:bg-neutral-900/50 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition-all font-medium text-sm"
              >
                {darkMode ? <Moon size={18} /> : <Sun size={18} />}
                <span>{darkMode ? 'Chế độ tối' : 'Chế độ sáng'}</span>
              </button>
              
              {/* Logout Button */}
              {user && (
                <button
                  onClick={handleLogout}
                  className="flex items-center justify-center gap-2 w-full px-4 py-3.5 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/10 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-xl transition-all font-bold text-sm"
                >
                  <LogOut size={18} />
                  <span>Đăng xuất</span>
                </button>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  ) : null;

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="md:hidden p-2 -ml-2 text-neutral-600 dark:text-neutral-300 hover:text-black dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-colors relative z-50"
        aria-label="Mở menu"
      >
        <Menu size={22} />
      </button>
      {menuContent}
    </>
  );
}
