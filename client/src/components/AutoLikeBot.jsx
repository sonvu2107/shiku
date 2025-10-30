import React, { useState, useEffect } from "react";
import { api } from "../api";
import { Heart, Users, Settings, Play, BarChart3 } from "lucide-react";

/**
 * Trình quản lý Auto Like Bot (dành cho Admin)
 * Cho phép tự động thả cảm xúc bài viết bằng test users
 */
export default function AutoLikeBot() {
  const [isRunning, setIsRunning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [testUsers, setTestUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [config, setConfig] = useState({
    maxPostsPerUser: 4,
    likeProbability: 1,
    emoteTypes: ["👍", "❤️", "😂", "😮", "😢", "😡"],
  });
  const [results, setResults] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    loadTestUsers();
  }, []);

  const loadTestUsers = async () => {
    try {
      const response = await api("/api/admin/users?search=test&limit=20");
      const users = response.users.filter((user) =>
        user.email.match(/^test\d+@example\.com$/)
      );
      setTestUsers(users);
    } catch (err) {
      console.error("Không tải được danh sách test user:", err);
    }
  };

  const runAutoLikeBot = async () => {
    if (selectedUsers.length === 0) {
      setError("Vui lòng chọn ít nhất một tài khoản test.");
      return;
    }

    if (config.emoteTypes.length === 0) {
      setError("Vui lòng chọn ít nhất một loại cảm xúc.");
      return;
    }

    setLoading(true);
    setIsRunning(true);
    setError("");
    setResults(null);

    try {
      const response = await api("/api/admin/auto-like-posts", {
        method: "POST",
        body: {
          maxPostsPerUser: config.maxPostsPerUser,
          likeProbability: config.likeProbability,
          selectedUsers,
          emoteTypes: config.emoteTypes,
        },
      });
      setResults(response);
    } catch (err) {
      setError(err.message || "Đã xảy ra lỗi khi chạy Auto Like Bot.");
    } finally {
      setLoading(false);
      setIsRunning(false);
    }
  };

  const toggleUserSelection = (userEmail) => {
    setSelectedUsers((prev) =>
      prev.includes(userEmail)
        ? prev.filter((email) => email !== userEmail)
        : [...prev, userEmail]
    );
  };

  const selectAllUsers = () => setSelectedUsers(testUsers.map((u) => u.email));
  const clearUserSelection = () => setSelectedUsers([]);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-gray-900 rounded-lg">
          <Heart className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            Trình Auto Like Bot
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Tự động thả cảm xúc cho bài viết bằng tài khoản test
          </p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-6">
        {/* Cấu hình bot */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-3">
            <Settings className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">
              Cấu hình Bot
            </h3>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Số bài viết tối đa mỗi user
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 bg-white text-gray-900"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Xác suất like (0-1)
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 bg-white text-gray-900"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Loại cảm xúc (Emote)
            </label>
            <div className="flex flex-wrap gap-2">
              {["👍", "❤️", "😂", "😮", "😢", "😡"].map((emote) => (
                <button
                  key={emote}
                  onClick={() => {
                    const emotes = config.emoteTypes.includes(emote)
                      ? config.emoteTypes.filter((e) => e !== emote)
                      : [...config.emoteTypes, emote];
                    setConfig((p) => ({ ...p, emoteTypes: emotes }));
                  }}
                  className={`px-3 py-2 rounded-lg text-lg border transition-all ${
                    config.emoteTypes.includes(emote)
                      ? "bg-gray-900 text-white border-gray-900"
                      : "bg-gray-100 text-gray-700 border-gray-300"
                  }`}
                >
                  {emote}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Danh sách user */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                Danh sách tài khoản test
              </h3>
            </div>
            <div className="flex gap-2">
              <button
                onClick={selectAllUsers}
                className="text-sm px-3 py-1 bg-gray-900 text-white rounded-lg hover:bg-black transition"
              >
                Chọn tất cả
              </button>
              <button
                onClick={clearUserSelection}
                className="text-sm px-3 py-1 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition"
              >
                Bỏ chọn
              </button>
            </div>
          </div>

          <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg p-3 bg-gray-50">
            {testUsers.length > 0 ? (
              <div className="space-y-1">
                {testUsers
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((user) => (
                    <label
                      key={user._id}
                      className="flex items-center justify-start gap-4 p-2 hover:bg-gray-100 rounded-lg cursor-pointer transition"
                    >
                      <div className="w-6 flex justify-center">
                        <input
                          type="checkbox"
                          checked={selectedUsers.includes(user.email)}
                          onChange={() => toggleUserSelection(user.email)}
                          className="text-gray-900 border-gray-400 rounded focus:ring-gray-900"
                        />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-medium text-gray-900 leading-tight">
                          {user.name}
                        </span>
                        <span className="text-sm text-gray-600">{user.email}</span>
                      </div>
                    </label>
                  ))}
              </div>
            ) : (
              <div className="text-center text-gray-500 py-4">
                Không tìm thấy tài khoản test
              </div>
            )}
          </div>

          <div className="text-sm text-gray-600">
            {selectedUsers.length > 0 ? (
              `Đã chọn ${selectedUsers.length} user`
            ) : (
              <span className="text-orange-600 font-medium">
                ⚠️ Chưa chọn user nào
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Nút chạy bot */}
      <div className="mb-6">
        <button
          onClick={runAutoLikeBot}
          disabled={loading || isRunning || selectedUsers.length === 0}
          className={`w-full flex items-center justify-center gap-3 px-6 py-3 rounded-lg font-semibold transition-all ${
            loading || isRunning || selectedUsers.length === 0
              ? "bg-gray-400 text-white cursor-not-allowed"
              : "bg-gray-900 text-white hover:bg-black"
          }`}
        >
          {loading ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Đang chạy Bot...
            </>
          ) : (
            <>
              <Play className="w-5 h-5" />
              Chạy Auto Like Bot
            </>
          )}
        </button>
      </div>

      {/* Lỗi */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="text-red-700 font-medium">Lỗi:</div>
          <div className="text-red-600">{error}</div>
        </div>
      )}

      {/* Kết quả */}
      {results && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 className="w-5 h-5 text-green-600" />
            <h3 className="font-semibold text-green-800">Kết quả</h3>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <Stat label="Tổng lượt like" value={results.totalLikes} color="green" />
            <Stat
              label="Số user tham gia"
              value={results.usersProcessed}
              color="blue"
            />
            <Stat
              label="Bài viết có sẵn"
              value={results.postsAvailable}
              color="purple"
            />
            <Stat
              label="Thành công"
              value={results.results?.filter((r) => !r.error).length || 0}
              color="orange"
            />
          </div>

          <div className="text-green-700 font-medium mb-2">
            {results.message}
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, color }) {
  const colors = {
    green: "text-green-600",
    blue: "text-blue-600",
    purple: "text-purple-600",
    orange: "text-orange-600",
  };
  return (
    <div className="text-center">
      <div className={`text-2xl font-bold ${colors[color]}`}>{value}</div>
      <div className="text-sm text-gray-600">{label}</div>
    </div>
  );
}
