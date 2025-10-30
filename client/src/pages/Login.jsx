import { useState } from "react";
import { api } from "../api";
import { useNavigate, Link } from "react-router-dom";
import { saveTokens } from "../utils/tokenManager";
import { getCSRFToken, clearCSRFToken } from "../utils/csrfToken";
import Logo from "../components/Logo";
import { LogIn, Mail, Lock } from "lucide-react";

/**
 * Login - Trang đăng nhập với form và modal quên mật khẩu
 * Có responsive design và branding section
 * @param {Function} setUser - Function để set user state sau khi login thành công
 */
export default function Login({ setUser }) {
  // ==================== STATE MANAGEMENT ====================
  
  // Login form states
  const [email, setEmail] = useState(""); // Email input
  const [password, setPassword] = useState(""); // Password input
  const [err, setErr] = useState(""); // Error message
  const [loading, setLoading] = useState(false); // Loading state khi đăng nhập
  
  // Forgot password modal states
  const [showForgot, setShowForgot] = useState(false); // Hiện modal quên mật khẩu
  const [forgotEmail, setForgotEmail] = useState(""); // Email cho forgot password
  const [forgotLoading, setForgotLoading] = useState(false); // Loading forgot password
  const [forgotError, setForgotError] = useState(""); // Error cho forgot password
  const [forgotSuccess, setForgotSuccess] = useState(false); // Success state
  
  const navigate = useNavigate();

  // ==================== EVENT HANDLERS ====================
  
  /**
   * Xử lý submit form đăng nhập
   * @param {Event} e - Form submit event
   */
  async function submit(e) {
    e.preventDefault();
    setErr(""); // Clear error cũ
    setLoading(true);
    
    try {
      // Lấy CSRF token trước khi đăng nhập
      const csrfToken = await getCSRFToken();
      if (!csrfToken) {
        throw new Error('Failed to get CSRF token');
      }
      
      // Gọi API đăng nhập với CSRF token
      const data = await api("/api/auth-token/login-token", { 
        method: "POST", 
        body: { email, password },
        headers: {
          'X-CSRF-Token': csrfToken
        }
      });
      
      console.log("Login response:", data); // Debug log
      
      // Xử lý phản hồi - kiểm tra cả trường accessToken và token
      if (data && data.accessToken) {
        saveTokens(data.accessToken, data.refreshToken);
      } else if (data && data.token) {
        // Fallback cho backward compatibility
        saveTokens(data.token, data.refreshToken || data.token);
      } else {
        throw new Error("Không nhận được token từ server");
      }
      
      // Xác thực dữ liệu người dùng
      if (!data.user) {
        throw new Error("Không nhận được thông tin người dùng từ server");
      }
      
      // Tạo CSRF token mới sau khi login để đồng bộ với sessionID
      await getCSRFToken(true);
      
      // Cập nhật user state toàn cục
      setUser(data.user);
      
      // Redirect đến trang chủ
      navigate("/");
    } catch (e) { 
      // Nếu là lỗi CSRF, clear cache và thử lại
      if (e.message.includes('csrf') || e.message.includes('CSRF')) {
        clearCSRFToken();
      }
      setErr(e.message);
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
            Shiku giúp bạn kết nối và chia sẻ với mọi người trong cộng đồng của bạn.
          </p>
          <div className="hidden lg:block space-y-4">
            <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
              <span>Viết và chia sẻ những câu chuyện của riêng bạn</span>
            </div>
            <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
              <span>Tương tác với mọi người</span>
            </div>
            <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
              <span>Quản lý nội dung dễ dàng</span>
            </div>
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="w-full max-w-md mx-auto px-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 border border-gray-100 dark:border-gray-700">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">Đăng nhập</h2>
              <p className="text-gray-600 dark:text-gray-300">Chào mừng bạn quay trở lại!</p>
            </div>

            <form onSubmit={submit} className="space-y-4">
              {/* Email Input */}
              <div className="relative">
                <Mail size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  placeholder="Nhập email"
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
                  placeholder="Mật khẩu"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent outline-none transition-all duration-200 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400"
                  required
                />
              </div>

              {/* Error Message */}
              {err && (
                <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg text-sm">
                  {err}
                </div>
              )}

              {/* Login Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gray-800 hover:bg-gray-900 disabled:bg-gray-400 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <LogIn size={20} />
                )}
                {loading ? "Đang đăng nhập..." : "Đăng nhập"}
              </button>

              {/* Forgot Password */}
              <div className="text-center">
                <button
                  type="button"
                  className="text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 text-sm font-medium underline"
                  onClick={() => setShowForgot(true)}
                >
                  Quên mật khẩu?
                </button>
              </div>

              {/* Divider */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300 dark:border-gray-700"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-300">hoặc</span>
                </div>
              </div>

              {/* Register Button */}
              <Link
                to="/register"
                className="w-full bg-slate-600 hover:bg-slate-700 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 text-center"
              >
                Tạo tài khoản mới
              </Link>
            </form>
          </div>
        </div>
      </div>

      {/* Modal Quên mật khẩu */}
      {showForgot && (
        <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex items-center justify-center">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 w-full max-w-sm relative">
            <button
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 dark:text-gray-300 dark:hover:text-gray-100"
              onClick={() => setShowForgot(false)}
            >
              &times;
            </button>
            <h2 className="text-lg font-bold mb-2 text-gray-900 dark:text-gray-100">Quên mật khẩu</h2>
            <p className="text-sm text-gray-500 dark:text-gray-300 mb-4">Nhập email để nhận hướng dẫn đặt lại mật khẩu.</p>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setForgotLoading(true);
                setForgotError("");
                try {
                  await api("/api/auth/forgot-password", {
                    method: "POST",
                    body: { email: forgotEmail }
                  });
                  setForgotSuccess(true);
                } catch (err) {
                  setForgotError(err.message || "Lỗi gửi yêu cầu");
                } finally {
                  setForgotLoading(false);
                }
              }}
            >
              <input
                type="email"
                required
                placeholder="Email của bạn"
                value={forgotEmail}
                onChange={e => setForgotEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded mb-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              />
              <button
                type="submit"
                className="w-full bg-red-600 text-white py-2 rounded font-semibold"
                disabled={forgotLoading}
              >
                {forgotLoading ? "Đang gửi..." : "Gửi yêu cầu"}
              </button>
              {forgotError && <div className="text-red-600 dark:text-red-300 text-sm mt-2">{forgotError}</div>}
              {forgotSuccess && <div className="text-green-600 dark:text-green-300 text-sm mt-2">Đã gửi email hướng dẫn đặt lại mật khẩu!</div>}
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
