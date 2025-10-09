import { useState } from "react";
import { api } from "../api";
import { useNavigate, Link } from "react-router-dom";
import { saveTokens } from "../utils/tokenManager";
import { getCSRFToken, clearCSRFToken } from "../utils/csrfToken";
import Logo from "../components/Logo";
import { UserPlus, Mail, Lock, User } from "lucide-react";

/**
 * Register - Trang đăng ký tài khoản mới
 * Có responsive design và branding section tương tự Login
 * @param {Function} setUser - Function để set user state sau khi đăng ký thành công
 */
export default function Register({ setUser }) {
  // ==================== STATE MANAGEMENT ====================
  
  // Form states
  const [name, setName] = useState(""); // Họ và tên
  const [email, setEmail] = useState(""); // Email
  const [password, setPassword] = useState(""); // Mật khẩu
  const [err, setErr] = useState(""); // Error message
  const [loading, setLoading] = useState(false); // Loading state
  const navigate = useNavigate();

  // ==================== EVENT HANDLERS ====================
  
  /**
   * Xử lý submit form đăng ký
   * @param {Event} e - Form submit event
   */
  async function submit(e) {
    e.preventDefault();
    setErr(""); // Clear error cũ
    setLoading(true);
    
    try {
      // Lấy CSRF token trước khi đăng ký
      const csrfToken = await getCSRFToken();
      if (!csrfToken) {
        throw new Error('Failed to get CSRF token');
      }
      
      // Gọi API đăng ký với CSRF token
      const data = await api("/api/auth-token/register-token", { 
        method: "POST", 
        body: { name, email, password },
        headers: {
          'X-CSRF-Token': csrfToken
        }
      });
      
      // Lưu token vào localStorage
      if (data.accessToken && data.refreshToken) {
        saveTokens(data.accessToken, data.refreshToken);
      } else if (data.token) {
        // Fallback cho backward compatibility
        saveTokens(data.token, data.token);
      }
      
      // Tạo CSRF token mới sau khi register để đồng bộ với sessionID
      await getCSRFToken(true);
      
      // Cập nhật user state toàn cục
      if (setUser) setUser(data.user);
      
      // Redirect đến trang chủ
      navigate("/");
    } catch (e) { 
      // Nếu là lỗi CSRF, clear cache và thử lại
      if (e.message.includes('csrf') || e.message.includes('CSRF')) {
        clearCSRFToken();
      }
      setErr(e.message); // Hiển thị error
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-gray-50 to-slate-100 dark:from-gray-900 dark:to-gray-900 flex items-center justify-center">
      <div className="w-full max-w-7xl mx-auto px-4 grid lg:grid-cols-2 gap-8 items-center">
        
        {/* Left Side - Branding */}
        <div className="text-center lg:text-left space-y-6 px-4">
          <div className="flex items-center justify-center lg:justify-start">
            <Logo size="large" showText={true} />
          </div>
          <p className="text-xl text-gray-700 dark:text-gray-300 leading-relaxed">
            Tham gia cộng đồng blogger và bắt đầu hành trình chia sẻ câu chuyện của bạn.
          </p>
          <div className="hidden lg:block space-y-4">
            <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
              <span>Tạo trang cá nhân miễn phí</span>
            </div>
            <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
              <span>Kết nối với mọi người</span>
            </div>
            <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
              <span>Công cụ viết bài hiện đại</span>
            </div>
          </div>
        </div>

        {/* Right Side - Register Form */}
        <div className="w-full max-w-md mx-auto px-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 border border-gray-100 dark:border-gray-700">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">Tạo tài khoản</h2>
              <p className="text-gray-600 dark:text-gray-300">Bắt đầu hành trình viết blog của bạn</p>
            </div>

            <form onSubmit={submit} className="space-y-4">
              {/* Name Input */}
              <div className="relative">
                <User size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Họ và tên"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent outline-none transition-all duration-200 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400"
                  required
                />
              </div>

              {/* Email Input */}
              <div className="relative">
                <Mail size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent outline-none transition-all duration-200 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400"
                  required
                />
              </div>

              {/* Password Input */}
              <div className="relative">
                <Lock size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="password"
                  placeholder="Mật khẩu (tối thiểu 6 ký tự)"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent outline-none transition-all duration-200 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400"
                  required
                  minLength="6"
                />
              </div>

              {/* Error Message */}
              {err && (
                <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg text-sm">
                  {err}
                </div>
              )}

              {/* Register Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gray-800 hover:bg-gray-900 disabled:bg-gray-400 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <UserPlus size={20} />
                )}
                {loading ? "Đang tạo tài khoản..." : "Đăng ký"}
              </button>

              {/* Divider */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300 dark:border-gray-700"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-300">Đã có tài khoản?</span>
                </div>
              </div>

              {/* Login Link */}
              <Link
                to="/login"
                className="w-full bg-slate-600 hover:bg-slate-700 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 text-center"
              >
                Đăng nhập
              </Link>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
