import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Pagination component for admin user list
 * @param {Object} pagination - { page, totalPages, total, hasPrevPage, hasNextPage }
 * @param {Function} onPageChange - callback when page changes
 * @param {boolean} loading - loading state
 */
export default function Pagination({ pagination, onPageChange, loading = false }) {
    if (!pagination || pagination.totalPages <= 1) return null;

    const { page, totalPages, total, hasPrevPage, hasNextPage } = pagination;

    // Generate page numbers to show (max 5)
    const getPageNumbers = () => {
        const pages = [];
        let start = Math.max(1, page - 2);
        let end = Math.min(totalPages, start + 4);

        if (end - start < 4) {
            start = Math.max(1, end - 4);
        }

        for (let i = start; i <= end; i++) {
            pages.push(i);
        }
        return pages;
    };

    return (
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-neutral-200 dark:border-neutral-700">
            <div className="text-sm text-neutral-500">
                Trang {page} / {totalPages} ({total} người dùng)
            </div>
            <div className="flex items-center gap-2">
                {/* Previous */}
                <button
                    onClick={() => onPageChange(page - 1)}
                    disabled={!hasPrevPage || loading}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-lg bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    <ChevronLeft size={16} />
                    Trước
                </button>

                {/* Page Numbers */}
                <div className="flex items-center gap-1">
                    {getPageNumbers().map(pageNum => (
                        <button
                            key={pageNum}
                            onClick={() => onPageChange(pageNum)}
                            disabled={loading}
                            className={`w-8 h-8 text-sm font-medium rounded-lg transition-colors ${page === pageNum
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                                } disabled:opacity-50`}
                        >
                            {pageNum}
                        </button>
                    ))}
                </div>

                {/* Next */}
                <button
                    onClick={() => onPageChange(page + 1)}
                    disabled={!hasNextPage || loading}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-lg bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    Sau
                    <ChevronRight size={16} />
                </button>
            </div>
        </div>
    );
}
