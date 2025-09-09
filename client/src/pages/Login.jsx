
import { useState } from "react";
import { api } from "../api";
import { useNavigate, Link } from "react-router-dom";
import { setAuthToken } from "../utils/auth";
import Logo from "../components/Logo";
import { LogIn, Mail, Lock } from "lucide-react";

export default function Login({ setUser }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function submit(e) {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      const data = await api("/api/auth/login-token", { method: "POST", body: { email, password } });
      // Lưu token cho fallback với IP
      if (data.token) setAuthToken(data.token);
      setUser(data.user); // cập nhật user toàn cục
      navigate("/");
    } catch (e) { 
      setErr(e.message); 
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-gray-50 to-slate-100 flex items-center justify-center">
      <div className="w-full max-w-7xl mx-auto px-4 grid lg:grid-cols-2 gap-8 items-center">
        
        {/* Left Side - Branding */}
        <div className="text-center lg:text-left space-y-6 px-4">
          <div className="flex items-center justify-center lg:justify-start">
            <Logo size="large" showText={true} />
          </div>
          <p className="text-xl text-gray-700 leading-relaxed">
            Shiku giúp bạn kết nối và chia sẻ với mọi người trong cộng đồng blog của bạn.
          </p>
          <div className="hidden lg:block space-y-4">
            <div className="flex items-center gap-3 text-gray-600">
              <span>Viết và chia sẻ những câu chuyện của riêng bạn</span>
            </div>
            <div className="flex items-center gap-3 text-gray-600">
              <span>Tương tác với mọi người</span>
            </div>
            <div className="flex items-center gap-3 text-gray-600">
              <span>Quản lý nội dung dễ dàng</span>
            </div>
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="w-full max-w-md mx-auto px-4">
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Đăng nhập</h2>
              <p className="text-gray-600">Chào mừng bạn quay trở lại!</p>
            </div>

            <form onSubmit={submit} className="space-y-4">
              {/* Email Input */}
              <div className="relative">
                <Mail size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  placeholder="Email hoặc số điện thoại"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent outline-none transition-all duration-200"
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
                  className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent outline-none transition-all duration-200"
                  required
                />
              </div>

              {/* Error Message */}
              {err && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
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
                <a href="#" className="text-gray-600 hover:text-gray-800 text-sm font-medium">
                  Quên mật khẩu?
                </a>
              </div>

              {/* Divider */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white text-gray-500">hoặc</span>
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
    </div>
  );
}
