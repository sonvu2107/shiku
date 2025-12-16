import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { getUserAvatarUrl, AVATAR_SIZES } from "../utils/avatarUtils";
import { removeAuthToken } from "../utils/auth";
import { invalidateUserCache } from "../utils/userCache";
import { PageLayout, PageHeader, SpotlightCard } from "../components/ui/DesignSystem";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield, Lock, Bell, Ban, Mail, Key, CheckCircle2,
  AlertCircle, Loader2, UserX, ChevronRight, User, FileText
} from "lucide-react";
import { cn } from "../utils/cn";
import { useToast } from "../contexts/ToastContext";
import Avatar from "../components/Avatar";

export default function Settings() {
  const navigate = useNavigate();
  const { showError } = useToast();

  // ==================== STATE MANAGEMENT ====================
  const [activeTab, setActiveTab] = useState("privacy"); // Mặc định vào tab bảo mật
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [loadingBlocked, setLoadingBlocked] = useState(false);


  // Email change states
  const [newEmail, setNewEmail] = useState("");
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailSuccess, setEmailSuccess] = useState("");
  const [emailError, setEmailError] = useState("");

  // Password change states
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [passwordError, setPasswordError] = useState("");

  // Refresh blocked users
  const refreshBlockedUsers = async () => {
    setLoadingBlocked(true);
    try {
      const res = await api("/api/auth/me");
      if (res.user.blockedUsers && res.user.blockedUsers.length > 0) {
        const batchRes = await api("/api/users/batch", {
          method: "POST",
          body: { userIds: res.user.blockedUsers }
        });
        setBlockedUsers(batchRes.users || []);
      } else {
        setBlockedUsers([]);
      }
    } catch (_) {
      setBlockedUsers([]);
    } finally {
      setLoadingBlocked(false);
    }
  };

  useEffect(() => {
    if (activeTab === "blocked") refreshBlockedUsers();
  }, [activeTab]);

  const unblockUser = async (userId) => {
    try {
      await api(`/api/users/unblock/${userId}`, { method: "POST" });
      await refreshBlockedUsers();
    } catch (err) {
      showError("Lỗi khi gỡ chặn: " + (err.message || "Lỗi hệ thống"));
    }
  };

  const handleUpdateEmail = async (e) => {
    e.preventDefault();
    setEmailLoading(true);
    setEmailError("");
    setEmailSuccess("");
    try {
      await api("/api/auth/update-profile", {
        method: "PUT",
        body: { email: newEmail }
      });
      setEmailSuccess("Đổi email thành công!");
      setNewEmail("");
    } catch (err) {
      setEmailError(err.message || "Lỗi đổi email");
    } finally {
      setEmailLoading(false);
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    setPasswordLoading(true);
    setPasswordError("");
    setPasswordSuccess("");
    try {
      await api("/api/auth/update-profile", {
        method: "PUT",
        body: { password: newPassword }
      });
      setPasswordSuccess("Đổi mật khẩu thành công!");
      setCurrentPassword("");
      setNewPassword("");
    } catch (err) {
      setPasswordError(err.message || "Lỗi đổi mật khẩu");
    } finally {
      setPasswordLoading(false);
    }
  };



  // --- SIDEBAR TABS ---
  const tabs = [
    { id: 'privacy', label: 'Bảo mật tài khoản', icon: Shield },
    { id: 'blocked', label: 'Danh sách chặn', icon: Ban },
  ];

  return (
    <PageLayout>
      <PageHeader
        title="Cài đặt"
        subtitle="Quản lý tài khoản và quyền riêng tư của bạn"
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

        {/* --- LEFT SIDEBAR (MENU) --- */}
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-white/80 dark:bg-[#1C1C1E]/80 backdrop-blur-xl rounded-2xl p-2 border border-neutral-200 dark:border-neutral-800 shadow-sm sticky top-24">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-bold transition-all mb-1 last:mb-0",
                  activeTab === tab.id
                    ? "bg-black dark:bg-white text-white dark:text-black shadow-md"
                    : "text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-neutral-200"
                )}
              >
                <div className="flex items-center gap-3">
                  <tab.icon size={18} />
                  {tab.label}
                </div>
                {activeTab === tab.id && <ChevronRight size={16} />}
              </button>
            ))}

            {/* Terms Link */}
            <button
              onClick={() => navigate('/terms')}
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-bold transition-all mb-1 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-neutral-200"
            >
              <div className="flex items-center gap-3">
                <FileText size={18} />
                Điều khoản & Chính sách
              </div>
              <ChevronRight size={16} />
            </button>
          </div>


        </div>

        {/* --- RIGHT CONTENT --- */}
        <div className="lg:col-span-9">
          <AnimatePresence mode="wait">

            {/* SECURITY / PRIVACY TAB */}
            {activeTab === "privacy" && (
              <motion.div
                key="privacy"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                {/* Change Email */}
                <SpotlightCard>
                  <div className="flex items-start gap-4 mb-6">
                    <div className="p-3 rounded-full bg-neutral-100 dark:bg-neutral-800">
                      <Mail className="w-6 h-6 text-neutral-900 dark:text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-neutral-900 dark:text-white">Địa chỉ Email</h3>
                      <p className="text-sm text-neutral-500 dark:text-neutral-400">Email dùng để đăng nhập và nhận thông báo.</p>
                    </div>
                  </div>

                  <form onSubmit={handleUpdateEmail} className="space-y-4 max-w-lg">
                    <div className="relative group">
                      <input
                        type="email"
                        placeholder="Nhập email mới"
                        value={newEmail}
                        onChange={e => setNewEmail(e.target.value)}
                        className="w-full bg-neutral-50 dark:bg-black border border-neutral-200 dark:border-neutral-800 rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-neutral-500 transition-all text-neutral-900 dark:text-white"
                      />
                    </div>
                    {emailSuccess && <p className="text-green-600 text-sm flex items-center gap-2"><CheckCircle2 size={14} /> {emailSuccess}</p>}
                    {emailError && <p className="text-red-600 text-sm flex items-center gap-2"><AlertCircle size={14} /> {emailError}</p>}

                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={emailLoading || !newEmail}
                        className="px-6 py-2 bg-black dark:bg-white text-white dark:text-black rounded-lg font-bold text-sm disabled:opacity-50 hover:scale-105 transition-transform flex items-center gap-2"
                      >
                        {emailLoading && <Loader2 className="animate-spin w-4 h-4" />}
                        Lưu thay đổi
                      </button>
                    </div>
                  </form>
                </SpotlightCard>

                {/* Change Password */}
                <SpotlightCard>
                  <div className="flex items-start gap-4 mb-6">
                    <div className="p-3 rounded-full bg-neutral-100 dark:bg-neutral-800">
                      <Key className="w-6 h-6 text-neutral-900 dark:text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-neutral-900 dark:text-white">Đổi mật khẩu</h3>
                      <p className="text-sm text-neutral-500 dark:text-neutral-400">Nên sử dụng mật khẩu mạnh để bảo vệ tài khoản.</p>
                    </div>
                  </div>

                  <form onSubmit={handleUpdatePassword} className="space-y-4 max-w-lg">
                    <div className="space-y-3">
                      <input
                        type="password"
                        placeholder="Mật khẩu hiện tại"
                        value={currentPassword}
                        onChange={e => setCurrentPassword(e.target.value)}
                        className="w-full bg-neutral-50 dark:bg-black border border-neutral-200 dark:border-neutral-800 rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-neutral-500 transition-all text-neutral-900 dark:text-white"
                      />
                      <input
                        type="password"
                        placeholder="Mật khẩu mới"
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        className="w-full bg-neutral-50 dark:bg-black border border-neutral-200 dark:border-neutral-800 rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-neutral-500 transition-all text-neutral-900 dark:text-white"
                      />
                    </div>

                    {passwordSuccess && <p className="text-green-600 text-sm flex items-center gap-2"><CheckCircle2 size={14} /> {passwordSuccess}</p>}
                    {passwordError && <p className="text-red-600 text-sm flex items-center gap-2"><AlertCircle size={14} /> {passwordError}</p>}

                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={passwordLoading || !currentPassword || !newPassword}
                        className="px-6 py-2 bg-black dark:bg-white text-white dark:text-black rounded-lg font-bold text-sm disabled:opacity-50 hover:scale-105 transition-transform flex items-center gap-2"
                      >
                        {passwordLoading && <Loader2 className="animate-spin w-4 h-4" />}
                        Đổi mật khẩu
                      </button>
                    </div>
                  </form>
                </SpotlightCard>
              </motion.div>
            )}

            {/* BLOCKED USERS TAB */}
            {activeTab === "blocked" && (
              <motion.div
                key="blocked"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <SpotlightCard className="min-h-[500px]">
                  <div className="flex items-center justify-between mb-8">
                    <div>
                      <h3 className="text-xl font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                        <UserX size={24} /> Danh sách chặn
                      </h3>
                      <p className="text-neutral-500 dark:text-neutral-400 text-sm mt-1">Những người này sẽ không thể liên lạc với bạn.</p>
                    </div>
                    <div className="bg-neutral-100 dark:bg-neutral-800 px-3 py-1 rounded-full text-xs font-bold text-neutral-700 dark:text-neutral-300">
                      {blockedUsers.length} người
                    </div>
                  </div>

                  {loadingBlocked ? (
                    <div className="py-20 flex justify-center"><Loader2 className="animate-spin w-8 h-8 text-neutral-400" /></div>
                  ) : blockedUsers.length > 0 ? (
                    <div className="grid gap-4">
                      {blockedUsers.map(user => (
                        <div key={user._id} className="flex items-center justify-between p-4 rounded-xl bg-neutral-50 dark:bg-black/40 border border-neutral-100 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 transition-colors">
                          <div className="flex items-center gap-4">
                            <Avatar src={user.avatarUrl} name={user.name} size={48} className="" />
                            <div>
                              <h4 className="font-bold text-neutral-900 dark:text-white">{user.name}</h4>
                              <p className="text-xs text-neutral-500">Đã chặn</p>
                            </div>
                          </div>
                          <button
                            onClick={() => unblockUser(user._id)}
                            className="px-4 py-2 text-xs font-bold text-red-600 border border-red-200 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          >
                            Gỡ chặn
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-20 border-2 border-dashed border-neutral-200 dark:border-neutral-800 rounded-2xl">
                      <Shield size={48} className="mx-auto text-neutral-300 mb-4" />
                      <p className="text-neutral-500 font-medium">Danh sách chặn trống</p>
                    </div>
                  )}
                </SpotlightCard>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

      </div>
    </PageLayout>
  );
}
