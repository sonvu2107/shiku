import { useState, useRef, useCallback } from 'react';

/**
 * useSwipeGesture - Custom hook for detecting swipe gestures
 * @param {Object} options - Configuration options
 * @param {Function} options.onSwipeLeft - Callback for left swipe
 * @param {Function} options.onSwipeRight - Callback for right swipe
 * @param {Function} options.onSwipeUp - Callback for up swipe
 * @param {Function} options.onSwipeDown - Callback for down swipe
 * @param {number} options.threshold - Minimum distance to trigger swipe (default: 50px)
 * @param {number} options.velocityThreshold - Minimum velocity (default: 0.3)
 * @returns {Object} Touch handlers and swipe state
 */
export function useSwipeGesture({
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    threshold = 50,
    velocityThreshold = 0.3
} = {}) {
    const [swiping, setSwiping] = useState(false);
    const [swipeOffset, setSwipeOffset] = useState({ x: 0, y: 0 });

    const touchStart = useRef({ x: 0, y: 0, time: 0 });
    const isSwiping = useRef(false);

    const handleTouchStart = useCallback((e) => {
        const touch = e.touches[0];
        touchStart.current = {
            x: touch.clientX,
            y: touch.clientY,
            time: Date.now()
        };
        isSwiping.current = true;
        setSwiping(true);
    }, []);

    const handleTouchMove = useCallback((e) => {
        if (!isSwiping.current) return;

        const touch = e.touches[0];
        const deltaX = touch.clientX - touchStart.current.x;
        const deltaY = touch.clientY - touchStart.current.y;

        setSwipeOffset({ x: deltaX, y: deltaY });
    }, []);

    const handleTouchEnd = useCallback((e) => {
        if (!isSwiping.current) return;

        const touch = e.changedTouches[0];
        const deltaX = touch.clientX - touchStart.current.x;
        const deltaY = touch.clientY - touchStart.current.y;
        const deltaTime = Date.now() - touchStart.current.time;

        // Calculate velocity (pixels per millisecond)
        const velocityX = Math.abs(deltaX) / deltaTime;
        const velocityY = Math.abs(deltaY) / deltaTime;

        const absDeltaX = Math.abs(deltaX);
        const absDeltaY = Math.abs(deltaY);

        // Determine if horizontal or vertical swipe
        const isHorizontal = absDeltaX > absDeltaY;

        if (isHorizontal && absDeltaX > threshold && velocityX > velocityThreshold) {
            if (deltaX > 0 && onSwipeRight) {
                onSwipeRight();
            } else if (deltaX < 0 && onSwipeLeft) {
                onSwipeLeft();
            }
        } else if (!isHorizontal && absDeltaY > threshold && velocityY > velocityThreshold) {
            if (deltaY > 0 && onSwipeDown) {
                onSwipeDown();
            } else if (deltaY < 0 && onSwipeUp) {
                onSwipeUp();
            }
        }

        // Reset
        isSwiping.current = false;
        setSwiping(false);
        setSwipeOffset({ x: 0, y: 0 });
    }, [onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown, threshold, velocityThreshold]);

    const handleTouchCancel = useCallback(() => {
        isSwiping.current = false;
        setSwiping(false);
        setSwipeOffset({ x: 0, y: 0 });
    }, []);

    return {
        handlers: {
            onTouchStart: handleTouchStart,
            onTouchMove: handleTouchMove,
            onTouchEnd: handleTouchEnd,
            onTouchCancel: handleTouchCancel
        },
        swiping,
        swipeOffset
    };
}

export default useSwipeGesture;
