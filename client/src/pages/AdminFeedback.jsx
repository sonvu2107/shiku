import React, { useEffect, useState } from "react";
import { api } from "../api";
import {
  MessageSquare, HelpCircle, Search, Filter, CheckCircle,
  XCircle, Clock, AlertCircle, Plus, Edit, Trash2, MoreHorizontal,
  ChevronDown, ChevronUp, Send, User, Shield, X
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import { useToast } from "../contexts/ToastContext";

// --- SUB-COMPONENTS ---

const TicketDetailModal = ({ ticket, onClose, onReply, onStatusChange, loading }) => {
  const [replyMessage, setReplyMessage] = useState("");
  const messagesEndRef = React.useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [ticket.replies]);

  const handleReply = (e) => {
    e.preventDefault();
    if (!replyMessage.trim()) return;
    onReply(ticket._id, replyMessage);
    setReplyMessage("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-neutral-900 w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-gray-200/80 dark:border-gray-800/80 flex justify-between items-center bg-gray-50 dark:bg-neutral-800">
          <div>
            <h3 className="font-bold text-lg text-gray-900 dark:text-white flex items-center gap-2">
              {ticket.subject}
              <span className={`text-xs px-2 py-1 rounded-full ${ticket.status === 'Mở' ? 'bg-blue-100 text-blue-700' :
                ticket.status === 'Đang xử lý' ? 'bg-yellow-100 text-yellow-700' :
                  ticket.status === 'Đã giải quyết' ? 'bg-green-100 text-green-700' :
                    'bg-gray-100 text-gray-700'
                }`}>
                {ticket.status}
              </span>
            </h3>
            <div className="text-sm text-gray-500 flex items-center gap-2 mt-1">
              <span>Từ: {ticket.user?.name} ({ticket.user?.email})</span>
              <span>•</span>
              <span>{formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true, locale: vi })}</span>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full">
            <X size={20} />
          </button>
        </div>

        {/* Actions Bar */}
        <div className="p-3 border-b border-gray-200/80 dark:border-gray-800/80 flex gap-2 bg-white dark:bg-neutral-900">
          <select
            value={ticket.status}
            onChange={(e) => onStatusChange(ticket._id, e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 text-sm bg-white dark:bg-neutral-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors appearance-none cursor-pointer"
          >
            <option value="open">Mở</option>
            <option value="in_progress">Đang xử lý</option>
            <option value="resolved">Đã giải quyết</option>
            <option value="closed">Đóng</option>
          </select>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-neutral-950">
          {/* Original ticket message */}
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-gray-200 flex-shrink-0 overflow-hidden">
              <img src={ticket.user?.avatarUrl || `https://ui-avatars.com/api/?name=${ticket.user?.name}`} alt="" className="w-full h-full object-cover" />
            </div>
            <div className="flex-1">
              <div className="bg-white dark:bg-neutral-800 p-4 rounded-2xl rounded-tl-none shadow-sm border border-gray-200 dark:border-gray-700/50 inline-block max-w-[90%]">
                <p className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{ticket.message}</p>
              </div>
            </div>
          </div>

          {/* Replies */}
          {ticket.replies?.map((reply, idx) => (
            <div key={idx} className={`flex gap-3 ${reply.isStaff ? 'flex-row-reverse' : ''}`}>
              <div className={`w-8 h-8 rounded-full flex-shrink-0 overflow-hidden ${reply.isStaff ? 'bg-blue-100' : 'bg-gray-200'}`}>
                <img src={reply.user?.avatarUrl || `https://ui-avatars.com/api/?name=${reply.user?.name}`} alt="" className="w-full h-full object-cover" />
              </div>
              <div className={`flex-1 flex flex-col ${reply.isStaff ? 'items-end' : 'items-start'}`}>
                <div className={`p-4 rounded-2xl shadow-sm inline-block max-w-[90%] ${reply.isStaff
                  ? 'bg-blue-600 text-white rounded-tr-none'
                  : 'bg-white dark:bg-neutral-800 text-gray-800 dark:text-gray-200 rounded-tl-none border border-gray-200 dark:border-gray-700/50'
                  }`}>
                  <p className="whitespace-pre-wrap">{reply.message}</p>
                </div>
                <span className="text-xs text-gray-400 mt-1 mx-1">
                  {formatDistanceToNow(new Date(reply.createdAt), { addSuffix: true, locale: vi })}
                </span>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Reply input form */}
        <form onSubmit={handleReply} className="p-4 border-t border-gray-200/80 dark:border-gray-800/80 bg-white dark:bg-neutral-900 flex gap-2">
          <input
            type="text"
            value={replyMessage}
            onChange={(e) => setReplyMessage(e.target.value)}
            placeholder="Nhập câu trả lời..."
            className="flex-1 px-4 py-2 rounded-full border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
          />
          <button
            type="submit"
            disabled={!replyMessage.trim() || loading}
            className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50"
          >
            <Send size={20} />
          </button>
        </form>
      </div>
    </div>
  );
};

const FAQModal = ({ faq, onClose, onSave, loading }) => {
  const [formData, setFormData] = useState({
    question: faq?.question || "",
    answer: faq?.answer || "",
    category: faq?.category || "other",
    order: faq?.order || 0,
    isPublished: faq?.isPublished ?? true
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-neutral-900 w-full max-w-lg rounded-2xl shadow-2xl p-6">
        <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
          {faq ? "Chỉnh sửa FAQ" : "Thêm FAQ mới"}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Câu hỏi</label>
            <input
              type="text"
              required
              value={formData.question}
              onChange={e => setFormData({ ...formData, question: e.target.value })}
              className="w-full p-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-neutral-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Câu trả lời</label>
            <textarea
              required
              rows={4}
              value={formData.answer}
              onChange={e => setFormData({ ...formData, answer: e.target.value })}
              className="w-full p-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-neutral-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Danh mục</label>
              <select
                value={formData.category}
                onChange={e => setFormData({ ...formData, category: e.target.value })}
                className="w-full p-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-neutral-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors appearance-none cursor-pointer"
              >
                <option value="start">Bắt đầu</option>
                <option value="account">Tài khoản</option>
                <option value="security">Bảo mật</option>
                <option value="privacy">Riêng tư</option>
                <option value="other">Khác</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Thứ tự</label>
              <input
                type="number"
                value={formData.order}
                onChange={e => setFormData({ ...formData, order: parseInt(e.target.value) })}
                className="w-full p-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-neutral-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isPublished"
              checked={formData.isPublished}
              onChange={e => setFormData({ ...formData, isPublished: e.target.checked })}
            />
            <label htmlFor="isPublished">Xuất bản ngay</label>
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-200 dark:bg-neutral-800 hover:bg-gray-300 dark:hover:bg-neutral-700 text-gray-800 dark:text-gray-200 transition-colors shadow-sm">Hủy</button>
            <button type="submit" disabled={loading} className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow-md transition-all disabled:opacity-50">
              {loading ? "Đang lưu..." : "Lưu"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default function AdminFeedback() {
  const { showError } = useToast();
  const [activeTab, setActiveTab] = useState("tickets");
  const [tickets, setTickets] = useState([]);
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [editingFaq, setEditingFaq] = useState(null);
  const [showFaqModal, setShowFaqModal] = useState(false);

  // Fetch data
  useEffect(() => {
    if (activeTab === "tickets") fetchTickets();
    else fetchFaqs();
  }, [activeTab]);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const res = await api("/api/support/admin/tickets");
      setTickets(res.tickets || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchFaqs = async () => {
    setLoading(true);
    try {
      const res = await api("/api/support/admin/faqs");
      setFaqs(res.faqs || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Ticket Actions
  const handleReplyTicket = async (ticketId, message) => {
    try {
      const res = await api(`/api/support/tickets/${ticketId}/reply`, {
        method: "POST",
        body: { message }
      });
      if (res.ticket) {
        setSelectedTicket(res.ticket);
        setTickets(prev => prev.map(t => t._id === ticketId ? res.ticket : t));
      }
    } catch (err) {
      showError(err.message || 'Lỗi khi trả lời ticket');
    }
  };

  const handleStatusChange = async (ticketId, status) => {
    try {
      const res = await api(`/api/support/tickets/${ticketId}/status`, {
        method: "PATCH",
        body: { status }
      });
      setTickets(prev => prev.map(t => t._id === ticketId ? { ...t, status } : t));
      if (selectedTicket && selectedTicket._id === ticketId) {
        setSelectedTicket(prev => ({ ...prev, status }));
      }
    } catch (err) {
      showError(err.message || 'Lỗi khi thay đổi trạng thái');
    }
  };

  // FAQ Actions
  const handleSaveFaq = async (data) => {
    try {
      if (editingFaq) {
        await api(`/api/support/admin/faqs/${editingFaq._id}`, {
          method: "PUT",
          body: data
        });
      } else {
        await api("/api/support/admin/faqs", {
          method: "POST",
          body: data
        });
      }
      setShowFaqModal(false);
      setEditingFaq(null);
      fetchFaqs();
    } catch (err) {
      showError(err.message || 'Lỗi khi lưu FAQ');
    }
  };

  const handleDeleteFaq = async (id) => {
    if (!window.confirm("Bạn có chắc muốn xóa FAQ này?")) return;
    try {
      await api(`/api/support/admin/faqs/${id}`, { method: "DELETE" });
      fetchFaqs();
    } catch (err) {
      showError(err.message || 'Lỗi khi xóa FAQ');
    }
  };

  return (
    <div className="min-h-screen pt-20 bg-gray-50 dark:bg-black p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Hỗ trợ người dùng</h1>
          <div className="flex bg-white dark:bg-neutral-900 rounded-lg p-1 shadow-sm border border-gray-200/80 dark:border-gray-800/80">
            <button
              onClick={() => setActiveTab("tickets")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === "tickets"
                ? "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"
                : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-neutral-800"
                }`}
            >
              Tickets
            </button>
            <button
              onClick={() => setActiveTab("faqs")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === "faqs"
                ? "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"
                : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-neutral-800"
                }`}
            >
              FAQs
            </button>
          </div>
        </div>

        {activeTab === "tickets" ? (
          <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-sm border border-gray-200/80 dark:border-gray-800/80 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 dark:bg-neutral-800 border-b border-gray-200/80 dark:border-gray-700/80">
                  <tr>
                    <th className="px-6 py-4 font-semibold text-gray-900 dark:text-white">Tiêu đề</th>
                    <th className="px-6 py-4 font-semibold text-gray-900 dark:text-white">Người gửi</th>
                    <th className="px-6 py-4 font-semibold text-gray-900 dark:text-white">Trạng thái</th>
                    <th className="px-6 py-4 font-semibold text-gray-900 dark:text-white">Ưu tiên</th>
                    <th className="px-6 py-4 font-semibold text-gray-900 dark:text-white">Ngày tạo</th>
                    <th className="px-6 py-4 font-semibold text-gray-900 dark:text-white">Hành động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200/80 dark:divide-gray-800/80">
                  {tickets.map(ticket => (
                    <tr key={ticket._id} className="hover:bg-gray-50 dark:hover:bg-neutral-800/50 transition-colors">
                      <td className="px-6 py-4 font-medium text-gray-900 dark:text-white max-w-xs truncate">
                        {ticket.subject}
                      </td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-gray-200 overflow-hidden">
                            <img src={ticket.user?.avatarUrl || `https://ui-avatars.com/api/?name=${ticket.user?.name}`} alt="" className="w-full h-full object-cover" />
                          </div>
                          <span className="truncate max-w-[150px]">{ticket.user?.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${ticket.status === 'Mở' ? 'bg-blue-100 text-blue-700' :
                          ticket.status === 'Đang xử lý' ? 'bg-yellow-100 text-yellow-700' :
                            ticket.status === 'Đã giải quyết' ? 'bg-green-100 text-green-700' :
                              'bg-gray-100 text-gray-700'
                          }`}>
                          {ticket.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${ticket.priority === 'Cấp bách' ? 'bg-red-100 text-red-700' :
                          ticket.priority === 'Cao' ? 'bg-orange-100 text-orange-700' :
                            ticket.priority === 'Trung bình' ? 'bg-blue-100 text-blue-700' :
                              'bg-gray-100 text-gray-700'
                          }`}>
                          {ticket.priority}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-500">
                        {new Date(ticket.createdAt).toLocaleDateString('vi-VN')}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => setSelectedTicket(ticket)}
                          className="text-blue-600 hover:text-blue-800 font-medium"
                        >
                          Chi tiết
                        </button>
                      </td>
                    </tr>
                  ))}
                  {tickets.length === 0 && (
                    <tr>
                      <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                        Không có ticket nào
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex justify-end mb-4">
              <button
                onClick={() => { setEditingFaq(null); setShowFaqModal(true); }}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus size={18} /> Thêm FAQ
              </button>
            </div>
            <div className="grid gap-4">
              {faqs.map(faq => (
                <div key={faq._id} className="bg-white dark:bg-neutral-900 p-4 rounded-xl border border-gray-200/80 dark:border-gray-800/80 flex justify-between items-start shadow-sm hover:shadow-md transition-all">
                  <div>
                    <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-1">{faq.question}</h3>
                    <p className="text-gray-600 dark:text-gray-400 text-sm line-clamp-2 mb-2">{faq.answer}</p>
                    <div className="flex gap-2 text-xs">
                      <span className="bg-gray-100 dark:bg-neutral-800 px-2 py-1 rounded text-gray-600 dark:text-gray-400">
                        {faq.category}
                      </span>
                      <span className={`px-2 py-1 rounded ${faq.isPublished ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                        {faq.isPublished ? 'Đã xuất bản' : 'Nháp'}
                      </span>
                      <span className="bg-gray-100 dark:bg-neutral-800 px-2 py-1 rounded text-gray-600 dark:text-gray-400">
                        Thứ tự: {faq.order}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setEditingFaq(faq); setShowFaqModal(true); }}
                      className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-full"
                    >
                      <Edit size={18} />
                    </button>
                    <button
                      onClick={() => handleDeleteFaq(faq._id)}
                      className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {selectedTicket && (
        <TicketDetailModal
          ticket={selectedTicket}
          onClose={() => setSelectedTicket(null)}
          onReply={handleReplyTicket}
          onStatusChange={handleStatusChange}
        />
      )}

      {showFaqModal && (
        <FAQModal
          faq={editingFaq}
          onClose={() => setShowFaqModal(false)}
          onSave={handleSaveFaq}
        />
      )}
    </div>
  );
}
