import React, { useState, useRef, useEffect } from 'react';

/**
 * LazyImage - Component for lazy loading images with responsive srcSet support
 * Only loads images when they come into viewport
 * @param {Object} props - Component props
 * @param {string} props.src - Image source URL (fallback)
 * @param {string} props.srcSet - Responsive image srcSet
 * @param {string} props.sizes - Responsive sizes attribute
 * @param {string} props.alt - Alt text
 * @param {string} props.className - CSS classes
 * @param {Object} props.style - Inline styles
 * @param {string} props.placeholder - Placeholder image URL
 * @param {boolean} props.priority - If true, skip lazy loading (for LCP images)
 * @param {Function} props.onLoad - On load callback
 * @param {Function} props.onError - On error callback
 * @returns {JSX.Element} Lazy loaded image component
 */
export default function LazyImage({
  src,
  srcSet = '',
  sizes = '',
  alt = '',
  className = '',
  style = {},
  placeholder = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5YTNhZiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkxvYWRpbmcuLi48L3RleHQ+PC9zdmc+',
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
    // Skip observer if priority image
    if (priority) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: '100px', // Start loading 100px before image comes into view
        threshold: 0.01
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
      className={`lazy-image-container ${className}`}
      style={{
        position: 'relative',
        overflow: 'hidden',
        ...style
      }}
      {...props}
    >
      {/* Placeholder */}
      {!isLoaded && !hasError && (
        <div
          className="absolute inset-0 bg-gray-200 dark:bg-neutral-800 animate-pulse"
          style={{
            filter: 'blur(5px)',
            transform: 'scale(1.1)',
          }}
        />
      )}

      {/* Actual image with responsive srcSet */}
      {(priority || isInView) && (
        <img
          src={src}
          srcSet={srcSet || undefined}
          sizes={sizes || undefined}
          alt={alt}
          onLoad={handleLoad}
          onError={handleError}
          loading={priority ? 'eager' : 'lazy'}
          fetchpriority={priority ? 'high' : 'auto'}
          decoding={priority ? 'sync' : 'async'}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            opacity: isLoaded ? 1 : 0,
            transition: 'opacity 0.3s ease',
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
