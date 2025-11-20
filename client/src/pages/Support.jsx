import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Search, HelpCircle, MessageCircle, FileText, Shield, 
  ChevronDown, ChevronUp, Mail, Zap, Lock, User 
} from "lucide-react";
import { PageLayout, SpotlightCard } from "../components/ui/DesignSystem";

// --- DATA MOCKUP ---
const CATEGORIES = [
  { id: 'start', label: 'Bắt đầu', icon: Zap, desc: 'Hướng dẫn cho người mới' },
  { id: 'account', label: 'Tài khoản', icon: User, desc: 'Cài đặt & Hồ sơ' },
  { id: 'security', label: 'Bảo mật', icon: Shield, desc: '2FA & Mật khẩu' },
  { id: 'privacy', label: 'Riêng tư', icon: Lock, desc: 'Quản lý hiển thị' },
];

const FAQS = [
  {
    question: "Làm thế nào để đổi ảnh đại diện?",
    answer: "Bạn có thể đổi ảnh đại diện bằng cách vào trang Hồ sơ (Profile) -> Nhấn vào nút 'Chỉnh sửa' -> Nhấn vào biểu tượng Camera trên ảnh đại diện hiện tại."
  },
  {
    question: "Shiku có bảo mật không?",
    answer: "Tuyệt đối. Chúng tôi sử dụng mã hóa đầu cuối cho tin nhắn và tuân thủ các tiêu chuẩn bảo mật nghiêm ngặt nhất để bảo vệ dữ liệu của bạn."
  },
  {
    question: "Làm sao để tạo một Nhóm mới?",
    answer: "Tại trang Nhóm (Groups), nhấn vào nút dấu cộng (+) hoặc 'Tạo nhóm'. Điền thông tin cần thiết và nhấn Tạo."
  },
  {
    question: "Tôi có thể khôi phục bài viết đã xóa không?",
    answer: "Hiện tại, bài viết đã xóa sẽ không thể khôi phục. Vui lòng cân nhắc kỹ trước khi thực hiện thao tác xóa."
  }
];

// --- SUB-COMPONENT: FAQ ITEM ---
const FaqItem = ({ item, isOpen, onClick }) => {
  return (
    <div className="border-b border-neutral-200 dark:border-neutral-800 last:border-0">
      <button
        onClick={onClick}
        className="w-full py-5 flex items-center justify-between text-left group transition-colors"
      >
        <span className={`text-base md:text-lg font-medium transition-colors ${isOpen ? 'text-blue-600 dark:text-blue-400' : 'text-neutral-900 dark:text-white group-hover:text-neutral-600 dark:group-hover:text-neutral-300'}`}>
          {item.question}
        </span>
        <div className={`p-2 rounded-full bg-neutral-100 dark:bg-neutral-800 transition-all duration-300 ${isOpen ? 'rotate-180 bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : ''}`}>
           {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </div>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <p className="pb-6 text-neutral-600 dark:text-neutral-400 leading-relaxed text-sm md:text-base">
              {item.answer}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default function Support() {
  const [searchQuery, setSearchQuery] = useState("");
  const [openFaqIndex, setOpenFaqIndex] = useState(null);

  const filteredFaqs = FAQS.filter(f => 
    f.question.toLowerCase().includes(searchQuery.toLowerCase()) || 
    f.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <PageLayout>
      {/* --- HEADER & SEARCH (Căn giữa, thoáng hơn) --- */}
      <div className="text-center max-w-4xl mx-auto mb-20 px-4">
        <motion.div
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50/50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-xs font-bold mb-8 uppercase tracking-widest border border-blue-100 dark:border-blue-800"
        >
           <HelpCircle size={14} /> Trung tâm trợ giúp
        </motion.div>
        
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-black tracking-tight text-neutral-900 dark:text-white mb-8 leading-[1.1]">
           Chúng tôi có thể giúp gì <br className="hidden md:block" /> cho bạn?
        </h1>

        <div className="relative max-w-2xl mx-auto group z-20">
           <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-500"></div>
           <div className="relative bg-white dark:bg-[#1C1C1E] rounded-2xl flex items-center p-2 shadow-2xl border border-neutral-100 dark:border-neutral-800">
              <Search className="ml-4 text-neutral-400 w-6 h-6" />
              <input 
                type="text" 
                placeholder="Nhập từ khóa tìm kiếm (ví dụ: mật khẩu, bảo mật...)" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full p-4 bg-transparent border-none outline-none text-lg text-neutral-900 dark:text-white placeholder-neutral-400 font-medium"
              />
           </div>
        </div>
      </div>

      {/* --- CATEGORIES GRID (Khoảng cách rộng hơn) --- */}
      <div className="mb-24">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {CATEGORIES.map((cat, index) => (
            <motion.div
              key={cat.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
            >
              <SpotlightCard className="h-full flex flex-col items-center text-center hover:border-blue-500/30 dark:hover:border-blue-500/30 cursor-pointer group py-8 px-6 transition-colors">
                 <div className="flex items-center justify-center gap-4 mb-4">
                    <div className="w-16 h-16 rounded-3xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 text-neutral-900 dark:text-white shadow-sm flex-shrink-0">
                       <cat.icon size={32} strokeWidth={1.5} />
                    </div>
                    <h3 className="font-bold text-xl text-neutral-900 dark:text-white">{cat.label}</h3>
                 </div>
                 <p className="text-sm text-neutral-500 dark:text-neutral-400 font-medium">{cat.desc}</p>
              </SpotlightCard>
            </motion.div>
          ))}
        </div>
      </div>

      {/* --- FAQ SECTION (Tách biệt rõ ràng) --- */}
      <div className="max-w-4xl mx-auto mb-32">
         <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-neutral-900 dark:text-white tracking-tight">Câu hỏi thường gặp</h2>
            <p className="text-neutral-500 dark:text-neutral-400 text-lg">
               Giải đáp nhanh những thắc mắc phổ biến nhất từ cộng đồng.
            </p>
         </div>

         <div className="bg-white dark:bg-[#1C1C1E] rounded-[32px] p-6 md:p-10 shadow-xl shadow-neutral-200/20 dark:shadow-none border border-neutral-100 dark:border-neutral-800">
            {filteredFaqs.length > 0 ? (
              filteredFaqs.map((faq, index) => (
                 <FaqItem 
                   key={index} 
                   item={faq} 
                   isOpen={openFaqIndex === index} 
                   onClick={() => setOpenFaqIndex(openFaqIndex === index ? null : index)} 
                 />
              ))
            ) : (
              <div className="text-center py-16 text-neutral-500">
                 <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                 <p>Không tìm thấy kết quả phù hợp với "{searchQuery}".</p>
              </div>
            )}
         </div>
         
         {/* Nút Chat với Support - Căn giữa và tách biệt */}
         <div className="mt-10 text-center">
            <p className="text-neutral-500 mb-4 font-medium">Chưa tìm thấy câu trả lời?</p>
            <button className="inline-flex items-center gap-3 px-8 py-4 bg-neutral-900 dark:bg-white text-white dark:text-black rounded-full font-bold text-lg hover:scale-105 hover:shadow-lg transition-all duration-300 group">
               <MessageCircle size={20} className="group-hover:-rotate-12 transition-transform" /> 
               Chat trực tiếp với Support
            </button>
         </div>
      </div>

      {/* --- CONTACT FOOTER (Tách biệt) --- */}
      <div className="relative rounded-[40px] overflow-hidden bg-black dark:bg-neutral-900 text-white p-12 md:p-20 text-center border border-neutral-800">
         {/* Background pattern nhẹ */}
         <div className="absolute inset-0 opacity-30 bg-[radial-gradient(#ffffff33_1px,transparent_1px)] [background-size:20px_20px]"></div>
         <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80"></div>
         
         <div className="relative z-10 max-w-2xl mx-auto">
            <div className="w-20 h-20 bg-white/10 backdrop-blur-sm rounded-3xl flex items-center justify-center mx-auto mb-8 border border-white/10">
               <Mail size={40} className="text-white" />
            </div>
            <h2 className="text-3xl md:text-5xl font-black mb-6 tracking-tight leading-tight">Vẫn cần sự trợ giúp chuyên sâu?</h2>
            <p className="text-neutral-400 mb-10 text-lg md:text-xl leading-relaxed">
               Đội ngũ kỹ thuật của Shiku luôn sẵn sàng lắng nghe bạn 24/7. <br className="hidden md:block"/> Đừng ngần ngại liên hệ với chúng tôi.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
               <a href="mailto:support@shiku.click" className="w-full sm:w-auto px-8 py-4 rounded-full bg-white text-black font-bold text-lg hover:bg-neutral-200 transition-colors shadow-lg shadow-white/10">
                  Gửi Email Hỗ Trợ
               </a>
               <button className="w-full sm:w-auto px-8 py-4 rounded-full border border-neutral-700 bg-transparent hover:bg-neutral-800 font-bold text-lg transition-colors text-white">
                  Xem Tài liệu API
               </button>
            </div>
         </div>
      </div>

    </PageLayout>
  );
}
