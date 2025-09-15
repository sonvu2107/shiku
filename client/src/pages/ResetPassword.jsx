import React, { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { api } from "../api";

/**
 * ResetPassword - Trang đặt lại mật khẩu
 * Sử dụng token từ URL để xác thực và đặt lại mật khẩu mới
 * @returns {JSX.Element} Component reset password page
 */
export default function ResetPassword() {
  // ==================== ROUTER & PARAMS ====================
  
  const [params] = useSearchParams(); // URL search params
  const token = params.get("token"); // Reset token từ URL
  const navigate = useNavigate();
  
  // ==================== STATE MANAGEMENT ====================
  
  // Form states
  const [password, setPassword] = useState(""); // Mật khẩu mới
  const [loading, setLoading] = useState(false); // Loading state
  const [error, setError] = useState(""); // Error message
  const [success, setSuccess] = useState(false); // Success state

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await api("/api/auth/reset-password", {
        method: "POST",
        body: { token, password }
      });
      setSuccess(true);
      setTimeout(() => navigate("/login"), 2000);
    } catch (err) {
      setError(err.message || "Lỗi đặt lại mật khẩu");
    } finally {
      setLoading(false);
    }
  }

  if (!token) return <div className="card max-w-md mx-auto mt-20 p-6">Token không hợp lệ!</div>;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="card max-w-md w-full p-6">
        <h1 className="text-xl font-bold mb-4">Đặt lại mật khẩu</h1>
        <form onSubmit={handleSubmit}>
          <input
            type="password"
            required
            placeholder="Mật khẩu mới"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full px-3 py-2 border rounded mb-3"
          />
          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 rounded font-semibold"
            disabled={loading}
          >
            {loading ? "Đang xử lý..." : "Đặt lại mật khẩu"}
          </button>
          {error && <div className="text-red-600 text-sm mt-2">{error}</div>}
          {success && <div className="text-green-600 text-sm mt-2">Đã đặt lại mật khẩu thành công! Đang chuyển về trang đăng nhập...</div>}
        </form>
      </div>
    </div>
  );
}
