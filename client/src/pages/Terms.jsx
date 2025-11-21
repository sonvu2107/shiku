import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { PageLayout, PageHeader, SpotlightCard } from '../components/ui/DesignSystem';
import { Shield, Lock, Users, AlertTriangle, CheckCircle2, FileText, Gavel, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';

// Icon component phụ trợ (nếu chưa import đủ)
const UserCheck = ({ size, className }) => (
   <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><polyline points="16 11 18 13 22 9"/></svg>
);
const MessageSquare = ({ size, className }) => (
   <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
);

export default function Terms() {
  const [activeSection, setActiveSection] = useState('terms');

  const sections = [
    { id: 'terms', label: 'Điều khoản sử dụng', icon: FileText },
    { id: 'privacy', label: 'Chính sách quyền riêng tư', icon: Lock },
    { id: 'community', label: 'Tiêu chuẩn cộng đồng', icon: Users },
  ];

  const renderContent = () => {
    switch (activeSection) {
      case 'privacy':
        return (
          <div className="space-y-6">
             <SpotlightCard className="border-l-4 border-l-green-500">
                <h3 className="text-xl font-bold mb-2 flex items-center gap-2"><Shield className="text-green-500"/> Thu thập dữ liệu</h3>
                <p className="text-neutral-600 dark:text-neutral-400">
                   Chúng tôi chỉ thu thập những thông tin cần thiết để cung cấp dịch vụ: Tên, Email, và Ảnh đại diện. Chúng tôi <strong>không bao giờ</strong> bán dữ liệu của bạn cho bên thứ ba.
                </p>
             </SpotlightCard>
             <SpotlightCard className="border-l-4 border-l-blue-500">
                <h3 className="text-xl font-bold mb-2 flex items-center gap-2"><Lock className="text-blue-500"/> Bảo mật</h3>
                <p className="text-neutral-600 dark:text-neutral-400">
                   Mật khẩu của bạn được mã hóa một chiều (hash). Tin nhắn riêng tư được mã hóa đầu cuối (E2EE) để đảm bảo chỉ người gửi và người nhận đọc được.
                </p>
             </SpotlightCard>
          </div>
        );
      case 'community':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <SpotlightCard className="bg-green-50/50 dark:bg-green-900/10 border-green-200 dark:border-green-800">
                <h3 className="text-lg font-bold text-green-700 dark:text-green-400 mb-3 flex items-center gap-2">
                   <CheckCircle2 size={20}/> Nên làm
                </h3>
                <ul className="space-y-2 text-sm text-neutral-600 dark:text-neutral-300">
                   <li>• Tôn trọng ý kiến của người khác.</li>
                   <li>• Chia sẻ kiến thức bổ ích.</li>
                   <li>• Báo cáo nội dung xấu.</li>
                </ul>
             </SpotlightCard>
             <SpotlightCard className="bg-red-50/50 dark:bg-red-900/10 border-red-200 dark:border-red-800">
                <h3 className="text-lg font-bold text-red-700 dark:text-red-400 mb-3 flex items-center gap-2">
                   <AlertTriangle size={20}/> Không được làm
                </h3>
                <ul className="space-y-2 text-sm text-neutral-600 dark:text-neutral-300">
                   <li>• Spam hoặc quấy rối người khác.</li>
                   <li>• Đăng tải nội dung đồi trụy, bạo lực.</li>
                   <li>• Mạo danh người khác.</li>
                </ul>
             </SpotlightCard>
          </div>
        );
      default: // Terms
        return (
          <div className="space-y-8">
             <div className="prose dark:prose-invert max-w-none">
                <p className="text-lg text-neutral-500 font-medium">
                   Chào mừng bạn đến với Shiku. Khi sử dụng nền tảng của chúng tôi, bạn đồng ý với các điều khoản sau đây.
                </p>
             </div>
             
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <SpotlightCard>
                   <div className="w-10 h-10 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mb-4">
                      <UserCheck size={20} className="text-neutral-900 dark:text-white"/>
                   </div>
                   <h4 className="font-bold mb-2">1. Tài khoản</h4>
                   <p className="text-sm text-neutral-500">Bạn chịu trách nhiệm bảo mật tài khoản của mình. Vui lòng không chia sẻ mật khẩu.</p>
                </SpotlightCard>
                <SpotlightCard>
                   <div className="w-10 h-10 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mb-4">
                      <MessageSquare size={20} className="text-neutral-900 dark:text-white"/>
                   </div>
                   <h4 className="font-bold mb-2">2. Nội dung</h4>
                   <p className="text-sm text-neutral-500">Bạn sở hữu nội dung mình đăng tải, nhưng cấp cho chúng tôi quyền hiển thị nó trên dịch vụ.</p>
                </SpotlightCard>
                <SpotlightCard>
                   <div className="w-10 h-10 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mb-4">
                      <Gavel size={20} className="text-neutral-900 dark:text-white"/>
                   </div>
                   <h4 className="font-bold mb-2">3. Chấm dứt</h4>
                   <p className="text-sm text-neutral-500">Chúng tôi có quyền khóa tài khoản nếu bạn vi phạm nghiêm trọng các tiêu chuẩn cộng đồng.</p>
                </SpotlightCard>
             </div>
          </div>
        );
    }
  };

  return (
    <PageLayout>
      <PageHeader 
         title="Điều khoản & Chính sách" 
         subtitle="Những quy tắc giúp cộng đồng Shiku luôn an toàn và văn minh."
         action={
            <Link to="/" className="flex items-center gap-2 text-sm font-medium text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors">
               <ArrowLeft size={16} />
               Quay lại
            </Link>
         }
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
         {/* Sidebar Navigation */}
         <div className="lg:col-span-3">
            <div className="sticky top-24 space-y-2">
               {sections.map((section) => (
                  <button
                     key={section.id}
                     onClick={() => setActiveSection(section.id)}
                     className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${
                        activeSection === section.id
                           ? 'bg-black dark:bg-white text-white dark:text-black shadow-lg scale-105'
                           : 'text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-neutral-200'
                     }`}
                  >
                     <section.icon size={18} />
                     {section.label}
                  </button>
               ))}
            </div>
         </div>

         {/* Content Area */}
         <div className="lg:col-span-9">
            <motion.div
               key={activeSection}
               initial={{ opacity: 0, x: 20 }}
               animate={{ opacity: 1, x: 0 }}
               transition={{ duration: 0.3 }}
            >
               <div className="mb-8 pb-4 border-b border-neutral-200 dark:border-neutral-800">
                  <h2 className="text-2xl font-black text-neutral-900 dark:text-white">
                     {sections.find(s => s.id === activeSection)?.label}
                  </h2>
               </div>
               
               {renderContent()}

               <div className="mt-12 p-6 rounded-2xl bg-neutral-100 dark:bg-neutral-900 text-center">
                  <p className="text-sm text-neutral-500 mb-2">Cập nhật lần cuối: 21/11/2025</p>
                  <p className="text-sm font-medium">
                     Nếu có thắc mắc, vui lòng liên hệ <a href="mailto:support@shiku.click" className="text-blue-600 hover:underline">support@shiku.click</a>
                  </p>
               </div>
            </motion.div>
         </div>
      </div>
    </PageLayout>
  );
}
