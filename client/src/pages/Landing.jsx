import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Shield, Zap, Globe, Heart } from "lucide-react";
import { motion } from "framer-motion";
import Logo from "../components/Logo";

export default function Landing() {
  return (
    <div className="min-h-screen bg-white dark:bg-black text-gray-900 dark:text-white transition-colors duration-300 overflow-x-hidden selection:bg-gray-500/30">
      
      {/* --- 1. NAVBAR (Trong suốt) --- */}
      <nav className="fixed top-0 w-full z-50 border-b border-white/10 bg-white/70 dark:bg-black/70 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Logo size="small" />
            <span className="font-bold text-xl tracking-tight"></span>
          </div>
          <div className="flex items-center gap-4">
            <Link 
              to="/login" 
              className="text-sm font-semibold text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              Đăng nhập
            </Link>
            <Link 
              to="/register" 
              className="px-4 py-2 rounded-full bg-gray-900 dark:bg-white text-white dark:text-black text-sm font-bold hover:opacity-90 transition-opacity"
            >
              Đăng ký ngay
            </Link>
          </div>
        </div>
      </nav>

      {/* --- 2. HERO SECTION (Điểm nhấn) --- */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
        {/* Background Glow Effects */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-gray-400/20 dark:bg-gray-600/10 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-gray-300/20 dark:bg-gray-700/10 blur-[120px] rounded-full pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-xs font-bold mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gray-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-gray-600 dark:bg-gray-400"></span>
            </span>
            Mạng xã hội thế hệ mới
          </div>

          <h1 className="text-5xl md:text-7xl font-bold tracking-tighter mb-6 bg-clip-text text-transparent bg-gradient-to-b from-gray-900 to-gray-600 dark:from-white dark:to-gray-400 animate-in fade-in slide-in-from-bottom-6 duration-1000 delay-100">
            Kết nối không giới hạn <br /> 
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-gray-700 via-gray-500 to-gray-700 dark:from-gray-300 via-gray-100 dark:to-gray-300">
              Trải nghiệm mượt mà
            </span>
          </h1>

          <p className="text-lg md:text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto mb-10 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200">
            Shiku mang đến không gian chia sẻ cởi mở, tôn trọng quyền riêng tư và tốc độ phản hồi tức thì. Tham gia cộng đồng ngay hôm nay.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-in fade-in slide-in-from-bottom-10 duration-1000 delay-300">
            <Link 
              to="/register" 
              className="w-full sm:w-auto px-8 py-4 rounded-full bg-gradient-to-r from-gray-900 to-black dark:from-white dark:to-gray-100 text-white dark:text-black font-bold text-lg shadow-lg shadow-gray-500/30 dark:shadow-gray-400/30 hover:shadow-gray-500/50 dark:hover:shadow-gray-400/50 hover:scale-105 transition-all flex items-center justify-center gap-2"
            >
              Bắt đầu khám phá <ArrowRight size={20} />
            </Link>
            <Link 
              to="/explore" 
              className="w-full sm:w-auto px-8 py-4 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white font-bold text-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
            >
              Dạo một vòng
            </Link>
          </div>
        </div>
      </section>

      {/* --- 3. BENTO GRID FEATURES (Tính năng) --- */}
      <section className="py-24 bg-gray-50 dark:bg-[#0A0A0A]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <motion.div 
            className="text-center mb-16"
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Tại sao chọn Shiku?</h2>
            <p className="text-gray-500 dark:text-gray-400">Tối ưu hóa trải nghiệm của bạn từng chi tiết nhỏ nhất.</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card 1: Speed (Large) */}
            <motion.div 
              className="md:col-span-2 group relative overflow-hidden rounded-3xl bg-white dark:bg-[#111] p-8 border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-xl transition-all duration-500"
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              <div className="relative z-10">
                <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-700 dark:text-gray-300 mb-4">
                  <Zap size={24} />
                </div>
                <h3 className="text-2xl font-bold mb-2">Tốc độ siêu nhanh</h3>
                <p className="text-gray-500 dark:text-gray-400 max-w-md">
                  Tối ưu hóa với công nghệ Lazy Loading và Eager Fetching. Trải nghiệm lướt feed mượt mà, không độ trễ ngay cả trên mạng yếu.
                </p>
              </div>
              {/* Decorative Element */}
              <div className="absolute right-0 bottom-0 w-64 h-64 bg-gradient-to-tl from-gray-400/20 dark:from-gray-600/20 to-transparent rounded-tl-full opacity-50 group-hover:scale-110 transition-transform duration-700" />
            </motion.div>

            {/* Card 2: Privacy */}
            <motion.div 
              className="group relative overflow-hidden rounded-3xl bg-white dark:bg-[#111] p-8 border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-xl transition-all duration-500"
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-700 dark:text-gray-300 mb-4">
                <Shield size={24} />
              </div>
              <h3 className="text-xl font-bold mb-2">Riêng tư & An toàn</h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                Quyền kiểm soát nằm trong tay bạn. Chế độ riêng tư, chặn người dùng và kiểm duyệt nội dung nghiêm ngặt.
              </p>
            </motion.div>

            {/* Card 3: Connect */}
            <motion.div 
              className="group relative overflow-hidden rounded-3xl bg-white dark:bg-[#111] p-8 border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-xl transition-all duration-500"
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
               <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-700 dark:text-gray-300 mb-4">
                <Globe size={24} />
              </div>
              <h3 className="text-xl font-bold mb-2">Kết nối toàn cầu</h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                Gặp gỡ bạn bè từ khắp nơi. Tham gia các nhóm cộng đồng và sự kiện thú vị.
              </p>
            </motion.div>

            {/* Card 4: Interactive (Large) */}
            <motion.div 
              className="md:col-span-2 group relative overflow-hidden rounded-3xl bg-white dark:bg-[#111] p-8 border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-xl transition-all duration-500"
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              <div className="relative z-10">
                <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-700 dark:text-gray-300 mb-4">
                  <Heart size={24} />
                </div>
                <h3 className="text-2xl font-bold mb-2">Tương tác thả ga</h3>
                <p className="text-gray-500 dark:text-gray-400 max-w-md">
                  Thả tim, bình luận, chia sẻ story và nhắn tin thời gian thực. Mọi tương tác đều sinh động và đầy màu sắc.
                </p>
              </div>
              <div className="absolute right-0 bottom-0 w-64 h-64 bg-gradient-to-tl from-gray-400/20 dark:from-gray-600/20 to-transparent rounded-tl-full opacity-50 group-hover:scale-110 transition-transform duration-700" />
            </motion.div>
          </div>
        </div>
      </section>

      {/* --- 4. CTA (Call to Action) --- */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gray-900 dark:bg-gray-800" />
        <div className="absolute inset-0 bg-gradient-to-r from-gray-800 via-gray-900 to-black dark:from-gray-700 dark:via-gray-800 dark:to-gray-900 opacity-95" />
        
        <motion.div 
          className="max-w-4xl mx-auto px-4 text-center relative z-10"
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-4xl md:text-5xl font-bold text-white dark:text-white mb-6">
            Sẵn sàng tham gia Shiku?
          </h2>
          <p className="text-gray-200 dark:text-gray-300 text-lg mb-10 max-w-2xl mx-auto">
            Hàng nghìn câu chuyện thú vị đang chờ bạn khám phá. Tạo tài khoản miễn phí chỉ trong 1 phút.
          </p>
          <Link 
            to="/register"
            className="inline-block px-10 py-4 rounded-full bg-white dark:bg-gray-100 text-gray-900 dark:text-black font-bold text-xl shadow-2xl hover:shadow-white/20 dark:hover:shadow-gray-200/20 hover:scale-105 transition-all"
          >
            Tạo tài khoản ngay
          </Link>
        </motion.div>
      </section>

      {/* --- 5. FOOTER --- */}
      <footer className="bg-white dark:bg-black py-12 border-t border-gray-200 dark:border-gray-800">
        <motion.div 
          className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row justify-between items-center gap-6"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center gap-2">
             <Logo size="small" />
             <span className="font-bold text-gray-500">Shiku make with love by <a href="https://github.com/sonvu2107" className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors">Sơn</a></span>
          </div>
          <div className="flex gap-8 text-gray-500 text-sm font-medium">
            <Link to="/support" className="hover:text-gray-900 dark:hover:text-white transition-colors">Hỗ trợ</Link>
            <Link to="/privacy" className="hover:text-gray-900 dark:hover:text-white transition-colors">Quyền riêng tư</Link>
            <Link to="/terms" className="hover:text-gray-900 dark:hover:text-white transition-colors">Điều khoản</Link>
          </div>
        </motion.div>
      </footer>
    </div>
  );
}

