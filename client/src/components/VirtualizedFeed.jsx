import React, { useCallback, useRef, useEffect, memo, useState } from 'react';
import { List, useDynamicRowHeight, useListRef } from 'react-window';
import ModernPostCard from './ModernPostCard';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

/**
 * VirtualizedFeed - Virtualized list for rendering posts efficiently
 * Uses react-window v2 for windowing (only renders visible items)
 */

// Estimated heights for different row types
const ESTIMATED_POST_HEIGHT = 500;
const LOADING_HEIGHT = 80;

// Custom hook for container dimensions
const useContainerDimensions = (containerRef) => {
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

    useEffect(() => {
        const updateDimensions = () => {
            if (containerRef.current) {
                setDimensions({
                    width: containerRef.current.offsetWidth,
                    height: window.innerHeight - 200
                });
            }
        };

        updateDimensions();
        window.addEventListener('resize', updateDimensions);
        return () => window.removeEventListener('resize', updateDimensions);
    }, [containerRef]);

    return dimensions;
};

// Memoized row renderer
const PostRow = memo(({ data, index, measureRef }) => {
    const {
        items,
        user,
        savedMap,
        updateSavedState,
        onUpdate,
        hasMore,
        loadingMore
    } = data;

    const isLoadingRow = index === items.length;
    const post = !isLoadingRow ? items[index] : null;

    // Loading/end indicator row
    if (isLoadingRow) {
        if (loadingMore) {
            return (
                <div ref={measureRef} className="flex justify-center py-8">
                    <div className="flex items-center gap-3 text-gray-600 dark:text-gray-300 text-base">
                        <Loader2 size={20} className="animate-spin text-gray-600 dark:text-gray-300" />
                        <span className="font-semibold">Đang tải thêm bài viết...</span>
                    </div>
                </div>
            );
        }

        if (!hasMore && items.length > 0) {
            return (
                <div ref={measureRef} className="text-center py-8">
                    <div className="inline-flex items-center gap-2 px-4 py-3 bg-gray-100 dark:bg-neutral-900 border border-gray-200 dark:border-gray-800 rounded-full text-gray-600 dark:text-gray-300 text-sm font-semibold">
                        <span>✨</span>
                        <span>Bạn đã xem hết tất cả bài viết!</span>
                    </div>
                </div>
            );
        }

        return <div ref={measureRef} style={{ height: 1 }} />;
    }

    // Post row
    if (!post) return <div ref={measureRef} style={{ height: 1 }} />;

    return (
        <div ref={measureRef} className="pb-4">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                    duration: 0.4,
                    delay: Math.min(index * 0.03, 0.15),
                    ease: [0.25, 0.1, 0.25, 1]
                }}
            >
                <ModernPostCard
                    post={post}
                    user={user}
                    onUpdate={onUpdate}
                    isSaved={savedMap[post._id]}
                    onSavedChange={updateSavedState}
                    isFirst={index === 0}
                />
            </motion.div>
        </div>
    );
});

PostRow.displayName = 'PostRow';

/**
 * VirtualizedFeed Component
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
    const containerRef = useRef(null);
    const { width, height } = useContainerDimensions(containerRef);

    // react-window v2 hooks
    const listRef = useListRef();
    const getRowHeight = useDynamicRowHeight({
        estimatedRowHeight: ESTIMATED_POST_HEIGHT,
    });

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

    if (items.length === 0) {
        return null;
    }

    const itemData = {
        items,
        user,
        savedMap,
        updateSavedState,
        onUpdate,
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
                    itemData={itemData}
                    onItemsRendered={handleItemsRendered}
                    overscanCount={3}
                    className="virtualized-list scrollbar-hide"
                    style={{ overflowX: 'hidden' }}
                    {...getRowHeight}
                >
                    {PostRow}
                </List>
            )}
        </div>
    );
}


