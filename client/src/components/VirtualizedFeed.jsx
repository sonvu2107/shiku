import React, { useCallback, useRef, useEffect, memo, useState } from 'react';
import { VariableSizeList as List } from 'react-window';
import ModernPostCard from './ModernPostCard';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

/**
 * VirtualizedFeed - Virtualized list for rendering posts efficiently
 * Uses react-window for windowing (only renders visible items)
 */

// Estimated heights for different post types
const ESTIMATED_POST_HEIGHT = 500; // Default estimate
const MIN_POST_HEIGHT = 300;
const LOADING_HEIGHT = 80;

// Custom hook for container dimensions
const useContainerDimensions = (containerRef) => {
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

    useEffect(() => {
        const updateDimensions = () => {
            if (containerRef.current) {
                setDimensions({
                    width: containerRef.current.offsetWidth,
                    height: window.innerHeight - 200 // Subtract header height
                });
            }
        };

        updateDimensions();
        window.addEventListener('resize', updateDimensions);
        return () => window.removeEventListener('resize', updateDimensions);
    }, [containerRef]);

    return dimensions;
};

// Memoized row renderer for better performance
const PostRow = memo(({ data, index, style }) => {
    const {
        items,
        user,
        savedMap,
        updateSavedState,
        onUpdate,
        setRowHeight,
        hasMore,
        loadingMore
    } = data;

    const rowRef = useRef(null);
    const isLoadingRow = index === items.length;
    const post = !isLoadingRow ? items[index] : null;

    // Measure actual height after render (only for post rows)
    useEffect(() => {
        if (rowRef.current && !isLoadingRow && post) {
            const height = rowRef.current.getBoundingClientRect().height;
            if (height > 0) {
                setRowHeight(index, height);
            }
        }
    }, [index, setRowHeight, isLoadingRow, post?._id]);

    // Loading/end indicator row
    if (isLoadingRow) {
        if (loadingMore) {
            return (
                <div style={style} className="flex justify-center py-8">
                    <div className="flex items-center gap-3 text-gray-600 dark:text-gray-300 text-base">
                        <Loader2 size={20} className="animate-spin text-gray-600 dark:text-gray-300" />
                        <span className="font-semibold">Đang tải thêm bài viết...</span>
                    </div>
                </div>
            );
        }

        if (!hasMore && items.length > 0) {
            return (
                <div style={style} className="text-center py-8">
                    <div className="inline-flex items-center gap-2 px-4 py-3 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-800 rounded-full text-gray-600 dark:text-gray-300 text-sm font-semibold">
                        <span>✨</span>
                        <span>Bạn đã xem hết tất cả bài viết!</span>
                    </div>
                </div>
            );
        }

        return <div style={style} />;
    }

    // Post row
    if (!post) return <div style={style} />;

    return (
        <div style={style}>
            <div ref={rowRef} className="pb-6">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                        duration: 0.4,
                        delay: Math.min(index * 0.05, 0.3),
                        ease: [0.25, 0.1, 0.25, 1]
                    }}
                >
                    <ModernPostCard
                        post={post}
                        user={user}
                        onUpdate={onUpdate}
                        isSaved={savedMap[post._id]}
                        onSavedChange={updateSavedState}
                    />
                </motion.div>
            </div>
        </div>
    );
});

PostRow.displayName = 'PostRow';

/**
 * VirtualizedFeed Component
 * 
 * @param {Array} items - Array of post objects
 * @param {Object} user - Current user object
 * @param {Object} savedMap - Map of saved post states
 * @param {Function} updateSavedState - Callback to update saved state
 * @param {Function} onUpdate - Callback when post is updated
 * @param {boolean} hasMore - Whether there are more posts to load
 * @param {boolean} loadingMore - Whether currently loading more posts
 * @param {Function} loadMore - Function to load more posts
 * @param {number} threshold - How many items from bottom to trigger loadMore
 */
export default function VirtualizedFeed({
    items,
    user,
    savedMap,
    updateSavedState,
    onUpdate,
    hasMore,
    loadingMore,
    loadMore,
    threshold = 5
}) {
    const listRef = useRef(null);
    const containerRef = useRef(null);
    const rowHeights = useRef({});
    const { width, height } = useContainerDimensions(containerRef);

    // Get height for a specific row
    const getRowHeight = useCallback((index) => {
        // Extra row for loading/end message
        if (index === items.length) {
            return LOADING_HEIGHT;
        }
        return rowHeights.current[index] || ESTIMATED_POST_HEIGHT;
    }, [items.length]);

    // Set height for a row after measurement
    const setRowHeight = useCallback((index, height) => {
        if (rowHeights.current[index] !== height && height >= MIN_POST_HEIGHT) {
            rowHeights.current[index] = height;
            // Reset the list to recalculate heights
            if (listRef.current) {
                listRef.current.resetAfterIndex(index);
            }
        }
    }, []);

    // Handle scroll to trigger loadMore
    const handleItemsRendered = useCallback(({ visibleStopIndex }) => {
        if (
            hasMore &&
            !loadingMore &&
            visibleStopIndex >= items.length - threshold
        ) {
            loadMore?.();
        }
    }, [items.length, hasMore, loadingMore, loadMore, threshold]);

    // Item count includes extra row for loading/end indicator
    const itemCount = items.length + (hasMore || loadingMore || items.length > 0 ? 1 : 0);

    // Reset heights when items change significantly
    useEffect(() => {
        if (listRef.current && items.length > 0) {
            listRef.current.resetAfterIndex(0);
        }
    }, [items.length]);

    if (items.length === 0) {
        return null;
    }

    const itemData = {
        items,
        user,
        savedMap,
        updateSavedState,
        onUpdate,
        setRowHeight,
        hasMore,
        loadingMore
    };

    return (
        <div
            ref={containerRef}
            className="virtualized-feed"
            style={{ height: 'calc(100vh - 200px)', minHeight: '500px' }}
        >
            {width > 0 && height > 0 && (
                <List
                    ref={listRef}
                    height={height}
                    width={width}
                    itemCount={itemCount}
                    itemSize={getRowHeight}
                    itemData={itemData}
                    onItemsRendered={handleItemsRendered}
                    overscanCount={3}
                    className="virtualized-list scrollbar-hide"
                    style={{ overflowX: 'hidden' }}
                >
                    {PostRow}
                </List>
            )}
        </div>
    );
}

