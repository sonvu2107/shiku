import React, { useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api";
import { motion } from "framer-motion";
import { ArrowRight, Lock, Mail, Loader2, AlertCircle } from "lucide-react";
import { cn } from "../utils/cn";
import Logo from "../components/Logo";
import { saveTokens } from "../utils/tokenManager";
import { getCSRFToken, clearCSRFToken } from "../utils/csrfToken";
import { useSEO } from "../utils/useSEO";

// --- UI COMPONENTS (Tái sử dụng style để đồng bộ) ---

const GridPattern = () => (
  <div className="absolute inset-0 -z-10 h-full w-full bg-neutral-950 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]">
    {/* Spotlight trung tâm */}
    <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-neutral-400 opacity-10 blur-[100px]"></div>
  </div>
);

const Meteors = ({ number = 20 }) => {
  const meteors = new Array(number || 20).fill(true);
  return (
    <>
      {meteors.map((el, idx) => (
        <span
          key={"meteor" + idx}
          className={cn(
            "animate-meteor absolute top-1/2 left-1/2 h-0.5 w-0.5 rounded-[9999px] bg-white shadow-[0_0_0_1px_#ffffff10] rotate-[215deg]",
            "before:content-[''] before:absolute before:top-1/2 before:transform before:-translate-y-[50%] before:w-[50px] before:h-[1px] before:bg-gradient-to-r before:from-neutral-400 before:to-transparent"
          )}
          style={{
            top: 0,
            left: Math.floor(Math.random() * (400 - -400) + -400) + "px",
            animationDelay: Math.random() * (0.8 - 0.2) + 0.2 + "s",
            animationDuration: Math.floor(Math.random() * (10 - 2) + 2) + "s",
          }}
        ></span>
      ))}
    </>
  );
};

// Input Field Custom
const InputGroup = ({ icon: Icon, ...props }) => (
  <div className="relative group">
    <div className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-neutral-500 group-focus-within:text-white transition-colors duration-300">
      <Icon size={18} className="sm:w-5 sm:h-5" strokeWidth={1.5} />
    </div>
    <input
      {...props}
      className="w-full bg-neutral-900/50 border border-neutral-800 text-white rounded-xl py-3 sm:py-4 pl-10 sm:pl-12 pr-4 text-sm sm:text-base outline-none focus:border-neutral-500 focus:bg-neutral-900 focus:ring-1 focus:ring-neutral-500 transition-all duration-300 placeholder:text-neutral-600"
    />
  </div>
);

export default function Login({ setUser }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // SEO
  useSEO({
    title: "Đăng nhập - Shiku",
    description: "Đăng nhập vào Shiku để khám phá những câu chuyện thú vị",
    robots: "noindex, nofollow"
  });

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;

    setLoading(true);
    setError(null);

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
    } catch (err) {
      // Nếu là lỗi CSRF, clear cache và thử lại
      if (err.message.includes('csrf') || err.message.includes('CSRF')) {
        clearCSRFToken();
      }
      setError(err.message || "Đăng nhập thất bại");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-black text-white relative overflow-hidden font-sans selection:bg-white/20">
      
      {/* Background Effects */}
      <GridPattern />
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
         <Meteors number={20} />
      </div>

      {/* Main Card */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10 p-3 sm:p-4"
      >
        <div className="relative bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl sm:rounded-3xl p-6 sm:p-8 md:p-10 shadow-2xl overflow-hidden">
          
          {/* Header */}
          <div className="text-center mb-6 sm:mb-8 md:mb-10">
            <Link to="/" className="inline-flex items-center mb-4 sm:mb-6 hover:scale-105 transition-transform duration-300">
              <span className="font-bold text-xl sm:text-2xl tracking-tighter text-white">Shiku</span>
            </Link>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2">Chào mừng trở lại</h1>
            <p className="text-neutral-400 text-xs sm:text-sm">Nhập thông tin để tiếp tục hành trình</p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4 sm:space-y-5">
            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 sm:p-4 flex items-center gap-2 sm:gap-3 text-red-400 text-xs sm:text-sm"
              >
                <AlertCircle size={16} className="sm:w-[18px] sm:h-[18px] flex-shrink-0" />
                <span className="break-words">{error}</span>
              </motion.div>
            )}

            <InputGroup 
              icon={Mail}
              type="email" 
              placeholder="Email của bạn" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
            
            <div>
              <InputGroup 
                icon={Lock}
                type="password" 
                placeholder="Mật khẩu" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
              <div className="flex justify-end mt-2">
                <Link to="/reset-password" className="text-xs text-neutral-500 hover:text-white transition-colors">
                  Quên mật khẩu?
                </Link>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="group w-full relative overflow-hidden rounded-xl bg-white text-black font-bold py-3 sm:py-4 text-sm sm:text-base shadow-[0_0_20px_-5px_rgba(255,255,255,0.3)] hover:shadow-[0_0_30px_-5px_rgba(255,255,255,0.5)] transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed min-h-[48px] touch-manipulation"
            >
              <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-black/10 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></div>
              <span className="relative flex items-center justify-center gap-2">
                {loading ? <Loader2 className="animate-spin w-4 h-4 sm:w-[18px] sm:h-[18px]" /> : "Đăng nhập"} 
                {!loading && <ArrowRight className="w-4 h-4 sm:w-[18px] sm:h-[18px] group-hover:translate-x-1 transition-transform" />}
              </span>
            </button>
          </form>

          {/* Footer */}
          <div className="mt-6 sm:mt-8 text-center text-xs sm:text-sm text-neutral-500">
            Chưa có tài khoản?{" "}
            <Link to="/register" className="text-white font-semibold hover:underline underline-offset-4 decoration-neutral-700">
              Đăng ký ngay
            </Link>
          </div>

          {/* Decor Glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-32 bg-gradient-to-b from-neutral-800/20 to-transparent pointer-events-none" />
        </div>
      </motion.div>
    </div>
  );
}
