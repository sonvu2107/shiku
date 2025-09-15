import React, { useState } from "react";
import { api } from "../api";

/**
 * Support - Trang hỗ trợ và góp ý
 * Cho phép user gửi feedback cho admin
 * @returns {JSX.Element} Component support page
 */
export default function Support() {
  // ==================== STATE MANAGEMENT ====================
  
  // Form states
  const [feedback, setFeedback] = useState(""); // Nội dung góp ý
  const [sending, setSending] = useState(false); // Loading khi gửi
  const [success, setSuccess] = useState(false); // Trạng thái thành công
  const [error, setError] = useState(""); // Error message

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSending(true);
    setError("");
    setSuccess(false);
    try {
      await api("/api/support/feedback", {
        method: "POST",
        body: { feedback }
      });
      setSuccess(true);
      setFeedback("");
    } catch (err) {
      setError(err.message || "Gửi góp ý thất bại");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen pt-20 bg-gray-50">
      <div className="max-w-2xl mx-auto card p-6">
        <h1 className="text-2xl font-bold mb-4">Trợ giúp & hỗ trợ</h1>
        <p className="mb-6 text-gray-600">Bạn có thắc mắc, góp ý hoặc cần hỗ trợ? Hãy gửi ý kiến cho admin qua form bên dưới.</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <textarea
            className="w-full border rounded p-3 min-h-[100px]"
            placeholder="Nhập góp ý hoặc câu hỏi của bạn..."
            value={feedback}
            onChange={e => setFeedback(e.target.value)}
            required
            disabled={sending}
          />
          <button
            type="submit"
            className="btn px-6 py-2"
            disabled={sending || !feedback.trim()}
          >
            {sending ? "Đang gửi..." : "Gửi góp ý"}
          </button>
          {success && <div className="text-green-600 text-sm">Gửi góp ý thành công! Cảm ơn bạn.</div>}
          {error && <div className="text-red-600 text-sm">{error}</div>}
        </form>
        <div className="mt-8 text-gray-500 text-xs">Mọi góp ý đều giúp web ngày càng phát triển, cảm ơn ban.</div>
      </div>
    </div>
  );
}
