/**
 * Pagination Component - Phong cách tu tiên
 */
import { memo } from 'react';
import { motion } from 'framer-motion';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';

const Pagination = memo(({
    currentPage,
    totalPages,
    onPageChange,
    itemsPerPage,
    totalItems
}) => {
    if (totalPages <= 1) return null;

    const startItem = (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(currentPage * itemsPerPage, totalItems);

    return (
        <div className="flex items-center justify-between gap-4 mt-4 pt-4 border-t border-amber-900/30">
            {/* Info */}
            <span className="text-xs text-slate-500">
                {startItem}-{endItem} / {totalItems}
            </span>

            {/* Controls */}
            <div className="flex items-center gap-2">
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className={`p-2 rounded-lg border transition-colors ${currentPage === 1
                            ? 'border-slate-700 text-slate-600 cursor-not-allowed'
                            : 'border-amber-500/30 text-amber-400 hover:bg-amber-500/10'
                        }`}
                >
                    <FiChevronLeft size={16} />
                </motion.button>

                <span className="px-3 py-1 bg-slate-800/50 border border-amber-500/20 rounded-lg text-sm text-amber-300 font-mono min-w-[60px] text-center">
                    {currentPage} / {totalPages}
                </span>

                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className={`p-2 rounded-lg border transition-colors ${currentPage === totalPages
                            ? 'border-slate-700 text-slate-600 cursor-not-allowed'
                            : 'border-amber-500/30 text-amber-400 hover:bg-amber-500/10'
                        }`}
                >
                    <FiChevronRight size={16} />
                </motion.button>
            </div>
        </div>
    );
});

export default Pagination;
