import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2 } from "lucide-react";
import { api } from "../api";
import { useToast } from "../contexts/ToastContext";

/**
 * ReportModal - Modal báo cáo vi phạm
 * Cho phép user báo cáo post, comment, hoặc user
 */
export default function ReportModal({ isOpen, onClose, targetType, targetId, targetInfo = {} }) {
    const { showSuccess, showError } = useToast();
    const [reason, setReason] = useState("");
    const [description, setDescription] = useState("");
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const reasons = [
        { value: "spam", label: "Spam / Quảng cáo" },
        { value: "harassment", label: "Quấy rối / Bắt nạt" },
        { value: "inappropriate", label: "Nội dung không phù hợp" },
        { value: "misinformation", label: "Thông tin sai lệch" },
        { value: "other", label: "Khác" }
    ];

    const targetLabels = {
        post: "bài viết",
        comment: "bình luận",
        user: "người dùng"
    };

    const handleSubmit = async () => {
        if (!reason) {
            showError("Vui lòng chọn lý do báo cáo");
            return;
        }

        if (reason === "other" && !description.trim()) {
            showError("Vui lòng mô tả lý do báo cáo");
            return;
        }

        try {
            setLoading(true);
            await api("/api/reports", {
                method: "POST",
                body: {
                    targetType,
                    targetId,
                    reason,
                    description: description.trim()
                }
            });

            setSuccess(true);
            showSuccess("Báo cáo đã được gửi thành công!");

            setTimeout(() => {
                handleClose();
            }, 1500);
        } catch (error) {
            showError(error.message || "Không thể gửi báo cáo");
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setReason("");
        setDescription("");
        setSuccess(false);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
                onClick={handleClose}
            >
                <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    className="bg-white dark:bg-neutral-900 rounded-2xl p-5 max-w-lg w-full shadow-xl"
                    onClick={e => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="font-bold text-lg">Báo cáo {targetLabels[targetType]}</h3>
                        <button
                            onClick={handleClose}
                            className="p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    {success ? (
                        <div className="py-6 text-center">
                            <div className="text-3xl mb-2">✓</div>
                            <p className="text-neutral-600 dark:text-neutral-400">
                                Báo cáo đã được gửi thành công!
                            </p>
                        </div>
                    ) : (
                        <>
                            {/* Reason Selection - Grid layout */}
                            <div className="mb-3">
                                <label className="text-sm font-medium text-neutral-600 dark:text-neutral-400 mb-2 block">
                                    Chọn lý do <span className="text-red-500">*</span>
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    {reasons.map(r => (
                                        <button
                                            key={r.value}
                                            onClick={() => setReason(r.value)}
                                            className={`px-3 py-2 rounded-lg border text-sm font-medium transition-all text-left ${reason === r.value
                                                    ? "bg-red-50 dark:bg-red-900/20 border-red-400 dark:border-red-700 text-red-700 dark:text-red-400"
                                                    : "border-neutral-200 dark:border-neutral-700 hover:border-neutral-400 dark:hover:border-neutral-500"
                                                }`}
                                        >
                                            {r.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Description */}
                            <div className="mb-3">
                                <textarea
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                    placeholder="Mô tả thêm (tùy chọn)..."
                                    maxLength={500}
                                    rows={2}
                                    className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 outline-none focus:ring-2 focus:ring-red-500 resize-none text-sm"
                                />
                            </div>

                            {/* Warning - compact */}
                            <p className="text-xs text-amber-600 dark:text-amber-400 mb-3">
                                ⚠️ Báo cáo sai sự thật có thể bị xử lý.
                            </p>

                            {/* Actions */}
                            <div className="flex gap-2">
                                <button
                                    onClick={handleClose}
                                    disabled={loading}
                                    className="flex-1 px-4 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 font-medium hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors disabled:opacity-50 text-sm"
                                >
                                    Hủy
                                </button>
                                <button
                                    onClick={handleSubmit}
                                    disabled={loading || !reason}
                                    className="flex-1 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50 text-sm"
                                >
                                    {loading && <Loader2 className="animate-spin" size={16} />}
                                    Gửi báo cáo
                                </button>
                            </div>
                        </>
                    )}
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
