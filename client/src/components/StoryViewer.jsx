import React, { useState, useEffect, useRef } from 'react';
import { X, ChevronLeft, ChevronRight, Heart, ThumbsUp, Laugh, Frown, Angry, Smile, Eye, Trash2, BarChart3 } from 'lucide-react';
import { api } from '../api';
import StoryAnalytics from './StoryAnalytics';

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
   * Mark story as viewed
   */
  useEffect(() => {
    if (currentStory && !isOwner) {
      api(`/api/stories/${currentStory._id}/view`, { method: 'POST' })
        .catch(() => {}); // Silent fail
    }
  }, [currentStory?._id]);

  /**
   * Next story
   */
  const handleNext = () => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setProgress(0);
    } else {
      onClose();
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
      console.error('Error reacting to story:', err);
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
      console.error('Error loading viewers:', err);
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
      console.error('Error loading reactions:', err);
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
      
      // Callback to parent
      if (onDelete) {
        onDelete(currentStory._id);
      }
      
      // Move to next or close
      if (stories.length > 1) {
        handleNext();
      } else {
        onClose();
      }
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
      className="fixed inset-0 bg-black z-50 flex items-center justify-center"
      onClick={(e) => {
        // Click outside để đóng
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      {/* Story Container */}
      <div className="relative w-full max-w-lg h-full md:h-[90vh] bg-black">
        {/* Progress Bars */}
        <div className="absolute top-0 left-0 right-0 flex gap-1 p-2 z-10">
          {stories.map((_, idx) => (
            <div key={idx} className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden">
              <div 
                className="h-full bg-white transition-all"
                style={{ 
                  width: idx < currentIndex ? '100%' : idx === currentIndex ? `${progress}%` : '0%'
                }}
              />
            </div>
          ))}
        </div>

        {/* Mobile-optimized Header */}
        <div className="absolute top-2 sm:top-4 left-0 right-0 flex items-center justify-between px-2 sm:px-4 z-10">
          {/* Author Info - Mobile compact */}
          <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
            <img
              src={author?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(author?.name || 'User')}`}
              alt={author?.name}
              className="w-6 h-6 sm:w-8 sm:h-8 rounded-full border-2 border-white flex-shrink-0"
            />
            <div className="text-white min-w-0 flex-1">
              <div className="flex items-center gap-1 sm:gap-2">
                <span className="font-semibold text-xs sm:text-sm truncate">{author?.name}</span>
                {author?.isVerified && (
                  <VerifiedBadge size={12} className="sm:w-4 sm:h-4" />
                )}
              </div>
              <p className="text-xs text-white/80">
                {new Date(currentStory.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
          
          {/* Right Controls - Mobile compact */}
          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            {/* Pause/Play Button */}
            <button
              onClick={() => setIsPaused(!isPaused)}
              className={`text-white hover:text-white/80 transition-colors rounded-full p-1.5 sm:p-2 ${
                isPaused ? 'bg-red-500/80' : 'bg-black/30'
              }`}
              title={isPaused ? "Tiếp tục" : "Tạm dừng"}
            >
              {isPaused ? (
                <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z"/>
                </svg>
              ) : (
                <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
                </svg>
              )}
            </button>

            {/* Analytics (owner only) */}
            {isOwner && (
              <button
                onClick={() => setShowAnalytics(true)}
                className="text-white hover:text-white/80 transition-colors bg-black/30 rounded-full p-1.5 sm:p-2"
                title="Xem thống kê"
              >
                <BarChart3 size={14} className="sm:w-4 sm:h-4" />
              </button>
            )}
            
            {/* Delete (owner only) */}
            {isOwner && (
              <button
                onClick={handleDelete}
                className="text-white hover:text-red-500 transition-colors bg-black/30 rounded-full p-1.5 sm:p-2"
                title="Xóa story"
              >
                <Trash2 size={14} className="sm:w-4 sm:h-4" />
              </button>
            )}
            
            {/* Close */}
            <button
              onClick={onClose}
              className="text-white hover:text-white/80 transition-colors bg-black/30 rounded-full p-1.5 sm:p-2"
              title="Đóng"
            >
              <X size={14} className="sm:w-4 sm:h-4" />
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
          {currentStory.mediaType === 'image' ? (
            <img
              src={currentStory.mediaUrl}
              alt="Story"
              className="max-w-full max-h-full object-contain"
            />
          ) : (
            <video
              ref={videoRef}
              src={currentStory.mediaUrl}
              autoPlay
              muted
              playsInline
              className="max-w-full max-h-full object-contain"
              onLoadedMetadata={() => {
                // Reset progress when video metadata loads
                setProgress(0);
              }}
            />
          )}
          
          {/* Caption Overlay */}
          {currentStory.caption && (
            <div className="absolute bottom-20 left-0 right-0 px-6">
              <p className="text-white text-center text-lg font-medium drop-shadow-lg">
                {currentStory.caption}
              </p>
            </div>
          )}


        </div>

        {/* Mobile-optimized Navigation */}
        <div className="absolute inset-0 flex">
          {/* Previous Button - Left side */}
          <button
            onClick={handlePrev}
            className="w-1/3 h-full flex items-center justify-start pl-2 sm:pl-4"
            disabled={currentIndex === 0}
          >
            {currentIndex > 0 && (
              <div className="bg-black/30 hover:bg-black/50 rounded-full p-1.5 sm:p-2 transition-colors">
                <svg className="w-4 h-4 sm:w-6 sm:h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
                </svg>
              </div>
            )}
          </button>

          {/* Center area - Click to pause/play */}
          <div 
            className="w-1/3 h-full flex items-center justify-center"
            onClick={() => setIsPaused(!isPaused)}
          >
          </div>

          {/* Next Button - Right side */}
          <button
            onClick={handleNext}
            className="w-1/3 h-full flex items-center justify-end pr-2 sm:pr-4"
            disabled={currentIndex === stories.length - 1}
          >
            {currentIndex < stories.length - 1 && (
              <div className="bg-black/30 hover:bg-black/50 rounded-full p-1.5 sm:p-2 transition-colors">
                <svg className="w-4 h-4 sm:w-6 sm:h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8.59 16.59L10 18l6-6-6-6-1.41 1.41L13.17 12z"/>
                </svg>
              </div>
            )}
          </button>
        </div>



        {/* Mobile-optimized Reaction Button */}
        {!isOwner && (
          <div className="absolute bottom-4 sm:bottom-6 left-1/2 transform -translate-x-1/2 z-10">
            <div className="relative">
              <button
                onClick={() => setShowReactions(!showReactions)}
                className="bg-black/50 hover:bg-black/70 text-white rounded-full px-4 sm:px-6 py-2 sm:py-3 flex items-center gap-2 sm:gap-3 transition-all duration-200 shadow-lg"
              >
                <Smile size={16} className="sm:w-5 sm:h-5" />
                <span className="font-medium text-sm sm:text-base">Cảm xúc</span>
              </button>
              
              {/* Reactions Popup - Mobile optimized */}
              {showReactions && (
                <div className="absolute bottom-full mb-2 sm:mb-3 left-1/2 -translate-x-1/2 bg-white rounded-full shadow-lg px-3 sm:px-4 py-2 sm:py-3 flex gap-2 sm:gap-3">
                  {Object.entries(reactionConfig).map(([type, { Icon, color }]) => (
                    <button
                      key={type}
                      onClick={() => handleReaction(type)}
                      className={`p-1.5 sm:p-2 hover:scale-110 transition-transform rounded-full ${color}`}
                    >
                      <Icon size={20} className="sm:w-6 sm:h-6" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
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
