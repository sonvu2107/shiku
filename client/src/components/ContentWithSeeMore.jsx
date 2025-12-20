import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '../utils/cn';

/**
 * ContentWithSeeMore
 * 
 * A wrapper component that truncates content by height and adds a "See more" / "Collapse" toggle.
 * 
 * @param {React.ReactNode} children - The content to display
 * @param {number} maxHeight - The maximum height in pixels before truncation (default: 200)
 * @param {string} className - Additional classes for the container
 * @param {boolean} alwaysShow - If true, disables truncation (optional)
 */
export default function ContentWithSeeMore({
    children,
    maxHeight = 200,
    className
}) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [shouldTruncate, setShouldTruncate] = useState(false);
    const contentRef = useRef(null);

    // Measure content height to decide whether to show the button
    useEffect(() => {
        if (contentRef.current) {
            // Use scrollHeight to get the full height of the content
            const height = contentRef.current.scrollHeight;
            if (height > maxHeight + 20) { // Add a small buffer (20px) to avoid chopping off just one line
                setShouldTruncate(true);
            } else {
                setShouldTruncate(false);
            }
        }
    }, [children, maxHeight]);

    return (
        <div className={cn("relative flex flex-col", className)}>
            <div
                ref={contentRef}
                className={cn(
                    "transition-[max-height] duration-300 ease-in-out overflow-hidden relative",
                    // If shouldn't truncate, show auto height.
                    // If should truncate:
                    //   - If expanded: max-h-none (or huge number)
                    //   - If not expanded: max-h-[maxHeight]
                    !shouldTruncate ? "max-h-none" : (isExpanded ? "max-h-none" : "")
                )}
                style={{
                    // Use inline style for the dynamic numeric max-height when collapsed
                    maxHeight: (shouldTruncate && !isExpanded) ? `${maxHeight}px` : undefined
                }}
            >
                {children}

                {/* Gradient overlay when collapsed */}
                {shouldTruncate && !isExpanded && (
                    <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white dark:from-[#333] to-transparent pointer-events-none" />
                )}
            </div>

            {shouldTruncate && (
                <button
                    onClick={(e) => {
                        e.stopPropagation(); // Prevent navigating to post detail if inside a clickable card
                        setIsExpanded(!isExpanded);
                    }}
                    className="self-start mt-2 text-sm font-semibold text-black dark:text-white hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1 transition-colors z-10"
                >
                    {isExpanded ? (
                        <>
                            Thu gọn <ChevronUp size={16} />
                        </>
                    ) : (
                        <>
                            Xem thêm <ChevronDown size={16} />
                        </>
                    )}
                </button>
            )}
        </div>
    );
}
