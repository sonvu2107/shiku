import React from "react";
import { api } from "../api";

export default function Settings() {
  const [activeTab, setActiveTab] = React.useState("blocked");
  const [blockedUsers, setBlockedUsers] = React.useState([]);
  const [privacySetting, setPrivacySetting] = React.useState("everyone");
  // State cho đổi email
  const [newEmail, setNewEmail] = React.useState("");
  const [emailLoading, setEmailLoading] = React.useState(false);
  // State cho đổi mật khẩu
  const [currentPassword, setCurrentPassword] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [passwordLoading, setPasswordLoading] = React.useState(false);

  React.useEffect(() => {
    // Lấy danh sách blocked users từ API
    async function fetchBlocked() {
      try {
        const res = await api("/api/auth/me");
        // res.user.blockedUsers là mảng id, cần lấy thông tin từng user
        if (res.user.blockedUsers && res.user.blockedUsers.length > 0) {
          const users = await Promise.all(
            res.user.blockedUsers.map(async (id) => {
              const u = await api(`/api/users/${id}`);
              return u.user;
            })
          );
          setBlockedUsers(users);
        } else {
          setBlockedUsers([]);
        }
      } catch (err) {
        setBlockedUsers([]);
      }
    }
    fetchBlocked();
  }, []);

  const unblockUser = async (userId) => {
    try {
      await api(`/api/users/unblock/${userId}`, { method: "POST" });
      setBlockedUsers((prev) => prev.filter((u) => u._id !== userId));
    } catch (err) {
      alert("Lỗi khi gỡ chặn");
    }
  };

  return (
    <div className="min-h-screen pt-20 bg-gray-50 dark:bg-gray-900 dark:text-white">
      <div className="max-w-5xl mx-auto px-4">
        {/* Header */}
        <div className="card mb-6 rounded-2xl p-6 shadow-sm border bg-white border-gray-200 text-black dark:bg-gray-800 dark:text-white dark:border-gray-700">
          <h1 className="text-2xl font-bold">Cài đặt tài khoản</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Các tùy chọn riêng tư và bảo mật cho tài khoản của bạn.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
              className={`px-4 py-2 rounded-lg font-semibold border transition-colors ${activeTab === "blocked"
                  ? "bg-black text-white"
                  : "bg-gray-100 text-gray-900 dark:bg-gray-700 dark:text-white"
                }`}
            onClick={() => setActiveTab("blocked")}
          >
            Danh sách chặn
          </button>
          <button
              className={`px-4 py-2 rounded-lg font-semibold border transition-colors ${activeTab === "privacy"
                  ? "bg-black text-white"
                  : "bg-gray-100 text-gray-900 dark:bg-gray-700 dark:text-white"
                }`}
            onClick={() => setActiveTab("privacy")}
          >
            Bảo mật tài khoản
          </button>
        </div>

        {/* Blocked Users */}
        {activeTab === "blocked" && (
          <div className="card rounded-2xl p-6 shadow-sm border bg-white border-gray-200 text-black dark:bg-gray-800 dark:text-white dark:border-gray-700">
            <h2 className="text-lg font-semibold mb-4">Người bạn đã chặn</h2>
            {blockedUsers.length === 0 ? (
              <div className="text-gray-500 dark:text-gray-400">
                Bạn chưa chặn ai.
              </div>
            ) : (
              <ul className="space-y-3">
                {blockedUsers.map((user) => (
                  <li key={user._id} className="flex items-center gap-4">
                    <img
                      src={
                        user.avatarUrl ||
                        `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || "User")}&background=3b82f6&color=ffffff&size=40`
                      }
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
          <div className="card rounded-2xl p-6 shadow-sm border bg-white border-gray-200 text-black dark:bg-gray-800 dark:text-white dark:border-gray-700">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h2 className="text-lg font-semibold mb-4">Đổi email</h2>
                <form onSubmit={async e => {
                  e.preventDefault();
                  setEmailLoading(true);
                  try {
                    await api("/api/auth/update-profile", {
                      method: "POST",
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
                    <input type="email" id="newEmail" name="newEmail" className="px-3 py-2 rounded border bg-gray-50 dark:bg-gray-900" required value={newEmail} onChange={e => setNewEmail(e.target.value)} />
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
                      method: "POST",
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
                    <input type="password" id="currentPassword" name="currentPassword" className="px-3 py-2 rounded border bg-gray-50 dark:bg-gray-900" required value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} />
                  </div>
                  <div className="flex flex-col gap-2 mb-4 max-w-md">
                    <label htmlFor="newPassword" className="font-medium">Mật khẩu mới</label>
                    <input type="password" id="newPassword" name="newPassword" className="px-3 py-2 rounded border bg-gray-50 dark:bg-gray-900" required value={newPassword} onChange={e => setNewPassword(e.target.value)} />
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
