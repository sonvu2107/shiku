import { useState, useEffect } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import Navbar from "./components/Navbar.jsx";
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
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import { api } from "./api.js";
import { getAuthToken } from "./utils/auth.js";

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  
  // Các trang không hiển thị navbar
  const hideNavbarPages = ['/login', '/register'];
  const shouldHideNavbar = hideNavbarPages.includes(location.pathname);
  
  useEffect(() => {
    // Chỉ gọi /me nếu có token trong localStorage
    const token = getAuthToken();
    if (token) {
      api("/api/auth/me")
        .then(res => setUser(res.user))
        .catch(() => setUser(null))
        .finally(() => setLoading(false));
    } else {
      setUser(null);
      setLoading(false);
    }
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Đang tải...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {!shouldHideNavbar && location.pathname !== '/chat' && <Navbar user={user} setUser={setUser} />}
      
      {shouldHideNavbar ? (
        // Layout full màn hình cho login/register
        <Routes>
          <Route path="/login" element={<Login setUser={setUser} />} />
          <Route path="/register" element={<Register setUser={setUser} />} />
        </Routes>
      ) : location.pathname === '/chat' ? (
        // Layout đặc biệt cho chat - full screen với navbar
        <div className="h-screen flex flex-col">
          <div className="flex-shrink-0">
            <Navbar user={user} setUser={setUser} />
          </div>
          <div className="flex-1 overflow-hidden">
            <Routes>
              <Route path="/chat" element={<ProtectedRoute user={user}><Chat /></ProtectedRoute>} />
            </Routes>
          </div>
        </div>
      ) : (
        // Layout thông thường cho các trang khác
        <div className="w-full">
          <Routes>
            <Route path="/" element={user ? <Home user={user} /> : <Navigate to="/login" />} />
            <Route path="/home" element={<ProtectedRoute user={user}><Home user={user} /></ProtectedRoute>} />
            <Route path="/post/:slug" element={<PostDetail />} />
            <Route path="/new" element={<ProtectedRoute user={user}><NewPost /></ProtectedRoute>} />
            <Route path="/edit/:id" element={<ProtectedRoute user={user}><EditPost /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute user={user}><Profile /></ProtectedRoute>} />
            <Route path="/user/:userId" element={<ProtectedRoute user={user}><UserProfile /></ProtectedRoute>} />
            <Route path="/friends" element={<ProtectedRoute user={user}><Friends /></ProtectedRoute>} />
            <Route path="/notifications" element={<ProtectedRoute user={user}><NotificationHistory /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute user={user}><AdminDashboard /></ProtectedRoute>} />
            <Route path="/admin/feedback" element={<ProtectedRoute user={user}><AdminFeedback /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute user={user}><Settings /></ProtectedRoute>} />
            <Route path="/support" element={<ProtectedRoute user={user}><Support /></ProtectedRoute>} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </div>
      )}
    </div>
  );
}
