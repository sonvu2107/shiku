import { useEffect, useState } from "react";
import AdminFeedback from "./AdminFeedback";
import { api } from "../api";
import { useNavigate } from "react-router-dom";
import { 
  BarChart3, 
  Users, 
  FileText, 
  Eye, 
  MessageCircle, 
  Heart, 
  Crown,
  Edit,
  Trash2,
  TrendingUp,
  TrendingDown,
  Bell
} from "lucide-react";

export default function AdminDashboard() {
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("stats");
  const [banForm, setBanForm] = useState({ userId: "", duration: "", reason: "" });
  const [notificationForm, setNotificationForm] = useState({ title: "", message: "", targetRole: "" });
  const navigate = useNavigate();

  useEffect(() => {
    checkAdmin();
  }, []);

  async function checkAdmin() {
    try {
      const res = await api("/api/auth/me");
      if (res.user.role !== "admin") {
        alert("Bạn không có quyền truy cập trang này!");
        navigate("/");
        return;
      }
      setUser(res.user);
      await Promise.all([loadStats(), loadUsers()]);
    } catch (e) {
      alert("Lỗi xác thực!");
      navigate("/login");
    } finally {
      setLoading(false);
    }
  }

  async function loadStats() {
    try {
      const res = await api("/api/admin/stats");
      setStats(res.stats);
    } catch (e) {
      console.error("Load stats error:", e);
    }
  }

  async function loadUsers() {
    try {
      const res = await api("/api/admin/users");
      setUsers(res.users);
    } catch (e) {
      console.error("Load users error:", e);
    }
  }

  async function toggleUserRole(userId, currentRole) {
    if (!window.confirm("Bạn có chắc muốn thay đổi quyền người dùng này?")) return;
    try {
      const newRole = currentRole === "admin" ? "user" : "admin";
      await api(`/api/admin/users/${userId}/role`, {
        method: "PUT",
        body: { role: newRole }
      });
      await loadUsers();
      alert("Đã cập nhật quyền người dùng!");
    } catch (e) {
      alert("Lỗi: " + e.message);
    }
  }

  async function deleteUser(userId) {
    if (!window.confirm("Bạn có chắc muốn xóa người dùng này? Tất cả bài viết và bình luận của họ sẽ bị xóa!")) return;
    try {
      await api(`/api/admin/users/${userId}`, { method: "DELETE" });
      await loadUsers();
      alert("Đã xóa người dùng!");
    } catch (e) {
      alert("Lỗi: " + e.message);
    }
  }

  async function banUser(userId, duration, reason) {
    if (!reason.trim()) {
      alert("Vui lòng nhập lý do cấm!");
      return;
    }
    
    try {
      const banDurationMinutes = duration === "permanent" ? null : parseInt(duration);
      await api("/api/admin/ban-user", {
        method: "POST",
        body: { userId, banDurationMinutes, reason }
      });
      
      // Reset form and refresh users list
      setBanForm({ userId: "", duration: "", reason: "" });
      await loadUsers();
      
      alert("Đã cấm người dùng!");
    } catch (e) {
      alert("Lỗi: " + e.message);
    }
  }

  async function unbanUser(userId) {
    if (!window.confirm("Bạn có chắc muốn gỡ cấm người dùng này?")) return;
    try {
      await api("/api/admin/unban-user", {
        method: "POST",
        body: { userId }
      });
      
      // Refresh users list
      await loadUsers();
      
      alert("Đã gỡ cấm người dùng!");
    } catch (e) {
      alert("Lỗi: " + e.message);
    }
  }

  async function sendNotification(type) {
    const { title, message, targetRole } = notificationForm;
    
    if (!title.trim() || !message.trim()) {
      alert("Vui lòng nhập tiêu đề và nội dung!");
      return;
    }

    try {
      const endpoint = type === "system" ? "/api/notifications/system" : "/api/notifications/broadcast";
      const body = type === "system" 
        ? { title, message, targetRole: targetRole || null }
        : { title, message };

      await api(endpoint, {
        method: "POST",
        body
      });

      setNotificationForm({ title: "", message: "", targetRole: "" });
      alert(`Đã gửi ${type === "system" ? "thông báo hệ thống" : "thông báo broadcast"}!`);
    } catch (error) {
      alert("Lỗi: " + error.message);
    }
  }

  if (loading) {
    return (
      <div className="w-full px-6 py-6 pt-20">
        <div className="card max-w-4xl mx-auto">Đang tải...</div>
      </div>
    );
  }

  return (
    <div className="w-full px-6 py-6 pt-20 space-y-6">
      {/* Header */}
      <div className="card max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-4">QUẢN LÝ NGƯỜI DÙNG</h1>
        <div className="text-gray-600">Chào mừng, {user?.name}!</div>
      </div>

      {/* Tab Navigation */}
      <div className="card max-w-7xl mx-auto">
        <div className="flex border-b">
          <button
            className={`px-4 py-2 font-medium flex items-center gap-2 ${activeTab === "stats" ? "border-b-2 border-blue-500 text-blue-600" : "text-gray-500"}`}
            onClick={() => setActiveTab("stats")}
          >
            <BarChart3 size={18} />
            Thống kê
          </button>
          <button
            className={`px-4 py-2 font-medium flex items-center gap-2 ${activeTab === "users" ? "border-b-2 border-blue-500 text-blue-600" : "text-gray-500"}`}
            onClick={() => setActiveTab("users")}
          >
            <Users size={18} />
            Quản lý User
          </button>
          <button
            className={`px-4 py-2 font-medium flex items-center gap-2 ${activeTab === "bans" ? "border-b-2 border-blue-500 text-blue-600" : "text-gray-500"}`}
            onClick={() => setActiveTab("bans")}
          >
            <Crown size={18} />
            Quản lý Cấm
          </button>
          <button
            className={`px-4 py-2 font-medium flex items-center gap-2 ${activeTab === "notifications" ? "border-b-2 border-blue-500 text-blue-600" : "text-gray-500"}`}
            onClick={() => setActiveTab("notifications")}
          >
            <Bell size={18} />
            Thông báo
          </button>
          <button
            className={`px-4 py-2 font-medium flex items-center gap-2 ${activeTab === "feedback" ? "border-b-2 border-blue-500 text-blue-600" : "text-gray-500"}`}
            onClick={() => setActiveTab("feedback")}
          >
            <MessageCircle size={18} />
            Góp ý người dùng
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="card max-w-7xl mx-auto">
        {/* Stats Tab */}
        {activeTab === "stats" && stats && (
          <div className="pt-4">
            <h2 className="text-xl font-bold mb-4">Thống kê tổng quan</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Bài viết */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="text-blue-600" size={24} />
                  <div className="text-2xl font-bold text-blue-600">
                    {stats.overview ? stats.overview.totalPosts.count : stats.totalPosts}
                  </div>
                </div>
                <div className="text-gray-600">Tổng bài viết</div>
                {stats.overview && (
                  <div className="mt-2 text-sm">
                    <div className="text-gray-500">
                      Tháng này: {stats.overview.totalPosts.thisMonth}
                    </div>
                    <div className={`flex items-center ${stats.overview.totalPosts.growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {stats.overview.totalPosts.growth >= 0 ? 
                        <TrendingUp size={14} className="mr-1" /> : 
                        <TrendingDown size={14} className="mr-1" />
                      }
                      {Math.abs(stats.overview.totalPosts.growth)}% so với tháng trước
                    </div>
                  </div>
                )}
              </div>

              {/* Lượt xem */}
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Eye className="text-green-600" size={24} />
                  <div className="text-2xl font-bold text-green-600">
                    {stats.overview ? stats.overview.totalViews.count : stats.totalViews}
                  </div>
                </div>
                <div className="text-gray-600">Tổng lượt xem</div>
                {stats.overview && (
                  <div className="mt-2 text-sm">
                    <div className="text-gray-500">
                      Tháng này: {stats.overview.totalViews.thisMonth}
                    </div>
                    <div className={`flex items-center ${stats.overview.totalViews.growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      <span className="mr-1">
                        {stats.overview.totalViews.growth >= 0 ? '↗' : '↘'}
                      </span>
                      {Math.abs(stats.overview.totalViews.growth)}% so với tháng trước
                    </div>
                  </div>
                )}
              </div>

              {/* Bình luận */}
              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <MessageCircle className="text-purple-600" size={24} />
                  <div className="text-2xl font-bold text-purple-600">
                    {stats.overview ? stats.overview.totalComments.count : stats.totalComments}
                  </div>
                </div>
                <div className="text-gray-600">Tổng bình luận</div>
                {stats.overview && (
                  <div className="mt-2 text-sm">
                    <div className="text-gray-500">
                      Tháng này: {stats.overview.totalComments.thisMonth}
                    </div>
                    <div className={`flex items-center ${stats.overview.totalComments.growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      <span className="mr-1">
                        {stats.overview.totalComments.growth >= 0 ? '↗' : '↘'}
                      </span>
                      {Math.abs(stats.overview.totalComments.growth)}% so với tháng trước
                    </div>
                  </div>
                )}
              </div>

              {/* Emotes */}
              <div className="bg-red-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Heart className="text-red-600" size={24} />
                  <div className="text-2xl font-bold text-red-600">
                    {stats.overview ? stats.overview.totalEmotes.count : stats.totalEmotes}
                  </div>
                </div>
                <div className="text-gray-600">Tổng emote</div>
                {stats.overview && (
                  <div className="mt-2 text-sm">
                    <div className="text-gray-500">
                      Tháng này: {stats.overview.totalEmotes.thisMonth}
                    </div>
                    <div className={`flex items-center ${stats.overview.totalEmotes.growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      <span className="mr-1">
                        {stats.overview.totalEmotes.growth >= 0 ? '↗' : '↘'}
                      </span>
                      {Math.abs(stats.overview.totalEmotes.growth)}% so với tháng trước
                    </div>
                  </div>
                )}
              </div>

              {/* Người dùng */}
              <div className="bg-yellow-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="text-yellow-600" size={24} />
                  <div className="text-2xl font-bold text-yellow-600">
                    {stats.overview ? stats.overview.totalUsers.count : stats.totalUsers}
                  </div>
                </div>
                <div className="text-gray-600">Tổng người dùng</div>
                {stats.overview && (
                  <div className="mt-2 text-sm">
                    <div className="text-gray-500">
                      Tháng này: {stats.overview.totalUsers.thisMonth}
                    </div>
                    <div className={`flex items-center ${stats.overview.totalUsers.growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      <span className="mr-1">
                        {stats.overview.totalUsers.growth >= 0 ? '↗' : '↘'}
                      </span>
                      {Math.abs(stats.overview.totalUsers.growth)}% so với tháng trước
                    </div>
                  </div>
                )}
              </div>

              {/* Bài đã xuất bản */}
              <div className="bg-indigo-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="text-indigo-600" size={24} />
                  <div className="text-2xl font-bold text-indigo-600">
                    {stats.overview ? stats.overview.publishedPosts.count : stats.publishedPosts}
                  </div>
                </div>
                <div className="text-gray-600">Bài đã đăng</div>
                {stats.overview && (
                  <div className="mt-2 text-sm">
                    <div className="text-gray-500">
                      Tháng này: {stats.overview.publishedPosts.thisMonth}
                    </div>
                    <div className={`flex items-center ${stats.overview.publishedPosts.growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      <span className="mr-1">
                        {stats.overview.publishedPosts.growth >= 0 ? '↗' : '↘'}
                      </span>
                      {Math.abs(stats.overview.publishedPosts.growth)}% so với tháng trước
                    </div>
                  </div>
                )}
              </div>

              {/* Bài riêng tư */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Edit className="text-gray-600" size={24} />
                  <div className="text-2xl font-bold text-gray-600">
                    {stats.overview ? stats.overview.draftPosts.count : stats.draftPosts}
                  </div>
                </div>
                <div className="text-gray-600">Bài riêng tư</div>
                {stats.overview && (
                  <div className="mt-2 text-sm">
                    <div className="text-gray-500">
                      Tháng này: {stats.overview.draftPosts.thisMonth}
                    </div>
                    <div className={`flex items-center ${stats.overview.draftPosts.growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      <span className="mr-1">
                        {stats.overview.draftPosts.growth >= 0 ? '↗' : '↘'}
                      </span>
                      {Math.abs(stats.overview.draftPosts.growth)}% so với tháng trước
                    </div>
                  </div>
                )}
              </div>

              {/* Admin */}
              <div className="bg-pink-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Crown className="text-pink-600" size={24} />
                  <div className="text-2xl font-bold text-pink-600">
                    {stats.overview ? stats.overview.adminUsers.count : stats.adminUsers}
                  </div>
                </div>
                <div className="text-gray-600">Admin</div>
                {stats.overview && (
                  <div className="mt-2 text-sm">
                    <div className="text-gray-500">
                      Tháng này: {stats.overview.adminUsers.thisMonth}
                    </div>
                    <div className={`flex items-center ${stats.overview.adminUsers.growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      <span className="mr-1">
                        {stats.overview.adminUsers.growth >= 0 ? '↗' : '↘'}
                      </span>
                      {Math.abs(stats.overview.adminUsers.growth)}% so với tháng trước
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Top Stats */}
            <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Top Posts */}
              <div className="bg-white border rounded-lg p-4">
                <h3 className="font-bold mb-3">Top 5 bài viết có nhiều lượt xem nhất</h3>
                {stats.topPosts?.map((post, index) => (
                  <div key={post._id} className="flex justify-between items-center py-2 border-b last:border-b-0">
                    <div>
                      <div className="font-medium text-sm">{index + 1}. {post.title}</div>
                      <div className="text-xs text-gray-500">by {post.author?.name}</div>
                    </div>
                    <div className="text-sm font-medium text-blue-600">{post.views} views</div>
                  </div>
                ))}
              </div>

              {/* Top Users */}
              <div className="bg-white border rounded-lg p-4">
                <h3 className="font-bold mb-3">Top 5 user có nhiều bài viết nhất</h3>
                {stats.topUsers?.map((userStat, index) => (
                  <div key={userStat._id} className="flex justify-between items-center py-2 border-b last:border-b-0">
                    <div>
                      <div className="font-medium text-sm">{index + 1}. {userStat.name}</div>
                      <div className="text-xs text-gray-500">{userStat.role === "admin" ? "Admin" : "User"}</div>
                    </div>
                    <div className="text-sm font-medium text-green-600">{userStat.postCount} bài</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === "users" && (
          <div className="pt-4">
            <h2 className="text-xl font-bold mb-4">Quản lý người dùng ({users.length})</h2>
            <div className="overflow-x-auto">
              <table className="w-full border border-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left">Avatar</th>
                    <th className="px-4 py-2 text-left">Tên</th>
                    <th className="px-4 py-2 text-left">Email</th>
                    <th className="px-4 py-2 text-left">Quyền</th>
                    <th className="px-4 py-2 text-left">Ngày tham gia</th>
                    <th className="px-4 py-2 text-left">Số bài viết</th>
                    <th className="px-4 py-2 text-left">Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u._id} className="border-t">
                      <td className="px-4 py-2">
                        <img
                          src={u.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}&background=cccccc&color=222222&size=40`}
                          alt="avatar"
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      </td>
                      <td className="px-4 py-2 font-medium">{u.name}</td>
                      <td className="px-4 py-2">{u.email}</td>
                      <td className="px-4 py-2">
                        <span className={`px-2 py-1 rounded-full text-xs ${u.role === "admin" ? "bg-red-100 text-red-800" : "bg-blue-100 text-blue-800"}`}>
                          {u.role === "admin" ? "Admin" : "User"}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-sm">{new Date(u.createdAt).toLocaleDateString()}</td>
                      <td className="px-4 py-2">{u.postCount}</td>
                      <td className="px-4 py-2">
                        <div className="flex gap-2">
                          <button
                            className="btn-outline btn-sm text-blue-600"
                            onClick={() => toggleUserRole(u._id, u.role)}
                            disabled={u._id === user._id}
                          >
                            {u.role === "admin" ? "Hạ quyền" : "Lên Admin"}
                          </button>
                          <button
                            className="btn-outline btn-sm text-red-600"
                            onClick={() => deleteUser(u._id)}
                            disabled={u._id === user._id}
                          >
                            Xóa
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Ban Management Tab */}
        {activeTab === "bans" && (
          <div className="pt-4">
            <h2 className="text-xl font-bold mb-4">Quản lý cấm người dùng</h2>
            
            {/* Ban Form */}
            <div className="bg-gray-50 p-4 rounded-lg mb-6">
              <h3 className="font-semibold mb-3">Cấm người dùng</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <select 
                  value={banForm.userId} 
                  onChange={(e) => setBanForm({...banForm, userId: e.target.value})}
                  className="input"
                >
                  <option value="">Chọn người dùng</option>
                  {users.filter(u => u.role !== "admin" && u._id !== user._id).map(u => (
                    <option key={u._id} value={u._id}>{u.name} ({u.email})</option>
                  ))}
                </select>
                
                <select 
                  value={banForm.duration} 
                  onChange={(e) => setBanForm({...banForm, duration: e.target.value})}
                  className="input"
                >
                  <option value="">Chọn thời gian cấm</option>
                  <option value="15">15 phút</option>
                  <option value="30">30 phút</option>
                  <option value="60">1 giờ</option>
                  <option value="180">3 giờ</option>
                  <option value="360">6 giờ</option>
                  <option value="720">12 giờ</option>
                  <option value="1440">1 ngày</option>
                  <option value="4320">3 ngày</option>
                  <option value="10080">1 tuần</option>
                  <option value="permanent">Vĩnh viễn</option>
                </select>
                
                <input 
                  type="text"
                  placeholder="Lý do cấm..."
                  value={banForm.reason}
                  onChange={(e) => setBanForm({...banForm, reason: e.target.value})}
                  className="input"
                />
                
                <button 
                  onClick={() => banUser(banForm.userId, banForm.duration, banForm.reason)}
                  disabled={!banForm.userId || !banForm.duration || !banForm.reason}
                  className="px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                >
                  Cấm
                </button>
              </div>
            </div>

            {/* Banned Users List */}
            <div className="overflow-x-auto">
              <h3 className="font-semibold mb-3">Danh sách người dùng bị cấm</h3>
              <table className="w-full border-collapse border">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left border">Người dùng</th>
                    <th className="px-4 py-2 text-left border">Lý do</th>
                    <th className="px-4 py-2 text-left border">Thời gian cấm</th>
                    <th className="px-4 py-2 text-left border">Hết hạn</th>
                    <th className="px-4 py-2 text-left border">Trạng thái</th>
                    <th className="px-4 py-2 text-left border">Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {users.filter(u => u.isBanned).map(u => (
                    <tr key={u._id} className="border">
                      <td className="px-4 py-2 border">
                        <div className="flex items-center gap-2">
                          <img
                            src={u.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}&background=cccccc&color=222222&size=32`}
                            alt="avatar"
                            className="w-6 h-6 rounded-full object-cover"
                          />
                          <span className="font-medium">{u.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2 border">{u.banReason}</td>
                      <td className="px-4 py-2 border text-sm">
                        {u.bannedAt ? new Date(u.bannedAt).toLocaleString() : "N/A"}
                      </td>
                      <td className="px-4 py-2 border text-sm">
                        {u.banExpiresAt ? new Date(u.banExpiresAt).toLocaleString() : "Vĩnh viễn"}
                      </td>
                      <td className="px-4 py-2 border">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          !u.banExpiresAt ? "bg-red-100 text-red-800" : 
                          new Date() < new Date(u.banExpiresAt) ? "bg-orange-100 text-orange-800" : "bg-green-100 text-green-800"
                        }`}>
                          {!u.banExpiresAt ? "Vĩnh viễn" : 
                           new Date() < new Date(u.banExpiresAt) ? "Đang cấm" : "Hết hạn"}
                        </span>
                      </td>
                      <td className="px-4 py-2 border">
                        <button
                          className="btn-outline btn-sm text-green-600"
                          onClick={() => unbanUser(u._id)}
                        >
                          Gỡ cấm
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {users.filter(u => u.isBanned).length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  Không có người dùng nào bị cấm
                </div>
              )}
            </div>
          </div>
        )}

        {/* Notifications Tab */}
        {activeTab === "notifications" && (
          <div className="pt-4">
            <h2 className="text-xl font-bold mb-4">Gửi thông báo</h2>
            
            {/* Notification Forms */}
            <div className="grid gap-6 lg:grid-cols-2">
              
              {/* System Notification */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-3 text-blue-800">Thông báo hệ thống</h3>
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="Tiêu đề thông báo..."
                    value={notificationForm.title}
                    onChange={(e) => setNotificationForm({...notificationForm, title: e.target.value})}
                    className="input w-full"
                  />
                  
                  <textarea
                    placeholder="Nội dung thông báo..."
                    value={notificationForm.message}
                    onChange={(e) => setNotificationForm({...notificationForm, message: e.target.value})}
                    className="input w-full h-20 resize-none"
                  />
                  
                  <select
                    value={notificationForm.targetRole}
                    onChange={(e) => setNotificationForm({...notificationForm, targetRole: e.target.value})}
                    className="input w-full"
                  >
                    <option value="">Tất cả người dùng</option>
                    <option value="admin">Chỉ Admin</option>
                    <option value="user">Chỉ User thường</option>
                  </select>
                  
                  <button
                    onClick={() => sendNotification("system")}
                    className="btn bg-blue-600 text-white w-full hover:bg-blue-700"
                    disabled={!notificationForm.title.trim() || !notificationForm.message.trim()}
                  >
                    Gửi thông báo hệ thống
                  </button>
                </div>
              </div>

              {/* Admin Broadcast */}
              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-3 text-green-800">Thông báo từ Admin</h3>
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="Tiêu đề thông báo..."
                    value={notificationForm.title}
                    onChange={(e) => setNotificationForm({...notificationForm, title: e.target.value})}
                    className="input w-full"
                  />
                  
                  <textarea
                    placeholder="Nội dung thông báo..."
                    value={notificationForm.message}
                    onChange={(e) => setNotificationForm({...notificationForm, message: e.target.value})}
                    className="input w-full h-20 resize-none"
                  />
                  
                  <button
                    onClick={() => sendNotification("broadcast")}
                    className="btn bg-green-600 text-white w-full hover:bg-green-700"
                    disabled={!notificationForm.title.trim() || !notificationForm.message.trim()}
                  >
                    Gửi thông báo
                  </button>
                </div>
              </div>
            </div>

            {/* Info */}
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium mb-2">Phân biệt các loại thông báo:</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li><strong>Thông báo hệ thống:</strong> Thông báo về cập nhật server, bảo trì, thay đổi chính sách (có thể chọn đối tượng)</li>
                <li><strong>Thông báo từ Admin:</strong> Thông báo cá nhân từ admin đến tất cả người dùng</li>
              </ul>
            </div>
          </div>
        )}

        {/* Feedback Tab */}
        {activeTab === "feedback" && (
          <div className="pt-4">
            <div className="text-center py-8 text-gray-500">
              {/* Hiển thị danh sách góp ý từ người dùng */}
              <AdminFeedback />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}