import React from "react";
import { motion } from "framer-motion";
import { PageLayout, SpotlightCard } from "../components/ui/DesignSystem";
import { Zap, Shield, Globe, Heart, Code, Cpu, Coffee, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

// --- COMPONENT: NOISE OVERLAY ---
const NoiseOverlay = () => (
  <div className="fixed inset-0 z-50 pointer-events-none opacity-[0.03] mix-blend-overlay"
    style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}
  />
);

// --- ANIMATION VARIANTS ---
const fadeInUp = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" } }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2
    }
  }
};

// --- MOCK DATA ---
const VALUES = [
  { icon: Zap, title: "Tốc độ", desc: "Không ai thích chờ đợi. Shiku được tối ưu để phản hồi ngay lập tức." },
  { icon: Shield, title: "Quyền riêng tư", desc: "Dữ liệu của bạn là của bạn. Chúng tôi không bán nó cho quảng cáo." },
  { icon: Globe, title: "Tự do", desc: "Một không gian mở để chia sẻ quan điểm, không bị thuật toán chi phối." },
];

export default function About() {
  return (
    <div className="min-h-screen bg-[#F5F7FA] dark:bg-black pt-16 sm:pt-20 transition-colors duration-300">
      <NoiseOverlay />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      
      {/* --- 1. HERO SECTION --- */}
      <section className="relative min-h-[60vh] flex flex-col items-center justify-center text-center mb-24">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerContainer}
          className="max-w-4xl px-4"
        >

          
          <motion.h1 variants={fadeInUp} className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter mb-8 text-neutral-900 dark:text-white leading-[0.9]">
            Chúng tôi xây dựng <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-neutral-500 via-neutral-900 to-neutral-500 dark:from-neutral-400 dark:via-white dark:to-neutral-400">
               Tương lai kết nối
            </span>
          </motion.h1>

          <motion.p variants={fadeInUp} className="text-xl text-neutral-500 dark:text-neutral-400 max-w-2xl mx-auto leading-relaxed">
             Shiku không chỉ là một mạng xã hội. Đó là nỗ lực định nghĩa lại cách con người tương tác trong kỷ nguyên số: Nhanh hơn, An toàn hơn và Chân thực hơn.
          </motion.p>
        </motion.div>
      </section>

      {/* --- 2. MANIFESTO (Sứ mệnh) --- */}
      <section className="mb-32 px-4">
         <div className="max-w-5xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
               <motion.div 
                  initial={{ opacity: 0, x: -50 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.8 }}
               >
                  <h2 className="text-3xl md:text-5xl font-bold mb-6 text-neutral-900 dark:text-white">
                     Tại sao lại là Shiku?
                  </h2>
                  <div className="space-y-6 text-lg text-neutral-600 dark:text-neutral-300 leading-relaxed">
                     <p>
                        Chúng tôi chán ngấy những mạng xã hội đầy rẫy quảng cáo, thuật toán gây nghiện và sự xâm phạm quyền riêng tư.
                     </p>
                     <p>
                        Shiku ra đời từ một ý tưởng đơn giản: <strong className="text-black dark:text-white">Trả lại quyền kiểm soát cho người dùng.</strong>
                     </p>
                     <p>
                        Chúng tôi tin rằng công nghệ nên phục vụ con người, chứ không phải lợi dụng họ. Tại đây, bạn kết nối với những người bạn thực sự quan tâm, không phải những gì thuật toán muốn bạn xem.
                     </p>
                  </div>
               </motion.div>
               
               <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.8 }}
                  className="relative h-[400px] bg-neutral-100 dark:bg-neutral-900 rounded-3xl overflow-hidden border border-neutral-200 dark:border-neutral-800"
               >
                  {/* Abstract Visualization */}
                  <div className="absolute inset-0 flex items-center justify-center">
                     <div className="relative w-64 h-64">
                        <div className="absolute inset-0 border-2 border-black/10 dark:border-white/10 rounded-full animate-[spin_10s_linear_infinite]"></div>
                        <div className="absolute inset-4 border-2 border-black/20 dark:border-white/20 rounded-full animate-[spin_15s_linear_infinite_reverse]"></div>
                        <div className="absolute inset-8 border-2 border-black/30 dark:border-white/30 rounded-full animate-[spin_20s_linear_infinite]"></div>
                        <div className="absolute inset-0 flex items-center justify-center">
                           <Heart className="w-12 h-12 text-black dark:text-white animate-pulse" fill="currentColor" />
                        </div>
                     </div>
                  </div>
               </motion.div>
            </div>
         </div>
      </section>

      {/* --- 3. CORE VALUES (Bento Grid) --- */}
      <section className="mb-32 px-4">
         <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
               <h2 className="text-3xl md:text-5xl font-bold mb-4 text-neutral-900 dark:text-white">Giá trị cốt lõi</h2>
               <p className="text-neutral-500">Kim chỉ nam cho mọi dòng code chúng tôi viết.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
               {VALUES.map((val, i) => (
                  <motion.div
                     key={i}
                     initial={{ opacity: 0, y: 20 }}
                     whileInView={{ opacity: 1, y: 0 }}
                     viewport={{ once: true }}
                     transition={{ delay: i * 0.1 }}
                  >
                     <SpotlightCard className="h-full flex flex-col items-center text-center p-8 group">
                        <div className="w-16 h-16 mx-auto bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                           <val.icon size={32} className="text-black dark:text-white" strokeWidth={1.5} />
                        </div>
                        <h3 className="text-xl font-bold mb-3 text-neutral-900 dark:text-white">{val.title}</h3>
                        <p className="text-neutral-500 dark:text-neutral-400 leading-relaxed">{val.desc}</p>
                     </SpotlightCard>
                  </motion.div>
               ))}
            </div>
         </div>
      </section>

      {/* --- 4. COMMUNITY (Replacement for Team) --- */}
      <section className="mb-32 px-4">
         <div className="max-w-6xl mx-auto bg-neutral-900 dark:bg-neutral-100 rounded-3xl p-12 text-center relative overflow-hidden">
            <div className="relative z-10">
               <h2 className="text-3xl md:text-5xl font-bold mb-6 text-white dark:text-black">
                  Cộng đồng là trái tim
               </h2>
               <p className="text-lg text-neutral-300 dark:text-neutral-600 max-w-2xl mx-auto mb-8">
                  Shiku không được xây dựng bởi một tập đoàn vô danh. Nó được xây dựng bởi chính các bạn - những người dùng đóng góp ý kiến, báo lỗi và chia sẻ tầm nhìn mỗi ngày.
               </p>
               <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-white dark:text-black">
                  <div>
                     <div className="text-4xl font-black mb-2">100%</div>
                     <div className="text-sm opacity-70">Minh bạch</div>
                  </div>
                  <div>
                     <div className="text-4xl font-black mb-2">0%</div>
                     <div className="text-sm opacity-70">Quảng cáo ẩn</div>
                  </div>
                  <div>
                     <div className="text-4xl font-black mb-2">24/7</div>
                     <div className="text-sm opacity-70">Lắng nghe</div>
                  </div>
               </div>
            </div>
            
            {/* Decorative background elements */}
            <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
               <div className="absolute top-[-50%] left-[-20%] w-[500px] h-[500px] rounded-full bg-blue-500 blur-[100px]"></div>
               <div className="absolute bottom-[-50%] right-[-20%] w-[500px] h-[500px] rounded-full bg-purple-500 blur-[100px]"></div>
            </div>
         </div>
      </section>

      {/* --- 5. TECH STACK --- */}
      <section className="mb-32 px-4 text-center">
         <h2 className="text-sm font-bold uppercase tracking-widest text-neutral-400 mb-8">Công nghệ chúng tôi sử dụng</h2>
         <div className="flex flex-wrap justify-center gap-8 md:gap-16 opacity-50 hover:opacity-100 transition-opacity duration-500">
             {/* Mock Logos - Bạn có thể thay bằng SVG thật */}
             {['React', 'Node.js', 'MongoDB', 'Socket.io', 'Tailwind', 'Framer'].map(tech => (
                <div key={tech} className="flex items-center gap-2 text-xl font-bold text-neutral-900 dark:text-white">
                   <Cpu size={20} /> {tech}
                </div>
             ))}
         </div>
      </section>
      </div>

      {/* --- 6. CTA --- */}
      <section className="py-20 bg-black dark:bg-white text-white dark:text-black text-center">
         <div className="max-w-2xl mx-auto px-4">
            <h2 className="text-4xl md:text-6xl font-black mb-6 tracking-tight">
               Sẵn sàng tham gia?
            </h2>
            <p className="text-lg md:text-xl text-neutral-400 dark:text-neutral-600 mb-10">
               Hãy trở thành một phần của cộng đồng Shiku ngay hôm nay.
            </p>
            <Link 
               to="/register"
               className="inline-flex items-center gap-2 px-8 py-4 bg-white dark:bg-black text-black dark:text-white rounded-full font-bold text-lg hover:scale-105 transition-transform"
            >
               Tạo tài khoản <ArrowRight size={20} />
            </Link>
         </div>
      </section>

    </div>
  );
}