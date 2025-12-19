import React, { useState, useEffect, useCallback } from "react";
import { api } from "../../api";
import { useToast } from "../../contexts/ToastContext";
import Avatar from "../Avatar";
import Pagination from "./Pagination";
import { SpotlightCard } from "../ui/DesignSystem";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "../../utils/cn";
import {
    Search,
    Trash2,
    Eye,
    Heart,
    Loader2,
    CheckSquare,
    Square,
    AlertTriangle,
    ExternalLink,
    User,
    Users
} from "lucide-react";

/**
 * AdminPostsTab - Quản lý bài viết cho admin
 * Hỗ trợ: search, filter by author, delete, bulk delete, delete by user
 */
export default function AdminPostsTab() {
    const { showSuccess, showError } = useToast();

    // State
    const [posts, setPosts] = useState([]);
    const [authors, setAuthors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState({ page: 1, totalPages: 0, total: 0, hasPrevPage: false, hasNextPage: false });

    // Filters
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [authorFilter, setAuthorFilter] = useState("");

    // Selection
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [deleting, setDeleting] = useState(false);

    // Confirm modal
    const [confirmModal, setConfirmModal] = useState({ show: false, type: "", data: null });

    // Load authors list
    useEffect(() => {
        const loadAuthors = async () => {
            try {
                const response = await api("/api/admin/posts/authors");
                if (response.success) {
                    setAuthors(response.authors);
                }
            } catch (error) {
                console.error("Error loading authors:", error);
            }
        };
        loadAuthors();
    }, []);

    // Load posts
    const loadPosts = useCallback(async (page = 1) => {
        try {
            setLoading(true);
            const params = new URLSearchParams({
                page: page.toString(),
                limit: "20",
                ...(searchTerm && { search: searchTerm }),
                ...(statusFilter && { status: statusFilter })
            });

            const response = await api(`/api/admin/posts?${params}`);
            if (response.success) {
                let filteredPosts = response.posts;
                // Client-side filter by author if selected
                if (authorFilter) {
                    filteredPosts = filteredPosts.filter(p => p.author?._id === authorFilter);
                }
                setPosts(filteredPosts);
                // Transform pagination to match Pagination component expected format
                const paginationData = response.pagination;
                setPagination({
                    page: paginationData.page,
                    totalPages: paginationData.pages || paginationData.totalPages || 1,
                    total: paginationData.total,
                    hasPrevPage: paginationData.page > 1,
                    hasNextPage: paginationData.page < (paginationData.pages || paginationData.totalPages || 1)
                });
                setSelectedIds(new Set());
            }
        } catch (error) {
            showError("Không thể tải danh sách bài viết");
        } finally {
            setLoading(false);
        }
    }, [searchTerm, statusFilter, authorFilter, showError]);

    useEffect(() => {
        loadPosts(1);
    }, [searchTerm, statusFilter, authorFilter]);

    // Toggle select
    const toggleSelect = (id) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === posts.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(posts.map(p => p._id)));
        }
    };

    // Delete actions
    const handleDelete = (id) => {
        setConfirmModal({ show: true, type: "single", data: { ids: [id] } });
    };

    const handleBulkDelete = () => {
        if (selectedIds.size === 0) return;
        setConfirmModal({ show: true, type: "bulk", data: { ids: Array.from(selectedIds) } });
    };

    const handleDeleteByUser = (userId, userName, postCount) => {
        setConfirmModal({
            show: true,
            type: "byUser",
            data: { userId, userName, postCount }
        });
    };

    // Confirm delete
    const confirmDelete = async () => {
        try {
            setDeleting(true);
            const { type, data } = confirmModal;

            if (type === "single") {
                await api(`/api/admin/posts/${data.ids[0]}`, { method: "DELETE" });
                showSuccess("Đã xóa bài viết");
            } else if (type === "bulk") {
                const response = await api("/api/admin/posts/bulk-delete", {
                    method: "POST",
                    body: { postIds: data.ids }
                });
                showSuccess(response.message || `Đã xóa ${data.ids.length} bài viết`);
            } else if (type === "byUser") {
                const response = await api("/api/admin/posts/delete-by-user", {
                    method: "POST",
                    body: { userId: data.userId, count: data.deleteCount || 0 }
                });
                showSuccess(response.message);
                // Reload authors after deletion
                const authorsRes = await api("/api/admin/posts/authors");
                if (authorsRes.success) setAuthors(authorsRes.authors);
            }

            setConfirmModal({ show: false, type: "", data: null });
            loadPosts(pagination.page);
        } catch (error) {
            showError(error.message || "Có lỗi xảy ra khi xóa");
        } finally {
            setDeleting(false);
        }
    };

    const goToPage = (page) => loadPosts(page);
    const isAllSelected = posts.length > 0 && selectedIds.size === posts.length;
    const selectedAuthor = authors.find(a => a._id === authorFilter);

    return (
        <SpotlightCard className="min-h-[600px]">
            {/* Header with Search & Filters */}
            <div className="flex flex-col gap-4 mb-6">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
                        <input
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 outline-none text-sm focus:ring-2 focus:ring-blue-500 transition-colors"
                            placeholder="Tìm kiếm theo tiêu đề..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <select
                        className="px-4 py-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 outline-none text-sm font-medium transition-colors cursor-pointer"
                        value={statusFilter}
                        onChange={e => setStatusFilter(e.target.value)}
                    >
                        <option value="">Tất cả trạng thái</option>
                        <option value="published">Đã đăng</option>
                        <option value="private">Riêng tư</option>
                    </select>
                    <select
                        className="px-4 py-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 outline-none text-sm font-medium transition-colors cursor-pointer max-w-[200px] truncate"
                        value={authorFilter}
                        onChange={e => setAuthorFilter(e.target.value)}
                    >
                        <option value="">Tất cả tác giả</option>
                        {authors.slice(0, 20).map(a => (
                            <option key={a._id} value={a._id}>
                                {a.name.length > 15 ? a.name.slice(0, 15) + '...' : a.name} ({a.postCount})
                            </option>
                        ))}
                    </select>
                </div>

                {/* Delete by User Action */}
                {authorFilter && selectedAuthor && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-4 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700"
                    >
                        <div className="flex items-center justify-between flex-wrap gap-3">
                            <div>
                                <span className="font-semibold">{selectedAuthor.name}</span>
                                <span className="text-sm text-neutral-500 ml-2">
                                    ({selectedAuthor.postCount} bài viết)
                                </span>
                            </div>
                            <button
                                onClick={() => handleDeleteByUser(selectedAuthor._id, selectedAuthor.name, selectedAuthor.postCount)}
                                className="px-4 py-2 rounded-lg bg-black dark:bg-white text-white dark:text-black text-sm font-bold transition-colors hover:opacity-80"
                            >
                                Xóa tất cả bài của user này
                            </button>
                        </div>
                    </motion.div>
                )}
            </div>

            {/* Bulk Action Bar */}
            <AnimatePresence>
                {selectedIds.size > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="mb-4 p-3 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 flex items-center justify-between"
                    >
                        <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                            Đã chọn {selectedIds.size} bài viết
                        </span>
                        <button
                            onClick={handleBulkDelete}
                            disabled={deleting}
                            className="px-4 py-2 rounded-lg bg-black dark:bg-white text-white dark:text-black text-sm font-bold transition-colors hover:opacity-80 disabled:opacity-50"
                        >
                            Xóa đã chọn
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Loading */}
            {loading ? (
                <div className="py-20 flex justify-center">
                    <Loader2 className="animate-spin" size={32} />
                </div>
            ) : (
                <>
                    {/* Desktop Table */}
                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-neutral-50 dark:bg-neutral-800/50 border-b border-neutral-200 dark:border-neutral-700">
                                <tr>
                                    <th className="px-3 py-2 w-10">
                                        <button onClick={toggleSelectAll} className="p-1 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded">
                                            {isAllSelected ? <CheckSquare size={18} className="text-blue-600" /> : <Square size={18} className="text-neutral-400" />}
                                        </button>
                                    </th>
                                    <th className="px-3 py-2 font-semibold">Tiêu đề</th>
                                    <th className="px-3 py-2 font-semibold">Tác giả</th>
                                    <th className="px-3 py-2 font-semibold whitespace-nowrap">Trạng thái</th>
                                    <th className="px-3 py-2 font-semibold">Views</th>
                                    <th className="px-3 py-2 font-semibold whitespace-nowrap">Ngày tạo</th>
                                    <th className="px-3 py-2 font-semibold"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                                {posts.map(post => (
                                    <tr key={post._id} className={cn(
                                        "hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors",
                                        selectedIds.has(post._id) && "bg-blue-50 dark:bg-blue-900/10"
                                    )}>
                                        <td className="px-3 py-2">
                                            <button onClick={() => toggleSelect(post._id)} className="p-1 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded">
                                                {selectedIds.has(post._id) ? <CheckSquare size={18} className="text-blue-600" /> : <Square size={18} className="text-neutral-400" />}
                                            </button>
                                        </td>
                                        <td className="px-3 py-2">
                                            <div className="max-w-[250px] truncate font-medium" title={post.title}>
                                                {post.title || "(Không có tiêu đề)"}
                                            </div>
                                        </td>
                                        <td className="px-3 py-2">
                                            <button
                                                onClick={() => setAuthorFilter(post.author?._id || "")}
                                                className="flex items-center gap-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 px-2 py-1 rounded-lg transition-colors"
                                                title="Lọc theo tác giả này"
                                            >
                                                <Avatar src={post.author?.avatarUrl} name={post.author?.name} size={24} />
                                                <span className="truncate max-w-[100px] text-sm">{post.author?.name || "Unknown"}</span>
                                            </button>
                                        </td>
                                        <td className="px-3 py-2 whitespace-nowrap">
                                            <span className={cn(
                                                "px-2 py-0.5 rounded-full text-xs font-medium",
                                                post.status === "published"
                                                    ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                                                    : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                                            )}>
                                                {post.status === "published" ? "Đã đăng" : "Riêng tư"}
                                            </span>
                                        </td>
                                        <td className="px-3 py-2 text-neutral-600 dark:text-neutral-400 text-sm">
                                            {post.views || 0}
                                        </td>
                                        <td className="px-3 py-2 text-neutral-600 dark:text-neutral-400 whitespace-nowrap text-sm">
                                            {post.createdAt ? new Date(post.createdAt).toLocaleDateString('vi-VN') : 'N/A'}
                                        </td>
                                        <td className="px-3 py-2">
                                            <div className="flex items-center gap-1">
                                                <button
                                                    onClick={() => window.open(`/bai-viet/${post.slug}`, '_blank')}
                                                    className="p-1.5 text-neutral-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                                                    title="Xem"
                                                >
                                                    <ExternalLink size={14} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(post._id)}
                                                    className="p-1.5 text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                                                    title="Xóa"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {posts.length === 0 && (
                                    <tr>
                                        <td colSpan="7" className="px-4 py-12 text-center text-neutral-500">
                                            Không có bài viết nào
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile List */}
                    <div className="md:hidden space-y-2">
                        {posts.map(post => (
                            <div
                                key={post._id}
                                className={cn(
                                    "p-3 rounded-xl border transition-all",
                                    selectedIds.has(post._id)
                                        ? "bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800"
                                        : "border-neutral-100 dark:border-neutral-800"
                                )}
                            >
                                <div className="flex items-start gap-3">
                                    <button onClick={() => toggleSelect(post._id)} className="mt-1">
                                        {selectedIds.has(post._id) ? <CheckSquare size={20} className="text-blue-600" /> : <Square size={20} className="text-neutral-400" />}
                                    </button>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-medium truncate mb-1">{post.title || "(Không có tiêu đề)"}</div>
                                        <div className="flex items-center gap-2 text-xs text-neutral-500 mb-2">
                                            <Avatar src={post.author?.avatarUrl} name={post.author?.name} size={20} />
                                            <span>{post.author?.name}</span>
                                            <span>•</span>
                                            <span>{new Date(post.createdAt).toLocaleDateString('vi-VN')}</span>
                                        </div>
                                        <div className="flex items-center gap-3 text-xs">
                                            <span className={cn(
                                                "px-2 py-0.5 rounded-full font-bold",
                                                post.status === "published"
                                                    ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                                                    : "bg-gray-100 dark:bg-gray-800 text-gray-600"
                                            )}>
                                                {post.status === "published" ? "Đã đăng" : "Riêng tư"}
                                            </span>
                                            <span className="flex items-center gap-1 text-neutral-500">
                                                <Eye size={12} /> {post.views || 0}
                                            </span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleDelete(post._id)}
                                        className="p-2 text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <Pagination pagination={pagination} onPageChange={goToPage} loading={loading} />
                </>
            )}

            {/* Confirm Modal */}
            <AnimatePresence>
                {confirmModal.show && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
                        onClick={() => !deleting && setConfirmModal({ show: false, type: "", data: null })}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white dark:bg-neutral-900 rounded-2xl p-6 max-w-md w-full shadow-xl"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                                    <AlertTriangle className="text-red-600 dark:text-red-400" size={24} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg">Xác nhận xóa</h3>
                                    <p className="text-sm text-neutral-500">
                                        {confirmModal.type === "single" && "Bạn có chắc muốn xóa bài viết này?"}
                                        {confirmModal.type === "bulk" && `Xóa ${confirmModal.data?.ids?.length} bài viết đã chọn?`}
                                        {confirmModal.type === "byUser" && `Xóa tất cả bài viết của ${confirmModal.data?.userName}?`}
                                    </p>
                                </div>
                            </div>

                            {/* For byUser, allow specifying count */}
                            {confirmModal.type === "byUser" && (
                                <div className="mb-4 p-3 bg-neutral-50 dark:bg-neutral-800 rounded-xl">
                                    <label className="text-sm font-medium block mb-2">
                                        Số bài viết muốn xóa (để trống = xóa tất cả {confirmModal.data?.postCount} bài)
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        max={confirmModal.data?.postCount}
                                        placeholder={`Tối đa ${confirmModal.data?.postCount}`}
                                        className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 outline-none focus:ring-2 focus:ring-blue-500"
                                        onChange={e => {
                                            setConfirmModal(prev => ({
                                                ...prev,
                                                data: { ...prev.data, deleteCount: parseInt(e.target.value) || 0 }
                                            }));
                                        }}
                                    />
                                </div>
                            )}

                            <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-6">
                                Hành động này không thể hoàn tác. Tất cả bình luận liên quan cũng sẽ bị xóa.
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setConfirmModal({ show: false, type: "", data: null })}
                                    disabled={deleting}
                                    className="flex-1 px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 font-medium hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors disabled:opacity-50"
                                >
                                    Hủy
                                </button>
                                <button
                                    onClick={confirmDelete}
                                    disabled={deleting}
                                    className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                                >
                                    {deleting ? <Loader2 className="animate-spin" size={18} /> : <Trash2 size={18} />}
                                    Xóa
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </SpotlightCard>
    );
}
