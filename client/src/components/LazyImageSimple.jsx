import React, { useState, useRef, useEffect } from 'react';

/**
 * LazyImageSimple - Simplified lazy loading image component
 * A lighter version of LazyImage for basic use cases
 * @param {Object} props - Component props
 * @param {string} props.src - Image source URL
 * @param {string} props.alt - Alt text
 * @param {string} props.className - CSS classes
 * @param {Object} props.style - Inline styles
 * @param {boolean} props.priority - If true, skip lazy loading (for LCP images)
 * @param {Function} props.onLoad - On load callback
 * @param {Function} props.onError - On error callback
 * @returns {JSX.Element} Lazy loaded image component
 */
export default function LazyImageSimple({
  src,
  alt = '',
  className = '',
  style = {},
  priority = false,
  onLoad,
  onError,
  ...props
}) {
  const [isLoaded, setIsLoaded] = useState(false);
  // If priority, start in view immediately (skip lazy loading)
  const [isInView, setIsInView] = useState(priority);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef();

  useEffect(() => {
    // Skip observer if priority image (already in view)
    if (priority) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: '100px', // Increased for earlier loading
        threshold: 0.01 // Lower threshold for faster trigger
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, [priority]);

  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    setHasError(true);
    onError?.();
  };

  return (
    <div
      ref={imgRef}
      className={`lazy-image-simple ${className}`}
      style={{
        position: 'relative',
        overflow: 'hidden',
        ...style
      }}
      {...props}
    >
      {/* Loading placeholder with blur effect */}
      {!isLoaded && !hasError && (
        <div
          className="absolute inset-0 bg-gray-200 dark:bg-neutral-900 animate-pulse"
          style={{
            filter: 'blur(10px)',
            transform: 'scale(1.1)',
          }}
        >
          {/* Shimmer effect */}
          <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/20 dark:via-white/10 to-transparent"></div>
        </div>
      )}

      {/* Actual image with blur-up effect */}
      {/* For priority images, always render immediately to avoid LCP delay */}
      {(priority || isInView) && (
        <img
          src={src}
          alt={alt}
          onLoad={handleLoad}
          onError={handleError}
          loading={priority ? 'eager' : 'lazy'}
          fetchpriority={priority ? 'high' : 'auto'}
          decoding={priority ? 'sync' : 'async'}
          className="w-full h-full object-cover transition-opacity duration-300 ease-out"
          style={{
            opacity: isLoaded ? 1 : 0,
            filter: isLoaded ? 'blur(0px)' : 'blur(10px)',
            transform: isLoaded ? 'scale(1)' : 'scale(1.1)',
            transition: 'opacity 0.3s ease-out, filter 0.3s ease-out, transform 0.3s ease-out'
          }}
        />
      )}

      {/* Error state */}
      {hasError && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#f3f4f6',
            color: '#6b7280',
            fontSize: '14px'
          }}
        >
          Failed to load
        </div>
      )}
    </div>
  );
}

