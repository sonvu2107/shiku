import React, { useState, useRef, memo, useMemo } from 'react';

/**
 * Extract YouTube video ID from various YouTube URL formats
 * @param {string} url - YouTube URL
 * @returns {string|null} Video ID or null
 */
export const extractYouTubeId = (url) => {
  if (!url) return null;
  
  // Match various YouTube URL patterns
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/shorts\/)([^&\n?#]+)/,
    /youtube\.com\/watch\?.*v=([^&\n?#]+)/,
    /^([a-zA-Z0-9_-]{11})$/ // Direct video ID
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  
  return null;
};

/**
 * Check if URL is a valid YouTube URL
 * @param {string} url - URL to check
 * @returns {boolean} True if valid YouTube URL
 */
export const isValidYouTubeUrl = (url) => {
  if (!url) return false;
  return extractYouTubeId(url) !== null;
};

/**
 * YouTubePlayer - Monochrome Luxury style YouTube player component
 * Supports embedded YouTube videos with elegant minimal UI (no icons)
 * 
 * @param {Object} props
 * @param {string} props.url - YouTube video URL
 * @param {string} props.variant - 'compact' | 'full' - Player style variant
 * @param {string} props.className - Additional CSS classes
 */
function YouTubePlayer({ 
  url, 
  variant = 'compact',
  className = '' 
}) {
  const videoId = extractYouTubeId(url);
  const [showPlayer, setShowPlayer] = useState(false);
  const [thumbnailLoaded, setThumbnailLoaded] = useState(false);
  const iframeRef = useRef(null);

  // Get YouTube thumbnail URL - memoized to prevent re-renders
  const thumbnailUrl = useMemo(() => {
    return videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : null;
  }, [videoId]);

  // YouTube embed URL with parameters - always use autoplay=1 when shown
  // Memoized based on videoId only, not showPlayer state
  const embedUrl = useMemo(() => {
    return videoId 
      ? `https://www.youtube.com/embed/${videoId}?enablejsapi=1&autoplay=1&rel=0&modestbranding=1&playsinline=1`
      : null;
  }, [videoId]);

  // Open YouTube in new tab
  const openInYouTube = () => {
    window.open(`https://www.youtube.com/watch?v=${videoId}`, '_blank');
  };

  if (!videoId) {
    return null;
  }

  // Compact variant - Minimal elegant style
  if (variant === 'compact') {
    return (
      <div className={`relative bg-neutral-100 dark:bg-neutral-900 rounded-2xl overflow-hidden border border-neutral-200 dark:border-neutral-800 ${className}`}>
        <div className="flex items-center gap-4 p-4">
          {/* Thumbnail */}
          <div 
            className="relative w-20 h-14 rounded-xl overflow-hidden flex-shrink-0 cursor-pointer group bg-neutral-200 dark:bg-neutral-800"
            onClick={() => setShowPlayer(true)}
          >
            {thumbnailUrl && (
              <img 
                src={thumbnailUrl} 
                alt="Video thumbnail"
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                onLoad={() => setThumbnailLoaded(true)}
              />
            )}
            <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="w-8 h-8 rounded-full bg-white/90 flex items-center justify-center">
                <div className="w-0 h-0 border-t-[6px] border-t-transparent border-l-[10px] border-l-neutral-900 border-b-[6px] border-b-transparent ml-1" />
              </div>
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <span className="text-[10px] font-black text-neutral-400 dark:text-neutral-500 uppercase tracking-[0.15em]">
              YouTube
            </span>
            <p className="text-sm font-bold text-neutral-900 dark:text-white truncate mt-0.5">
              Nhấn để phát nhạc
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setShowPlayer(true)}
              className="px-4 py-2 bg-neutral-900 dark:bg-white text-white dark:text-black text-xs font-black uppercase tracking-wider rounded-full hover:opacity-80 transition-opacity"
            >
              Phát
            </button>
            <button 
              onClick={openInYouTube}
              className="px-3 py-2 text-xs font-bold text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
            >
              Mở
            </button>
          </div>
        </div>

        {/* Expanded Player Modal */}
        {showPlayer && (
          <div 
            className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-[9999] p-4" 
            onClick={() => setShowPlayer(false)}
          >
            <div 
              className="relative w-full max-w-3xl aspect-video bg-black rounded-3xl overflow-hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <iframe
                ref={iframeRef}
                src={embedUrl}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title="YouTube video player"
              />
              <button 
                onClick={() => setShowPlayer(false)}
                className="absolute top-4 right-4 px-4 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full text-white text-xs font-bold uppercase tracking-wider transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Full variant - Embedded player style
  return (
    <div className={`relative aspect-video bg-neutral-100 dark:bg-neutral-900 rounded-3xl overflow-hidden border border-neutral-200 dark:border-neutral-800 ${className}`}>
      {!showPlayer ? (
        // Thumbnail with play button overlay
        <div 
          className="relative w-full h-full cursor-pointer group"
          onClick={() => setShowPlayer(true)}
        >
          {thumbnailUrl && (
            <img 
              src={thumbnailUrl} 
              alt="Video thumbnail"
              className="w-full h-full object-cover"
            />
          )}
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          
          {/* Play button - CSS triangle instead of icon */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-20 h-20 rounded-full bg-white/90 dark:bg-white flex items-center justify-center shadow-xl transform transition-all duration-300 group-hover:scale-110">
              <div className="w-0 h-0 border-t-[12px] border-t-transparent border-l-[20px] border-l-neutral-900 border-b-[12px] border-b-transparent ml-2" />
            </div>
          </div>

          {/* YouTube branding */}
          <div className="absolute bottom-4 left-4">
            <span className="px-4 py-2 bg-white/90 dark:bg-neutral-900/90 backdrop-blur-sm rounded-full text-xs font-black text-neutral-900 dark:text-white uppercase tracking-wider">
              YouTube
            </span>
          </div>

          {/* External link */}
          <button 
            onClick={(e) => {
              e.stopPropagation();
              openInYouTube();
            }}
            className="absolute top-4 right-4 px-4 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full text-white text-xs font-bold uppercase tracking-wider transition-colors"
          >
            Mở trong YouTube
          </button>
        </div>
      ) : (
        // Embedded player
        <iframe
          ref={iframeRef}
          src={embedUrl}
          className="w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          title="YouTube video player"
        />
      )}
    </div>
  );
}

export default memo(YouTubePlayer);
