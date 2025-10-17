import React from "react";
import { api } from "../api";
import { getUserAvatarUrl, AVATAR_SIZES } from "../utils/avatarUtils";

/**
 * Settings - Trang cài đặt tài khoản
 * Bao gồm quản lý danh sách chặn và bảo mật tài khoản
 * @returns {JSX.Element} Component settings page
 */
export default function Settings() {
  // ==================== STATE MANAGEMENT ====================
  
  // Tab management
  const [activeTab, setActiveTab] = React.useState("blocked"); // Tab hiện tại
  const [darkMode, setDarkMode] = React.useState(() => {
    const saved = localStorage.getItem('app:darkMode');
    if (saved != null) return saved === '1';
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  
  // Blocked users management
  const [blockedUsers, setBlockedUsers] = React.useState([]); // Danh sách người đã chặn
  const [privacySetting, setPrivacySetting] = React.useState("everyone"); // Privacy setting (chưa sử dụng)
  
  // Email change states
  const [newEmail, setNewEmail] = React.useState(""); // Email mới
  const [emailLoading, setEmailLoading] = React.useState(false); // Loading khi đổi email
  
  // Password change states
  const [currentPassword, setCurrentPassword] = React.useState(""); // Mật khẩu hiện tại
  const [newPassword, setNewPassword] = React.useState(""); // Mật khẩu mới
  const [passwordLoading, setPasswordLoading] = React.useState(false); // Loading khi đổi mật khẩu

  // Function để refresh danh sách blocked users
  const refreshBlockedUsers = async () => {
    try {
      const res = await api("/api/auth/me");
      
      // res.user.blockedUsers là mảng id, lấy thông tin tất cả users trong một lần gọi
      if (res.user.blockedUsers && res.user.blockedUsers.length > 0) {
        const batchRes = await api("/api/users/batch", {
          method: "POST",
          body: { userIds: res.user.blockedUsers }
        });
        setBlockedUsers(batchRes.users || []);
      } else {
        setBlockedUsers([]);
      }
    } catch (err) {
      // Silent handling for blocked users loading error
      setBlockedUsers([]);
    }
  };

  React.useEffect(() => {
    refreshBlockedUsers();
  }, []);
  React.useEffect(() => {
    const root = document.documentElement;
    if (darkMode) root.classList.add('dark'); else root.classList.remove('dark');
    try { localStorage.setItem('app:darkMode', darkMode ? '1' : '0'); } catch (_) {}
  }, [darkMode]);

  // Refresh danh sách blocked users khi chuyển sang tab blocked
  React.useEffect(() => {
    if (activeTab === "blocked") {
      refreshBlockedUsers();
    }
  }, [activeTab]);

  // Thêm listener để refresh khi focus lại window (để sync với các tab khác)
  React.useEffect(() => {
    const handleFocus = () => {
      if (activeTab === "blocked") {
        refreshBlockedUsers();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [activeTab]);

  const unblockUser = async (userId) => {
    try {
      await api(`/api/users/unblock/${userId}`, { method: "POST" });
      
      // Refresh lại danh sách để đảm bảo đồng bộ với server
      await refreshBlockedUsers();
      
      // Thêm một lần refresh nữa sau 500ms để đảm bảo
      setTimeout(() => {
        refreshBlockedUsers();
      }, 500);
      
    } catch (err) {
      alert("Lỗi khi gỡ chặn: " + (err.message || "Lỗi hệ thống"));
    }
  };

  return (
    <div className="min-h-screen pt-20 bg-gray-50">
      <div className="max-w-5xl mx-auto px-4">
        {/* Header */}
        <div className="card mb-6 rounded-2xl p-6 shadow-sm border bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-black dark:text-gray-100">
          <h1 className="text-2xl font-bold">Cài đặt tài khoản</h1>
          <p className="mt-1 text-sm text-gray-500">
            Các tùy chọn riêng tư và bảo mật cho tài khoản của bạn.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
              className={`px-4 py-2 rounded-lg font-semibold border transition-colors ${activeTab === "blocked"
                  ? "bg-black text-white"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                }`}
            onClick={() => setActiveTab("blocked")}
          >
            Danh sách chặn
          </button>
          <button
              className={`px-4 py-2 rounded-lg font-semibold border transition-colors ${activeTab === "privacy"
                  ? "bg-black text-white"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                }`}
            onClick={() => setActiveTab("privacy")}
          >
            Bảo mật tài khoản
          </button>
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 dark:text-gray-300">Dark mode</span>
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`relative inline-flex h-6 w-12 items-center rounded-full transition-colors ${darkMode ? 'bg-blue-600' : 'bg-gray-300'}`}
            >
              <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${darkMode ? 'translate-x-7' : 'translate-x-1'}`} />
            </button>
          </div>
        </div>

        {/* Blocked Users */}
        {activeTab === "blocked" && (
          <div className="card rounded-2xl p-6 shadow-sm border bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-black dark:text-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Người bạn đã chặn ({blockedUsers.length})</h2>
              <button
                onClick={refreshBlockedUsers}
                className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Làm mới
              </button>
            </div>
            {blockedUsers.length === 0 ? (
              <div className="text-gray-500 ">
                Bạn chưa chặn ai.
              </div>
            ) : (
              <ul className="space-y-3">
                {blockedUsers.map((user) => (
                  <li key={user._id} className="flex items-center gap-4">
                    <img
                      src={getUserAvatarUrl(user, AVATAR_SIZES.SMALL)}
                      alt={user.name}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                    <span className="font-semibold flex-1">{user.name}</span>
                    <button
                      className="px-4 py-2 rounded-lg bg-black text-white text-sm font-semibold transition-colors hover:bg-gray-900"
                      style={{ minWidth: 100 }}
                      onClick={() => unblockUser(user._id)}
                    >
                      Gỡ chặn
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Privacy Settings */}
        {activeTab === "privacy" && (
          <div className="card rounded-2xl p-6 shadow-sm border bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-black dark:text-gray-100">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h2 className="text-lg font-semibold mb-4">Đổi email</h2>
                <form onSubmit={async e => {
                  e.preventDefault();
                  setEmailLoading(true);
                  try {
                    await api("/api/auth/update-profile", {
                      method: "PUT",
                      body: { email: newEmail }
                    });
                    alert("Đổi email thành công!");
                    setNewEmail("");
                  } catch (err) {
                    alert("Lỗi đổi email: " + (err.message || err));
                  } finally {
                    setEmailLoading(false);
                  }
                }}>
                  <div className="flex flex-col gap-2 mb-4 max-w-md">
                    <label htmlFor="newEmail" className="font-medium">Email mới</label>
                    <input type="email" id="newEmail" name="newEmail" className="px-3 py-2 rounded border bg-gray-50 dark:bg-gray-700 dark:border-gray-600" required value={newEmail} onChange={e => setNewEmail(e.target.value)} />
                  </div>
                  <button type="submit" className="px-6 py-2 rounded-lg bg-black text-white font-semibold text-sm transition-colors hover:bg-gray-900" disabled={emailLoading}>{emailLoading ? "Đang lưu..." : "Lưu email"}</button>
                </form>
              </div>
              <div>
                <h2 className="text-lg font-semibold mb-4">Đổi mật khẩu</h2>
                <form onSubmit={async e => {
                  e.preventDefault();
                  setPasswordLoading(true);
                  try {
                    await api("/api/auth/update-profile", {
                      method: "PUT",
                      body: { password: newPassword }
                    });
                    alert("Đổi mật khẩu thành công!");
                    setCurrentPassword("");
                    setNewPassword("");
                  } catch (err) {
                    alert("Lỗi đổi mật khẩu: " + (err.message || err));
                  } finally {
                    setPasswordLoading(false);
                  }
                }}>
                  <div className="flex flex-col gap-2 mb-4 max-w-md">
                    <label htmlFor="currentPassword" className="font-medium">Mật khẩu hiện tại</label>
                    <input type="password" id="currentPassword" name="currentPassword" className="px-3 py-2 rounded border bg-gray-50 dark:bg-gray-700 dark:border-gray-600" required value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} />
                  </div>
                  <div className="flex flex-col gap-2 mb-4 max-w-md">
                    <label htmlFor="newPassword" className="font-medium">Mật khẩu mới</label>
                    <input type="password" id="newPassword" name="newPassword" className="px-3 py-2 rounded border bg-gray-50 dark:bg-gray-700 dark:border-gray-600" required value={newPassword} onChange={e => setNewPassword(e.target.value)} />
                  </div>
                  <button type="submit" className="px-6 py-2 rounded-lg bg-black text-white font-semibold text-sm transition-colors hover:bg-gray-900" disabled={passwordLoading}>{passwordLoading ? "Đang lưu..." : "Lưu mật khẩu"}</button>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
