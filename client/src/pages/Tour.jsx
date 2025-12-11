import React, { useRef } from "react";
import { Link } from "react-router-dom";
import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowRight, Bot, Zap, Layers, Hash, MessageCircle, Radio, Calendar, Users } from "lucide-react";
import Logo from "../components/Logo";
import { cn } from "../utils/cn";

// --- UI COMPONENTS (Tái sử dụng style từ Landing để đồng bộ) ---

const GridPattern = () => (
  <div className="absolute inset-0 -z-10 h-full w-full bg-neutral-950 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
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

// --- SCROLL SECTION COMPONENT ---
const FeatureShowcase = ({ title, subtitle, icon: Icon, align = "left", children }) => {
  return (
    <div className="min-h-[80vh] w-full flex items-center justify-center py-20 relative overflow-hidden">
      {/* Background Glow cục bộ */}
      <div className={`absolute top-1/2 ${align === "left" ? "-left-20" : "-right-20"} w-[500px] h-[500px] bg-neutral-800/30 blur-[120px] rounded-full pointer-events-none`} />

      <div className={`max-w-7xl w-full px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center ${align === "right" ? "lg:grid-flow-dense" : ""}`}>

        {/* Text Content */}
        <motion.div
          initial={{ opacity: 0, x: align === "left" ? -50 : 50 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className={`flex flex-col justify-center ${align === "right" ? "lg:col-start-2 lg:items-end lg:text-right" : "lg:items-start text-left"}`}
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-900 border border-neutral-800 text-white text-xs font-bold mb-6 w-fit">
            <Icon size={14} className="text-neutral-400" />
            <span className="uppercase tracking-widest">{subtitle}</span>
          </div>

          <h2 className="text-4xl md:text-6xl font-black text-white mb-6 tracking-tighter leading-[1.1]">
            {title}
          </h2>
          <p className="text-lg text-neutral-400 leading-relaxed max-w-lg">
            {children}
          </p>
        </motion.div>

        {/* Visual Demo (Mockup) */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 30 }}
          whileInView={{ opacity: 1, scale: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, delay: 0.2, ease: "backOut" }}
          className={align === "right" ? "lg:col-start-1" : ""}
        >
          {/* Khung chứa Mockup */}
          <div className="relative w-full aspect-[4/3] rounded-3xl bg-neutral-900 border border-neutral-800 shadow-2xl overflow-hidden group">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-neutral-800/50 to-neutral-950"></div>

            {/* Nội dung Demo tùy chỉnh */}
            {align === "left" && (title.includes("AI") || title.includes("Trí tuệ") || title.includes("nhân tạo")) && (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-8">
                <div className="w-full max-w-sm space-y-4">
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-neutral-700"></div>
                    <div className="bg-neutral-800 p-3 rounded-2xl rounded-tl-none text-sm text-neutral-300 animate-pulse">
                      Gợi ý cho tôi một status hay về cà phê?
                    </div>
                  </div>
                  <div className="flex gap-3 flex-row-reverse">
                    <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-black"><Bot size={16} /></div>
                    <div className="bg-white text-black p-3 rounded-2xl rounded-tr-none text-sm shadow-lg transform transition-all duration-500 hover:scale-105">
                      "Cà phê không chỉ là đồ uống, nó là cú hích cho những ý tưởng lớn. ☕️✨ #MorningVibes"
                    </div>
                  </div>
                </div>
              </div>
            )}

            {align === "right" && title.includes("Sáng tạo") && (
              <div className="absolute inset-0 p-6 font-mono text-sm text-neutral-400">
                <div className="w-full h-full bg-neutral-950 rounded-xl border border-neutral-800 p-4 overflow-hidden">
                  <div className="flex gap-2 mb-4 border-b border-neutral-800 pb-2">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  </div>
                  <span className="text-blue-400"># Tiêu đề bài viết</span> <br />
                  <span className="text-white">Nội dung in đậm:</span> <span className="text-yellow-400">**Bold**</span> <br />
                  <span className="text-white">Code block:</span> <br />
                  <span className="text-green-400">```javascript</span> <br />
                  <span className="text-purple-400">const</span> shiku = <span className="text-orange-400">"Awesome"</span>; <br />
                  <span className="text-green-400">```</span>
                </div>
                {/* Floating UI Element */}
                <div className="absolute bottom-10 right-10 bg-white text-black px-4 py-2 rounded-full font-bold shadow-lg rotate-[-5deg] group-hover:rotate-0 transition-transform">
                  Rendered ✨
                </div>
              </div>
            )}

            {align === "left" && title.includes("Kết nối") && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="relative">
                  <div className="w-24 h-24 bg-neutral-800 rounded-full flex items-center justify-center border border-neutral-700 relative z-10">
                    <MessageCircle size={40} className="text-white" />
                  </div>
                  {/* Ripple Effects */}
                  <div className="absolute inset-0 rounded-full border border-white/20 animate-ping [animation-duration:2s]"></div>
                  <div className="absolute inset-0 rounded-full border border-white/10 animate-ping [animation-duration:2s] [animation-delay:0.5s]"></div>

                  {/* Connecting lines */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[1px] bg-gradient-to-r from-transparent via-white/50 to-transparent rotate-45"></div>
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[1px] bg-gradient-to-r from-transparent via-white/50 to-transparent -rotate-45"></div>

                  {/* Avatars popping */}
                  <div className="absolute -top-12 -left-12 w-12 h-12 bg-white rounded-full border-4 border-black z-20 animate-bounce"></div>
                  <div className="absolute -bottom-8 -right-12 w-10 h-10 bg-neutral-400 rounded-full border-4 border-black z-20 animate-bounce [animation-delay:0.2s]"></div>
                </div>
              </div>
            )}

            {align === "right" && title.includes("Cộng đồng") && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="grid grid-cols-2 gap-4 rotate-12 scale-110 group-hover:rotate-0 group-hover:scale-100 transition-all duration-700">
                  <div className="bg-white text-black p-4 rounded-2xl shadow-xl w-40 h-32 flex flex-col justify-between">
                    <Hash size={24} />
                    <span className="font-bold">Dev Community</span>
                  </div>
                  <div className="bg-neutral-800 text-white p-4 rounded-2xl shadow-xl w-40 h-32 flex flex-col justify-between mt-8">
                    <Calendar size={24} />
                    <span className="font-bold">Tech Event 2024</span>
                  </div>
                  <div className="bg-neutral-900 text-white border border-neutral-700 p-4 rounded-2xl shadow-xl w-40 h-32 flex flex-col justify-between -mt-8">
                    <Radio size={24} />
                    <span className="font-bold">Live Podcast</span>
                  </div>
                  <div className="bg-neutral-200 text-black p-4 rounded-2xl shadow-xl w-40 h-32 flex flex-col justify-between">
                    <Layers size={24} />
                    <span className="font-bold">Design Team</span>
                  </div>
                </div>
              </div>
            )}

          </div>
        </motion.div>

      </div>
    </div>
  );
};

// --- MAIN PAGE ---
export default function Tour() {
  const { scrollYProgress } = useScroll();
  const scaleX = useTransform(scrollYProgress, [0, 1], [0, 1]);

  return (
    <div className="bg-black min-h-screen text-white font-sans selection:bg-white selection:text-black overflow-x-hidden">

      {/* Progress Bar */}
      <motion.div
        className="fixed top-0 left-0 right-0 h-1 bg-white origin-left z-50"
        style={{ scaleX }}
      />

      {/* NAVBAR */}
      <nav className="fixed top-0 w-full z-40 border-b border-white/10 bg-black/50 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group">
          </Link>
          <Link to="/register" className="text-sm font-bold hover:underline">
            Bỏ qua giới thiệu →
          </Link>
        </div>
      </nav>

      {/* HERO: SHIKU UNIVERSE */}
      <section className="relative h-screen flex flex-col items-center justify-center overflow-hidden">
        <GridPattern />
        <div className="absolute inset-0 z-0 opacity-50"><Meteors number={30} /></div>

        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, ease: "circOut" }}
          className="relative z-10 text-center px-4"
        >
          <h1 className="text-6xl md:text-9xl font-black tracking-tighter mb-4">
            SHIKU <br /> <span className="text-transparent bg-clip-text bg-gradient-to-b from-neutral-200 to-neutral-800">UNIVERSE</span>
          </h1>
          <p className="text-xl md:text-2xl text-neutral-400 font-medium max-w-2xl mx-auto mt-6">
            Không chỉ là lướt. Đây là hành trình kiến tạo không gian số của riêng bạn.
          </p>
        </motion.div>

        <div className="absolute bottom-10 animate-bounce">
          <div className="w-[1px] h-16 bg-gradient-to-b from-white to-transparent"></div>
        </div>
      </section>

      {/* FEATURE 1: AI INTELLIGENCE */}
      <FeatureShowcase
        title="Trí tuệ nhân tạo đồng hành"
        subtitle="INTELLIGENCE"
        icon={Bot}
        align="left"
      >
        Tích hợp <strong>Chatbot AI</strong> thông minh ngay trong ứng dụng. Hỗ trợ bạn lên ý tưởng viết bài, tóm tắt thảo luận và giải đáp mọi thắc mắc 24/7. Sáng tạo chưa bao giờ dễ dàng đến thế.
      </FeatureShowcase>

      {/* FEATURE 2: MARKDOWN EDITOR */}
      <FeatureShowcase
        title="Sáng tạo không giới hạn"
        subtitle="CREATION"
        icon={Hash}
        align="right"
      >
        Trình soạn thảo hỗ trợ <strong>Markdown</strong> mạnh mẽ. Định dạng văn bản, chèn code, tạo checklist - biến bài viết của bạn thành một tác phẩm được trình bày chuyên nghiệp.
      </FeatureShowcase>

      {/* FEATURE 3: REAL-TIME */}
      <FeatureShowcase
        title="Kết nối thời gian thực"
        subtitle="SYNC"
        icon={Zap}
        align="left"
      >
        Hệ thống <strong>Socket.io</strong> tiên tiến đảm bảo tin nhắn, thông báo và cuộc gọi Video Call đến ngay lập tức. Không độ trễ, không chờ đợi, cảm xúc trọn vẹn.
      </FeatureShowcase>

      {/* FEATURE 4: COMMUNITY */}
      <FeatureShowcase
        title="Cộng đồng & Sự kiện"
        subtitle="COMMUNITY"
        icon={Users}
        align="right"
      >
        Tìm kiếm bộ lạc của bạn. Tham gia các <strong>Nhóm</strong> chuyên sâu, tổ chức <strong>Sự kiện</strong> và kết nối với những người cùng đam mê. Mạng xã hội thực sự là về con người.
      </FeatureShowcase>

      {/* CTA FOOTER */}
      <section className="py-32 px-4 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-white text-black [mask-image:radial-gradient(circle_at_center,white,transparent_80%)] z-0 opacity-10"></div>
        <div className="relative z-10 max-w-4xl mx-auto">
          <h2 className="text-5xl md:text-7xl font-black mb-8 tracking-tight">
            Bắt đầu hành trình của bạn.
          </h2>
          <Link
            to="/register"
            className="group inline-flex items-center gap-4 px-12 py-6 rounded-full bg-white text-black font-bold text-xl hover:scale-105 transition-transform shadow-[0_0_40px_-10px_rgba(255,255,255,0.5)]"
          >
            Đăng ký ngay <ArrowRight className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </section>

    </div>
  );
}
