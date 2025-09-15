// Import React hooks và routing
import { useState, useEffect } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";

// Import các components chính
import Navbar from "./components/Navbar.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";

// Import các pages
import Home from "./pages/Home.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import PostDetail from "./pages/PostDetail.jsx";
import NewPost from "./pages/NewPost.jsx";
import EditPost from "./pages/EditPost.jsx";
import Profile from "./pages/Profile.jsx";
import UserProfile from "./pages/UserProfile.jsx";
import Friends from "./pages/Friends.jsx";
import Chat from "./pages/Chat.jsx";
import AdminDashboard from "./pages/AdminDashboard.jsx";
import AdminFeedback from "./pages/AdminFeedback.jsx";
import Settings from "./pages/Settings.jsx";
import Support from "./pages/Support.jsx";
import NotificationHistory from "./pages/NotificationHistory.jsx";
import ResetPassword from "./pages/ResetPassword.jsx";
import Groups from "./pages/Groups.jsx";
import GroupDetail from "./pages/GroupDetail.jsx";
import CreateGroup from "./pages/CreateGroup.jsx";

// Import các utilities và services
import { api } from "./api.js";
import { getAuthToken } from "./utils/auth.js";
import socketService from "./socket";   // Service quản lý WebSocket connection

/**
 * Component chính của ứng dụng - quản lý routing và authentication
 * @returns {JSX.Element} App component
 */
export default function App() {
  // State quản lý thông tin user hiện tại
  const [user, setUser] = useState(null);
  // State quản lý trạng thái loading khi khởi tạo app
  const [loading, setLoading] = useState(true);
  // Hook để lấy thông tin location hiện tại
  const location = useLocation();

  // Danh sách các trang không hiển thị navbar
  const hideNavbarPages = ["/login", "/register"];
  const shouldHideNavbar = hideNavbarPages.includes(location.pathname);

  // Effect chạy khi app khởi tạo để kiểm tra authentication
  useEffect(() => {
    const token = getAuthToken();
    if (token) {
      // Nếu có token, gọi API để lấy thông tin user
      api("/api/auth/me")
        .then(res => {
          setUser(res.user);
          // Kết nối socket khi đã xác thực user thành công
          socketService.connect(res.user);
        })
        .catch(() => setUser(null)) // Nếu token không hợp lệ, reset user
        .finally(() => setLoading(false)); // Kết thúc loading
    } else {
      // Không có token, set user null và kết thúc loading
      setUser(null);
      setLoading(false);
    }
  }, []);

  // Effect để gửi heartbeat định kỳ khi user đã đăng nhập
  useEffect(() => {
    if (!user) return;

    // Gửi heartbeat ngay lập tức
    const sendHeartbeat = () => {
      api("/api/auth/heartbeat", { method: "POST" })
        .catch(err => console.log("Heartbeat failed:", err));
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

  // Hiển thị loading screen khi app đang khởi tạo
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Đang tải...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Hiển thị navbar cho tất cả trang trừ login/register và chat */}
      {!shouldHideNavbar && location.pathname !== "/chat" && (
        <Navbar user={user} setUser={setUser} />
      )}

      {/* Routing logic dựa trên loại trang */}
      {shouldHideNavbar ? (
        // Routes cho các trang authentication (không có navbar)
        <Routes>
          <Route path="/login" element={<Login setUser={setUser} />} />
          <Route path="/register" element={<Register setUser={setUser} />} />
        </Routes>
      ) : location.pathname === "/chat" ? (
        // Layout đặc biệt cho trang chat (full screen với navbar cố định)
        <div className="h-screen flex flex-col">
          <div className="flex-shrink-0">
            <Navbar user={user} setUser={setUser} />
          </div>
          <div className="flex-1 overflow-hidden">
            <Routes>
              <Route
                path="/chat"
                element={<ProtectedRoute user={user}><Chat /></ProtectedRoute>}
              />
            </Routes>
          </div>
        </div>
      ) : (
        // Routes cho các trang thông thường
        <div className="w-full">
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
            <Route path="/notifications" element={<ProtectedRoute user={user}><NotificationHistory /></ProtectedRoute>} />
            
            {/* Trang admin */}
            <Route path="/admin" element={<ProtectedRoute user={user}><AdminDashboard /></ProtectedRoute>} />
            <Route path="/admin/feedback" element={<ProtectedRoute user={user}><AdminFeedback /></ProtectedRoute>} />
            
            {/* Các trang khác */}
            <Route path="/settings" element={<ProtectedRoute user={user}><Settings /></ProtectedRoute>} />
            <Route path="/support" element={<ProtectedRoute user={user}><Support /></ProtectedRoute>} />
            <Route path="/reset-password" element={<ResetPassword />} />
            
            {/* Catch-all route - redirect về trang chủ */}
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </div>
      )}
    </div>
  );
}
