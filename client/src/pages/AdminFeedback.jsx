import React, { useEffect, useState } from "react";
import { api } from "../api";

/**
 * AdminFeedback - Component hiển thị feedback từ người dùng
 * Chỉ admin mới có thể xem danh sách góp ý từ người dùng
 * @returns {JSX.Element} Component admin feedback page
 */
export default function AdminFeedback() {
  // ==================== STATE MANAGEMENT ====================
  
  // Feedback data
  const [feedbacks, setFeedbacks] = useState([]); // Danh sách feedback
  const [loading, setLoading] = useState(true); // Loading state
  const [error, setError] = useState(""); // Error message

  useEffect(() => {
    api("/api/support/feedback")
      .then(res => setFeedbacks(res.feedbacks || []))
      .catch(err => setError(err.message || "Lỗi tải góp ý"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen pt-20 bg-gray-50">
      <div className="max-w-3xl mx-auto card p-6">
        <h1 className="text-2xl font-bold mb-4">Góp ý từ người dùng</h1>
        {loading ? (
          <div className="text-gray-500">Đang tải danh sách góp ý...</div>
        ) : error ? (
          <div className="text-red-600">{error}</div>
        ) : feedbacks.length === 0 ? (
          <div className="text-gray-500">Chưa có góp ý nào.</div>
        ) : (
          <div className="space-y-6">
            {feedbacks.map(fb => (
              <div key={fb._id} className="border-b pb-4">
                <div className="flex items-center gap-3 mb-2">
                  <img src={fb.user?.avatarUrl || '/default-avatar.png'} alt={fb.user?.name} className="w-8 h-8 rounded-full object-cover" />
                  <div>
                    <div className="font-semibold text-gray-900">{fb.user?.name || 'Ẩn danh'}</div>
                    <div className="text-xs text-gray-500">{fb.user?.email}</div>
                  </div>
                  <div className="ml-auto text-xs text-gray-400">{fb.createdAt ? new Date(fb.createdAt).toLocaleString() : ""}</div>
                </div>
                <div className="text-gray-800 text-base">{fb.feedback}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
