import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api";
import { motion } from "framer-motion";
import { Mail, Loader2, AlertCircle, CheckCircle, ArrowRight } from "lucide-react";
import { cn } from "../utils/cn";
import { useSEO } from "../utils/useSEO";

// --- UI COMPONENTS (Tái sử dụng style để đồng bộ) ---

const GridPattern = () => (
  <div className="absolute inset-0 -z-10 h-full w-full bg-neutral-950 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]">
    <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-neutral-400 opacity-10 blur-[100px]"></div>
  </div>
);

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

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  // SEO
  useSEO({
    title: "Quên mật khẩu - Shiku",
    description: "Đặt lại mật khẩu tài khoản Shiku của bạn",
    robots: "noindex, nofollow"
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    setError(null);

    try {
      await api("/api/auth/forgot-password", {
        method: "POST",
        body: { email: email.toLowerCase().trim() }
      });

      setSuccess(true);
    } catch (err) {
      setError(err.message || "Có lỗi xảy ra. Vui lòng thử lại sau.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-black text-white relative overflow-hidden font-sans selection:bg-white/20">

      {/* Background Effects */}
      <GridPattern />

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
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2">Quên mật khẩu?</h1>
            <p className="text-neutral-400 text-xs sm:text-sm">
              {success
                ? "Chúng tôi đã gửi email hướng dẫn đặt lại mật khẩu"
                : "Nhập email của bạn để nhận link đặt lại mật khẩu"}
            </p>
          </div>

          {success ? (
            /* Success State */
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-6 flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mb-4">
                  <CheckCircle className="w-8 h-8 text-green-400" />
                </div>
                <h2 className="text-lg font-semibold text-white mb-2">Email đã được gửi!</h2>
                <p className="text-sm text-neutral-400 mb-4">
                  Chúng tôi đã gửi hướng dẫn đặt lại mật khẩu đến <strong className="text-white">{email}</strong>
                </p>
                <p className="text-xs text-neutral-500">
                  Vui lòng kiểm tra hộp thư đến và thư mục spam. Link sẽ hết hạn sau 30 phút.
                </p>
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => navigate("/login")}
                  className="group w-full relative overflow-hidden rounded-xl bg-white text-black font-bold py-3 sm:py-4 text-sm sm:text-base shadow-[0_0_20px_-5px_rgba(255,255,255,0.3)] hover:shadow-[0_0_30px_-5px_rgba(255,255,255,0.5)] transition-all duration-300 min-h-[48px] touch-manipulation"
                >
                  <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-black/10 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></div>
                  <span className="relative flex items-center justify-center gap-2">
                    Quay về đăng nhập
                    <ArrowRight className="w-4 h-4 sm:w-[18px] sm:h-[18px] group-hover:translate-x-1 transition-transform" />
                  </span>
                </button>

                <button
                  onClick={() => {
                    setSuccess(false);
                    setEmail("");
                  }}
                  className="w-full text-neutral-400 hover:text-white text-sm transition-colors py-2"
                >
                  Gửi lại email
                </button>
              </div>
            </motion.div>
          ) : (
            /* Form State */
            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
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
                disabled={loading}
              />

              <button
                type="submit"
                disabled={loading || !email.trim()}
                className="group w-full relative overflow-hidden rounded-xl bg-white text-black font-bold py-3 sm:py-4 text-sm sm:text-base shadow-[0_0_20px_-5px_rgba(255,255,255,0.3)] hover:shadow-[0_0_30px_-5px_rgba(255,255,255,0.5)] transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed min-h-[48px] touch-manipulation"
              >
                <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-black/10 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></div>
                <span className="relative flex items-center justify-center gap-2">
                  {loading ? (
                    <>
                      <Loader2 className="animate-spin w-4 h-4 sm:w-[18px] sm:h-[18px]" />
                      Đang gửi...
                    </>
                  ) : (
                    <>
                      Gửi email đặt lại mật khẩu
                      <ArrowRight className="w-4 h-4 sm:w-[18px] sm:h-[18px] group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </span>
              </button>
            </form>
          )}

          {/* Footer */}
          <div className="mt-6 sm:mt-8 text-center text-xs sm:text-sm text-neutral-500">
            Nhớ mật khẩu?{" "}
            <Link to="/login" className="text-white font-semibold hover:underline underline-offset-4 decoration-neutral-700">
              Đăng nhập
            </Link>
          </div>

          {/* Decor Glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-32 bg-gradient-to-b from-neutral-800/20 to-transparent pointer-events-none" />
        </div>
      </motion.div>
    </div>
  );
}

