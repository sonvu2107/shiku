import React, { useState, useEffect } from "react";
import { api } from "../api";
import { Heart, Users, Settings, Play, BarChart3, CheckCircle, Eye } from "lucide-react";

export default function AutoLikeBot() {
  const [isRunning, setIsRunning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [testUsers, setTestUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [botMode, setBotMode] = useState("like");
  const [config, setConfig] = useState({
    maxPostsPerUser: 4,
    likeProbability: 1,
    emoteTypes: ["👍", "❤️", "😂", "😮", "😢", "😡"],
    maxViewsPerUser: 8,
    forceOverride: false, // Option to override old reactions
    loopCount: 1, // Number of loops for view bot
  });
  const [results, setResults] = useState(null);
  const [error, setError] = useState("");
  const [clearingReactions, setClearingReactions] = useState(false);

  useEffect(() => {
    loadTestUsers();
  }, []);

  const loadTestUsers = async () => {
    try {
      const response = await api("/api/admin/users?search=test&limit=20");
      const users = response.users.filter((u) =>
        u.email.match(/^test\d+@example\.com$/)
      );
      setTestUsers(users);
    } catch (err) {
      console.error("Không tải được danh sách tài khoản test:", err);
    }
  };

  const runAutoLikeBot = async () => {
    if (selectedUsers.length === 0) {
      setError("Vui lòng chọn ít nhất một tài khoản để chạy bot.");
      return;
    }

    setLoading(true);
    setIsRunning(true);
    setError("");
    setResults(null);

    try {
      const res = await api("/api/admin/auto-like-posts", {
        method: "POST",
        body: {
          maxPostsPerUser: config.maxPostsPerUser,
          likeProbability: config.likeProbability,
          selectedUsers,
          emoteTypes: config.emoteTypes,
          enableAutoView: false, // Only like, no view
          maxViewsPerUser: 0,
          forceOverride: config.forceOverride,
        },
      });
      setResults(res);
    } catch (err) {
      setError(err.message || "Đã xảy ra lỗi khi chạy Bot.");
    } finally {
      setLoading(false);
      setIsRunning(false);
    }
  };

  const runAutoViewBot = async () => {
    if (selectedUsers.length === 0) {
      setError("Vui lòng chọn ít nhất một tài khoản để chạy bot.");
      return;
    }

    setLoading(true);
    setIsRunning(true);
    setError("");
    setResults(null);

    try {
      const res = await api("/api/admin/auto-view-posts", {
        method: "POST",
        body: {
          maxViewsPerUser: config.maxViewsPerUser,
          selectedUsers,
          loopCount: config.loopCount,
        },
      });
      setResults(res);
    } catch (err) {
      setError(err.message || "Đã xảy ra lỗi khi chạy Bot.");
    } finally {
      setLoading(false);
      setIsRunning(false);
    }
  };

  const toggleUserSelection = (email) => {
    setSelectedUsers((prev) =>
      prev.includes(email)
        ? prev.filter((e) => e !== email)
        : [...prev, email]
    );
  };

  const selectAllUsers = () => setSelectedUsers(testUsers.map((u) => u.email));
  const clearUserSelection = () => setSelectedUsers([]);

  const clearAllReactions = async () => {
    if (!confirm("Bạn có chắc muốn xóa tất cả cảm xúc của các tài khoản test? Hành động này không thể hoàn tác.")) {
      return;
    }

    setClearingReactions(true);
    setError("");

    try {
      const res = await api("/api/admin/clear-test-reactions", {
        method: "POST",
        body: {}
      });

      alert(` ${res.message}`);
      setResults(null); // Clear previous results
    } catch (err) {
      setError(err.message || "Đã xảy ra lỗi khi xóa cảm xúc.");
    } finally {
      setClearingReactions(false);
    }
  };

  return (
    <div className="bg-gray-50 dark:bg-gray-900 min-h-screen py-4 md:py-10 px-2 md:px-4">
      <div className="max-w-6xl mx-auto bg-white dark:bg-gray-800 rounded-xl md:rounded-2xl shadow-xl p-4 md:p-8 border border-gray-200 dark:border-gray-700">
        {/* Header - Mobile Responsive */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 mb-6">
          <div className="p-3 bg-black text-white rounded-xl w-fit">
            {botMode === "like" ? <Heart className="w-5 h-5 md:w-6 md:h-6" /> : <Eye className="w-5 h-5 md:w-6 md:h-6" />}
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
              Auto BOT
            </h2>
            <p className="text-sm md:text-base text-gray-600 dark:text-gray-400">
              Tự động tăng likes và views bằng tài khoản test (Admin)
            </p>
          </div>
        </div>

        {/* Bot Mode Tabs - Mobile Responsive */}
        <div className="flex bg-gray-100 dark:bg-gray-700 rounded-xl p-1 mb-6 md:mb-8">
          <button
            onClick={() => setBotMode("like")}
            className={`flex-1 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 py-2 sm:py-3 px-2 sm:px-4 rounded-lg font-semibold transition-all text-sm sm:text-base ${botMode === "like"
              ? "bg-white dark:bg-gray-600 text-black dark:text-white shadow-sm"
              : "text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100"
              }`}
          >
            <Heart className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="text-xs sm:text-sm">Auto Like Bot</span>
          </button>
          <button
            onClick={() => setBotMode("view")}
            className={`flex-1 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 py-2 sm:py-3 px-2 sm:px-4 rounded-lg font-semibold transition-all text-sm sm:text-base ${botMode === "view"
              ? "bg-white dark:bg-gray-600 text-black dark:text-white shadow-sm"
              : "text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100"
              }`}
          >
            <Eye className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="text-xs sm:text-sm">Auto View Bot</span>
          </button>
        </div>

        {/* Layout - Mobile First */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-10">
          {/* Bot Configuration - Mobile Responsive */}
          <div className="space-y-4 md:space-y-6">
            <div className="flex items-center gap-2 mb-1">
              <Settings className="w-4 h-4 md:w-5 md:h-5 text-gray-800 dark:text-gray-200" />
              <h3 className="text-base md:text-lg font-semibold text-gray-900 dark:text-white">Cấu hình Bot</h3>
            </div>

            <div className="bg-gray-100 dark:bg-gray-700 rounded-xl p-3 md:p-4 space-y-3 md:space-y-4">
              {botMode === "like" && (
                <>
                  <div>
                    <label className="block text-xs md:text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                      Số bài viết tối đa mỗi tài khoản (Like)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={config.maxPostsPerUser}
                      onChange={(e) =>
                        setConfig((p) => ({
                          ...p,
                          maxPostsPerUser: parseInt(e.target.value),
                        }))
                      }
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm md:text-base focus:ring-2 focus:ring-black dark:focus:ring-blue-500 focus:outline-none dark:bg-gray-600 dark:text-white touch-target"
                    />
                  </div>

                  <div>
                    <label className="block text-xs md:text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                      Xác suất like (0–1)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="1"
                      step="0.1"
                      value={config.likeProbability}
                      onChange={(e) =>
                        setConfig((p) => ({
                          ...p,
                          likeProbability: parseFloat(e.target.value),
                        }))
                      }
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm md:text-base focus:ring-2 focus:ring-black dark:focus:ring-blue-500 focus:outline-none dark:bg-gray-600 dark:text-white touch-target"
                    />
                  </div>

                  <div>
                    <label className="block text-xs md:text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                      Loại cảm xúc
                    </label>
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                      {["👍", "❤️", "😂", "😮", "😢", "😡"].map((emote) => (
                        <button
                          key={emote}
                          onClick={() => {
                            const list = config.emoteTypes.includes(emote)
                              ? config.emoteTypes.filter((e) => e !== emote)
                              : [...config.emoteTypes, emote];
                            setConfig((p) => ({ ...p, emoteTypes: list }));
                          }}
                          className={`px-2 py-2 md:px-3 md:py-2 rounded-lg text-lg border transition-all touch-target ${config.emoteTypes.includes(emote)
                            ? "bg-black dark:bg-blue-600 text-white border-black dark:border-blue-600"
                            : "bg-white dark:bg-gray-600 border-gray-300 dark:border-gray-500 hover:bg-gray-100 dark:hover:bg-gray-500"
                            }`}
                        >
                          {emote}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="flex items-center gap-2 text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300">
                      <input
                        type="checkbox"
                        checked={config.forceOverride}
                        onChange={(e) =>
                          setConfig((p) => ({ ...p, forceOverride: e.target.checked }))
                        }
                        className="w-3 h-3 sm:w-3 sm:h-3 accent-black dark:accent-blue-400 rounded focus:ring-0"
                      />
                      <span>Force Override - Ghi đè reactions cũ</span>
                    </label>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 ml-6">
                      Bật tùy chọn này để thay thế reactions cũ bằng reactions mới
                    </p>
                  </div>
                </>
              )}

              {botMode === "view" && (
                <>
                  <div>
                    <label className="block text-xs md:text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                      Số bài viết tối đa mỗi tài khoản (View)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="20"
                      value={config.maxViewsPerUser}
                      onChange={(e) =>
                        setConfig((p) => ({
                          ...p,
                          maxViewsPerUser: parseInt(e.target.value),
                        }))
                      }
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm md:text-base focus:ring-2 focus:ring-black dark:focus:ring-blue-500 focus:outline-none dark:bg-gray-600 dark:text-white touch-target"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Mỗi tài khoản sẽ xem {config.maxViewsPerUser} bài viết để tăng lượt xem.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs md:text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                      Số vòng lặp (1-10)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={config.loopCount}
                      onChange={(e) =>
                        setConfig((p) => ({
                          ...p,
                          loopCount: Math.min(10, Math.max(1, parseInt(e.target.value) || 1)),
                        }))
                      }
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm md:text-base focus:ring-2 focus:ring-black dark:focus:ring-blue-500 focus:outline-none dark:bg-gray-600 dark:text-white touch-target"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Tổng views dự kiến: {config.maxViewsPerUser * config.loopCount} views/tài khoản
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* User list - Mobile Responsive */}
          <div className="space-y-3 md:space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 md:w-5 md:h-5 text-gray-800 dark:text-gray-200" />
                <h3 className="text-base md:text-lg font-semibold text-gray-900 dark:text-white">
                  Danh sách tài khoản test
                </h3>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={selectAllUsers}
                  className="text-xs px-2 md:px-3 py-1.5 bg-black dark:bg-blue-600 text-white rounded-md hover:bg-gray-900 dark:hover:bg-blue-700 transition touch-target"
                >
                  Chọn tất cả
                </button>
                <button
                  onClick={clearUserSelection}
                  className="text-xs px-2 md:px-3 py-1.5 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500 transition touch-target"
                >
                  Bỏ chọn
                </button>
                <button
                  onClick={clearAllReactions}
                  disabled={clearingReactions}
                  className="text-xs px-2 md:px-3 py-1.5 bg-red-600 text-white rounded-md hover:bg-red-700 transition disabled:bg-red-400 touch-target"
                >
                  {clearingReactions ? "Đang xóa..." : "Xóa Reactions"}
                </button>
              </div>
            </div>

            <div className="border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 overflow-hidden">
              <div className="max-h-48 md:max-h-64 overflow-y-auto divide-y divide-gray-200 dark:divide-gray-600">
                {testUsers.length ? (
                  testUsers
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map((u) => (
                      <label
                        key={u._id}
                        className="flex items-center justify-between px-3 md:px-4 py-3 hover:bg-white dark:hover:bg-gray-600 cursor-pointer transition"
                      >
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white text-sm md:text-base">
                            {u.name}
                          </div>
                          <div className="text-xs md:text-sm text-gray-600 dark:text-gray-400">{u.email}</div>
                        </div>
                        <input
                          type="checkbox"
                          checked={selectedUsers.includes(u.email)}
                          onChange={() => toggleUserSelection(u.email)}
                          className="w-3 h-3 sm:w-3 sm:h-3 accent-black dark:accent-blue-400 rounded focus:ring-0"
                        />
                      </label>
                    ))
                ) : (
                  <div className="text-center py-4 text-gray-500 text-sm">
                    Không có tài khoản test
                  </div>
                )}
              </div>
            </div>

            <div className="text-xs md:text-sm text-gray-700 dark:text-gray-300">
              {selectedUsers.length > 0 ? (
                <span>Đã chọn {selectedUsers.length} tài khoản</span>
              ) : (
                <span className="text-orange-600 dark:text-orange-400">⚠️ Chưa chọn tài khoản nào</span>
              )}
            </div>
          </div>
        </div>

        {/* Run Bot Button - Mobile Responsive */}
        <div className="mt-6 md:mt-8">
          {botMode === "like" ? (
            <button
              onClick={runAutoLikeBot}
              disabled={loading || isRunning || selectedUsers.length === 0}
              className={`w-full py-3 md:py-2.5 font-medium rounded-lg text-white text-sm md:text-base transition-all flex items-center justify-center gap-2 touch-target ${loading || isRunning || selectedUsers.length === 0
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-black dark:bg-blue-600 hover:bg-gray-900 dark:hover:bg-blue-700 shadow-md"
                }`}
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Đang hoạt động...
                </>
              ) : (
                <>
                  <Heart className="w-4 h-4" />
                  Khởi chạy Bot
                </>
              )}
            </button>
          ) : (
            <button
              onClick={runAutoViewBot}
              disabled={loading || isRunning || selectedUsers.length === 0}
              className={`w-full py-3 md:py-2.5 font-medium rounded-lg text-white text-sm md:text-base transition-all flex items-center justify-center gap-2 touch-target ${loading || isRunning || selectedUsers.length === 0
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-black dark:bg-blue-600 hover:bg-gray-900 dark:hover:bg-blue-700 shadow-md"
                }`}
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Đang hoạt động...
                </>
              ) : (
                <>
                  <Eye className="w-4 h-4" />
                  Khởi chạy Bot
                </>
              )}
            </button>
          )}
        </div>

        {/* Display Error - Mobile Responsive */}
        {error && (
          <div className="mt-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-lg p-3 md:p-4 text-sm md:text-base">
            {error}
          </div>
        )}

        {/* Results - Mobile Responsive */}
        {results && (
          <div className="mt-6 md:mt-10 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl p-4 md:p-6">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle className="w-4 h-4 md:w-5 md:h-5 text-green-600 dark:text-green-400" />
              <h3 className="text-base md:text-lg font-semibold text-gray-900 dark:text-white">
                Kết quả
              </h3>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4 mb-4 md:mb-6">
              <Stat label="Tổng lượt like" value={results.totalLikes} />
              <Stat label="Tổng view" value={results.totalViews || 0} />
              <Stat label="Tài khoản chạy" value={results.usersProcessed} />
              <Stat label="Bài viết có sẵn" value={results.postsAvailable} />
              <Stat
                label="Thành công"
                value={results.results?.filter((r) => !r.error).length || 0}
              />
            </div>

            <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
              <p className="text-gray-800 font-medium mb-2">
                {results.message}
              </p>

              {results.results && (
                <div className="max-h-40 overflow-y-auto divide-y divide-gray-200 text-sm">
                  {results.results.map((r, i) => (
                    <div
                      key={i}
                      className="py-2 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 sm:gap-0"
                    >
                      <span className="font-medium text-gray-800 dark:text-gray-200 text-sm">
                        {r.user}
                      </span>
                      {r.error ? (
                        <span className="text-red-600 dark:text-red-400 text-xs">Lỗi: {r.error}</span>
                      ) : (
                        <span className="text-green-600 dark:text-green-400 text-xs">
                          {r.likesGiven} likes • {r.viewsGiven || 0} views • {r.postsProcessed} bài xử lý • {r.skippedPosts || 0} bài đã like
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="bg-white border border-gray-200 shadow-sm rounded-xl p-4 text-center">
      <div className="text-3xl font-bold text-gray-900">{value}</div>
      <div className="text-sm text-gray-600 mt-1">{label}</div>
    </div>
  );
}
