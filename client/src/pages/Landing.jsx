import React, { useRef, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { ArrowRight, Shield, Zap, Globe, Heart, Lock, Terminal, ChevronRight } from "lucide-react";
import Logo from "../components/Logo";
import { cn } from "../utils/cn";

// --- 1. COMPONENT: NOISE & GRAIN (Tạo chất liệu điện ảnh) ---
const NoiseOverlay = () => (
  <div className="fixed inset-0 z-50 pointer-events-none opacity-[0.03] mix-blend-overlay"
    style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}
  />
);

// --- 2. COMPONENT: SPOTLIGHT CARD (Ánh sáng bạc) - Tối ưu mobile ---
const SpotlightCard = ({ children, className = "" }) => {
  const divRef = useRef(null);
  const [isFocused, setIsFocused] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [opacity, setOpacity] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleMouseMove = (e) => {
    if (!divRef.current || isMobile) return;
    const div = divRef.current;
    const rect = div.getBoundingClientRect();
    setPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const handleFocus = () => { setIsFocused(true); setOpacity(1); };
  const handleBlur = () => { setIsFocused(false); setOpacity(0); };
  const handleMouseEnter = () => { if (!isMobile) setOpacity(1); };
  const handleMouseLeave = () => { setOpacity(0); };

  return (
    <div
      ref={divRef}
      onMouseMove={handleMouseMove}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={cn(
        "relative overflow-hidden rounded-2xl md:rounded-3xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-6 md:p-8 shadow-sm transition-all duration-300 hover:shadow-xl md:hover:shadow-2xl",
        className
      )}
    >
      <div
        className="pointer-events-none absolute -inset-px opacity-0 transition duration-300"
        style={{
          opacity: isMobile ? 0 : opacity,
          background: `radial-gradient(${isMobile ? '400px' : '600px'} circle at ${position.x}px ${position.y}px, rgba(255,255,255,0.1), transparent 40%)`,
        }}
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
};

// --- 4. COMPONENT: METEORS (SAO BĂNG TRẮNG) - Tối ưu mobile ---
const Meteors = ({ number = 20 }) => {
  const meteors = new Array(number || 20).fill(true);
  return (
    <>
      {meteors.map((el, idx) => (
        <span
          key={"meteor" + idx}
          className={cn(
            "animate-meteor absolute top-1/2 left-1/2 h-0.5 w-0.5 rounded-[9999px] bg-slate-500 dark:bg-white shadow-[0_0_0_1px_#ffffff10] rotate-[215deg]",
            // Ẩn một nửa meteors trên mobile để tối ưu performance
            idx >= number / 2 ? "hidden md:block" : "",
            "before:content-[''] before:absolute before:top-1/2 before:transform before:-translate-y-[50%] before:w-[30px] md:before:w-[50px] before:h-[1px] before:bg-gradient-to-r before:from-slate-500 dark:before:from-white before:to-transparent"
          )}
          style={{
            top: 0,
            left: Math.floor(Math.random() * (300 - -300) + -300) + "px",
            animationDelay: Math.random() * (0.8 - 0.2) + 0.2 + "s",
            animationDuration: Math.floor(Math.random() * (8 - 2) + 2) + "s",
          }}
        ></span>
      ))}
    </>
  );
};

// --- 4. COMPONENT: GRID PATTERN (Lưới kỹ thuật số) ---
const GridPattern = () => {
  return (
    <div className="absolute inset-0 -z-10 h-full w-full bg-white dark:bg-black bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]">
      {/* Hiệu ứng đèn pha (Spotlight) trung tâm màu trắng/xám */}
      <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-neutral-400 opacity-10 blur-[120px] dark:bg-white"></div>
    </div>
  );
};

// --- 5. COMPONENT: TEXT REVEAL (HIỆN CHỮ) - Tối ưu mobile ---
const TextReveal = ({ text, className }) => {
  const words = text.split(" ");
  return (
    <div className={cn("overflow-visible flex flex-wrap justify-center gap-x-1 sm:gap-x-2 md:gap-x-4 gap-y-1 pb-1", className)}>
      {words.map((word, i) => (
        <motion.span
          key={i}
          initial={{ y: 40, opacity: 0, filter: "blur(10px)" }}
          animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
          transition={{ delay: i * 0.08 + 0.2, duration: 0.6, ease: [0.2, 0.65, 0.3, 0.9] }}
          className="inline-block leading-[0.9] text-black dark:text-white"
        >
          {word}
        </motion.span>
      ))}
    </div>
  );
};

// --- 6. COMPONENT: LAMP CONTAINER (ĐÈN SÂN KHẤU MONOCHROME) ---
const LampContainer = ({ children, className }) => {
  return (
    <div
      className={cn(
        "relative flex min-h-[70vh] md:min-h-[80vh] flex-col items-center justify-center overflow-hidden bg-white dark:bg-black w-full rounded-md z-0",
        className
      )}
    >
      <div className="relative flex w-full flex-1 scale-y-110 md:scale-y-125 items-center justify-center isolate z-0 ">
        {/* Luồng sáng trái */}
        <motion.div
          initial={{ opacity: 0.5, width: "15rem" }}
          whileInView={{ opacity: 1, width: "30rem" }}
          transition={{ delay: 0.3, duration: 0.8, ease: "easeInOut" }}
          style={{ backgroundImage: `conic-gradient(var(--conic-position), var(--tw-gradient-stops))` }}
          className="absolute inset-auto right-1/2 h-40 md:h-56 overflow-visible w-[20rem] md:w-[30rem] bg-gradient-to-br from-neutral-400 via-transparent to-transparent dark:from-neutral-200 text-white [--conic-position:from_70deg_at_center_top]"
        >
          <div className="absolute w-[100%] left-0 bg-white dark:bg-black h-32 md:h-40 bottom-0 z-20 [mask-image:linear-gradient(to_top,white,transparent)]" />
          <div className="absolute w-24 md:w-40 h-[100%] left-0 bg-white dark:bg-black bottom-0 z-20 [mask-image:linear-gradient(to_right,white,transparent)]" />
        </motion.div>
        
        {/* Luồng sáng phải */}
        <motion.div
          initial={{ opacity: 0.5, width: "15rem" }}
          whileInView={{ opacity: 1, width: "30rem" }}
          transition={{ delay: 0.3, duration: 0.8, ease: "easeInOut" }}
          style={{ backgroundImage: `conic-gradient(var(--conic-position), var(--tw-gradient-stops))` }}
          className="absolute inset-auto left-1/2 h-40 md:h-56 w-[20rem] md:w-[30rem] bg-gradient-to-bl from-neutral-400 via-transparent to-transparent dark:from-neutral-200 text-white [--conic-position:from_290deg_at_center_top]"
        >
          <div className="absolute w-[100%] right-0 bg-white dark:bg-black h-32 md:h-40 bottom-0 z-20 [mask-image:linear-gradient(to_top,white,transparent)]" />
          <div className="absolute w-24 md:w-40 h-[100%] right-0 bg-white dark:bg-black bottom-0 z-20 [mask-image:linear-gradient(to_left,white,transparent)]" />
        </motion.div>

        {/* Glow Effect trung tâm (Trắng/Bạc) - Giảm cho mobile */}
        <div className="absolute top-1/2 h-32 md:h-48 w-full translate-y-12 scale-x-100 md:scale-x-150 bg-neutral-200 dark:bg-neutral-950 blur-xl md:blur-2xl"></div>
        <div className="absolute top-1/2 z-50 h-32 md:h-48 w-full bg-transparent opacity-5 md:opacity-10 backdrop-blur-sm md:backdrop-blur-md"></div>
        <div className="absolute inset-auto z-50 h-24 md:h-36 w-[20rem] md:w-[28rem] -translate-y-1/2 rounded-full bg-neutral-300 dark:bg-white opacity-30 md:opacity-40 blur-2xl md:blur-3xl"></div>
        
        <motion.div
          initial={{ width: "6rem" }}
          whileInView={{ width: "12rem" }}
          transition={{ delay: 0.3, duration: 0.8, ease: "easeInOut" }}
          className="absolute inset-auto z-30 h-24 md:h-36 w-48 md:w-64 -translate-y-[4rem] md:-translate-y-[6rem] rounded-full bg-neutral-300 dark:bg-neutral-200 blur-xl md:blur-2xl"
        ></motion.div>
      </div>

      <div className="relative z-50 flex -translate-y-8 md:-translate-y-8 flex-col items-center px-4 md:px-5">
        {children}
      </div>
    </div>
  );
};

// --- 7. COMPONENT: MAGIC BUTTON (VIỀN SÁNG CHẠY) ---
const MagicButton = ({ children, to }) => {
  return (
    <Link to={to} className="relative inline-flex h-12 overflow-hidden rounded-full p-[1px] focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 focus:ring-offset-slate-50 group">
      <span className="absolute inset-[-1000%] animate-[spin_2s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#a3a3a3_0%,#ffffff_50%,#a3a3a3_100%)] dark:bg-[conic-gradient(from_90deg_at_50%_50%,#3f3f46_0%,#ffffff_50%,#3f3f46_100%)]" />
      <span className="inline-flex h-full w-full cursor-pointer items-center justify-center rounded-full bg-white dark:bg-black px-8 py-1 text-sm font-bold text-black dark:text-white backdrop-blur-3xl transition-all group-hover:bg-neutral-100 dark:group-hover:bg-neutral-900">
        {children}
      </span>
    </Link>
  );
};

// --- TRANG LANDING CHÍNH ---
export default function Landing() {
  return (
    <div className="min-h-screen bg-white dark:bg-black text-neutral-900 dark:text-white transition-colors duration-500 overflow-x-hidden font-sans selection:bg-neutral-200 dark:selection:bg-neutral-800 relative">
      
      <NoiseOverlay />

      {/* NAVBAR */}
      <nav className="fixed top-0 w-full z-50 border-b border-neutral-200/50 dark:border-neutral-800/50 bg-white/70 dark:bg-black/70 backdrop-blur-2xl transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 group cursor-pointer">
            <div className="w-8 h-8 bg-black dark:bg-white rounded-lg flex items-center justify-center text-white dark:text-black font-bold shadow-lg transition-transform group-hover:rotate-12">
              S
            </div>
            <span className="font-bold text-xl tracking-tighter">Shiku</span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/login" className="text-sm font-semibold hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors">Đăng nhập</Link>
            <Link to="/register" className="px-5 py-2 rounded-full bg-neutral-900 dark:bg-white text-white dark:text-black text-sm font-bold hover:opacity-90 transition-opacity">
              Tham gia
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO SECTION: LAMP EFFECT (Monochrome) */}
      <LampContainer className="pt-16 md:pt-20">
        <motion.div
          initial={{ opacity: 0.5, y: 100 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.8, ease: "easeInOut" }}
          className="flex flex-col items-center text-center"
        >
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 text-xs font-bold mb-8 backdrop-blur-md">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-neutral-400 dark:bg-neutral-600 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-neutral-500 dark:bg-white"></span>
            </span>
            Mạng xã hội thế hệ mới
          </div>

          {/* HEADLINE: GRADIENT ĐEN TRẮNG */}
          <h1 className="text-5xl sm:text-6xl md:text-8xl font-black tracking-tighter mb-4 md:mb-6 text-neutral-900 dark:text-white leading-[0.9] pb-2 px-2">
            <div className="mb-0">
              <TextReveal text="KẾT NỐI KHÔNG GIỚI HẠN" />
            </div>
            <motion.span 
              initial={{ opacity: 0, filter: "blur(10px)" }}
              animate={{ opacity: 1, filter: "blur(0px)" }}
              transition={{ delay: 1.2, duration: 1 }}
              className="block mt-1 leading-[1.2] pb-1 bg-clip-text text-transparent bg-gradient-to-b from-neutral-600 to-black dark:from-white dark:to-neutral-500"
            >
              TRẢI NGHIỆM MƯỢT MÀ
            </motion.span>
          </h1>

          <p className="text-base md:text-lg lg:text-xl text-neutral-500 dark:text-neutral-400 max-w-2xl mx-auto mb-8 md:mb-10 leading-relaxed font-medium px-4">
            Shiku mang đến không gian chia sẻ cởi mở, tôn trọng quyền riêng tư và tốc độ phản hồi tức thì.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-4 md:gap-6 px-4">
            {/* Magic Button - Điểm nhấn */}
            <MagicButton to="/register">
              BẮT ĐẦU NGAY <ArrowRight className="ml-2 w-4 h-4" />
            </MagicButton>
            
            <Link 
              to="/tour" 
              className="text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white font-medium flex items-center gap-1 transition-colors group px-4 md:px-6 py-2 md:py-3"
            >
              Dạo một vòng <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </motion.div>
        
        {/* Sao băng bay nền - Tối ưu mobile: ít meteors hơn */}
        <div className="absolute inset-0 h-full w-full pointer-events-none opacity-10 md:opacity-20 z-0 top-40">
           <Meteors number={20} />
        </div>
      </LampContainer>

      {/* --- INFINITE MARQUEE (Monochrome) - Tối ưu mobile --- */}
      <div className="py-8 md:py-12 bg-white dark:bg-black border-y border-neutral-200 dark:border-neutral-800 overflow-hidden relative z-20">
        <div className="absolute inset-0 bg-gradient-to-r from-white via-transparent to-white dark:from-black dark:to-black z-10 pointer-events-none"></div>
        <div className="flex gap-12 md:gap-20 animate-infinite-scroll whitespace-nowrap items-center opacity-70 md:opacity-80">
           {[...Array(4)].map((_, i) => (
              <div key={i} className="flex gap-12 md:gap-20 items-center">
                 <span className="text-xl md:text-3xl font-black tracking-widest text-neutral-900 dark:text-white">SHIKU</span>
                 <span className="text-xl md:text-3xl font-black tracking-widest stroke-text dark:stroke-text-white">FAST</span>
                 <span className="text-xl md:text-3xl font-black tracking-widest text-neutral-900 dark:text-white">SECURE</span>
                 <span className="text-xl md:text-3xl font-black tracking-widest stroke-text dark:stroke-text-white">GLOBAL</span>
              </div>
           ))}
        </div>
      </div>

      {/* --- FEATURES (Bento Grid - Dark Mode Heavy) --- */}
      <section className="py-20 md:py-32 bg-neutral-50 dark:bg-black relative z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12 md:mb-20">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 md:mb-6 text-neutral-900 dark:text-white tracking-tight px-4">
              Tính năng vượt trội
            </h2>
            <p className="text-neutral-500 dark:text-neutral-400 text-base md:text-lg px-4">
              Tối ưu hóa trải nghiệm của bạn từng chi tiết nhỏ nhất.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
            {/* Card 1: Speed */}
            <div className="md:col-span-2">
              <SpotlightCard className="h-full group">
                <div className="relative z-10 h-full flex flex-col justify-between">
                  <div>
                    <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center text-black dark:text-white mb-4 md:mb-6 border border-neutral-200 dark:border-neutral-800">
                      <Zap className="w-6 h-6 md:w-7 md:h-7" strokeWidth={1.5} />
                    </div>
                    <h3 className="text-2xl md:text-3xl font-bold mb-2 md:mb-3 text-neutral-900 dark:text-white">Tốc độ ánh sáng</h3>
                    <p className="text-neutral-500 dark:text-neutral-400 text-base md:text-lg leading-relaxed max-w-lg">
                      Kiến trúc được tối ưu hóa đến từng mili-giây. Lazy Loading thông minh giúp bạn không bao giờ phải chờ đợi.
                    </p>
                  </div>
                  {/* Thanh loading Monochrome */}
                  <div className="mt-12 w-full h-1 bg-neutral-200 dark:bg-neutral-800 rounded-full overflow-hidden">
            <motion.div 
                          initial={{ width: "0%" }}
                          whileInView={{ width: "100%" }}
                          transition={{ duration: 1.5, ease: "circOut", repeat: Infinity, repeatDelay: 2 }}
                          className="h-full bg-black dark:bg-white"
                      />
                  </div>
                </div>
              </SpotlightCard>
              </div>

            {/* Card 2: Privacy */}
            <SpotlightCard>
              <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center text-black dark:text-white mb-4 md:mb-6 border border-neutral-200 dark:border-neutral-800">
                <Shield className="w-6 h-6 md:w-7 md:h-7" strokeWidth={1.5} />
              </div>
              <h3 className="text-xl md:text-2xl font-bold mb-2 md:mb-3 text-neutral-900 dark:text-white">Bảo mật thép</h3>
              <p className="text-neutral-500 dark:text-neutral-400 text-sm md:text-base leading-relaxed">
                Mã hóa đầu cuối. Bạn là người duy nhất nắm giữ chìa khóa dữ liệu của mình.
              </p>
            </SpotlightCard>

            {/* Card 3: Open Source */}
            <SpotlightCard>
               <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center text-black dark:text-white mb-4 md:mb-6 border border-neutral-200 dark:border-neutral-800">
                <Terminal className="w-6 h-6 md:w-7 md:h-7" strokeWidth={1.5} />
              </div>
              <h3 className="text-xl md:text-2xl font-bold mb-2 md:mb-3 text-neutral-900 dark:text-white">Mã nguồn mở</h3>
              <p className="text-neutral-500 dark:text-neutral-400 text-sm md:text-base leading-relaxed">
                Minh bạch hoàn toàn. Cộng đồng cùng nhau xây dựng nền tảng tốt hơn mỗi ngày.
              </p>
            </SpotlightCard>

            {/* Card 4: Interactive */}
            <div className="md:col-span-2">
              <SpotlightCard className="h-full group relative overflow-hidden">
              <div className="relative z-10">
                  <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center text-black dark:text-white mb-4 md:mb-6 border border-neutral-200 dark:border-neutral-800">
                    <Heart className="w-6 h-6 md:w-7 md:h-7" strokeWidth={1.5} />
                  </div>
                  <h3 className="text-2xl md:text-3xl font-bold mb-2 md:mb-3 text-neutral-900 dark:text-white">Tương tác thả ga</h3>
                  <p className="text-neutral-500 dark:text-neutral-400 text-base md:text-lg leading-relaxed max-w-md">
                    Thả tim, bình luận, chia sẻ story và nhắn tin thời gian thực. Mọi tương tác đều sinh động.
                  </p>
                </div>
                {/* Decor Icon Monochrome - Ẩn trên mobile */}
                <div className="hidden md:block absolute right-0 bottom-0 opacity-5 dark:opacity-10 rotate-12 group-hover:rotate-0 group-hover:scale-110 transition-all duration-700">
                    <Heart size={200} className="text-black dark:text-white" />
                </div>
              </SpotlightCard>
              </div>
          </div>
        </div>
      </section>

      {/* CTA & Footer */}
      <section className="py-20 md:py-32 bg-black text-white dark:bg-white dark:text-black relative overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center opacity-5 md:opacity-10 pointer-events-none">
           <div className="w-[400px] md:w-[800px] h-[400px] md:h-[800px] border border-current rounded-full animate-ping [animation-duration:3s]"></div>
        </div>
        
        <motion.div 
          className="max-w-4xl mx-auto px-4 text-center relative z-10"
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl md:text-5xl lg:text-7xl font-black mb-6 md:mb-8 tracking-tight px-2">
            Sẵn sàng chưa?
          </h2>
          <p className="text-neutral-400 dark:text-neutral-600 text-base md:text-lg lg:text-xl mb-8 md:mb-12 max-w-xl mx-auto px-2">
            Tham gia ngay hôm nay để trải nghiệm mạng xã hội của tương lai.
          </p>
          <Link 
            to="/register"
            className="inline-flex items-center gap-2 md:gap-3 px-8 md:px-12 py-3 md:py-5 rounded-full bg-white text-black dark:bg-black dark:text-white font-bold text-lg md:text-xl hover:scale-105 transition-transform"
          >
            Tạo tài khoản <ArrowRight size={20} className="md:w-6 md:h-6" />
          </Link>
        </motion.div>
      </section>

      {/* --- 5. FOOTER --- */}
      <footer className="bg-white dark:bg-black py-12 border-t border-neutral-200 dark:border-neutral-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2 opacity-50 hover:opacity-100 transition-opacity">
             <Logo size="small" />
             <span className="font-bold text-neutral-900 dark:text-white">Copyright © 2025</span>
          </div>
          <div className="flex gap-8 text-neutral-500 text-sm font-medium">
            <Link to="/support" className="hover:text-black dark:hover:text-white transition-colors">Hỗ trợ</Link>
            <Link to="/terms" className="hover:text-black dark:hover:text-white transition-colors">Điều khoản</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
