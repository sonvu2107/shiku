import { memo, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Pagination component - responsive for mobile and desktop
 * @param {Object} pagination - { page, totalPages, total, hasPrevPage, hasNextPage }
 * @param {Function} onPageChange - callback when page changes
 * @param {boolean} loading - loading state
 * @param {string} itemLabel - label for items (default: "người dùng")
 */
function Pagination({ pagination, onPageChange, loading = false, itemLabel = "người dùng" }) {
    if (!pagination || pagination.totalPages <= 1) return null;

    const { page, totalPages, total, hasPrevPage, hasNextPage } = pagination;

    // Generate page numbers - max 3 on mobile, max 5 on desktop
    const pageNumbers = useMemo(() => {
        const pages = [];
        // On mobile we show fewer pages
        const maxPages = typeof window !== 'undefined' && window.innerWidth < 640 ? 3 : 5;
        const halfMax = Math.floor(maxPages / 2);

        let start = Math.max(1, page - halfMax);
        let end = Math.min(totalPages, start + maxPages - 1);

        if (end - start < maxPages - 1) {
            start = Math.max(1, end - maxPages + 1);
        }

        for (let i = start; i <= end; i++) {
            pages.push(i);
        }
        return pages;
    }, [page, totalPages]);

    return (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-0 mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-neutral-200 dark:border-neutral-700">
            {/* Info text - centered on mobile */}
            <div className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 order-2 sm:order-1">
                Trang {page}/{totalPages} <span className="hidden sm:inline">({total} {itemLabel})</span>
            </div>

            {/* Navigation buttons */}
            <div className="flex items-center gap-1 sm:gap-2 order-1 sm:order-2">
                {/* Previous */}
                <button
                    onClick={() => onPageChange(page - 1)}
                    disabled={!hasPrevPage || loading}
                    className="flex items-center justify-center w-8 h-8 sm:w-auto sm:h-auto sm:px-3 sm:py-1.5 text-sm font-medium rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-neutral-100 dark:disabled:hover:bg-neutral-800 disabled:hover:text-neutral-700 dark:disabled:hover:text-neutral-300 transition-all duration-150 touch-manipulation"
                >
                    <ChevronLeft size={16} />
                    <span className="hidden sm:inline ml-1">Trước</span>
                </button>

                {/* Page Numbers */}
                <div className="flex items-center gap-1">
                    {/* First page + ellipsis on desktop */}
                    {pageNumbers[0] > 1 && (
                        <>
                            <button
                                onClick={() => onPageChange(1)}
                                disabled={loading}
                                className="hidden sm:flex w-8 h-8 items-center justify-center text-sm font-medium rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-all duration-150"
                            >
                                1
                            </button>
                            {pageNumbers[0] > 2 && (
                                <span className="hidden sm:flex w-6 h-8 items-center justify-center text-neutral-400 text-sm">...</span>
                            )}
                        </>
                    )}

                    {pageNumbers.map(pageNum => (
                        <button
                            key={pageNum}
                            onClick={() => onPageChange(pageNum)}
                            disabled={loading}
                            className={`w-8 h-8 text-xs sm:text-sm font-medium rounded-lg transition-all duration-150 touch-manipulation active:scale-95 ${page === pageNum
                                    ? 'bg-black dark:bg-white text-white dark:text-black shadow-md'
                                    : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black'
                                } disabled:opacity-50`}
                        >
                            {pageNum}
                        </button>
                    ))}

                    {/* Last page + ellipsis on desktop */}
                    {pageNumbers[pageNumbers.length - 1] < totalPages && (
                        <>
                            {pageNumbers[pageNumbers.length - 1] < totalPages - 1 && (
                                <span className="hidden sm:flex w-6 h-8 items-center justify-center text-neutral-400 text-sm">...</span>
                            )}
                            <button
                                onClick={() => onPageChange(totalPages)}
                                disabled={loading}
                                className="hidden sm:flex w-8 h-8 items-center justify-center text-sm font-medium rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-all duration-150"
                            >
                                {totalPages}
                            </button>
                        </>
                    )}
                </div>

                {/* Next */}
                <button
                    onClick={() => onPageChange(page + 1)}
                    disabled={!hasNextPage || loading}
                    className="flex items-center justify-center w-8 h-8 sm:w-auto sm:h-auto sm:px-3 sm:py-1.5 text-sm font-medium rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-neutral-100 dark:disabled:hover:bg-neutral-800 disabled:hover:text-neutral-700 dark:disabled:hover:text-neutral-300 transition-all duration-150 touch-manipulation"
                >
                    <span className="hidden sm:inline mr-1">Sau</span>
                    <ChevronRight size={16} />
                </button>
            </div>
        </div>
    );
}

export default memo(Pagination);
