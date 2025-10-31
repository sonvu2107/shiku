import React, { useState, useEffect } from "react";
import { api } from "../api";
import { Heart, Users, Settings, Play, BarChart3, CheckCircle, Eye } from "lucide-react";

export default function AutoLikeBot() {
  const [isRunning, setIsRunning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [testUsers, setTestUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [botMode, setBotMode] = useState("like"); // "like" hoặc "view"
  const [config, setConfig] = useState({
    maxPostsPerUser: 4,
    likeProbability: 1,
    emoteTypes: ["👍", "❤️", "😂", "😮", "😢", "😡"],
    maxViewsPerUser: 8,
    forceOverride: false, // Option để ghi đè reactions cũ
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
      setError("Vui lòng chọn ít nhất một tài khoản để chạy auto like bot.");
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
          enableAutoView: false, // Chỉ like, không view
          maxViewsPerUser: 0,
          forceOverride: config.forceOverride, // Thêm option force
        },
      });
      setResults(res);
    } catch (err) {
      setError(err.message || "Đã xảy ra lỗi khi chạy Auto Like Bot.");
    } finally {
      setLoading(false);
      setIsRunning(false);
    }
  };

  const runAutoViewBot = async () => {
    if (selectedUsers.length === 0) {
      setError("Vui lòng chọn ít nhất một tài khoản để chạy auto view bot.");
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
        },
      });
      setResults(res);
    } catch (err) {
      setError(err.message || "Đã xảy ra lỗi khi chạy Auto View Bot.");
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
    if (!confirm("Bạn có chắc muốn xóa tất cả reactions của test users? Hành động này không thể hoàn tác.")) {
      return;
    }

    setClearingReactions(true);
    setError("");

    try {
      const res = await api("/api/admin/clear-test-reactions", {
        method: "POST",
        body: {}
      });

      alert(`✅ ${res.message}`);
      setResults(null); // Clear previous results
    } catch (err) {
      setError(err.message || "Đã xảy ra lỗi khi xóa reactions.");
    } finally {
      setClearingReactions(false);
    }
  };

  return (
    <div className="bg-gray-50 min-h-screen py-10 px-4">
      <div className="max-w-6xl mx-auto bg-white rounded-2xl shadow-xl p-8 border border-gray-200">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <div className="p-3 bg-black text-white rounded-xl">
            {botMode === "like" ? <Heart className="w-6 h-6" /> : <Eye className="w-6 h-6" />}
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Auto BOT
            </h2>
            <p className="text-gray-600">
              Tự động tăng likes và views bằng tài khoản test (Admin)
            </p>
          </div>
        </div>

        {/* Bot Mode Tabs */}
        <div className="flex bg-gray-100 rounded-xl p-1 mb-8">
          <button
            onClick={() => setBotMode("like")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-semibold transition-all ${
              botMode === "like"
                ? "bg-white text-black shadow-sm"
                : "text-gray-600 hover:text-gray-800"
            }`}
          >
            <Heart className="w-5 h-5" />
            Auto Like Bot
          </button>
          <button
            onClick={() => setBotMode("view")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-semibold transition-all ${
              botMode === "view"
                ? "bg-white text-black shadow-sm"
                : "text-gray-600 hover:text-gray-800"
            }`}
          >
            <Eye className="w-5 h-5" />
            Auto View Bot
          </button>
        </div>

        {/* Layout */}
        <div className="grid lg:grid-cols-2 gap-10">
          {/* Cấu hình Bot */}
          <div className="space-y-6">
            <div className="flex items-center gap-2 mb-1">
              <Settings className="w-5 h-5 text-gray-800" />
              <h3 className="text-lg font-semibold text-gray-900">Cấu hình Bot</h3>
            </div>

            <div className="bg-gray-100 rounded-xl p-4 space-y-4">
              {botMode === "like" && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700">
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
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-black focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700">
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
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-black focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700">
                      Loại cảm xúc
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {["👍", "❤️", "😂", "😮", "😢", "😡"].map((emote) => (
                        <button
                          key={emote}
                          onClick={() => {
                            const list = config.emoteTypes.includes(emote)
                              ? config.emoteTypes.filter((e) => e !== emote)
                              : [...config.emoteTypes, emote];
                            setConfig((p) => ({ ...p, emoteTypes: list }));
                          }}
                          className={`px-3 py-2 rounded-lg text-lg border transition-all ${
                            config.emoteTypes.includes(emote)
                              ? "bg-black text-white border-black"
                              : "bg-white border-gray-300 hover:bg-gray-100"
                          }`}
                        >
                          {emote}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                      <input
                        type="checkbox"
                        checked={config.forceOverride}
                        onChange={(e) =>
                          setConfig((p) => ({ ...p, forceOverride: e.target.checked }))
                        }
                        className="w-4 h-4 accent-black"
                      />
                      <span>Force Override - Ghi đè reactions cũ</span>
                    </label>
                    <p className="text-xs text-gray-500 mt-1 ml-6">
                      Bật tùy chọn này để thay thế reactions cũ bằng reactions mới
                    </p>
                  </div>
                </>
              )}

              {botMode === "view" && (
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700">
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
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Mỗi tài khoản sẽ view {config.maxViewsPerUser} bài viết để tăng view count
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Danh sách User */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-gray-800" />
                <h3 className="text-lg font-semibold text-gray-900">
                  Danh sách tài khoản test
                </h3>
              </div>
              <div className="flex gap-1.5">
                <button
                  onClick={selectAllUsers}
                  className="text-xs px-3 py-1.5 bg-black text-white rounded-md hover:bg-gray-900 transition"
                >
                  Chọn tất cả
                </button>
                <button
                  onClick={clearUserSelection}
                  className="text-xs px-3 py-1.5 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition"
                >
                  Bỏ chọn
                </button>
                <button
                  onClick={clearAllReactions}
                  disabled={clearingReactions}
                  className="text-xs px-3 py-1.5 bg-red-600 text-white rounded-md hover:bg-red-700 transition disabled:bg-red-400"
                >
                  {clearingReactions ? "Đang xóa..." : "Xóa Reactions"}
                </button>
              </div>
            </div>

            <div className="border border-gray-200 rounded-xl bg-gray-50 overflow-hidden">
              <div className="max-h-64 overflow-y-auto divide-y divide-gray-200">
                {testUsers.length ? (
                  testUsers
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map((u) => (
                      <label
                        key={u._id}
                        className="flex items-center justify-between px-4 py-3 hover:bg-white cursor-pointer transition"
                      >
                        <div>
                          <div className="font-medium text-gray-900">
                            {u.name}
                          </div>
                          <div className="text-sm text-gray-600">{u.email}</div>
                        </div>
                        <input
                          type="checkbox"
                          checked={selectedUsers.includes(u.email)}
                          onChange={() => toggleUserSelection(u.email)}
                          className="w-4 h-4 accent-black"
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

            <div className="text-sm text-gray-700">
              {selectedUsers.length > 0 ? (
                <span>Đã chọn {selectedUsers.length} tài khoản</span>
              ) : (
                <span className="text-orange-600">⚠️ Chưa chọn tài khoản nào</span>
              )}
            </div>
          </div>
        </div>

        {/* Nút chạy bot */}
        <div className="mt-8">
          {botMode === "like" ? (
            <button
              onClick={runAutoLikeBot}
              disabled={loading || isRunning || selectedUsers.length === 0}
              className={`w-full py-2.5 font-medium rounded-lg text-white text-base transition-all flex items-center justify-center gap-2 ${
                loading || isRunning || selectedUsers.length === 0
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-black hover:bg-gray-900 shadow-md"
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
              className={`w-full py-2.5 font-medium rounded-lg text-white text-base transition-all flex items-center justify-center gap-2 ${
                loading || isRunning || selectedUsers.length === 0
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-black hover:bg-gray-900 shadow-md"
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

        {/* Hiển thị lỗi */}
        {error && (
          <div className="mt-6 bg-red-50 border border-red-200 text-red-700 rounded-lg p-4">
            {error}
          </div>
        )}

        {/* Kết quả */}
        {results && (
          <div className="mt-10 bg-gray-100 border border-gray-200 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <h3 className="text-lg font-semibold text-gray-900">
                Kết quả thực thi
              </h3>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
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
                      className="py-2 flex justify-between items-center"
                    >
                      <span className="font-medium text-gray-800">
                        {r.user}
                      </span>
                      {r.error ? (
                        <span className="text-red-600">Lỗi: {r.error}</span>
                      ) : (
                        <span className="text-green-600">
                          {r.likesGiven} likes • {r.viewsGiven || 0} views • {r.postsProcessed} bài viết • {r.availablePosts || 0} posts khả dụng
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
