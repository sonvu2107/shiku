import React, { useState, useRef, useCallback } from 'react';
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
    const pullThreshold = 80; // Khoảng cách cần kéo để trigger refresh

    const handleTouchStart = useCallback((e) => {
        if (disabled || refreshing) return;

        // Chỉ trigger khi scroll ở top
        const scrollTop = window.scrollY || document.documentElement.scrollTop;
        if (scrollTop > 10) return;

        startYRef.current = e.touches[0].clientY;
        setPulling(true);
    }, [disabled, refreshing]);

    const handleTouchMove = useCallback((e) => {
        if (!pulling || disabled || refreshing) return;

        const scrollTop = window.scrollY || document.documentElement.scrollTop;
        if (scrollTop > 10) {
            setPulling(false);
            setPullDistance(0);
            return;
        }

        const currentY = e.touches[0].clientY;
        const distance = Math.max(0, currentY - startYRef.current);

        // Giảm dần khi kéo xa (resistance effect)
        const dampedDistance = Math.min(distance * 0.5, 120);
        setPullDistance(dampedDistance);
    }, [pulling, disabled, refreshing]);

    const handleTouchEnd = useCallback(async () => {
        if (!pulling) return;
        setPulling(false);

        if (pullDistance >= pullThreshold && onRefresh && !refreshing) {
            setRefreshing(true);
            setPullDistance(60); // Giữ indicator visible

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
    }, [pulling, pullDistance, onRefresh, refreshing, pullThreshold]);

    // Tính toán progress (0-1) cho animation
    const progress = Math.min(pullDistance / pullThreshold, 1);
    const showIndicator = pullDistance > 10 || refreshing;

    return (
        <div
            ref={containerRef}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            className="relative"
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
