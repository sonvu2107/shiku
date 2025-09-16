import { useState, useEffect, useRef } from "react";
import { X, Download, Eye, Play, Pause, Volume2, VolumeX, ZoomIn, ZoomOut, RotateCw } from "lucide-react";

/**
 * MediaViewer - Component xem ảnh/video full screen
 * Modal hiển thị media với các controls
 */
export default function MediaViewer({ media, onClose }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [imageScale, setImageScale] = useState(1);
  const [imageRotation, setImageRotation] = useState(0);
  const videoRef = useRef(null);
  const imageRef = useRef(null);

  useEffect(() => {
    if (media?.type === "video" && videoRef.current) {
      const video = videoRef.current;
      
      const handleTimeUpdate = () => setCurrentTime(video.currentTime);
      const handleLoadedMetadata = () => setDuration(video.duration);
      const handlePlay = () => setIsPlaying(true);
      const handlePause = () => setIsPlaying(false);
      
      video.addEventListener('timeupdate', handleTimeUpdate);
      video.addEventListener('loadedmetadata', handleLoadedMetadata);
      video.addEventListener('play', handlePlay);
      video.addEventListener('pause', handlePause);
      
      return () => {
        video.removeEventListener('timeupdate', handleTimeUpdate);
        video.removeEventListener('loadedmetadata', handleLoadedMetadata);
        video.removeEventListener('play', handlePlay);
        video.removeEventListener('pause', handlePause);
      };
    }
  }, [media]);

  const togglePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const formatTime = (time) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = media.url;
    link.download = media.originalName;
    link.click();
  };

  const handleImageZoom = (direction) => {
    if (direction === 'in') {
      setImageScale(prev => Math.min(prev + 0.5, 3));
    } else {
      setImageScale(prev => Math.max(prev - 0.5, 0.5));
    }
  };

  const handleImageRotate = () => {
    setImageRotation(prev => (prev + 90) % 360);
  };

  const resetImageTransform = () => {
    setImageScale(1);
    setImageRotation(0);
  };

  const toggleControls = () => {
    setShowControls(prev => !prev);
  };

  if (!media) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-2 sm:p-4"
      onClick={toggleControls}
    >
      <div className="relative max-w-6xl max-h-full w-full h-full flex flex-col">
        {/* Header */}
        <div className={`flex items-center justify-between mb-2 sm:mb-4 text-white transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
          <div className="flex-1 min-w-0 mr-2">
            <h2 className="text-base sm:text-lg lg:text-xl font-semibold truncate" title={media.title}>
              {media.title.length > 30 ? `${media.title.substring(0, 30)}...` : media.title}
            </h2>
            <p className="text-xs sm:text-sm text-gray-300 truncate">
              {media.type === "image" ? "Hình ảnh" : "Video"} • {media.formattedSize || "Unknown size"}
            </p>
          </div>
          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            {media.type === "image" && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleImageZoom('out');
                  }}
                  className="p-1.5 sm:p-2 text-white hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors touch-target"
                  title="Thu nhỏ"
                >
                  <ZoomOut size={18} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleImageZoom('in');
                  }}
                  className="p-1.5 sm:p-2 text-white hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors touch-target"
                  title="Phóng to"
                >
                  <ZoomIn size={18} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleImageRotate();
                  }}
                  className="p-1.5 sm:p-2 text-white hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors touch-target"
                  title="Xoay"
                >
                  <RotateCw size={18} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    resetImageTransform();
                  }}
                  className="p-1.5 sm:p-2 text-white hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors touch-target text-xs"
                  title="Reset"
                >
                  Reset
                </button>
              </>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDownload();
              }}
              className="p-1.5 sm:p-2 text-white hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors touch-target"
              title="Tải xuống"
            >
              <Download size={18} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="p-1.5 sm:p-2 text-white hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors touch-target"
              title="Đóng"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Media Content */}
        <div className="flex-1 flex items-center justify-center bg-black rounded-lg overflow-hidden">
          {media.type === "video" ? (
            <div className="relative w-full h-full group">
              <video
                ref={videoRef}
                src={media.url}
                className="w-full h-full object-contain"
                controls={false}
                muted={isMuted}
                loop
              />
              
              {/* Video Controls Overlay */}
              <div className={`absolute inset-0 bg-black transition-all duration-300 flex items-center justify-center ${showControls ? 'bg-opacity-30' : 'bg-opacity-0'}`}>
                <div className={`transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      togglePlayPause();
                    }}
                    className="bg-white bg-opacity-90 hover:bg-opacity-100 rounded-full p-3 sm:p-4 transition-all duration-200 touch-target"
                  >
                    {isPlaying ? <Pause size={24} /> : <Play size={24} />}
                  </button>
                </div>
              </div>

              {/* Bottom Controls */}
              <div className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-2 sm:p-4 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
                <div className="flex items-center gap-2 sm:gap-4 text-white">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      togglePlayPause();
                    }}
                    className="p-1.5 sm:p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors touch-target"
                  >
                    {isPlaying ? <Pause size={16} /> : <Play size={16} />}
                  </button>
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleMute();
                    }}
                    className="p-1.5 sm:p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors touch-target"
                  >
                    {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                  </button>
                  
                  <div className="flex-1 flex items-center gap-1 sm:gap-2">
                    <span className="text-xs sm:text-sm">{formatTime(currentTime)}</span>
                    <div className="flex-1 bg-gray-600 rounded-full h-1">
                      <div 
                        className="bg-white h-1 rounded-full transition-all duration-200"
                        style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
                      />
                    </div>
                    <span className="text-xs sm:text-sm">{formatTime(duration)}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <img
              ref={imageRef}
              src={media.url}
              alt={media.title}
              className="max-w-full max-h-full object-contain transition-transform duration-300"
              style={{
                transform: `scale(${imageScale}) rotate(${imageRotation}deg)`,
                cursor: imageScale > 1 ? 'move' : 'default'
              }}
            />
          )}
        </div>

        {/* Footer Info */}
        <div className={`mt-2 sm:mt-4 text-white text-xs sm:text-sm transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
            <div className="flex flex-wrap items-center gap-2 sm:gap-4">
              <span className="truncate">Kích thước: {media.formattedSize || "Unknown"}</span>
              <span className="hidden sm:inline">•</span>
              <span>Lượt xem: {media.views || 0}</span>
            </div>
            <div className="text-gray-400 text-xs sm:text-sm">
              {new Date(media.uploadedAt || media.createdAt).toLocaleDateString("vi-VN")}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
