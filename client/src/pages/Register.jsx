import { useState, useRef, useEffect } from "react";
import { api } from "../api";
import { useNavigate, Link } from "react-router-dom";
import { saveTokens } from "../utils/tokenManager";
import { getCSRFToken, clearCSRFToken } from "../utils/csrfToken";
import Logo from "../components/Logo";
import { UserPlus, Mail, Lock, User, Eye, EyeOff, ChevronLeft, ChevronRight, Calendar, ArrowLeft } from "lucide-react";
import { useSEO } from "../utils/useSEO";

/**
 * Register - Trang đăng ký tài khoản mới
 * Có responsive design và branding section tương tự Login
 * @param {Function} setUser - Function để set user state sau khi đăng ký thành công
 */
export default function Register({ setUser }) {
  // ==================== STATE MANAGEMENT ====================
  
  // Form states
  const [currentStep, setCurrentStep] = useState(1); // Step hiện tại (1 hoặc 2)
  const [name, setName] = useState(""); // Họ và tên
  const [dateOfBirth, setDateOfBirth] = useState(""); // Ngày tháng năm sinh
  const [email, setEmail] = useState(""); // Email
  const [password, setPassword] = useState(""); // Mật khẩu
  const [showPassword, setShowPassword] = useState(false); // Toggle password visibility
  const [passwordStrength, setPasswordStrength] = useState(0); // Độ mạnh mật khẩu (0-5)
  const [err, setErr] = useState(""); // Error message
  const [loading, setLoading] = useState(false); // Loading state
  const navigate = useNavigate();

  // ==================== SEO ====================
  // Trang đăng ký không cần SEO → thêm noindex
  useSEO({
    title: "Đăng ký - Shiku",
    description: "Tạo tài khoản mới trên Shiku",
    robots: "noindex, nofollow"
  });
  
  // Refs để đo chiều cao của các step
  const step1Ref = useRef(null);
  const step2Ref = useRef(null);
  const [containerHeight, setContainerHeight] = useState('auto');

  // Đo và đồng bộ chiều cao của cả 2 step
  useEffect(() => {
    const updateHeight = () => {
      if (step1Ref.current && step2Ref.current) {
        // Tạm thời hiển thị cả 2 step để đo chiều cao chính xác
        const step1Height = step1Ref.current.scrollHeight;
        const step2Height = step2Ref.current.scrollHeight;
        const maxHeight = Math.max(step1Height, step2Height);
        if (maxHeight > 0) {
          setContainerHeight(`${maxHeight}px`);
        }
      }
    };

    // Delay nhỏ để đảm bảo DOM đã render xong
    const timeoutId = setTimeout(updateHeight, 10);
    
    // Cập nhật chiều cao khi window resize
    const handleResize = () => {
      setTimeout(updateHeight, 10);
    };
    window.addEventListener('resize', handleResize);
    
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', handleResize);
    };
  }, [currentStep, name, dateOfBirth, email, password, err]);

  // ==================== EVENT HANDLERS ====================
  
  /**
   * Xử lý submit form đăng ký
   * @param {Event} e - Form submit event
   */
  async function submit(e) {
    e.preventDefault();
    setErr(""); // Clear error cũ
    
    // Validate step 2 trước khi submit
    if (!validateStep2()) {
      return;
    }
    
    setLoading(true);
    
    try {
      
      // Lấy CSRF token trước khi đăng ký
      const csrfToken = await getCSRFToken();
      if (!csrfToken) {
        throw new Error('Failed to get CSRF token');
      }
      
      // Gọi API đăng ký với CSRF token
      const requestBody = { name, email, password };
      if (dateOfBirth && dateOfBirth.trim()) {
        requestBody.dateOfBirth = dateOfBirth.trim();
      }
      
      const data = await api("/api/auth-token/register-token", { 
        method: "POST", 
        body: requestBody,
        headers: {
          'X-CSRF-Token': csrfToken
        }
      });
      
      console.log("Register response:", data); // Debug log
      
      // Handle response - check for both accessToken and token fields
      if (data && data.accessToken) {
        saveTokens(data.accessToken, data.refreshToken);
      } else if (data && data.token) {
        // Fallback cho backward compatibility
        saveTokens(data.token, data.refreshToken || data.token);
      } else {
        throw new Error("Không nhận được token từ server");
      }
      
      // Validate user data
      if (!data.user) {
        throw new Error("Không nhận được thông tin user từ server");
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

  // ==================== VALIDATION FUNCTIONS ====================
  
  /**
   * Tính toán độ mạnh của mật khẩu
   * @param {string} password - Mật khẩu cần kiểm tra
   * @returns {number} - Điểm từ 0-5 (0: rất yếu, 5: rất mạnh)
   */
  const calculatePasswordStrength = (password) => {
    if (!password) return 0;
    
    let score = 0;
    
    // Kiểm tra độ dài
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    
    // Kiểm tra các loại ký tự
    if (/[a-z]/.test(password)) score++; // Chữ thường
    if (/[A-Z]/.test(password)) score++; // Chữ hoa
    if (/\d/.test(password)) score++; // Số
    if (/[@$!%*?&]/.test(password)) score++; // Ký tự đặc biệt
    
    // Bonus cho mật khẩu rất dài
    if (password.length >= 16) score++;
    
    return Math.min(score, 5); // Tối đa 5 điểm
  };

  /**
   * Lấy thông tin về độ mạnh mật khẩu
   * @param {number} strength - Điểm strength (0-5)
   * @returns {Object} - {text, color, bgColor}
   */
  const getPasswordStrengthInfo = (strength) => {
    switch (strength) {
      case 0:
      case 1:
        return {
          text: "Rất yếu",
          color: "text-red-600 dark:text-red-400",
          bgColor: "bg-red-500",
          percentage: 20
        };
      case 2:
        return {
          text: "Yếu", 
          color: "text-orange-600 dark:text-orange-400",
          bgColor: "bg-orange-500",
          percentage: 40
        };
      case 3:
        return {
          text: "Trung bình",
          color: "text-yellow-600 dark:text-yellow-400", 
          bgColor: "bg-yellow-500",
          percentage: 60
        };
      case 4:
        return {
          text: "Mạnh",
          color: "text-green-600 dark:text-green-400",
          bgColor: "bg-green-500", 
          percentage: 80
        };
      case 5:
        return {
          text: "Rất mạnh",
          color: "text-green-700 dark:text-green-300",
          bgColor: "bg-green-600",
          percentage: 100
        };
      default:
        return {
          text: "",
          color: "",
          bgColor: "",
          percentage: 0
        };
    }
  };

  /**
   * Kiểm tra độ an toàn mật khẩu
   * @param {string} key - Tên field cần validate
   * @param {string} value - Giá trị cần validate
   * @returns {boolean} - true nếu hợp lệ, false nếu không hợp lệ
   */
  const validateInput = (key, value) => {
    if (key === "password") {
      const strength = calculatePasswordStrength(value);
      setPasswordStrength(strength);
      
      if (value === "") return true; // Cho phép rỗng khi đang nhập
      
      // Yêu cầu tối thiểu strength >= 3 (trung bình)
      if (strength < 3) {
        return true; // Vẫn cho phép nhập nhưng hiển thị warning
      }
      return true;
    }
    return true;
  };

  // ==================== STEP NAVIGATION ====================
  
  /**
   * Validate step 1 (Họ tên và ngày sinh)
   */
  const validateStep1 = () => {
    if (!name.trim()) {
      setErr("Vui lòng nhập họ và tên");
      return false;
    }
    if (!dateOfBirth) {
      setErr("Vui lòng chọn ngày tháng năm sinh");
      return false;
    }
    // Kiểm tra tuổi (ít nhất 13 tuổi)
    const birthDate = new Date(dateOfBirth);
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    const actualAge = monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate()) ? age - 1 : age;
    
    if (actualAge < 13) {
      setErr("Bạn phải ít nhất 13 tuổi để đăng ký");
      return false;
    }
    return true;
  };

  /**
   * Validate step 2 (Email và mật khẩu)
   */
  const validateStep2 = () => {
    if (!email.trim()) {
      setErr("Vui lòng nhập email");
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setErr("Email không hợp lệ");
      return false;
    }
    if (!password) {
      setErr("Vui lòng nhập mật khẩu");
      return false;
    }
    if (passwordStrength < 3) {
      setErr("Mật khẩu chưa đủ mạnh. Vui lòng chọn mật khẩu có độ bảo mật từ 'Trung bình' trở lên.");
      return false;
    }
    return true;
  };

  /**
   * Chuyển sang step tiếp theo
   */
  const handleNext = () => {
    setErr("");
    if (currentStep === 1) {
      if (validateStep1()) {
        setCurrentStep(2);
      }
    }
  };

  /**
   * Quay lại step trước
   */
  const handleBack = () => {
    setErr("");
    setCurrentStep(1);
  };

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
              <p className="text-sm opacity-80 mb-2 lg:mb-3">Tham gia cộng đồng</p>
              <h2 className="text-xl lg:text-2xl xl:text-3xl font-bold leading-snug">
                Bắt đầu hành trình chia sẻ <br className="hidden lg:block" />
                câu chuyện của bạn ngay hôm nay.
              </h2>
            </div>
            <div className="space-y-2 lg:space-y-3 opacity-90">
              <div className="flex items-center gap-2 lg:gap-3">
                <div className="w-1.5 h-1.5 bg-white rounded-full flex-shrink-0"></div>
                <span className="text-xs lg:text-sm">Tạo trang cá nhân miễn phí</span>
              </div>
              <div className="flex items-center gap-2 lg:gap-3">
                <div className="w-1.5 h-1.5 bg-white rounded-full flex-shrink-0"></div>
                <span className="text-xs lg:text-sm">Kết nối với mọi người trong cộng đồng</span>
              </div>
              <div className="flex items-center gap-2 lg:gap-3">
                <div className="w-1.5 h-1.5 bg-white rounded-full flex-shrink-0"></div>
                <span className="text-xs lg:text-sm">Công cụ viết bài hiện đại và dễ dàng</span>
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

        {/* Cột phải: Form đăng ký với flip card */}
        <div className="p-4 sm:p-6 md:p-8 lg:p-10 flex flex-col justify-center bg-white dark:bg-neutral-800 relative">
          {/* Header */}
          <div className="mb-6 md:mb-8">
            <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-semibold text-black dark:text-white">Tạo tài khoản</h1>
              </div>
              <Link
                to="/login"
                className="flex items-center gap-1 text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors text-xs sm:text-sm font-medium touch-manipulation min-h-[44px]"
                aria-label="Đăng nhập"
              >
                <ArrowLeft size={16} className="sm:w-[18px] sm:h-[18px]" />
                <span>Đăng nhập</span>
              </Link>
            </div>
            <p className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm">
              Bước {currentStep} / 2
            </p>
            </div>

          {/* Flip Card Container */}
          <div className="relative register-flip-container" style={{ perspective: '1000px', height: containerHeight }}>
            <div 
              className="relative w-full transition-all duration-500 ease-in-out register-flip-card"
              style={{
                transformStyle: 'preserve-3d',
                transform: currentStep === 2 ? 'rotateY(180deg)' : 'rotateY(0deg)',
                height: containerHeight
              }}
            >
              {/* Step 1: Họ tên và Ngày sinh (Mặt trước) */}
              <div 
                ref={step1Ref}
                className="absolute inset-0 w-full register-step-1"
                data-step-active={currentStep === 1 ? "true" : "false"}
                style={{
                  backfaceVisibility: 'hidden',
                  WebkitBackfaceVisibility: 'hidden',
                  transform: 'rotateY(0deg)',
                  pointerEvents: currentStep === 1 ? 'auto' : 'none'
                }}
              >
                <form onSubmit={(e) => { e.preventDefault(); handleNext(); }} className="space-y-4 sm:space-y-5">
              {/* Name Input */}
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-800 dark:text-gray-200 mb-2">
                      Họ và tên
                    </label>
                <input
                      id="name"
                  type="text"
                  value={name}
                      onChange={(e) => {
                        setName(e.target.value);
                        setErr("");
                      }}
                      placeholder="Nhập họ và tên của bạn"
                      className="w-full border border-gray-300 dark:border-neutral-600 rounded-xl px-4 py-3 sm:py-3.5 text-base focus:ring-2 focus:ring-black dark:focus:ring-white focus:outline-none transition-all duration-300 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-neutral-500 bg-white dark:bg-neutral-700 touch-manipulation"
                  required
                  autoComplete="name"
                />
              </div>

                  {/* Date of Birth Input */}
                  <div>
                    <label htmlFor="dateOfBirth" className="block text-sm font-medium text-gray-800 dark:text-gray-200 mb-2">
                      Ngày tháng năm sinh
                    </label>
                    <div className="relative">
                      <Calendar size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none z-10" />
                      <input
                        id="dateOfBirth"
                        type="date"
                        value={dateOfBirth}
                        onChange={(e) => {
                          setDateOfBirth(e.target.value);
                          setErr("");
                        }}
                        max={new Date(new Date().setFullYear(new Date().getFullYear() - 13)).toISOString().split('T')[0]}
                        className="w-full border border-gray-300 dark:border-neutral-600 rounded-xl px-4 py-3 sm:py-3.5 pl-12 text-base focus:ring-2 focus:ring-black dark:focus:ring-white focus:outline-none transition-all duration-300 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-neutral-500 bg-white dark:bg-neutral-700 touch-manipulation"
                        required
                        autoComplete="bday"
                      />
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Bạn phải ít nhất 13 tuổi để đăng ký</p>
                  </div>

                  {/* Error Message */}
                  {err && (
                    <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg text-sm break-words">
                      {err}
                    </div>
                  )}

                  {/* Next Button */}
                  <button
                    type="submit"
                    className="w-full bg-black dark:bg-white text-white dark:text-black py-3.5 sm:py-4 rounded-xl font-semibold text-base hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-all duration-300 shadow-md hover:shadow-lg flex items-center justify-center gap-2 touch-manipulation min-h-[48px] active:scale-[0.98]"
                  >
                    <span>Tiếp theo</span>
                    <ChevronRight size={18} />
                  </button>

                  {/* Divider */}
                  <div className="flex items-center my-5 sm:my-6">
                    <div className="flex-1 h-px bg-gray-300 dark:bg-neutral-600"></div>
                    <span className="px-3 text-xs sm:text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">hoặc tiếp tục với</span>
                    <div className="flex-1 h-px bg-gray-300 dark:bg-neutral-600"></div>
                  </div>

                  {/* Footer - Login Link */}
                  <p className="text-center text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                    Đã có tài khoản?{" "}
                    <Link 
                      to="/login" 
                      className="text-black dark:text-white font-semibold hover:underline transition-colors touch-manipulation inline-block min-h-[44px] leading-[44px]"
                    >
                      Đăng nhập
                    </Link>
                  </p>
                </form>
              </div>

              {/* Step 2: Email và Mật khẩu (Mặt sau) */}
              <div 
                ref={step2Ref}
                className="absolute inset-0 w-full register-step-2"
                data-step-active={currentStep === 2 ? "true" : "false"}
                style={{
                  backfaceVisibility: 'hidden',
                  WebkitBackfaceVisibility: 'hidden',
                  transform: 'rotateY(180deg)',
                  pointerEvents: currentStep === 2 ? 'auto' : 'none'
                }}
              >
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
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setErr("");
                      }}
                      placeholder="username@gmail.com"
                      className="w-full border border-gray-300 dark:border-neutral-600 rounded-xl px-4 py-3 sm:py-3.5 text-base focus:ring-2 focus:ring-black dark:focus:ring-white focus:outline-none transition-all duration-300 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-neutral-500 bg-white dark:bg-neutral-700 touch-manipulation"
                  required
                  autoComplete="email"
                />
              </div>

              {/* Password Input */}
                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-800 dark:text-gray-200 mb-2">
                      Mật khẩu
                    </label>
              <div className="relative">
                <input
                        id="password"
                        type={showPassword ? "text" : "password"}
                  value={password}
                        onChange={(e) => {
                    const newValue = e.target.value;
                    setPassword(newValue);
                    validateInput("password", newValue);
                          setErr("");
                  }}
                        placeholder="Tối thiểu 8 ký tự"
                        className="w-full border border-gray-300 dark:border-neutral-600 rounded-xl px-4 py-3 sm:py-3.5 pr-12 text-base focus:ring-2 focus:ring-black dark:focus:ring-white focus:outline-none transition-all duration-300 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-neutral-500 bg-white dark:bg-neutral-700 touch-manipulation"
                  required
                  minLength="8"
                  autoComplete="new-password"
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

              {/* Password Strength Meter */}
              {password && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-600 dark:text-gray-400">Độ bảo mật:</span>
                    <span className={`font-medium ${getPasswordStrengthInfo(passwordStrength).color}`}>
                      {getPasswordStrengthInfo(passwordStrength).text}
                    </span>
                  </div>
                      <div className="w-full bg-gray-200 dark:bg-neutral-600 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${getPasswordStrengthInfo(passwordStrength).bgColor}`}
                      style={{ width: `${getPasswordStrengthInfo(passwordStrength).percentage}%` }}
                    ></div>
                  </div>
                </div>
              )}

              {/* Error Message */}
              {err && (
                <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg text-sm break-words">
                  {err}
                </div>
              )}

                  {/* Navigation Buttons */}
                  <div className="flex gap-2 sm:gap-3">
                    <button
                      type="button"
                      onClick={handleBack}
                      className="flex-1 bg-gray-200 dark:bg-neutral-700 text-gray-800 dark:text-gray-200 py-3.5 sm:py-4 rounded-xl font-semibold text-base hover:bg-gray-300 dark:hover:bg-neutral-600 transition-all duration-300 shadow-md hover:shadow-lg flex items-center justify-center gap-2 touch-manipulation min-h-[48px] active:scale-[0.98]"
                    >
                      <ChevronLeft size={18} />
                      <span>Quay lại</span>
                    </button>
              <button
                type="submit"
                disabled={loading}
                      className="flex-1 bg-black dark:bg-white text-white dark:text-black py-3.5 sm:py-4 rounded-xl font-semibold text-base hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-all duration-300 shadow-md hover:shadow-lg disabled:bg-gray-400 dark:disabled:bg-neutral-600 disabled:cursor-not-allowed touch-manipulation min-h-[48px] active:scale-[0.98]"
              >
                {loading ? (
                        <span className="flex items-center justify-center gap-2">
                          <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                          <span>Đang tạo...</span>
                        </span>
                ) : (
                        <>
                          <span className="hidden sm:inline">Tạo tài khoản</span>
                          <span className="sm:hidden">Tạo</span>
                        </>
                )}
              </button>
                  </div>
                </form>
              </div>
                </div>
                </div>

          {/* Divider - Chỉ hiển thị ở step 2 */}
          {currentStep === 2 && (
            <>
              <div className="flex items-center my-5 sm:my-6">
                <div className="flex-1 h-px bg-gray-300 dark:bg-neutral-600"></div>
                <span className="px-3 text-xs sm:text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">hoặc tiếp tục với</span>
                <div className="flex-1 h-px bg-gray-300 dark:bg-neutral-600"></div>
              </div>

              {/* Footer - Login Link */}
              <p className="text-center text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                Đã có tài khoản?{" "}
              <Link
                to="/login"
                  className="text-black dark:text-white font-semibold hover:underline transition-colors touch-manipulation inline-block min-h-[44px] leading-[44px]"
              >
                Đăng nhập
              </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
