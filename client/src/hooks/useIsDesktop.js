import { useState, useEffect } from 'react';

/**
 * useIsDesktop - Hook to detect if viewport is desktop size (md breakpoint: 768px)
 * Uses matchMedia for efficient responsive detection
 * @returns {boolean} true if viewport >= 768px
 */
export function useIsDesktop() {
    const [isDesktop, setIsDesktop] = useState(() => {
        // Initial check (SSR-safe)
        if (typeof window === 'undefined') return false;
        return window.innerWidth >= 768;
    });

    useEffect(() => {
        const mediaQuery = window.matchMedia('(min-width: 768px)');

        const handleChange = (e) => {
            setIsDesktop(e.matches);
        };

        // Set initial value
        setIsDesktop(mediaQuery.matches);

        // Listen for changes
        mediaQuery.addEventListener('change', handleChange);

        return () => {
            mediaQuery.removeEventListener('change', handleChange);
        };
    }, []);

    return isDesktop;
}

export default useIsDesktop;
