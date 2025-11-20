import React, { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api";
import { motion } from "framer-motion";
import { ArrowRight, Lock, Mail, User, Loader2, AlertCircle, Calendar, Eye, EyeOff, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "../utils/cn";
import Logo from "../components/Logo";
import { saveTokens } from "../utils/tokenManager";
import { getCSRFToken, clearCSRFToken } from "../utils/csrfToken";
import { useSEO } from "../utils/useSEO";

// --- TÁI SỬ DỤNG UI COMPONENTS ---
const GridPattern = () => (
  <div className="absolute inset-0 -z-10 h-full w-full bg-neutral-950 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]">
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

const InputGroup = ({ icon: Icon, type = "text", showPasswordToggle = false, passwordVisible = false, onTogglePassword, ...props }) => (
  <div className="relative group">
    <div className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-neutral-500 group-focus-within:text-white transition-colors duration-300">
      <Icon size={18} className="sm:w-5 sm:h-5" strokeWidth={1.5} />
    </div>
    <input
      type={showPasswordToggle ? (passwordVisible ? "text" : "password") : type}
      {...props}
      className="w-full bg-neutral-900/50 border border-neutral-800 text-white rounded-xl py-3 sm:py-4 pl-10 sm:pl-12 pr-4 text-sm sm:text-base outline-none focus:border-neutral-500 focus:bg-neutral-900 focus:ring-1 focus:ring-neutral-500 transition-all duration-300 placeholder:text-neutral-600"
    />
    {showPasswordToggle && (
      <button
        type="button"
        onClick={onTogglePassword}
        className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white transition-colors p-1"
      >
        {passwordVisible ? <EyeOff size={18} className="sm:w-5 sm:h-5" /> : <Eye size={18} className="sm:w-5 sm:h-5" />}
      </button>
    )}
  </div>
);

export default function Register({ setUser }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [name, setName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Refs để đo chiều cao
  const step1Ref = useRef(null);
  const step2Ref = useRef(null);
  const [containerHeight, setContainerHeight] = useState('auto');

  useSEO({
    title: "Đăng ký - Shiku",
    description: "Tạo tài khoản mới trên Shiku",
    robots: "noindex, nofollow"
  });

  // Đo và đồng bộ chiều cao
  useEffect(() => {
    const updateHeight = () => {
      if (step1Ref.current && step2Ref.current) {
        const step1Height = step1Ref.current.scrollHeight;
        const step2Height = step2Ref.current.scrollHeight;
        const maxHeight = Math.max(step1Height, step2Height);
        if (maxHeight > 0) {
          setContainerHeight(`${maxHeight}px`);
        }
      }
    };
    const timeoutId = setTimeout(updateHeight, 10);
    const handleResize = () => setTimeout(updateHeight, 10);
    window.addEventListener('resize', handleResize);
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', handleResize);
    };
  }, [currentStep, name, dateOfBirth, email, password, error]);

  // Tính độ mạnh mật khẩu
  const calculatePasswordStrength = (password) => {
    if (!password) return 0;
    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[@$!%*?&]/.test(password)) score++;
    if (password.length >= 16) score++;
    return Math.min(score, 5);
  };

  const getPasswordStrengthInfo = (strength) => {
    const info = {
      0: { text: "Rất yếu", color: "text-red-400", bgColor: "bg-red-500", percentage: 20 },
      1: { text: "Rất yếu", color: "text-red-400", bgColor: "bg-red-500", percentage: 20 },
      2: { text: "Yếu", color: "text-orange-400", bgColor: "bg-orange-500", percentage: 40 },
      3: { text: "Trung bình", color: "text-yellow-400", bgColor: "bg-yellow-500", percentage: 60 },
      4: { text: "Mạnh", color: "text-green-400", bgColor: "bg-green-500", percentage: 80 },
      5: { text: "Rất mạnh", color: "text-green-300", bgColor: "bg-green-600", percentage: 100 }
    };
    return info[strength] || info[0];
  };

  const validateStep1 = () => {
    if (!name.trim()) {
      setError("Vui lòng nhập họ và tên");
      return false;
    }
    if (!dateOfBirth) {
      setError("Vui lòng chọn ngày tháng năm sinh");
      return false;
    }
    const birthDate = new Date(dateOfBirth);
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    const actualAge = monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate()) ? age - 1 : age;
    if (actualAge < 13) {
      setError("Bạn phải ít nhất 13 tuổi để đăng ký");
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (!email.trim()) {
      setError("Vui lòng nhập email");
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Email không hợp lệ");
      return false;
    }
    if (!password) {
      setError("Vui lòng nhập mật khẩu");
      return false;
    }
    if (passwordStrength < 3) {
      setError("Mật khẩu chưa đủ mạnh. Vui lòng chọn mật khẩu có độ bảo mật từ 'Trung bình' trở lên.");
      return false;
    }
    return true;
  };

  const handleNext = () => {
    setError("");
    if (currentStep === 1 && validateStep1()) {
      setCurrentStep(2);
    }
  };

  const handleBack = () => {
    setError("");
    setCurrentStep(1);
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");
    if (!validateStep2()) return;

    setLoading(true);
    try {
      const csrfToken = await getCSRFToken();
      if (!csrfToken) {
        throw new Error('Failed to get CSRF token');
      }

      const requestBody = { name, email, password };
      if (dateOfBirth && dateOfBirth.trim()) {
        requestBody.dateOfBirth = dateOfBirth.trim();
      }

      const data = await api("/api/auth-token/register-token", { 
        method: "POST", 
        body: requestBody,
        headers: { 'X-CSRF-Token': csrfToken }
      });

      if (data && data.accessToken) {
        saveTokens(data.accessToken, data.refreshToken);
      } else if (data && data.token) {
        saveTokens(data.token, data.refreshToken || data.token);
      } else {
        throw new Error("Không nhận được token từ server");
      }

      if (!data.user) {
        throw new Error("Không nhận được thông tin user từ server");
      }

      await getCSRFToken(true);
      if (setUser) setUser(data.user);
      navigate("/");
    } catch (err) {
      if (err.message.includes('csrf') || err.message.includes('CSRF')) {
        clearCSRFToken();
      }
      setError(err.message || "Đăng ký thất bại");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-black text-white relative overflow-hidden font-sans selection:bg-white/20">
      
      <GridPattern />
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
         <Meteors number={20} />
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10 p-3 sm:p-4"
      >
        <div className="relative bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl sm:rounded-3xl p-6 sm:p-8 md:p-10 shadow-2xl overflow-hidden">
          
          <div className="text-center mb-6 sm:mb-8">
            <Link to="/" className="inline-flex items-center mb-4 sm:mb-6 hover:scale-105 transition-transform duration-300">
              <span className="font-bold text-xl sm:text-2xl tracking-tighter text-white">Shiku</span>
            </Link>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight mb-2">Tạo tài khoản mới</h1>
            <p className="text-neutral-400 text-xs sm:text-sm">Tham gia cộng đồng Shiku ngay hôm nay</p>
            <p className="text-xs text-neutral-500 mt-2">Bước {currentStep} / 2</p>
          </div>

          {/* Flip Card Container */}
          <div className="relative" style={{ perspective: '1000px', height: containerHeight, minHeight: '350px' }}>
            <div 
              className="relative w-full transition-all duration-500 ease-in-out"
              style={{
                transformStyle: 'preserve-3d',
                transform: currentStep === 2 ? 'rotateY(180deg)' : 'rotateY(0deg)',
                height: containerHeight
              }}
            >
              {/* Step 1: Name & Date of Birth */}
              <div 
                ref={step1Ref}
                className="absolute inset-0 w-full"
                style={{
                  backfaceVisibility: 'hidden',
                  WebkitBackfaceVisibility: 'hidden',
                  transform: 'rotateY(0deg)',
                  pointerEvents: currentStep === 1 ? 'auto' : 'none'
                }}
              >
                <form onSubmit={(e) => { e.preventDefault(); handleNext(); }} className="space-y-4">
                  <InputGroup 
                    icon={User}
                    type="text" 
                    placeholder="Tên hiển thị" 
                    value={name} 
                    onChange={(e) => { setName(e.target.value); setError(""); }}
                    required
                  />

                  <div className="relative group">
                    <div className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-neutral-500 group-focus-within:text-white transition-colors duration-300">
                      <Calendar size={18} className="sm:w-5 sm:h-5" strokeWidth={1.5} />
                    </div>
                    <input
                      type="date"
                      value={dateOfBirth}
                      onChange={(e) => { setDateOfBirth(e.target.value); setError(""); }}
                      max={new Date(new Date().setFullYear(new Date().getFullYear() - 13)).toISOString().split('T')[0]}
                      className="w-full bg-neutral-900/50 border border-neutral-800 text-white rounded-xl py-3 sm:py-4 pl-10 sm:pl-12 pr-4 text-sm sm:text-base outline-none focus:border-neutral-500 focus:bg-neutral-900 focus:ring-1 focus:ring-neutral-500 transition-all duration-300 placeholder:text-neutral-600"
                      required
                    />
                  </div>
                  <p className="text-xs text-neutral-500">Bạn phải ít nhất 13 tuổi để đăng ký</p>

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

                  <button
                    type="submit"
                    className="group w-full relative overflow-hidden rounded-xl bg-white text-black font-bold py-3 sm:py-4 text-sm sm:text-base shadow-[0_0_20px_-5px_rgba(255,255,255,0.3)] hover:shadow-[0_0_30px_-5px_rgba(255,255,255,0.5)] transition-all duration-300 flex items-center justify-center gap-2 min-h-[48px] touch-manipulation"
                  >
                    <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-black/10 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></div>
                    <span className="relative">Tiếp theo</span>
                    <ChevronRight size={18} className="relative w-4 h-4 sm:w-[18px] sm:h-[18px]" />
                  </button>
                </form>
              </div>

              {/* Step 2: Email & Password */}
              <div 
                ref={step2Ref}
                className="absolute inset-0 w-full"
                style={{
                  backfaceVisibility: 'hidden',
                  WebkitBackfaceVisibility: 'hidden',
                  transform: 'rotateY(180deg)',
                  pointerEvents: currentStep === 2 ? 'auto' : 'none'
                }}
              >
                <form onSubmit={handleRegister} className="space-y-4">
                  <InputGroup 
                    icon={Mail}
                    type="email" 
                    placeholder="Email" 
                    value={email} 
                    onChange={(e) => { setEmail(e.target.value); setError(""); }}
                    autoComplete="email"
                    required
                  />
                  
                  <div>
                    <InputGroup 
                      icon={Lock}
                      showPasswordToggle={true}
                      passwordVisible={showPassword}
                      onTogglePassword={() => setShowPassword(!showPassword)}
                      placeholder="Mật khẩu" 
                      value={password} 
                      onChange={(e) => {
                        const newValue = e.target.value;
                        setPassword(newValue);
                        setPasswordStrength(calculatePasswordStrength(newValue));
                        setError("");
                      }}
                      autoComplete="new-password"
                      required
                      minLength="8"
                    />
                    
                    {password && (
                      <div className="mt-3 space-y-2">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-neutral-500">Độ bảo mật:</span>
                          <span className={cn("font-medium", getPasswordStrengthInfo(passwordStrength).color)}>
                            {getPasswordStrengthInfo(passwordStrength).text}
                          </span>
                        </div>
                        <div className="w-full bg-neutral-800 rounded-full h-2">
                          <div 
                            className={cn("h-2 rounded-full transition-all duration-300", getPasswordStrengthInfo(passwordStrength).bgColor)}
                            style={{ width: `${getPasswordStrengthInfo(passwordStrength).percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    )}
                  </div>

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

                  <div className="flex gap-2 sm:gap-3">
                    <button
                      type="button"
                      onClick={handleBack}
                      className="flex-1 bg-neutral-800 text-white font-bold py-3 sm:py-4 rounded-xl hover:bg-neutral-700 transition-all duration-300 flex items-center justify-center gap-2 text-sm sm:text-base min-h-[48px] touch-manipulation"
                    >
                      <ChevronLeft size={18} className="w-4 h-4 sm:w-[18px] sm:h-[18px]" />
                      <span className="hidden sm:inline">Quay lại</span>
                      <span className="sm:hidden">Lùi</span>
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="group flex-1 relative overflow-hidden rounded-xl bg-white text-black font-bold py-3 sm:py-4 text-sm sm:text-base shadow-[0_0_20px_-5px_rgba(255,255,255,0.3)] hover:shadow-[0_0_30px_-5px_rgba(255,255,255,0.5)] transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed min-h-[48px] touch-manipulation"
                    >
                      <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-black/10 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></div>
                      <span className="relative flex items-center justify-center gap-2">
                        {loading ? <Loader2 className="animate-spin w-4 h-4 sm:w-[18px] sm:h-[18px]" /> : <><span className="hidden sm:inline">Đăng ký ngay</span><span className="sm:hidden">Đăng ký</span></>} 
                        {!loading && <ArrowRight className="w-4 h-4 sm:w-[18px] sm:h-[18px] group-hover:translate-x-1 transition-transform" />}
                      </span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>

          <div className="mt-6 sm:mt-8 text-center text-xs sm:text-sm text-neutral-500">
            Đã có tài khoản?{" "}
            <Link to="/login" className="text-white font-semibold hover:underline underline-offset-4 decoration-neutral-700">
              Đăng nhập
            </Link>
          </div>

          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-32 bg-gradient-to-b from-neutral-800/20 to-transparent pointer-events-none" />
        </div>
      </motion.div>
    </div>
  );
}
