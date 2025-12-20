// Import React hooks và routing
import React, { useState, useEffect, lazy, Suspense } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";

// Import các components chính (giữ nguyên vì cần thiết cho layout)
import Navbar from "./components/Navbar.jsx";
import FloatingDock from "./components/FloatingDock.jsx";
import PostCreator from "./components/PostCreator.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
import { ToastContainer } from "./components/Toast.jsx";
import { ToastProvider, useToast } from "./contexts/ToastContext";
import { PageLoader, LazyErrorBoundary } from "./components/PageLoader.jsx";
import Loader from "./components/Loader.jsx";
import OfflineScreen from "./components/OfflineScreen.jsx";
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
const Gallery = lazy(() => import("./pages/Gallery.jsx"));

// Admin & Support (heavy pages - lazy load)
const AdminDashboard = lazy(() => import("./pages/AdminDashboard.jsx"));
const AdminFeedback = lazy(() => import("./pages/AdminFeedback.jsx"));
const EquipmentManagement = lazy(() => import("./pages/admin/EquipmentManagement.jsx"));
const Support = lazy(() => import("./pages/Support.jsx"));

// Tu Tiên System
const Cultivation = lazy(() => import("./pages/Cultivation.jsx"));

// Activity Leaderboard
const ActivityLeaderboard = lazy(() => import("./pages/ActivityLeaderboard.jsx"));

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
  // State quản lý trạng thái kết nối internet
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  // Dark mode
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem("app:darkMode");
    if (saved != null) return saved === "1";
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  // Kiểm tra xem StoryViewer có đang mở không
  const [isStoryViewerOpen, setIsStoryViewerOpen] = useState(false);
  // Kiểm tra xem video có đang phát không (trong PostDetail)
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  // Hook để lấy thông tin location hiện tại
  const location = useLocation();

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
  const conditionalHideNavbarPages = ["/login", "/register", "/welcome", "/tour", "/terms", "/support"];
  const shouldHideNavbar = alwaysHideNavbarPages.includes(location.pathname) ||
    (conditionalHideNavbarPages.includes(location.pathname) && !user);

  // Debug log
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
    }
  }, [location.pathname, user, shouldHideNavbar]);

  // Effect chạy khi app khởi tạo để kiểm tra authentication
  useEffect(() => {
    let cancelled = false;
    let timeoutId = null;
    const startTime = Date.now();
    const MIN_LOADING_TIME = 0; // Tắt loading delay

    const checkAuth = async () => {
      try {
        await ensureCSRFToken();
        // Try to initialize access token from cookies (will attempt refresh if needed)
        const token = await initializeAccessToken();
        if (cancelled) {
          return;
        }

        if (token && !cancelled) {
          // Nếu có token, gọi API để lấy thông tin user
          try {
            const res = await api("/api/auth/session");
            if (!cancelled && res.authenticated && res.user) {
              setUser(res.user);
              // Kết nối socket khi đã xác thực user thành công
              socketService.connect(res.user);
            } else {
              setUser(null);
            }
          } catch (error) {
            if (!cancelled) {
              setUser(null);
            }
          }
        } else if (!cancelled) {
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
          // Đảm bảo loading hiển thị ít nhất 5 giây
          const elapsedTime = Date.now() - startTime;
          const remainingTime = Math.max(0, MIN_LOADING_TIME - elapsedTime);

          setTimeout(() => {
            if (!cancelled) {
              setLoading(false); // Kết thúc loading sau 5 giây
            }
          }, remainingTime);
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
      getValidAccessToken().catch(() => { });
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

  // Effect để theo dõi trạng thái kết nối internet
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
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
        }).catch(() => { });
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
  // OPTIMIZED: Sử dụng debounced check và giới hạn observation scope
  useEffect(() => {
    let debounceTimer = null;

    const checkStoryViewer = () => {
      // Debounce để tránh check quá nhiều lần
      if (debounceTimer) cancelAnimationFrame(debounceTimer);
      debounceTimer = requestAnimationFrame(() => {
        const storyViewer = document.querySelector('.story-viewer');
        setIsStoryViewerOpen(!!storyViewer);
      });
    };

    // Kiểm tra ngay lập tức
    checkStoryViewer();

    // OPTIMIZED: Chỉ theo dõi childList của body, không cần subtree
    // vì StoryViewer thường được mount trực tiếp vào body hoặc root
    const observer = new MutationObserver(checkStoryViewer);
    observer.observe(document.body, {
      childList: true,
      subtree: false  // Giảm scope observation
    });

    return () => {
      if (debounceTimer) cancelAnimationFrame(debounceTimer);
      observer.disconnect();
    };
  }, []);


  // Effect để theo dõi video đang phát (trong PostDetail)
  // OPTIMIZED: Sử dụng debounce và WeakMap để tránh add/remove listeners quá nhiều lần
  useEffect(() => {
    let debounceTimer = null;
    const videoListenerMap = new WeakMap(); // Track which videos already have listeners

    const handleVideoPlay = () => setIsVideoPlaying(true);
    const handleVideoPause = () => setIsVideoPlaying(false);
    const handleVideoEnded = () => setIsVideoPlaying(false);

    const updateVideoListeners = () => {
      const videos = document.querySelectorAll('video');
      videos.forEach(video => {
        // Chỉ add listeners nếu chưa có
        if (!videoListenerMap.has(video)) {
          video.addEventListener('play', handleVideoPlay);
          video.addEventListener('pause', handleVideoPause);
          video.addEventListener('ended', handleVideoEnded);
          videoListenerMap.set(video, true);
        }
      });
    };

    // OPTIMIZED: Debounce để tránh update quá nhiều lần
    const debouncedUpdate = () => {
      if (debounceTimer) cancelAnimationFrame(debounceTimer);
      debounceTimer = requestAnimationFrame(updateVideoListeners);
    };

    // Kiểm tra ngay lập tức
    updateVideoListeners();

    // MutationObserver để theo dõi video mới được thêm vào DOM
    const observer = new MutationObserver(debouncedUpdate);
    observer.observe(document.body, {
      childList: true,
      subtree: true // Cần subtree vì video có thể nằm sâu trong DOM
    });

    return () => {
      if (debounceTimer) cancelAnimationFrame(debounceTimer);
      // Cleanup all video listeners
      document.querySelectorAll('video').forEach(video => {
        video.removeEventListener('play', handleVideoPlay);
        video.removeEventListener('pause', handleVideoPause);
        video.removeEventListener('ended', handleVideoEnded);
      });
      observer.disconnect();
    };
  }, []);


  // Hiển thị màn hình offline khi mất kết nối
  if (!isOnline) {
    return <OfflineScreen />;
  }

  // Hiển thị loading screen khi app đang khởi tạo
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-black">
        <div className="flex flex-col items-center space-y-4">
          {/* Square animation loader */}
          <Loader />

          {/* Loading text */}
          <div className="text-center">
            <h2 className="text-lg font-bold text-black dark:text-white mb-1">
              Đang khởi tạo Shiku
            </h2>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 animate-pulse">
              Vui lòng chờ trong giây lát...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <ToastProvider>
        <ChatProvider>
          <div className="min-h-screen">
            {/* Toast Container - moved inside ToastProvider */}
            <ToastContainerWrapper />

            {/* Mobile CSRF Debug Component */}

            {/* Hiển thị navbar cho tất cả trang trừ login/register/landing (khi chưa đăng nhập), chat, home, cultivation, admin/equipment và gallery */}
            {!shouldHideNavbar && location.pathname !== "/chat" && location.pathname !== "/" && location.pathname !== "/home" && location.pathname !== "/feed" && location.pathname !== "/search" && location.pathname !== "/cultivation" && location.pathname !== "/admin/equipment" && location.pathname !== "/gallery" && (
              <Navbar user={user} setUser={setUser} darkMode={darkMode} setDarkMode={setDarkMode} />
            )}

            {/* Floating Dock - chỉ hiển thị khi user đã đăng nhập, không ở trang auth/landing/chat/cultivation/admin/gallery/home, không có story viewer đang mở, và không có video đang phát */}
            {user && !shouldHideNavbar && location.pathname !== "/" && location.pathname !== "/chat" && location.pathname !== "/cultivation" && !location.pathname.startsWith("/admin") && location.pathname !== "/gallery" && !isStoryViewerOpen && !isVideoPlaying && (
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
                    {/* Trang chủ - Home feed cho tất cả (guest và logged-in) */}
                    <Route path="/" element={<Home user={user} setUser={setUser} />} />

                    {/* Landing page - cho marketing/SEO */}
                    <Route path="/welcome" element={<Landing />} />

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
                    <Route path="/explore" element={<ProtectedRoute user={user}><Explore user={user} /></ProtectedRoute>} />
                    <Route path="/events" element={<ProtectedRoute user={user}><Events /></ProtectedRoute>} />
                    <Route path="/events/create" element={<ProtectedRoute user={user}><CreateEvent /></ProtectedRoute>} />
                    <Route path="/events/:id" element={<ProtectedRoute user={user}><EventDetail /></ProtectedRoute>} />
                    <Route path="/events/:id/edit" element={<ProtectedRoute user={user}><EditEvent /></ProtectedRoute>} />
                    <Route path="/media" element={<ProtectedRoute user={user}><Media /></ProtectedRoute>} />
                    <Route path="/saved" element={<ProtectedRoute user={user}><Saved /></ProtectedRoute>} />
                    <Route path="/gallery" element={<ProtectedRoute user={user}><Gallery /></ProtectedRoute>} />
                    <Route path="/activity-leaderboard" element={<ProtectedRoute user={user}><ActivityLeaderboard /></ProtectedRoute>} />
                    <Route path="/notifications" element={<ProtectedRoute user={user}><NotificationHistory /></ProtectedRoute>} />

                    {/* Trang admin */}
                    <Route path="/admin" element={<ProtectedRoute user={user}><AdminDashboard /></ProtectedRoute>} />
                    <Route path="/admin/feedback" element={<ProtectedRoute user={user}><AdminFeedback /></ProtectedRoute>} />
                    <Route path="/admin/equipment" element={<ProtectedRoute user={user}><EquipmentManagement /></ProtectedRoute>} />

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
      </ToastProvider>
    </ErrorBoundary>
  );
}

// Separate component to use ToastContext inside ToastProvider
function ToastContainerWrapper() {
  const { toasts, removeToast } = useToast();
  return <ToastContainer toasts={toasts} onRemove={removeToast} />;
}
