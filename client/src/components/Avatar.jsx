/**
 * Avatar Component - Simple avatar display with video support
 * Use this for quick avatar displays in lists, comments, etc.
 * For profile page with frames/badges, use UserAvatar instead.
 */

import { memo, useMemo, useRef, useEffect, useState } from 'react';
import { isVideoUrl } from '../utils/mediaUtils';

const Avatar = memo(function Avatar({
    src,
    name = 'User',
    size = 40,
    className = '',
    onClick,
    loading = 'lazy'
}) {
    const videoRef = useRef(null);
    const [isVisible, setIsVisible] = useState(false);
    const [videoError, setVideoError] = useState(false);

    // Generate fallback URL if no src provided
    const fallbackUrl = useMemo(() => {
        return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&length=2&background=cccccc&color=222222&size=${size * 2}`;
    }, [name, size]);

    const avatarUrl = useMemo(() => {
        if (src && src.trim() !== '') return src;
        return fallbackUrl;
    }, [src, fallbackUrl]);

    // Check if avatar is a video
    const isVideo = useMemo(() => isVideoUrl(avatarUrl), [avatarUrl]);

    // IntersectionObserver for lazy video loading - chỉ phát video khi nhìn thấy
    useEffect(() => {
        if (!isVideo || !videoRef.current) return;

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach(entry => {
                    setIsVisible(entry.isIntersecting);
                    if (entry.isIntersecting && videoRef.current) {
                        videoRef.current.play().catch(() => {
                            // Silent fail nếu không play được
                        });
                    } else if (videoRef.current) {
                        videoRef.current.pause();
                    }
                });
            },
            { threshold: 0.1, rootMargin: '50px' }
        );

        observer.observe(videoRef.current);
        return () => observer.disconnect();
    }, [isVideo]);

    const baseClasses = `rounded-full object-cover bg-neutral-200 dark:bg-neutral-700 ${className}`;

    // Nếu video lỗi, fallback về hình ảnh
    if (isVideo && !videoError) {
        return (
            <video
                ref={videoRef}
                src={avatarUrl}
                poster={fallbackUrl}
                autoPlay={false}
                loop
                muted
                playsInline
                preload="metadata" // Tải metadata để hiển thị frame đầu tiên
                className={baseClasses}
                style={{ width: size, height: size }}
                onClick={onClick}
                onError={() => setVideoError(true)}
            />
        );
    }

    return (
        <img
            src={videoError ? fallbackUrl : avatarUrl}
            alt={name}
            width={size}
            height={size}
            className={baseClasses}
            style={{ width: size, height: size }}
            loading={loading}
            onClick={onClick}
            onError={(e) => {
                // Fallback to ui-avatars if image fails to load
                e.target.src = fallbackUrl;
            }}
        />
    );
});

export default Avatar;
