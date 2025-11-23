import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Search, HelpCircle, MessageCircle, FileText, Shield, 
  ChevronDown, ChevronUp, Mail, Zap, Lock, User, Plus, Clock, CheckCircle, AlertCircle, X, Send
} from "lucide-react";
import { PageLayout, SpotlightCard } from "../components/ui/DesignSystem";
import { api } from "../api";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";

// --- DATA MOCKUP ---
const CATEGORIES = [
  { id: 'start', label: 'Bắt đầu', icon: Zap, desc: 'Hướng dẫn cho người mới' },
  { id: 'account', label: 'Tài khoản', icon: User, desc: 'Cài đặt & Hồ sơ' },
  { id: 'security', label: 'Bảo mật', icon: Shield, desc: '2FA & Mật khẩu' },
  { id: 'privacy', label: 'Riêng tư', icon: Lock, desc: 'Quản lý hiển thị' },
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
            <p className="pb-6 text-neutral-600 dark:text-neutral-400 leading-relaxed text-sm md:text-base whitespace-pre-line">
              {item.answer}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// --- SUB-COMPONENT: TICKET ITEM ---
const TicketItem = ({ ticket, onClick }) => {
  const getStatusColor = (status) => {
    switch (status) {
      case 'open': return 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400';
      case 'in_progress': return 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'resolved': return 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400';
      case 'closed': return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'open': return 'Mới';
      case 'in_progress': return 'Đang xử lý';
      case 'resolved': return 'Đã giải quyết';
      case 'closed': return 'Đã đóng';
      default: return status;
    }
  };

  return (
    <div 
      onClick={onClick}
      className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 hover:border-blue-500 dark:hover:border-blue-500 cursor-pointer transition-all bg-white dark:bg-[#1C1C1E] group"
    >
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-bold text-neutral-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-1">
          {ticket.subject}
        </h3>
        <span className={`text-xs font-bold px-2 py-1 rounded-full whitespace-nowrap ml-2 ${getStatusColor(ticket.status)}`}>
          {getStatusLabel(ticket.status)}
        </span>
      </div>
      <p className="text-sm text-neutral-500 dark:text-neutral-400 line-clamp-2 mb-3">
        {ticket.message}
      </p>
      <div className="flex items-center justify-between text-xs text-neutral-400">
        <span>#{ticket._id.slice(-6)}</span>
        <span>{formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true, locale: vi })}</span>
      </div>
    </div>
  );
};

// --- SUB-COMPONENT: CREATE TICKET FORM ---
const CreateTicketForm = ({ onSubmit, onCancel, loading }) => {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState("other");
  const [priority, setPriority] = useState("medium");

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ subject, message, category, priority });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Tiêu đề</label>
        <input
          type="text"
          required
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="w-full p-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
          placeholder="Tóm tắt vấn đề của bạn"
          minLength={5}
        />
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Danh mục</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full p-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="technical">Kỹ thuật</option>
            <option value="account">Tài khoản</option>
            <option value="security">Bảo mật</option>
            <option value="feature">Tính năng</option>
            <option value="bug">Báo lỗi</option>
            <option value="other">Khác</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Mức độ ưu tiên</label>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="w-full p-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="low">Thấp</option>
            <option value="medium">Trung bình</option>
            <option value="high">Cao</option>
            <option value="urgent">Khẩn cấp</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Nội dung chi tiết</label>
        <textarea
          required
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={5}
          className="w-full p-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none resize-none"
          placeholder="Mô tả chi tiết vấn đề bạn đang gặp phải..."
          minLength={10}
        />
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-3 rounded-xl border border-neutral-200 dark:border-neutral-700 font-medium hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors text-neutral-700 dark:text-neutral-300"
        >
          Hủy
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex-1 py-3 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-black font-bold hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Đang gửi..." : "Gửi yêu cầu"}
        </button>
      </div>
    </form>
  );
};

// --- SUB-COMPONENT: TICKET DETAIL ---
const TicketDetail = ({ ticket, onClose, onReply, loading }) => {
  const [replyMessage, setReplyMessage] = useState("");
  const messagesEndRef = React.useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [ticket.replies]);

  const handleReply = (e) => {
    e.preventDefault();
    if (!replyMessage.trim()) return;
    onReply(ticket._id, replyMessage);
    setReplyMessage("");
  };

  return (
    <div className="flex flex-col h-[600px] max-h-[80vh]">
      <div className="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-800">
        <div>
          <h3 className="font-bold text-lg text-neutral-900 dark:text-white">{ticket.subject}</h3>
          <div className="flex items-center gap-2 text-xs text-neutral-500">
            <span>#{ticket._id.slice(-6)}</span>
            <span>•</span>
            <span>{formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true, locale: vi })}</span>
          </div>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full">
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Original Message */}
        <div className="flex gap-3">
          <div className="w-8 h-8 rounded-full bg-neutral-200 dark:bg-neutral-700 flex-shrink-0 overflow-hidden">
            {ticket.user?.avatarUrl ? (
              <img src={ticket.user.avatarUrl} alt="User" className="w-full h-full object-cover" />
            ) : (
              <User className="w-full h-full p-1.5 text-neutral-500" />
            )}
          </div>
          <div className="flex-1">
            <div className="bg-neutral-100 dark:bg-neutral-800 p-3 rounded-2xl rounded-tl-none inline-block max-w-[85%]">
              <p className="text-sm text-neutral-800 dark:text-neutral-200 whitespace-pre-wrap">{ticket.message}</p>
            </div>
            <div className="text-xs text-neutral-400 mt-1 ml-1">
              {formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true, locale: vi })}
            </div>
          </div>
        </div>

        {/* Replies */}
        {ticket.replies?.map((reply, idx) => {
          const isStaff = reply.isStaff;
          return (
            <div key={idx} className={`flex gap-3 ${isStaff ? 'flex-row-reverse' : ''}`}>
              <div className={`w-8 h-8 rounded-full flex-shrink-0 overflow-hidden ${isStaff ? 'bg-blue-100' : 'bg-neutral-200 dark:bg-neutral-700'}`}>
                {reply.user?.avatarUrl ? (
                  <img src={reply.user.avatarUrl} alt="User" className="w-full h-full object-cover" />
                ) : (
                  isStaff ? <Shield className="w-full h-full p-1.5 text-blue-600" /> : <User className="w-full h-full p-1.5 text-neutral-500" />
                )}
              </div>
              <div className={`flex-1 flex flex-col ${isStaff ? 'items-end' : 'items-start'}`}>
                <div className={`p-3 rounded-2xl inline-block max-w-[85%] ${
                  isStaff 
                    ? 'bg-blue-600 text-white rounded-tr-none' 
                    : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 rounded-tl-none'
                }`}>
                  <p className="text-sm whitespace-pre-wrap">{reply.message}</p>
                </div>
                <div className="text-xs text-neutral-400 mt-1 mx-1">
                  {formatDistanceToNow(new Date(reply.createdAt), { addSuffix: true, locale: vi })}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {ticket.status !== 'closed' && (
        <form onSubmit={handleReply} className="p-4 border-t border-neutral-200 dark:border-neutral-800 flex gap-2">
          <input
            type="text"
            value={replyMessage}
            onChange={(e) => setReplyMessage(e.target.value)}
            placeholder="Nhập tin nhắn trả lời..."
            className="flex-1 p-3 rounded-full border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button 
            type="submit" 
            disabled={!replyMessage.trim() || loading}
            className="p-3 bg-neutral-900 dark:bg-white text-white dark:text-black rounded-full hover:bg-neutral-800 dark:hover:bg-neutral-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send size={20} />
          </button>
        </form>
      )}
    </div>
  );
};

export default function Support({ user }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [openFaqIndex, setOpenFaqIndex] = useState(null);
  const [activeTab, setActiveTab] = useState("faq"); // 'faq', 'tickets', 'create'
  
  // Data states
  const [faqs, setFaqs] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch FAQs on mount
  useEffect(() => {
    const fetchFaqs = async () => {
      try {
        const res = await api("/api/support/faqs");
        if (res && res.faqs) {
          setFaqs(res.faqs);
        }
      } catch (err) {
        console.error("Failed to fetch FAQs", err);
      }
    };
    fetchFaqs();
  }, []);

  // Fetch Tickets when tab changes to 'tickets'
  useEffect(() => {
    if (activeTab === 'tickets' && user) {
      fetchTickets();
    }
  }, [activeTab, user]);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const res = await api("/api/support/tickets");
      if (res && res.tickets) {
        setTickets(res.tickets);
      }
    } catch (err) {
      console.error("Failed to fetch tickets", err);
      setError("Không thể tải danh sách yêu cầu hỗ trợ");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTicket = async (data) => {
    setLoading(true);
    try {
      await api("/api/support/tickets", {
        method: "POST",
        body: data
      });
      setActiveTab('tickets');
      fetchTickets();
    } catch (err) {
      alert(err.message || "Có lỗi xảy ra khi tạo ticket");
    } finally {
      setLoading(false);
    }
  };

  const handleReplyTicket = async (ticketId, message) => {
    setLoading(true);
    try {
      const res = await api(`/api/support/tickets/${ticketId}/reply`, {
        method: "POST",
        body: { message }
      });
      
      // Update selected ticket with new reply
      if (res && res.ticket) {
        setSelectedTicket(res.ticket);
        // Update in list as well
        setTickets(prev => prev.map(t => t._id === ticketId ? res.ticket : t));
      }
    } catch (err) {
      alert(err.message || "Có lỗi xảy ra khi gửi tin nhắn");
    } finally {
      setLoading(false);
    }
  };

  const filteredFaqs = faqs.filter(f => 
    f.question.toLowerCase().includes(searchQuery.toLowerCase()) || 
    f.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <PageLayout>
      {/* --- HEADER & SEARCH --- */}
      <div className="text-center max-w-4xl mx-auto mb-12 px-4">
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

        <div className="relative max-w-2xl mx-auto group z-20 mb-8">
           <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-500"></div>
           <div className="relative bg-white dark:bg-[#1C1C1E] rounded-2xl flex items-center p-2 shadow-2xl border border-neutral-100 dark:border-neutral-800">
              <Search className="ml-4 text-neutral-400 w-6 h-6" />
              <input 
                type="text" 
                placeholder="Nhập từ khóa tìm kiếm..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full p-4 bg-transparent border-none outline-none text-lg text-neutral-900 dark:text-white placeholder-neutral-400 font-medium"
              />
           </div>
        </div>

        {/* Navigation Tabs */}
        {user && (
          <div className="flex justify-center gap-2 mb-8">
            <button
              onClick={() => setActiveTab('faq')}
              className={`px-6 py-2 rounded-full font-medium transition-all ${
                activeTab === 'faq' 
                  ? 'bg-neutral-900 dark:bg-white text-white dark:text-black shadow-lg' 
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700'
              }`}
            >
              Câu hỏi thường gặp
            </button>
            <button
              onClick={() => setActiveTab('tickets')}
              className={`px-6 py-2 rounded-full font-medium transition-all ${
                activeTab === 'tickets' || activeTab === 'create'
                  ? 'bg-neutral-900 dark:bg-white text-white dark:text-black shadow-lg' 
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700'
              }`}
            >
              Yêu cầu hỗ trợ
            </button>
          </div>
        )}
      </div>

      {/* --- CONTENT AREA --- */}
      <div className="max-w-4xl mx-auto mb-32 px-4">
        <AnimatePresence mode="wait">
          {activeTab === 'faq' && (
            <motion.div
              key="faq"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              {/* Categories */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
                {CATEGORIES.map((cat, index) => (
                  <SpotlightCard key={cat.id} className="flex flex-col items-center text-center p-6 cursor-pointer hover:border-blue-500/30 transition-colors">
                     <div className="w-12 h-12 rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mb-3 text-neutral-900 dark:text-white">
                        <cat.icon size={24} />
                     </div>
                     <h3 className="font-bold text-neutral-900 dark:text-white">{cat.label}</h3>
                     <p className="text-xs text-neutral-500 mt-1">{cat.desc}</p>
                  </SpotlightCard>
                ))}
              </div>

              {/* FAQ List */}
              <div className="bg-white dark:bg-[#1C1C1E] rounded-[32px] p-6 md:p-10 shadow-xl shadow-neutral-200/20 dark:shadow-none border border-neutral-100 dark:border-neutral-800">
                {filteredFaqs.length > 0 ? (
                  filteredFaqs.map((faq, index) => (
                     <FaqItem 
                       key={faq._id || index} 
                       item={faq} 
                       isOpen={openFaqIndex === index} 
                       onClick={() => setOpenFaqIndex(openFaqIndex === index ? null : index)} 
                     />
                  ))
                ) : (
                  <div className="text-center py-16 text-neutral-500">
                     <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                     <p>Không tìm thấy kết quả phù hợp.</p>
                  </div>
                )}
              </div>

              {/* CTA */}
              {!user ? (
                <div className="mt-10 text-center">
                  <p className="text-neutral-500 mb-4 font-medium">Cần hỗ trợ thêm?</p>
                  <Link to="/login" className="inline-flex items-center gap-3 px-8 py-4 bg-neutral-900 dark:bg-white text-white dark:text-black rounded-full font-bold text-lg hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-all shadow-lg shadow-neutral-500/30">
                     Đăng nhập để tạo yêu cầu
                  </Link>
                </div>
              ) : (
                <div className="mt-10 text-center">
                  <p className="text-neutral-500 mb-4 font-medium">Chưa tìm thấy câu trả lời?</p>
                  <button 
                    onClick={() => setActiveTab('create')}
                    className="inline-flex items-center gap-3 px-8 py-4 bg-neutral-900 dark:bg-white text-white dark:text-black rounded-full font-bold text-lg hover:scale-105 hover:shadow-lg transition-all duration-300 group"
                  >
                     <MessageCircle size={20} className="group-hover:-rotate-12 transition-transform" /> 
                     Chat trực tiếp với Support
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {(activeTab === 'tickets' || activeTab === 'create') && (
            <motion.div
              key="tickets"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-white dark:bg-[#1C1C1E] rounded-[32px] p-6 md:p-8 shadow-xl shadow-neutral-200/20 dark:shadow-none border border-neutral-100 dark:border-neutral-800 min-h-[400px]"
            >
              {activeTab === 'create' ? (
                <div>
                  <div className="flex items-center gap-3 mb-6 pb-6 border-b border-neutral-200 dark:border-neutral-800">
                    <button onClick={() => setActiveTab('tickets')} className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full">
                      <ChevronDown className="rotate-90" size={24} />
                    </button>
                    <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">Tạo yêu cầu hỗ trợ mới</h2>
                  </div>
                  <CreateTicketForm 
                    onSubmit={handleCreateTicket} 
                    onCancel={() => setActiveTab('tickets')}
                    loading={loading}
                  />
                </div>
              ) : selectedTicket ? (
                <TicketDetail 
                  ticket={selectedTicket} 
                  onClose={() => setSelectedTicket(null)}
                  onReply={handleReplyTicket}
                  loading={loading}
                />
              ) : (
                <div>
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">Yêu cầu của tôi</h2>
                    <button 
                      onClick={() => setActiveTab('create')}
                      className="flex items-center gap-2 px-4 py-2 bg-neutral-900 dark:bg-white text-white dark:text-black rounded-full font-bold text-sm hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors"
                    >
                      <Plus size={18} /> Tạo mới
                    </button>
                  </div>

                  {loading && tickets.length === 0 ? (
                    <div className="text-center py-12 text-neutral-500">Đang tải...</div>
                  ) : tickets.length > 0 ? (
                    <div className="grid gap-4">
                      {tickets.map(ticket => (
                        <TicketItem 
                          key={ticket._id} 
                          ticket={ticket} 
                          onClick={() => setSelectedTicket(ticket)} 
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-16 text-neutral-500">
                      <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p className="mb-4">Bạn chưa có yêu cầu hỗ trợ nào.</p>
                      <button 
                        onClick={() => setActiveTab('create')}
                        className="text-blue-600 font-bold hover:underline"
                      >
                        Tạo yêu cầu đầu tiên
                      </button>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* --- CONTACT FOOTER --- */}
      <div className="relative rounded-[40px] overflow-hidden bg-black dark:bg-neutral-900 text-white p-12 md:p-20 text-center border border-neutral-800 mx-4 mb-12">
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
            </div>
         </div>
      </div>

    </PageLayout>
  );
}
