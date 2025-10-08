// Import React hooks và routing
import React, { useState, useEffect, lazy, Suspense } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";

// Import các components chính (giữ nguyên vì cần thiết cho layout)
import Navbar from "./components/Navbar.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
import { ToastContainer, useToast } from "./components/Toast.jsx";
import { PageLoader, LazyErrorBoundary } from "./components/PageLoader.jsx";

// 🚀 LAZY IMPORT CÁC PAGES - Code Splitting
// Core pages (load ngay)
const Home = lazy(() => import("./pages/Home.jsx"));
const Login = lazy(() => import("./pages/Login.jsx"));
const Register = lazy(() => import("./pages/Register.jsx"));

// Content pages
const PostDetail = lazy(() => import("./pages/PostDetail.jsx"));
const NewPost = lazy(() => import("./pages/NewPost.jsx"));
const EditPost = lazy(() => import("./pages/EditPost.jsx"));

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
const ApiTester = lazy(() => import("./pages/ApiTester.jsx"));

// Utility pages
const NotificationHistory = lazy(() => import("./pages/NotificationHistory.jsx"));
const ResetPassword = lazy(() => import("./pages/ResetPassword.jsx"));

// Import các utilities và services (giữ nguyên - cần thiết ngay)
import { api } from "./api.js";
import { getValidAccessToken } from "./utils/tokenManager.js";
import socketService from "./socket";   // Service quản lý WebSocket connection

// 🚀 DYNAMIC IMPORTS cho Safari utilities (chỉ load khi cần)
const loadSafariUtils = () => Promise.all([
  import("./utils/csrfToken.js"),
  import("./utils/safariSession.js"),
  import("./utils/safariTest.js"),
  import("./utils/mobileCSRF.js")
]);

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
  // Hook để lấy thông tin location hiện tại
  const location = useLocation();
  // Toast notifications
  const { toasts, removeToast } = useToast();

  // Danh sách các trang không hiển thị navbar
  const hideNavbarPages = ["/login", "/register"];
  const shouldHideNavbar = hideNavbarPages.includes(location.pathname);

  // Effect chạy khi app khởi tạo để kiểm tra authentication
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // 🚀 Dynamic import Safari utilities - chỉ load khi cần
        const [
          { getCSRFToken, initializeCSRFToken, debugCSRFToken },
          { initializeSafariSession, checkSafariSession, testSafariCookies, recoverSafariSession },
          { runSafariTests },
          { initializeMobileCSRF, isMobileDevice, handleMobileCSRFError }
        ] = await loadSafariUtils();

        // 🚀 Parallel execution để giảm blocking time
        const [sessionInitialized, token] = await Promise.all([
          isMobileDevice() ? initializeMobileCSRF() : initializeSafariSession(),
          getValidAccessToken()
        ]);
        
        // Background tasks không block UI
        if (!sessionInitialized) {
          console.warn("Session initialization failed, attempting recovery...");
          // Chạy background recovery
          if (isMobileDevice()) {
            setTimeout(() => initializeMobileCSRF(), 0);
          } else {
            setTimeout(() => recoverSafariSession(), 0);
          }
        }
        
        // Background CSRF và cookie checks
        Promise.all([
          testSafariCookies(),
          isMobileDevice() ? initializeMobileCSRF() : initializeCSRFToken()
        ]).catch(err => console.warn("Background tasks failed:", err));
        
        if (token) {
          // Nếu có token, gọi API để lấy thông tin user
          const res = await api("/api/auth/me");
          setUser(res.user);
          // Kết nối socket khi đã xác thực user thành công
          socketService.connect(res.user);
          // Background CSRF token sync
          setTimeout(() => getCSRFToken(true), 0);
        } else {
          // Không có token, set user null
          setUser(null);
        }

        // 🚀 Expose debug functions globally (background)
        setTimeout(() => {
          window.debugCSRF = debugCSRFToken;
          window.debugSafariSession = checkSafariSession;
          window.testSafariCookies = testSafariCookies;
          window.recoverSafariSession = recoverSafariSession;
          window.runSafariTests = runSafariTests;
        }, 0);

      } catch (error) {
        console.error("Authentication check failed:", error);
        // Nếu có lỗi (token không hợp lệ), reset user
        setUser(null);
      } finally {
        setLoading(false); // Kết thúc loading
      }
    };
    
    checkAuth();
  }, []);

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

  // Effect để gửi heartbeat định kỳ khi user đã đăng nhập
  useEffect(() => {
    if (!user) return;

    // Gửi heartbeat ngay lập tức
    const sendHeartbeat = () => {
      api("/api/auth/heartbeat", { method: "POST" })
    };

    // Gửi heartbeat đầu tiên
    sendHeartbeat();

    // Thiết lập interval để gửi heartbeat mỗi 30 giây
    const heartbeatInterval = setInterval(sendHeartbeat, 30000);

    // Event listener để cập nhật trạng thái offline khi user rời khỏi trang
    const handleBeforeUnload = () => {
      // Gửi request để cập nhật trạng thái offline
      navigator.sendBeacon('/api/auth/logout');
    };

    // Event listener để cập nhật trạng thái offline khi user đóng tab
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Khi tab bị ẩn, cập nhật trạng thái offline
        api("/api/auth/heartbeat", { 
          method: "POST",
          body: { isOnline: false }
        }).catch(() => {});
      } else {
        // Khi tab được hiển thị lại, cập nhật trạng thái online
        sendHeartbeat();
      }
    };

    // Thêm event listeners
    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup khi component unmount hoặc user thay đổi
    return () => {
      clearInterval(heartbeatInterval);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user]);

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

  // Hiển thị loading screen khi app đang khởi tạo
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Đang tải...</div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen">
      {/* Toast Container */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      
      {/* Mobile CSRF Debug Component */}
      
      {/* Hiển thị navbar cho tất cả trang trừ login/register và chat */}
      {!shouldHideNavbar && location.pathname !== "/chat" && (
        <Navbar user={user} setUser={setUser} darkMode={darkMode} setDarkMode={setDarkMode} />
      )}

      {/* Routing logic dựa trên loại trang */}
      {shouldHideNavbar ? (
        // Routes cho các trang authentication (không có navbar)
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/login" element={<Login setUser={setUser} />} />
            <Route path="/register" element={<Register setUser={setUser} />} />
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
              {/* Trang chủ - redirect đến login nếu chưa đăng nhập */}
              <Route path="/" element={user ? <Home user={user} /> : <Navigate to="/login" />} />
              
              {/* Các trang được bảo vệ (cần đăng nhập) */}
              <Route path="/home" element={<ProtectedRoute user={user}><Home user={user} /></ProtectedRoute>} />
              <Route path="/post/:slug" element={<PostDetail />} />
              <Route path="/new" element={<ProtectedRoute user={user}><NewPost /></ProtectedRoute>} />
              <Route path="/edit/:id" element={<ProtectedRoute user={user}><EditPost /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute user={user}><Profile /></ProtectedRoute>} />
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
              <Route path="/admin/api-tester" element={<ProtectedRoute user={user}><ApiTester /></ProtectedRoute>} />
              
              {/* Các trang khác */}
              <Route path="/settings" element={<ProtectedRoute user={user}><Settings /></ProtectedRoute>} />
              <Route path="/support" element={<ProtectedRoute user={user}><Support /></ProtectedRoute>} />
              <Route path="/reset-password" element={<ResetPassword />} />
              
              {/* Catch-all route - redirect về trang chủ */}
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </Suspense>
        </div>
      )}
      
      </div>
    </ErrorBoundary>
  );
}