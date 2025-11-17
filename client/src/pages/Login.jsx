import { useState } from "react";
import { api } from "../api";
import { useNavigate, Link } from "react-router-dom";
import { saveTokens } from "../utils/tokenManager";
import { getCSRFToken, clearCSRFToken } from "../utils/csrfToken";
import { useSEO } from "../utils/useSEO";
import Logo from "../components/Logo";
import { LogIn, Mail, Lock, Eye, EyeOff } from "lucide-react";

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
  const [showPassword, setShowPassword] = useState(false); // Toggle password visibility
  const [err, setErr] = useState(""); // Error message
  const [loading, setLoading] = useState(false); // Loading state khi đăng nhập
  
  // Forgot password modal states
  const [showForgot, setShowForgot] = useState(false); // Hiện modal quên mật khẩu
  const [forgotEmail, setForgotEmail] = useState(""); // Email cho forgot password
  const [forgotLoading, setForgotLoading] = useState(false); // Loading forgot password
  const [forgotError, setForgotError] = useState(""); // Error cho forgot password
  const [forgotSuccess, setForgotSuccess] = useState(false); // Success state
  
  const navigate = useNavigate();

  // ==================== SEO ====================
  // Trang login không cần SEO → thêm noindex
  useSEO({
    title: "Đăng nhập - Shiku",
    description: "Đăng nhập vào Shiku để khám phá những câu chuyện thú vị",
    robots: "noindex, nofollow"
  });

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
    <div 
      className="min-h-screen flex items-center justify-center p-2 sm:p-4 relative login-background"
      style={{
        backgroundImage: 'url(/assets/Home.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      {/* Overlay nhẹ cho background */}
      <div className="absolute inset-0 bg-black/20"></div>
      
      <div 
        className="w-full max-w-5xl bg-white dark:bg-neutral-800 rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl grid grid-cols-1 md:grid-cols-2 relative z-10 my-4 sm:my-0"
        style={{
          filter: 'drop-shadow(0 4px 20px rgba(0,0,0,0.15))'
        }}
      >
        {/* Cột trái: Giới thiệu với gradient - Ẩn trên mobile nhỏ, hiện từ md trở lên */}
        <div 
          className="hidden md:flex relative flex-col justify-between p-8 lg:p-10 text-white min-h-[500px]"
          style={{
            backgroundImage: 'url(/assets/gradient.jpg)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat'
          }}
        >
          {/* Overlay để đảm bảo text dễ đọc */}
          <div className="absolute inset-0 bg-gradient-to-br from-neutral-800/70 via-neutral-900/70 to-black/70"></div>
          
          {/* Logo/Top */}
          <div className="relative z-10">
            <div className="mb-6 lg:mb-8 [&_span]:text-white [&_svg]:text-white [&_img]:!invert-0 [&_img]:!dark:invert">
              <Logo size="large" showText={true} />
            </div>
          </div>

          {/* Content giới thiệu */}
          <div className="relative z-10 space-y-4 lg:space-y-6">
            <div>
              <p className="text-sm opacity-80 mb-2 lg:mb-3">Bạn có thể dễ dàng</p>
              <h2 className="text-xl lg:text-2xl xl:text-3xl font-bold leading-snug">
                Truy cập vào Shiku <br className="hidden lg:block" />
                để khám phá những câu chuyện thú vị.
              </h2>
            </div>
            <div className="space-y-2 lg:space-y-3 opacity-90">
              <div className="flex items-center gap-2 lg:gap-3">
                <div className="w-1.5 h-1.5 bg-white rounded-full flex-shrink-0"></div>
                <span className="text-xs lg:text-sm">Viết và chia sẻ những câu chuyện của riêng bạn</span>
              </div>
              <div className="flex items-center gap-2 lg:gap-3">
                <div className="w-1.5 h-1.5 bg-white rounded-full flex-shrink-0"></div>
                <span className="text-xs lg:text-sm">Tương tác với mọi người trong cộng đồng</span>
              </div>
              <div className="flex items-center gap-2 lg:gap-3">
                <div className="w-1.5 h-1.5 bg-white rounded-full flex-shrink-0"></div>
                <span className="text-xs lg:text-sm">Quản lý nội dung dễ dàng và hiệu quả</span>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Logo - Hiện trên mobile */}
        <div className="md:hidden pt-6 px-6 pb-4 bg-white dark:bg-neutral-800 border-b border-gray-200 dark:border-neutral-700">
          <div className="flex justify-center [&_span]:text-black [&_svg]:text-black [&_img]:!invert-0 dark:[&_span]:text-white dark:[&_svg]:text-white dark:[&_img]:!dark:invert">
            <Logo size="medium" showText={true} />
          </div>
        </div>

        {/* Cột phải: Form đăng nhập */}
        <div className="p-4 sm:p-6 md:p-8 lg:p-10 flex flex-col justify-center bg-white dark:bg-neutral-800">
          {/* Header */}
          <div className="mb-6 md:mb-8">
            <div className="flex items-center gap-2 mb-2">
              <h1 className="text-xl sm:text-2xl font-semibold text-black dark:text-white">Đăng nhập</h1>
            </div>
            <p className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm">
              Chào mừng bạn trở lại! Tiếp tục cuộc hành trình trên Shiku nào.
            </p>
          </div>

          <form onSubmit={submit} className="space-y-4 sm:space-y-5">
            {/* Email Input */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-800 dark:text-gray-200 mb-2">
                Email của bạn
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="username@gmail.com"
                className="w-full border border-gray-300 dark:border-neutral-600 rounded-xl px-4 py-3 sm:py-3.5 text-base focus:ring-2 focus:ring-black dark:focus:ring-white focus:outline-none transition-all duration-300 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-neutral-500 bg-white dark:bg-neutral-700 touch-manipulation"
                required
                autoComplete="email"
              />
            </div>

            {/* Password Input */}
            <div>
              <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                <label htmlFor="password" className="block text-sm font-medium text-gray-800 dark:text-gray-200">
                  Mật khẩu
                </label>
                <button
                  type="button"
                  onClick={() => setShowForgot(true)}
                  className="text-xs sm:text-sm text-black dark:text-white hover:underline font-medium transition-colors touch-manipulation min-h-[44px] px-2 -mr-2"
                  aria-label="Quên mật khẩu"
                >
                  Quên mật khẩu?
                </button>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  className="w-full border border-gray-300 dark:border-neutral-600 rounded-xl px-4 py-3 sm:py-3.5 pr-12 text-base focus:ring-2 focus:ring-black dark:focus:ring-white focus:outline-none transition-all duration-300 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-neutral-500 bg-white dark:bg-neutral-700 touch-manipulation"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors touch-manipulation p-2 -mr-2 min-w-[44px] min-h-[44px] flex items-center justify-center"
                  aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {err && (
              <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg text-sm break-words">
                {err}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-black dark:bg-white text-white dark:text-black py-3.5 sm:py-4 rounded-xl font-semibold text-base hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-all duration-300 shadow-md hover:shadow-lg disabled:bg-gray-400 dark:disabled:bg-neutral-600 disabled:cursor-not-allowed touch-manipulation min-h-[48px] active:scale-[0.98]"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                  Đang đăng nhập...
                </span>
              ) : (
                'Đăng nhập'
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center my-5 sm:my-6">
            <div className="flex-1 h-px bg-gray-300 dark:bg-neutral-600"></div>
            <span className="px-3 text-xs sm:text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">hoặc tiếp tục với</span>
            <div className="flex-1 h-px bg-gray-300 dark:bg-neutral-600"></div>
          </div>

          {/* Footer - Register Link */}
          <p className="text-center text-xs sm:text-sm text-gray-600 dark:text-gray-400">
            Chưa có tài khoản?{" "}
            <Link 
              to="/register" 
              className="text-black dark:text-white font-semibold hover:underline transition-colors touch-manipulation inline-block min-h-[44px] leading-[44px]"
            >
              Đăng ký
            </Link>
          </p>
        </div>
      </div>

      {/* Modal Quên mật khẩu */}
      {showForgot && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-6"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowForgot(false);
            }
          }}
        >
          <div 
            className="bg-white dark:bg-neutral-800 rounded-2xl shadow-2xl p-5 sm:p-6 w-full max-w-sm relative border border-gray-200 dark:border-neutral-700 max-h-[90vh] overflow-y-auto"
            style={{
              boxShadow: '0 8px 32px 0 rgba(0,0,0,0.3)'
            }}
          >
            <button
              className="absolute top-3 right-3 sm:top-4 sm:right-4 text-gray-400 hover:text-gray-600 dark:text-gray-300 dark:hover:text-white transition-colors duration-200 text-2xl font-bold w-10 h-10 sm:w-8 sm:h-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-neutral-700 touch-manipulation z-10"
              onClick={() => setShowForgot(false)}
              aria-label="Đóng"
            >
              &times;
            </button>
            <h2 className="text-lg sm:text-xl font-bold mb-2 pr-8 text-black dark:text-white">Quên mật khẩu</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-5 sm:mb-6">Nhập email để nhận hướng dẫn đặt lại mật khẩu.</p>
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
              <div className="space-y-4">
                <input
                  type="email"
                  required
                  placeholder="Email của bạn"
                  value={forgotEmail}
                  onChange={e => setForgotEmail(e.target.value)}
                  className="w-full px-4 py-3 text-base border border-gray-300 dark:border-neutral-600 rounded-xl bg-white dark:bg-neutral-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-neutral-500 focus:ring-2 focus:ring-black dark:focus:ring-white focus:outline-none transition-all duration-300 touch-manipulation"
                  autoComplete="email"
                />
                <button
                  type="submit"
                  className="w-full bg-black dark:bg-white text-white dark:text-black py-3.5 sm:py-3 rounded-xl font-semibold text-base hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-md touch-manipulation min-h-[48px] active:scale-[0.98]"
                  disabled={forgotLoading}
                >
                  {forgotLoading ? "Đang gửi..." : "Gửi yêu cầu"}
                </button>
                {forgotError && (
                  <div className="text-red-600 dark:text-red-400 text-sm break-words">{forgotError}</div>
                )}
                {forgotSuccess && (
                  <div className="text-green-600 dark:text-green-400 text-sm break-words">Đã gửi email hướng dẫn đặt lại mật khẩu!</div>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
