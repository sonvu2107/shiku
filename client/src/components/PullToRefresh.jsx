import React, { useState, useRef, useCallback, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';

/**
 * PullToRefresh - Component kéo xuống để refresh
 * Sử dụng cho mobile, tối ưu UX không reload toàn trang
 * 
 * @param {Function} onRefresh - Async function để gọi khi refresh
 * @param {React.ReactNode} children - Nội dung bên trong
 * @param {boolean} disabled - Disable pull-to-refresh
 */
export default function PullToRefresh({ onRefresh, children, disabled = false }) {
    const [pulling, setPulling] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [pullDistance, setPullDistance] = useState(0);

    const containerRef = useRef(null);
    const startYRef = useRef(0);
    const pullingRef = useRef(false); // Sync ref for event handlers
    const pullThreshold = 80;

    // Sync pulling state với ref để event handlers luôn có giá trị mới nhất
    useEffect(() => {
        pullingRef.current = pulling;
    }, [pulling]);

    const handleTouchStart = useCallback((e) => {
        if (disabled || refreshing) return;

        const scrollTop = window.scrollY || document.documentElement.scrollTop;
        if (scrollTop > 10) return;

        startYRef.current = e.touches[0].clientY;
        setPulling(true);
        pullingRef.current = true;
    }, [disabled, refreshing]);

    const handleTouchMove = useCallback((e) => {
        if (!pullingRef.current || disabled || refreshing) return;

        const scrollTop = window.scrollY || document.documentElement.scrollTop;
        if (scrollTop > 10) {
            setPulling(false);
            pullingRef.current = false;
            setPullDistance(0);
            return;
        }

        const currentY = e.touches[0].clientY;
        const distance = Math.max(0, currentY - startYRef.current);

        // Nếu đang kéo xuống, ngăn chặn browser native pull-to-refresh
        // Chỉ preventDefault khi event có thể cancel được (chưa bắt đầu scroll)
        if (distance > 0 && e.cancelable) {
            e.preventDefault();
        }

        const dampedDistance = Math.min(distance * 0.5, 120);
        setPullDistance(dampedDistance);
    }, [disabled, refreshing]);

    const handleTouchEnd = useCallback(async () => {
        if (!pullingRef.current) return;
        setPulling(false);
        pullingRef.current = false;

        if (pullDistance >= pullThreshold && onRefresh && !refreshing) {
            setRefreshing(true);
            setPullDistance(60);

            try {
                await onRefresh();
            } catch (error) {
                console.error('[PullToRefresh] Error:', error);
            } finally {
                setRefreshing(false);
                setPullDistance(0);
            }
        } else {
            setPullDistance(0);
        }
    }, [pullDistance, onRefresh, refreshing, pullThreshold]);

    // Sử dụng native event listeners với { passive: false } để có thể gọi preventDefault()
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        container.addEventListener('touchstart', handleTouchStart, { passive: true });
        container.addEventListener('touchmove', handleTouchMove, { passive: false }); // passive: false để gọi được preventDefault()
        container.addEventListener('touchend', handleTouchEnd, { passive: true });

        return () => {
            container.removeEventListener('touchstart', handleTouchStart);
            container.removeEventListener('touchmove', handleTouchMove);
            container.removeEventListener('touchend', handleTouchEnd);
        };
    }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

    const progress = Math.min(pullDistance / pullThreshold, 1);
    const showIndicator = pullDistance > 10 || refreshing;

    return (
        <div
            ref={containerRef}
            className="relative"
            style={{
                // Ngăn chặn browser native pull-to-refresh
                overscrollBehaviorY: 'contain',
                touchAction: 'pan-y pinch-zoom'
            }}
        >
            {/* Pull indicator */}
            {showIndicator && (
                <div
                    className="absolute left-1/2 -translate-x-1/2 z-50 flex items-center justify-center transition-opacity duration-200"
                    style={{
                        top: Math.max(pullDistance - 50, 8),
                        opacity: refreshing ? 1 : progress
                    }}
                >
                    <div className={`
                        flex items-center gap-2 px-4 py-2 
                        bg-white dark:bg-neutral-900 
                        border border-neutral-200 dark:border-neutral-800 
                        rounded-full shadow-lg
                        ${refreshing ? 'animate-pulse' : ''}
                    `}>
                        <RefreshCw
                            size={16}
                            className={`text-neutral-600 dark:text-neutral-400 ${refreshing ? 'animate-spin' : ''}`}
                            style={{
                                transform: refreshing ? 'none' : `rotate(${progress * 360}deg)`,
                                transition: 'transform 0.1s ease-out'
                            }}
                        />
                        <span className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
                            {refreshing ? 'Đang tải...' : progress >= 1 ? 'Thả để làm mới' : 'Kéo xuống để làm mới'}
                        </span>
                    </div>
                </div>
            )}

            {/* Content with pull transform */}
            <div
                style={{
                    transform: pullDistance > 0 ? `translateY(${pullDistance}px)` : 'none',
                    transition: pulling ? 'none' : 'transform 0.3s ease-out'
                }}
            >
                {children}
            </div>
        </div>
    );
}
