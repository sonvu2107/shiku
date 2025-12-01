// Import React hooks và routing
import React, { useState, useEffect, lazy, Suspense } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";

// Import các components chính (giữ nguyên vì cần thiết cho layout)
import Navbar from "./components/Navbar.jsx";
import FloatingDock from "./components/FloatingDock.jsx";
import PostCreator from "./components/PostCreator.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
import { ToastContainer, useToast } from "./components/Toast.jsx";
import { PageLoader, LazyErrorBoundary } from "./components/PageLoader.jsx";
import { ChatProvider } from "./contexts/ChatContext.jsx";
import Home from "./pages/Home.jsx"; // Eager load Home for better LCP

// LAZY IMPORT CÁC PAGES - Code Splitting
// Core pages (load ngay)
const Landing = lazy(() => import("./pages/Landing.jsx"));
const Tour = lazy(() => import("./pages/Tour.jsx"));
const About = lazy(() => import("./pages/About.jsx"));
const Login = lazy(() => import("./pages/Login.jsx"));
const Register = lazy(() => import("./pages/Register.jsx"));

// Content pages
const PostDetail = lazy(() => import("./pages/PostDetail.jsx"));
const NewPost = lazy(() => import("./pages/NewPost.jsx"));
const EditPost = lazy(() => import("./pages/EditPost.jsx"));
const Search = lazy(() => import("./pages/Search.jsx"));

// User pages
const Profile = lazy(() => import("./pages/Profile.jsx"));
const UserProfile = lazy(() => import("./pages/UserProfile.jsx"));
const Settings = lazy(() => import("./pages/Settings.jsx"));

// Social features
const Friends = lazy(() => import("./pages/Friends.jsx"));
const Chat = lazy(() => import("./pages/Chat.jsx"));
const Groups = lazy(() => import("./pages/Groups.jsx"));
const GroupDetail = lazy(() => import("./pages/GroupDetail.jsx"));
const CreateGroup = lazy(() => import("./pages/CreateGroup.jsx"));

// Discover & Events
const Explore = lazy(() => import("./pages/Explore.jsx"));
const Events = lazy(() => import("./pages/Events.jsx"));
const CreateEvent = lazy(() => import("./pages/CreateEvent.jsx"));
const EventDetail = lazy(() => import("./pages/EventDetail.jsx"));
const EditEvent = lazy(() => import("./pages/EditEvent.jsx"));

// Media & Content
const Media = lazy(() => import("./pages/Media.jsx"));
const Saved = lazy(() => import("./pages/Saved.jsx"));

// Admin & Support (heavy pages - lazy load)
const AdminDashboard = lazy(() => import("./pages/AdminDashboard.jsx"));
const AdminFeedback = lazy(() => import("./pages/AdminFeedback.jsx"));
const Support = lazy(() => import("./pages/Support.jsx"));

// Tu Tiên System
const Cultivation = lazy(() => import("./pages/Cultivation.jsx"));

// Utility pages
const NotificationHistory = lazy(() => import("./pages/NotificationHistory.jsx"));
const ResetPassword = lazy(() => import("./pages/ResetPassword.jsx"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword.jsx"));
const Terms = lazy(() => import("./pages/Terms.jsx"));

// Import các utilities và services (giữ nguyên - cần thiết ngay)
import { api } from "./api.js";
import { ensureCSRFToken } from "./utils/csrfToken.js";
import { initializeAccessToken, getValidAccessToken } from "./utils/tokenManager.js";
import socketService from "./socket";   // Service quản lý WebSocket connection
import { heartbeatManager } from "./services/heartbeatManager";
import { startKeepAlive } from "./utils/keepalive.js"; // Server keepalive service

/**
 * Component chính của ứng dụng - quản lý routing và authentication
 * @returns {JSX.Element} App component
 */
export default function App() {
  // State quản lý thông tin user hiện tại
  const [user, setUser] = useState(null);
  // State quản lý trạng thái loading khi khởi tạo app
  const [loading, setLoading] = useState(true);
  // Dark mode
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem("app:darkMode");
    if (saved != null) return saved === "1";
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  // Kiểm tra xem StoryViewer có đang mở không
  const [isStoryViewerOpen, setIsStoryViewerOpen] = useState(false);
  // Hook để lấy thông tin location hiện tại
  const location = useLocation();
  // Toast notifications
  const { toasts, removeToast } = useToast();

  // Effect để đảm bảo robots meta tag luôn được set đúng khi route thay đổi
  // Đặt mặc định 'index, follow' cho các trang công khai
  useEffect(() => {
    // Danh sách các trang private (cần noindex)
    const privatePages = ["/login", "/register", "/forgot-password", "/reset-password", "/settings", "/notifications", "/chat", "/admin"];
    const isPrivatePage = privatePages.some(page => location.pathname.startsWith(page));
    
    // Chỉ set robots nếu không phải trang private (các trang private sẽ tự set qua useSEO)
    if (!isPrivatePage) {
      let metaRobots = document.querySelector('meta[name="robots"]');
      if (!metaRobots) {
        metaRobots = document.createElement('meta');
        metaRobots.setAttribute('name', 'robots');
        document.head.appendChild(metaRobots);
      }
      // Đảm bảo các trang công khai luôn có 'index, follow'
      metaRobots.setAttribute('content', 'index, follow');
    }
  }, [location.pathname]);

  // Danh sách các trang không hiển thị navbar
  // reset-password và forgot-password luôn ẩn navbar (bất kể đã đăng nhập hay chưa)
  const alwaysHideNavbarPages = ["/forgot-password", "/reset-password", "/about", "/cultivation"];
  const conditionalHideNavbarPages = ["/login", "/register", "/", "/tour", "/terms", "/support"];
  const shouldHideNavbar = alwaysHideNavbarPages.includes(location.pathname) || 
    (conditionalHideNavbarPages.includes(location.pathname) && !user);

  // Debug log
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log("[App] Location:", location.pathname, "| User:", user ? user.name : "null", "| shouldHideNavbar:", shouldHideNavbar);
    }
  }, [location.pathname, user, shouldHideNavbar]);

  // Effect chạy khi app khởi tạo để kiểm tra authentication
  useEffect(() => {
    let cancelled = false;
    let timeoutId = null;

    const checkAuth = async () => {
      try {
        console.log("[App] Starting authentication check...");
        
        await ensureCSRFToken();
        console.log("[App] CSRF token ensured");
        
        // Try to initialize access token from cookies (will attempt refresh if needed)
        const token = await initializeAccessToken();
        console.log("[App] Token initialization result:", token ? "SUCCESS" : "FAILED");

        if (cancelled) {
          return;
        }

        if (token && !cancelled) {
          console.log("[App] Token available, checking session...");
          // Nếu có token, gọi API để lấy thông tin user
          try {
            const res = await api("/api/auth/session");
            console.log("[App] Session check result:", res);
            
            if (!cancelled && res.authenticated && res.user) {
              console.log("[App] User authenticated:", res.user.name);
              setUser(res.user);
              // Kết nối socket khi đã xác thực user thành công
              socketService.connect(res.user);
            } else {
              console.log("[App] User not authenticated or missing user data");
              setUser(null);
            }
          } catch (error) {
            console.log("[App] Session check failed:", error.message);
            if (!cancelled) {
              setUser(null);
            }
          }
        } else if (!cancelled) {
          console.log("[App] No token available, user needs to login");
          // Không có token, set user null
          setUser(null);
        }
      } catch (error) {
        // Nếu có lỗi (token không hợp lệ), reset user
        if (!cancelled) {
          setUser(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false); // Kết thúc loading
        }
      }
    };
    
    // Debounce the auth check to prevent multiple calls
    timeoutId = setTimeout(checkAuth, 100);
    
    return () => {
      cancelled = true;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, []);

  useEffect(() => {
    // Only run token refresh interval when user is logged in
    if (!user) {
      return;
    }

    const interval = setInterval(() => {
      getValidAccessToken().catch(() => {});
    }, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, [user]);

  // Apply/remove dark class on root html element
  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('app:darkMode', darkMode ? '1' : '0');
  }, [darkMode]);
    // Centralized heartbeat manager (1 request/min)
  useEffect(() => {
    if (!user) {
      heartbeatManager.stop();
      return;
    }

    heartbeatManager.start();

    const handleVisibilityChange = () => {
      if (document.hidden) {
        heartbeatManager.stop();
        api("/api/auth-token/heartbeat", {
          method: "POST",
          body: { isOnline: false }
        }).catch(() => {});
      } else {
        heartbeatManager.start();
        heartbeatManager.ping();
      }
    };

    const handleBeforeUnload = () => {
      navigator.sendBeacon("/api/auth/logout");
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      heartbeatManager.stop();
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [user]);

  // Server keepalive service (production only)
  useEffect(() => {
    // Chỉ chạy trong production để tránh server Render sleep
    if (process.env.NODE_ENV === 'production') {
      console.log('[App] Starting server keepalive service...');
      const cleanup = startKeepAlive(12, true); // Ping mỗi 12 phút, chỉ khi tab active
      
      return cleanup;
    }
  }, []);

  // Toggle dark mode function


  // Effect để đồng bộ user state khi user thay đổi (đảm bảo có đầy đủ thông tin)
  useEffect(() => {
    const syncUserData = async () => {
      if (user && (!user.avatarUrl || !user.bio || !user._id)) {
        // Nếu user có nhưng thiếu thông tin quan trọng, gọi API /me để cập nhật
        try {
          const res = await api("/api/auth/me");
          if (res.user && res.user._id === user._id) {
            // Chỉ cập nhật nếu là cùng user để tránh infinite loop
            setUser(res.user);
          }
        } catch (error) {
          // Silent error handling for user data sync
        }
      }
    };
    
    syncUserData();
  }, [user?._id]); // Chỉ depend vào user._id để tránh infinite loop

  // Effect để kiểm tra xem StoryViewer có đang mở không
  useEffect(() => {
    const checkStoryViewer = () => {
      const storyViewer = document.querySelector('.story-viewer');
      setIsStoryViewerOpen(!!storyViewer);
    };

    // Kiểm tra ngay lập tức
    checkStoryViewer();

    // Sử dụng MutationObserver để theo dõi thay đổi DOM
    const observer = new MutationObserver(checkStoryViewer);
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    return () => observer.disconnect();
  }, []);

  // Hiển thị loading screen khi app đang khởi tạo
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <div className="flex flex-col items-center space-y-4">
          {/* Spinner vòng tròn */}
          <div className="relative">
            <div className="w-16 h-16 border-4 border-gray-200 dark:border-gray-600 rounded-full animate-spin border-t-black dark:border-t-white"></div>
            <div className="absolute inset-0 w-16 h-16 border-4 border-transparent rounded-full animate-ping border-t-gray-600 dark:border-t-gray-300 opacity-20"></div>
          </div>
          
          {/* Loading text */}
          <div className="text-center">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-1">
              Đang khởi tạo Shiku
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 animate-pulse">
              Vui lòng chờ trong giây lát...
            </p>
          </div>
          
          {/* Loading dots animation */}
          <div className="flex space-x-1">
            <div className="w-2 h-2 bg-black dark:bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-2 h-2 bg-black dark:bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-2 h-2 bg-black dark:bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <ChatProvider>
        <div className="min-h-screen">
        {/* Toast Container */}
        <ToastContainer toasts={toasts} onRemove={removeToast} />
        
        {/* Mobile CSRF Debug Component */}
        
        {/* Hiển thị navbar cho tất cả trang trừ login/register/landing (khi chưa đăng nhập), chat, home và cultivation */}
        {!shouldHideNavbar && location.pathname !== "/chat" && location.pathname !== "/" && location.pathname !== "/home" && location.pathname !== "/feed" && location.pathname !== "/search" && location.pathname !== "/cultivation" && (
          <Navbar user={user} setUser={setUser} darkMode={darkMode} setDarkMode={setDarkMode} />
        )}

        {/* Floating Dock - chỉ hiển thị khi user đã đăng nhập, không ở trang auth/landing/chat/cultivation, và không có story viewer đang mở */}
        {user && !shouldHideNavbar && location.pathname !== "/chat" && location.pathname !== "/cultivation" && !isStoryViewerOpen && (
          <FloatingDock />
        )}

        {/* Global PostCreator - để có thể mở modal từ bất kỳ trang nào (qua FloatingDock) - ẩn trigger input card */}
        {user && !shouldHideNavbar && location.pathname !== "/cultivation" && (
          <PostCreator user={user} hideTrigger={true} />
        )}

      {/* Routing logic dựa trên loại trang */}
      {shouldHideNavbar ? (
        // Routes cho các trang authentication và landing (không có navbar)
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/tour" element={<Tour />} />
            <Route path="/login" element={<Login setUser={setUser} />} />
            <Route path="/register" element={<Register setUser={setUser} />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/about" element={<About />} />
            <Route path="/support" element={<Support user={user} />} />
            <Route path="/cultivation" element={<ProtectedRoute user={user}><Cultivation /></ProtectedRoute>} />
          </Routes>
        </Suspense>
      ) : location.pathname === "/chat" ? (
        // Layout đặc biệt cho trang chat (full screen với navbar cố định)
        <div className="h-screen flex flex-col">
          <div className="flex-shrink-0">
            <Navbar user={user} setUser={setUser} darkMode={darkMode} setDarkMode={setDarkMode} />
          </div>
          <div className="flex-1 overflow-hidden">
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route
                  path="/chat"
                  element={<ProtectedRoute user={user}><Chat /></ProtectedRoute>}
                />
              </Routes>
            </Suspense>
          </div>
        </div>
      ) : (
        // Routes cho các trang thông thường
        <div className="w-full">
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Trang chủ - Landing page nếu chưa đăng nhập, Home nếu đã đăng nhập */}
              <Route path="/" element={user ? <Home user={user} setUser={setUser} /> : <Landing />} />
              
              {/* Trang About - Public */}
              <Route path="/about" element={<About />} />
              
              {/* Các trang được bảo vệ (cần đăng nhập) */}
              <Route path="/home" element={<ProtectedRoute user={user}><Home user={user} setUser={setUser} /></ProtectedRoute>} />
              <Route path="/feed" element={<ProtectedRoute user={user}><Home user={user} setUser={setUser} /></ProtectedRoute>} />
              <Route path="/post/:slug" element={<PostDetail user={user} />} />
              <Route path="/new-post" element={<ProtectedRoute user={user}><NewPost user={user} /></ProtectedRoute>} />
              <Route path="/edit-post/:id" element={<ProtectedRoute user={user}><EditPost user={user} /></ProtectedRoute>} />
              <Route path="/search" element={<Search user={user} />} />

              {/* User Routes */}
              <Route path="/profile" element={<ProtectedRoute user={user}><Profile user={user} setUser={setUser} /></ProtectedRoute>} />
              <Route path="/user/:userId" element={<ProtectedRoute user={user}><UserProfile /></ProtectedRoute>} />
              <Route path="/friends" element={<ProtectedRoute user={user}><Friends /></ProtectedRoute>} />
              <Route path="/groups" element={<ProtectedRoute user={user}><Groups /></ProtectedRoute>} />
              <Route path="/groups/:id" element={<ProtectedRoute user={user}><GroupDetail /></ProtectedRoute>} />
              <Route path="/groups/create" element={<ProtectedRoute user={user}><CreateGroup /></ProtectedRoute>} />
              <Route path="/explore" element={<ProtectedRoute user={user}><Explore /></ProtectedRoute>} />
              <Route path="/events" element={<ProtectedRoute user={user}><Events /></ProtectedRoute>} />
              <Route path="/events/create" element={<ProtectedRoute user={user}><CreateEvent /></ProtectedRoute>} />
              <Route path="/events/:id" element={<ProtectedRoute user={user}><EventDetail /></ProtectedRoute>} />
              <Route path="/events/:id/edit" element={<ProtectedRoute user={user}><EditEvent /></ProtectedRoute>} />
              <Route path="/media" element={<ProtectedRoute user={user}><Media /></ProtectedRoute>} />
              <Route path="/saved" element={<ProtectedRoute user={user}><Saved /></ProtectedRoute>} />
              <Route path="/notifications" element={<ProtectedRoute user={user}><NotificationHistory /></ProtectedRoute>} />
              
              {/* Trang admin */}
              <Route path="/admin" element={<ProtectedRoute user={user}><AdminDashboard /></ProtectedRoute>} />
              <Route path="/admin/feedback" element={<ProtectedRoute user={user}><AdminFeedback /></ProtectedRoute>} />
              
              {/* Tu Tiên System */}
              <Route path="/cultivation" element={<ProtectedRoute user={user}><Cultivation /></ProtectedRoute>} />
              
              {/* Các trang khác */}
              <Route path="/settings" element={<ProtectedRoute user={user}><Settings /></ProtectedRoute>} />
              <Route path="/support" element={<ProtectedRoute user={user}><Support user={user} /></ProtectedRoute>} />
              
              {/* Auth pages - cần có ở cả 2 nhánh để đảm bảo luôn match (bất kể đã đăng nhập hay chưa) */}
              <Route path="/login" element={<Login setUser={setUser} />} />
              <Route path="/register" element={<Register setUser={setUser} />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/terms" element={<Terms />} />
              
              {/* Catch-all route - redirect về trang chủ */}
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </Suspense>
        </div>
      )}
      
      
        </div>
      </ChatProvider>
    </ErrorBoundary>
  );
}
