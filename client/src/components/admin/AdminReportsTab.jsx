import React, { useState, useEffect, useCallback } from "react";
import { api } from "../../api";
import { useToast } from "../../contexts/ToastContext";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import Avatar from "../Avatar";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";

const REASON_LABELS = {
    spam: "Spam",
    harassment: "Quấy rối",
    inappropriate: "Không phù hợp",
    misinformation: "Sai lệch",
    other: "Khác"
};

const STATUS_LABELS = {
    pending: "Chờ xử lý",
    resolved: "Đã xử lý",
    dismissed: "Đã bỏ qua"
};

const TARGET_TYPE_LABELS = {
    post: "Bài viết",
    comment: "Bình luận",
    user: "Người dùng"
};

/**
 * AdminReportsTab - Quản lý báo cáo vi phạm cho admin
 */
export default function AdminReportsTab() {
    const { showSuccess, showError } = useToast();

    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState({ page: 1, totalPages: 0, total: 0 });
    const [stats, setStats] = useState(null);

    const [statusFilter, setStatusFilter] = useState("pending");
    const [typeFilter, setTypeFilter] = useState("");

    const [selectedReport, setSelectedReport] = useState(null);
    const [actionLoading, setActionLoading] = useState(false);
    const [resolutionNote, setResolutionNote] = useState("");

    const loadReports = useCallback(async (page = 1) => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            params.set("page", page.toString());
            params.set("limit", "20");
            if (statusFilter) params.set("status", statusFilter);
            if (typeFilter) params.set("targetType", typeFilter);

            const res = await api(`/api/admin/reports?${params.toString()}`);
            if (res.success) {
                setReports(res.reports || []);
                setPagination(res.pagination || { page: 1, totalPages: 0, total: 0 });
            }
        } catch (error) {
            showError(error.message || "Không thể tải danh sách báo cáo");
        } finally {
            setLoading(false);
        }
    }, [statusFilter, typeFilter, showError]);

    const loadStats = useCallback(async () => {
        try {
            const res = await api("/api/admin/reports/stats");
            if (res.success) setStats(res.stats);
        } catch (error) { /* Silent */ }
    }, []);

    useEffect(() => {
        loadReports(1);
        loadStats();
    }, [statusFilter, typeFilter]);

    const handleResolve = async (reportId, action = 'resolve') => {
        try {
            setActionLoading(true);
            const response = await api(`/api/admin/reports/${reportId}/resolve`, {
                method: "POST",
                body: {
                    resolution: resolutionNote || "Đã xử lý",
                    action: action !== 'resolve' ? action : undefined
                }
            });
            showSuccess(response.message || "Đã xử lý báo cáo");
            setSelectedReport(null);
            setResolutionNote("");
            loadReports(pagination.page);
            loadStats();
        } catch (error) {
            showError(error.message || "Không thể xử lý báo cáo");
        } finally {
            setActionLoading(false);
        }
    };

    const handleDismiss = async (reportId) => {
        try {
            setActionLoading(true);
            await api(`/api/admin/reports/${reportId}/dismiss`, {
                method: "POST",
                body: { reason: resolutionNote || "Báo cáo không hợp lệ" }
            });
            showSuccess("Đã bỏ qua báo cáo");
            setSelectedReport(null);
            setResolutionNote("");
            loadReports(pagination.page);
            loadStats();
        } catch (error) {
            showError(error.message || "Không thể bỏ qua báo cáo");
        } finally {
            setActionLoading(false);
        }
    };

    const handleDelete = async (reportId) => {
        if (!confirm("Bạn có chắc muốn xóa báo cáo này?")) return;
        try {
            await api(`/api/admin/reports/${reportId}`, { method: "DELETE" });
            showSuccess("Đã xóa báo cáo");
            loadReports(pagination.page);
            loadStats();
        } catch (error) {
            showError(error.message || "Không thể xóa báo cáo");
        }
    };

    const formatTime = (date) => {
        try {
            return formatDistanceToNow(new Date(date), { addSuffix: true, locale: vi });
        } catch { return ""; }
    };

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            {/* Stats */}
            {stats && (
                <div className="grid grid-cols-4 gap-3">
                    <div className="bg-neutral-50 dark:bg-neutral-800/50 rounded-xl p-3 text-center">
                        <div className="text-xl font-bold">{stats.pending}</div>
                        <div className="text-xs text-neutral-500">Chờ xử lý</div>
                    </div>
                    <div className="bg-neutral-50 dark:bg-neutral-800/50 rounded-xl p-3 text-center">
                        <div className="text-xl font-bold">{stats.resolved}</div>
                        <div className="text-xs text-neutral-500">Đã xử lý</div>
                    </div>
                    <div className="bg-neutral-50 dark:bg-neutral-800/50 rounded-xl p-3 text-center">
                        <div className="text-xl font-bold">{stats.dismissed}</div>
                        <div className="text-xs text-neutral-500">Đã bỏ qua</div>
                    </div>
                    <div className="bg-neutral-50 dark:bg-neutral-800/50 rounded-xl p-3 text-center">
                        <div className="text-xl font-bold">{stats.total}</div>
                        <div className="text-xs text-neutral-500">Tổng</div>
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="flex gap-2">
                <select
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value)}
                    className="px-3 py-2 rounded-lg bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-sm"
                >
                    <option value="">Tất cả</option>
                    <option value="pending">Chờ xử lý</option>
                    <option value="resolved">Đã xử lý</option>
                    <option value="dismissed">Đã bỏ qua</option>
                </select>
                <select
                    value={typeFilter}
                    onChange={e => setTypeFilter(e.target.value)}
                    className="px-3 py-2 rounded-lg bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-sm"
                >
                    <option value="">Tất cả loại</option>
                    <option value="post">Bài viết</option>
                    <option value="comment">Bình luận</option>
                    <option value="user">Người dùng</option>
                </select>
            </div>

            {/* Table */}
            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="animate-spin text-neutral-400" size={24} />
                </div>
            ) : reports.length === 0 ? (
                <div className="text-center py-12 text-neutral-500">
                    Không có báo cáo nào
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-neutral-200 dark:border-neutral-800">
                                <th className="text-left py-3 px-2 font-medium text-neutral-500">Loại</th>
                                <th className="text-left py-3 px-2 font-medium text-neutral-500">Lý do</th>
                                <th className="text-left py-3 px-2 font-medium text-neutral-500">Nội dung</th>
                                <th className="text-left py-3 px-2 font-medium text-neutral-500">Người báo cáo</th>
                                <th className="text-left py-3 px-2 font-medium text-neutral-500">Thời gian</th>
                                <th className="text-left py-3 px-2 font-medium text-neutral-500">Trạng thái</th>
                                <th className="text-right py-3 px-2 font-medium text-neutral-500">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {reports.map(report => (
                                <tr key={report._id} className="border-b border-neutral-100 dark:border-neutral-800/50 hover:bg-neutral-50 dark:hover:bg-neutral-800/30">
                                    <td className="py-3 px-2">{TARGET_TYPE_LABELS[report.targetType]}</td>
                                    <td className="py-3 px-2">{REASON_LABELS[report.reason]}</td>
                                    <td className="py-3 px-2 max-w-[200px]">
                                        {report.target ? (
                                            <span className="truncate block text-neutral-600 dark:text-neutral-400">
                                                {report.targetType === "post" && (report.target.title || "Bài viết")}
                                                {report.targetType === "comment" && (report.target.content?.slice(0, 50) + "...")}
                                                {report.targetType === "user" && report.target.name}
                                            </span>
                                        ) : (
                                            <span className="text-neutral-400 italic">Đã xóa</span>
                                        )}
                                    </td>
                                    <td className="py-3 px-2">
                                        {report.reporter && (
                                            <div className="flex items-center gap-2">
                                                <Avatar src={report.reporter.avatarUrl} name={report.reporter.name} size={24} />
                                                <span className="truncate max-w-[100px]">{report.reporter.name}</span>
                                            </div>
                                        )}
                                    </td>
                                    <td className="py-3 px-2 text-neutral-500 whitespace-nowrap">{formatTime(report.createdAt)}</td>
                                    <td className="py-3 px-2">
                                        <span className={`text-xs px-2 py-1 rounded ${report.status === "pending" ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400" :
                                                report.status === "resolved" ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" :
                                                    "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400"
                                            }`}>
                                            {STATUS_LABELS[report.status]}
                                        </span>
                                    </td>
                                    <td className="py-3 px-2 text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            {report.status === "pending" && (
                                                <>
                                                    <button
                                                        onClick={() => setSelectedReport(report)}
                                                        className="px-2 py-1 text-xs bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded transition-colors"
                                                    >
                                                        Xem
                                                    </button>
                                                    <button
                                                        onClick={() => handleResolve(report._id)}
                                                        className="px-2 py-1 text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50 rounded transition-colors"
                                                    >
                                                        Xử lý
                                                    </button>
                                                    <button
                                                        onClick={() => handleDismiss(report._id)}
                                                        className="px-2 py-1 text-xs bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded transition-colors"
                                                    >
                                                        Bỏ qua
                                                    </button>
                                                </>
                                            )}
                                            <button
                                                onClick={() => handleDelete(report._id)}
                                                className="px-2 py-1 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                                            >
                                                Xóa
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Pagination */}
            {pagination.totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-2">
                    <button
                        onClick={() => loadReports(pagination.page - 1)}
                        disabled={pagination.page <= 1}
                        className="p-2 rounded-lg bg-neutral-100 dark:bg-neutral-800 disabled:opacity-50"
                    >
                        <ChevronLeft size={16} />
                    </button>
                    <span className="text-sm text-neutral-500">
                        {pagination.page} / {pagination.totalPages}
                    </span>
                    <button
                        onClick={() => loadReports(pagination.page + 1)}
                        disabled={pagination.page >= pagination.totalPages}
                        className="p-2 rounded-lg bg-neutral-100 dark:bg-neutral-800 disabled:opacity-50"
                    >
                        <ChevronRight size={16} />
                    </button>
                </div>
            )}

            {/* Detail Modal with Ban/Warn options */}
            {selectedReport && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setSelectedReport(null)}>
                    <div className="bg-white dark:bg-neutral-900 rounded-xl max-w-lg w-full p-5" onClick={e => e.stopPropagation()}>
                        <h3 className="font-bold text-lg mb-4">Chi tiết báo cáo</h3>

                        <div className="space-y-3 text-sm">
                            <div className="flex justify-between">
                                <span className="text-neutral-500">Loại:</span>
                                <span>{TARGET_TYPE_LABELS[selectedReport.targetType]}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-neutral-500">Lý do:</span>
                                <span>{REASON_LABELS[selectedReport.reason]}</span>
                            </div>
                            {selectedReport.targetSnapshot?.authorName && (
                                <div className="flex justify-between">
                                    <span className="text-neutral-500">Tác giả:</span>
                                    <span>{selectedReport.targetSnapshot.authorName}</span>
                                </div>
                            )}
                            {selectedReport.description && (
                                <div>
                                    <span className="text-neutral-500 block mb-1">Mô tả:</span>
                                    <p className="bg-neutral-50 dark:bg-neutral-800 p-2 rounded text-neutral-600 dark:text-neutral-400">
                                        {selectedReport.description}
                                    </p>
                                </div>
                            )}
                            {selectedReport.target && (
                                <div>
                                    <span className="text-neutral-500 block mb-1">Nội dung bị báo cáo:</span>
                                    <p className="bg-neutral-50 dark:bg-neutral-800 p-2 rounded text-neutral-600 dark:text-neutral-400 max-h-24 overflow-y-auto">
                                        {selectedReport.targetSnapshot?.content || selectedReport.target.title || selectedReport.target.content || selectedReport.target.name}
                                    </p>
                                </div>
                            )}

                            <textarea
                                value={resolutionNote}
                                onChange={e => setResolutionNote(e.target.value)}
                                placeholder="Ghi chú / lý do xử lý..."
                                rows={2}
                                className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-sm resize-none"
                            />

                            {/* Action Buttons */}
                            <div className="space-y-2 pt-2">
                                <div className="text-xs text-neutral-500 mb-1">Hành động:</div>

                                {/* Row 1: Basic actions */}
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleResolve(selectedReport._id, 'resolve')}
                                        disabled={actionLoading}
                                        className="flex-1 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium text-sm disabled:opacity-50"
                                    >
                                        Xử lý
                                    </button>
                                    <button
                                        onClick={() => handleDismiss(selectedReport._id)}
                                        disabled={actionLoading}
                                        className="flex-1 px-3 py-2 bg-neutral-200 dark:bg-neutral-700 hover:bg-neutral-300 dark:hover:bg-neutral-600 rounded-lg font-medium text-sm disabled:opacity-50"
                                    >
                                        Bỏ qua
                                    </button>
                                </div>

                                {/* Row 2: Delete content */}
                                {selectedReport.target && selectedReport.targetType !== "user" && (
                                    <button
                                        onClick={() => handleResolve(selectedReport._id, 'delete_target')}
                                        disabled={actionLoading}
                                        className="w-full px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium text-sm disabled:opacity-50"
                                    >
                                        Xóa nội dung vi phạm
                                    </button>
                                )}

                                {/* Row 3: Warn/Ban user */}
                                {selectedReport.targetSnapshot?.authorId && (
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleResolve(selectedReport._id, 'warn_user')}
                                            disabled={actionLoading}
                                            className="flex-1 px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium text-sm disabled:opacity-50"
                                        >
                                            Cảnh báo user
                                        </button>
                                        <button
                                            onClick={() => handleResolve(selectedReport._id, 'ban_user')}
                                            disabled={actionLoading}
                                            className="flex-1 px-3 py-2 bg-red-800 hover:bg-red-900 text-white rounded-lg font-medium text-sm disabled:opacity-50"
                                        >
                                            Cấm user
                                        </button>
                                    </div>
                                )}

                                {/* Row 4: Delete + Warn/Ban */}
                                {selectedReport.target && selectedReport.targetType !== "user" && selectedReport.targetSnapshot?.authorId && (
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleResolve(selectedReport._id, 'delete_and_warn')}
                                            disabled={actionLoading}
                                            className="flex-1 px-3 py-2 border border-amber-500 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg font-medium text-sm disabled:opacity-50"
                                        >
                                            Xóa + Cảnh báo
                                        </button>
                                        <button
                                            onClick={() => handleResolve(selectedReport._id, 'delete_and_ban')}
                                            disabled={actionLoading}
                                            className="flex-1 px-3 py-2 border border-red-600 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg font-medium text-sm disabled:opacity-50"
                                        >
                                            Xóa + Cấm user
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </motion.div>
    );
}
