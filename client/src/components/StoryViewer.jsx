import React, { useState, useEffect, useRef } from 'react';
import { X, ChevronLeft, ChevronRight, Heart, ThumbsUp, Laugh, Frown, Angry, Smile, Eye, Trash2, BarChart3 } from 'lucide-react';
import { api } from '../api';
import StoryAnalytics from './StoryAnalytics';
import VerifiedBadge from './VerifiedBadge';

/**
 * StoryViewer - Component xem stories fullscreen
 * Tự động chuyển story, progress bar, reactions
 */
export default function StoryViewer({ 
  storiesGroup, // { _id: userId, stories: [], latestStory: {}, storyCount: N }
  initialStoryIndex = 0,
  onClose,
  currentUser,
  onDelete
}) {
  const [currentIndex, setCurrentIndex] = useState(initialStoryIndex);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [viewersList, setViewersList] = useState([]);
  const [showViewers, setShowViewers] = useState(false);
  const [reactionsList, setReactionsList] = useState([]);
  const [showReactionsList, setShowReactionsList] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const progressInterval = useRef(null);
  const videoRef = useRef(null);
  
  const stories = storiesGroup?.stories || [];
  const currentStory = stories[currentIndex];
  const isOwner = currentUser?._id === storiesGroup?._id?._id || currentUser?._id === storiesGroup?._id;

  // Helper functions for safe callbacks
  const safeClose = () => setTimeout(onClose, 0);
  const safeDelete = (storyId) => setTimeout(() => onDelete?.(storyId), 0);
  
  // Story duration (giây) - Tăng thời gian hiển thị
  const getDuration = () => {
    if (currentStory?.mediaType === 'video' && videoRef.current) {
      return videoRef.current.duration || 30; // 30s cho video
    }
    return currentStory?.duration || 10; // 10s cho ảnh
  };

  /**
   * Tự động chuyển story và progress bar
   */
  useEffect(() => {
    if (!currentStory || isPaused) return;

    const duration = getDuration();
    const interval = 50; // Update mỗi 50ms
    const increment = (interval / 1000) / duration * 100;

    progressInterval.current = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          handleNext();
          return 0;
        }
        return prev + increment;
      });
    }, interval);

    return () => {
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
    };
  }, [currentIndex, isPaused, currentStory]);

  /**
   * Control video playback khi pause/play
   */
  useEffect(() => {
    if (videoRef.current && currentStory?.mediaType === 'video') {
      if (isPaused) {
        videoRef.current.pause();
      } else {
        videoRef.current.play().catch(() => {});
      }
    }
  }, [isPaused, currentStory]);

  /**
   * Mark story as viewed
   */
  useEffect(() => {
    if (currentStory && !isOwner) {
      // Use setTimeout to ensure this runs after render
      const timeoutId = setTimeout(() => {
        api(`/api/stories/${currentStory._id}/view`, { method: 'POST' })
          .catch(() => {}); // Silent fail
      }, 0);
      
      return () => clearTimeout(timeoutId);
    }
  }, [currentStory?._id, isOwner]);

  /**
   * Next story
   */
  const handleNext = () => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setProgress(0);
    } else {
      safeClose();
    }
  };

  /**
   * Previous story
   */
  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      setProgress(0);
    }
  };

  /**
   * React to story
   */
  const handleReaction = async (type) => {
    if (!currentStory) return;
    
    try {
      const response = await api(`/api/stories/${currentStory._id}/react`, {
        method: 'POST',
        body: { type }
      });
      
      // Note: Reactions will be updated when parent component reloads
      
      setShowReactions(false);
    } catch (err) {
      // Silent fail - reaction will not be shown
    }
  };

  /**
   * Load viewers list (chỉ owner)
   */
  const loadViewers = async () => {
    if (!isOwner || !currentStory) return;
    
    setLoading(true);
    try {
      const response = await api(`/api/stories/${currentStory._id}/views`);
      setViewersList(response.views || []);
      setShowViewers(true);
    } catch (err) {
      // Silent fail - viewers list will be empty
    } finally {
      setLoading(false);
    }
  };

  /**
   * Load reactions list (chỉ owner)
   */
  const loadReactions = async () => {
    if (!isOwner || !currentStory) return;
    
    setLoading(true);
    try {
      const response = await api(`/api/stories/${currentStory._id}/reactions`);
      setReactionsList(response.reactions || []);
      setShowReactionsList(true);
    } catch (err) {
      // Silent fail - reactions list will be empty
    } finally {
      setLoading(false);
    }
  };

  /**
   * Delete story
   */
  const handleDelete = async () => {
    if (!isOwner || !currentStory) return;
    
    if (!confirm('Bạn có chắc muốn xóa story này?')) return;
    
    try {
      await api(`/api/stories/${currentStory._id}`, { method: 'DELETE' });
      
      // Defer all callbacks to avoid state update during render
      setTimeout(() => {
        // Callback to parent
        if (onDelete) {
          onDelete(currentStory._id);
        }
        
        // Move to next or close after parent update
        if (stories.length > 1) {
          setCurrentIndex(prev => prev + 1);
          setProgress(0);
        } else {
          onClose(); // Không cần lồng setTimeout nữa
        }
      }, 0);
      
    } catch (err) {
      alert('Lỗi xóa story: ' + err.message);
    }
  };

  /**
   * Reactions config
   */
  const reactionConfig = {
    like: { Icon: ThumbsUp, color: 'text-blue-500' },
    love: { Icon: Heart, color: 'text-red-500' },
    laugh: { Icon: Laugh, color: 'text-yellow-500' },
    sad: { Icon: Frown, color: 'text-gray-500' },
    angry: { Icon: Angry, color: 'text-orange-500' }
  };

  if (!currentStory) {
    return null;
  }

  const author = storiesGroup._id;

  return (
    <div 
      className="story-viewer fixed inset-0 bg-black z-50 flex items-center justify-center"
      onClick={(e) => {
        // Click outside để đóng
        if (e.target === e.currentTarget) {
          safeClose();
        }
      }}
    >
      {/* Custom CSS for paper slide animation */}
      <style jsx>{`
        @keyframes slideInFromLeft {
          0% {
            transform: translateX(-100%);
            opacity: 0;
          }
          60% {
            transform: translateX(5%);
            opacity: 0.8;
          }
          100% {
            transform: translateX(0);
            opacity: 1;
          }
        }
        
        .animate-slide-from-left {
          animation: slideInFromLeft 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
      `}</style>
      
      {/* Story Container - Facebook style */}
      <div className="relative w-full max-w-md h-full md:max-w-lg md:h-[95vh] bg-black md:rounded-2xl overflow-hidden">
        {/* Progress Bars - Facebook style thinner */}
        <div className="absolute top-0 left-0 right-0 flex gap-0.5 p-2 z-20">
          {stories.map((_, idx) => (
            <div key={idx} className="flex-1 h-0.5 bg-white/40 rounded-full overflow-hidden">
              <div 
                className="h-full bg-white transition-all duration-100"
                style={{ 
                  width: idx < currentIndex ? '100%' : idx === currentIndex ? `${progress}%` : '0%'
                }}
              />
            </div>
          ))}
        </div>

        {/* Header - Facebook style */}
        <div className="absolute top-6 left-0 right-0 flex items-center justify-between px-4 z-20">
          {/* Author Info */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="relative">
              <img
                src={author?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(author?.name || 'User')}`}
                alt={author?.name}
                className="w-10 h-10 rounded-full border-2 border-white"
              />
              {/* Online indicator for active stories */}
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-black rounded-full"></div>
            </div>
            <div className="text-white min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm truncate">{author?.name}</span>
                {author?.isVerified && (
                  <VerifiedBadge size={14} />
                )}
              </div>
              <p className="text-xs text-white/80">
                {(() => {
                  const now = new Date();
                  const storyTime = new Date(currentStory.createdAt);
                  const diffMinutes = Math.floor((now - storyTime) / (1000 * 60));
                  
                  if (diffMinutes < 1) return 'Vừa xong';
                  if (diffMinutes < 60) return `${diffMinutes}p`;
                  if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)}h`;
                  return `${Math.floor(diffMinutes / 1440)}d`;
                })()}
              </p>
            </div>
          </div>
          
          {/* Right Controls */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {/* Pause/Play Button */}
            <button
              onClick={() => setIsPaused(!isPaused)}
              className="text-white/80 hover:text-white transition-colors p-2"
              title={isPaused ? "Tiếp tục" : "Tạm dừng"}
            >
              {isPaused ? (
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z"/>
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
                </svg>
              )}
            </button>

            {/* More options menu for owner */}
            {isOwner && (
              <div className="relative">
                <button
                  onClick={() => setShowViewers(!showViewers)}
                  className="text-white/80 hover:text-white transition-colors p-2"
                  title="Tùy chọn"
                >
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
                  </svg>
                </button>
              </div>
            )}
            
            {/* Close */}
            <button
              onClick={safeClose}
              className="text-white/80 hover:text-white transition-colors p-2"
              title="Đóng"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Story Content */}
        <div 
          className="w-full h-full flex items-center justify-center relative"
          onMouseDown={() => setIsPaused(true)}
          onMouseUp={() => setIsPaused(false)}
          onTouchStart={() => setIsPaused(true)}
          onTouchEnd={() => setIsPaused(false)}
        >
          {/* Click areas for navigation - Facebook style */}
          <div className="absolute inset-0 flex z-10">
            {/* Previous area - Left 1/3 */}
            <button
              onClick={handlePrev}
              className="w-1/3 h-full flex items-center justify-start pl-4 opacity-0 hover:opacity-100 transition-opacity"
              disabled={currentIndex === 0}
            >
              {currentIndex > 0 && (
                <div className="bg-black/40 backdrop-blur-sm rounded-full p-2 text-white">
                  <ChevronLeft size={24} />
                </div>
              )}
            </button>

            {/* Center area - pause/play by tap */}
            <div 
              className="w-1/3 h-full flex items-center justify-center"
              onClick={() => setIsPaused(!isPaused)}
            />

            {/* Next area - Right 1/3 */}
            <button
              onClick={handleNext}
              className="w-1/3 h-full flex items-center justify-end pr-4 opacity-0 hover:opacity-100 transition-opacity"
              disabled={currentIndex === stories.length - 1}
            >
              {currentIndex < stories.length - 1 && (
                <div className="bg-black/40 backdrop-blur-sm rounded-full p-2 text-white">
                  <ChevronRight size={24} />
                </div>
              )}
            </button>
          </div>

          {/* Media Content */}
          {currentStory.mediaType === 'image' ? (
            <img
              src={currentStory.mediaUrl}
              alt="Story"
              className="max-w-full max-h-full object-contain"
              style={{ maxHeight: 'calc(100vh - 120px)' }}
            />
          ) : (
            <video
              ref={videoRef}
              src={currentStory.mediaUrl}
              autoPlay
              playsInline
              muted
              className="max-w-full max-h-full object-contain"
              style={{ maxHeight: 'calc(100vh - 120px)' }}
              onLoadedMetadata={() => {
                setProgress(0);
              }}
            />
          )}
          
          {/* Caption Overlay - Facebook style */}
          {currentStory.caption && (
            <div className="absolute bottom-20 left-4 right-4 z-10">
              <p className="text-white text-center font-medium leading-relaxed drop-shadow-lg">
                {currentStory.caption}
              </p>
            </div>
          )}
        </div>

        {/* Bottom Actions - Facebook style */}
        <div className="absolute bottom-0 left-0 right-0 z-20">
          {/* Reaction Button for non-owners - Compact left corner */}
          {!isOwner && (
            <div className="absolute bottom-6 left-4">
              <div className="relative">
                <button
                  onClick={() => setShowReactions(!showReactions)}
                  className="bg-black/30 backdrop-blur-sm text-white rounded-full px-4 py-3 flex items-center gap-3 hover:bg-black/50 transition-all"
                >
                  <Heart size={18} />
                  <span className="text-sm font-medium">Cảm xúc</span>
                </button>
                
                {/* Reactions Popup - To the right of button, matching height */}
                {showReactions && (
                  <div className="absolute left-full ml-2 top-0 bg-black/30 backdrop-blur-sm rounded-full shadow-lg px-4 py-3 flex gap-3 h-[48px] items-center animate-slide-from-left">
                    {Object.entries(reactionConfig).map(([type, { Icon, color }], index) => (
                      <button
                        key={type}
                        onClick={() => handleReaction(type)}
                        className={`p-2.5 hover:scale-110 transition-all duration-200 rounded-full hover:bg-white/20 ${color}`}
                        style={{
                          transform: 'translateX(-100%)',
                          opacity: 0,
                          animationDelay: `${index * 80}ms`,
                          animation: `slideInFromLeft 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards ${index * 80}ms`
                        }}
                      >
                        <Icon size={18} />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Owner actions */}
          {isOwner && (
            <div className="flex justify-center gap-4 pb-6">
              <button
                onClick={loadViewers}
                className="bg-black/30 backdrop-blur-sm text-white rounded-full px-4 py-2 flex items-center gap-2 hover:bg-black/50 transition-all"
                disabled={loading}
              >
                <Eye size={18} />
                <span className="text-sm font-medium">
                  {currentStory.viewCount || 0} lượt xem
                </span>
              </button>
              
              <button
                onClick={() => setShowAnalytics(true)}
                className="bg-black/30 backdrop-blur-sm text-white rounded-full px-4 py-2 flex items-center gap-2 hover:bg-black/50 transition-all"
              >
                <BarChart3 size={18} />
                <span className="text-sm font-medium">Thống kê</span>
              </button>
              
              <button
                onClick={handleDelete}
                className="bg-black/30 backdrop-blur-sm text-white rounded-full px-4 py-2 flex items-center gap-2 hover:bg-red-500/50 transition-all"
              >
                <Trash2 size={18} />
                <span className="text-sm font-medium">Xóa</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Viewers Modal */}
      {showViewers && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center z-50 p-4"
          onClick={() => setShowViewers(false)}
        >
          <div 
            className="bg-white rounded-t-2xl md:rounded-2xl w-full max-w-md max-h-[70vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-semibold">Người xem ({viewersList.length})</h3>
            </div>
            <div className="p-4 space-y-3">
              {viewersList.map((view, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img
                      src={view.user?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(view.user?.name || 'User')}`}
                      alt={view.user?.name}
                      className="w-10 h-10 rounded-full"
                    />
                    <div>
                      <p className="font-medium">{view.user?.name}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(view.viewedAt).toLocaleString('vi-VN')}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Reactions Modal */}
      {showReactionsList && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center z-50 p-4"
          onClick={() => setShowReactionsList(false)}
        >
          <div 
            className="bg-white rounded-t-2xl md:rounded-2xl w-full max-w-md max-h-[70vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-semibold">Cảm xúc ({reactionsList.length})</h3>
            </div>
            <div className="p-4 space-y-3">
              {reactionsList.map((reaction, idx) => {
                const { Icon, color } = reactionConfig[reaction.type] || { Icon: Heart, color: 'text-red-500' };
                return (
                  <div key={idx} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <img
                        src={reaction.user?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(reaction.user?.name || 'User')}`}
                        alt={reaction.user?.name}
                        className="w-10 h-10 rounded-full"
                      />
                      <div>
                        <p className="font-medium">{reaction.user?.name}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(reaction.reactedAt).toLocaleString('vi-VN')}
                        </p>
                      </div>
                    </div>
                    <div className={`${color} flex items-center gap-1`}>
                      <Icon size={20} />
                      <span className="text-sm font-medium capitalize">{reaction.type}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Analytics Modal */}
      {showAnalytics && (
        <StoryAnalytics
          storyId={currentStory._id}
          onClose={() => setShowAnalytics(false)}
        />
      )}
    </div>
  );
}
