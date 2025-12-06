import React, { useState, useEffect, useRef } from 'react';
import { X, ChevronLeft, ChevronRight, Heart, ThumbsUp, Laugh, Frown, Angry, Smile, Eye, Trash2, BarChart3 } from 'lucide-react';
import { api } from '../api';
import StoryAnalytics from './StoryAnalytics';
import VerifiedBadge from './VerifiedBadge';

/**
 * StoryViewer - Component xem stories fullscreen
 * Automatically switch stories, progress bars, and reactions
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

  // Story duration (seconds) - Increase display time for videos
  const getDuration = () => {
    if (currentStory?.mediaType === 'video' && videoRef.current) {
      return videoRef.current.duration || 30; // 30s for videos
    }
    return currentStory?.duration || 10; // 10s for images
  };

  /**
   * Automatically switch stories and progress bar
   */
  useEffect(() => {
    if (!currentStory || isPaused) return;

    const duration = getDuration();
    const interval = 50; // Update every 50ms
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
   * Control video playback when paused/played
   */
  useEffect(() => {
    if (videoRef.current && currentStory?.mediaType === 'video') {
      if (isPaused) {
        videoRef.current.pause();
      } else {
        videoRef.current.play().catch(() => { });
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
          .catch(() => { }); // Silent fail
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
      className="story-viewer fixed inset-0 bg-black z-[9999] flex items-center justify-center"
      data-story-viewer
      onClick={(e) => {
        // Click outside to close (only on desktop)
        if (e.target === e.currentTarget && window.innerWidth >= 768) {
          safeClose();
        }
      }}
    >
      {/* Custom CSS for paper slide animation */}
      <style>{`
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

      {/* Story Container - Mobile Fullscreen, Desktop Card */}
      <div className="relative w-full h-full md:w-[400px] md:h-[85vh] md:max-h-[800px] bg-black md:rounded-[32px] overflow-hidden shadow-2xl flex flex-col">

        {/* Top Gradient Overlay for visibility */}
        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-black/60 to-transparent z-10 pointer-events-none" />

        {/* Progress Bars */}
        <div className="absolute top-0 left-0 right-0 flex gap-1 p-3 z-20 pt-safe-top">
          {stories.map((_, idx) => (
            <div key={idx} className="flex-1 h-1 bg-white/20 rounded-full overflow-hidden backdrop-blur-sm">
              <div
                className="h-full bg-white transition-all duration-100 ease-linear"
                style={{
                  width: idx < currentIndex ? '100%' : idx === currentIndex ? `${progress}%` : '0%'
                }}
              />
            </div>
          ))}
        </div>

        {/* Header */}
        <div className="absolute top-6 left-0 right-0 flex items-center justify-between px-4 z-20 mt-safe-top">
          {/* Author Info */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="relative group cursor-pointer">
              <img
                src={author?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(author?.name || 'User')}`}
                alt={author?.name}
                className="w-10 h-10 rounded-full border border-white/20 shadow-sm"
              />
            </div>
            <div className="text-white min-w-0 flex-1 drop-shadow-md">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm truncate">{author?.name}</span>
                {author?.isVerified && (
                  <VerifiedBadge size={14} className="text-blue-400" />
                )}
              </div>
              <p className="text-xs text-white/70 font-medium">
                {(() => {
                  const now = new Date();
                  const storyTime = new Date(currentStory.createdAt);
                  const diffMinutes = Math.floor((now - storyTime) / (1000 * 60));

                  if (diffMinutes < 1) return 'Vừa xong';
                  if (diffMinutes < 60) return `${diffMinutes} phút`;
                  if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)} giờ`;
                  return `${Math.floor(diffMinutes / 1440)} ngày`;
                })()}
              </p>
            </div>
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Pause/Play Button */}
            <button
              onClick={(e) => { e.stopPropagation(); setIsPaused(!isPaused); }}
              className="text-white/70 hover:text-white transition-colors p-2 rounded-full hover:bg-white/10 backdrop-blur-md"
            >
              {isPaused ? (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
              ) : (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" /></svg>
              )}
            </button>

            {/* More options menu for owner */}
            {isOwner && (
              <button
                onClick={(e) => { e.stopPropagation(); setShowViewers(!showViewers); }}
                className="text-white/70 hover:text-white transition-colors p-2 rounded-full hover:bg-white/10 backdrop-blur-md"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" /></svg>
              </button>
            )}

            {/* Close */}
            <button
              onClick={(e) => { e.stopPropagation(); safeClose(); }}
              className="text-white/70 hover:text-white transition-colors p-2 rounded-full hover:bg-white/10 backdrop-blur-md"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Story Content Area */}
        <div
          className="flex-1 relative flex items-center justify-center bg-black"
          onMouseDown={() => setIsPaused(true)}
          onMouseUp={() => setIsPaused(false)}
          onTouchStart={() => setIsPaused(true)}
          onTouchEnd={() => setIsPaused(false)}
        >
          {/* Click areas for navigation */}
          <div className="absolute inset-0 flex z-10">
            <button
              onClick={handlePrev}
              className="w-1/3 h-full outline-none focus:outline-none"
              disabled={currentIndex === 0}
            />
            <div
              className="w-1/3 h-full"
              onClick={() => setIsPaused(!isPaused)}
            />
            <button
              onClick={handleNext}
              className="w-1/3 h-full outline-none focus:outline-none"
              disabled={currentIndex === stories.length - 1}
            />
          </div>

          {/* Media Content */}
          {currentStory.mediaType === 'image' ? (
            <img
              src={currentStory.mediaUrl}
              alt="Story"
              className="w-full h-full object-contain"
            />
          ) : (
            <video
              ref={videoRef}
              src={currentStory.mediaUrl}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-contain"
              onLoadedMetadata={() => setProgress(0)}
            />
          )}

          {/* Caption Overlay */}
          {currentStory.caption && (
            <div className="absolute bottom-32 left-0 right-0 z-10 px-6">
              <div className="bg-black/40 backdrop-blur-md p-4 rounded-2xl border border-white/10">
                <p className="text-white text-center font-medium leading-relaxed text-sm md:text-base">
                  {currentStory.caption}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Gradient Overlay */}
        <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-black/90 via-black/40 to-transparent z-10 pointer-events-none" />

        {/* Bottom Actions */}
        <div className="absolute bottom-0 left-0 right-0 z-20 p-4 pb-8 md:pb-4">
          {/* Reaction Button for non-owners */}
          {!isOwner && (
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Gửi tin nhắn..."
                  className="w-full bg-white/10 backdrop-blur-md border border-white/20 rounded-full px-5 py-3 text-white placeholder-white/50 focus:outline-none focus:border-white/40 transition-colors text-sm"
                />
              </div>
              <button
                onClick={() => setShowReactions(!showReactions)}
                className="bg-white/10 backdrop-blur-md text-white rounded-full p-3 hover:bg-white/20 transition-all border border-white/20"
              >
                <Heart size={20} className={showReactions ? "fill-red-500 text-red-500" : ""} />
              </button>

              {/* Reactions Popup */}
              {showReactions && (
                <div className="absolute right-0 bottom-full mb-4 bg-white/10 backdrop-blur-xl border border-white/20 rounded-full p-2 flex gap-2 animate-slide-from-left shadow-2xl">
                  {Object.entries(reactionConfig).map(([type, { Icon, color }], index) => (
                    <button
                      key={type}
                      onClick={() => handleReaction(type)}
                      className={`p-2 hover:scale-125 transition-all duration-200 rounded-full hover:bg-white/20 ${color}`}
                    >
                      <Icon size={24} />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Owner actions */}
          {isOwner && (
            <div className="flex justify-center gap-3">
              <button
                onClick={loadViewers}
                className="bg-white/10 backdrop-blur-md text-white rounded-xl px-4 py-3 flex items-center gap-2 hover:bg-white/20 transition-all border border-white/10 flex-1 justify-center"
                disabled={loading}
              >
                <Eye size={18} />
                <span className="text-sm font-bold">
                  {currentStory.viewCount || 0}
                </span>
              </button>

              <button
                onClick={() => setShowAnalytics(true)}
                className="bg-white/10 backdrop-blur-md text-white rounded-xl px-4 py-3 flex items-center gap-2 hover:bg-white/20 transition-all border border-white/10 flex-1 justify-center"
              >
                <BarChart3 size={18} />
                <span className="text-sm font-bold">Thống kê</span>
              </button>

              <button
                onClick={handleDelete}
                className="bg-red-500/20 backdrop-blur-md text-red-400 rounded-xl px-4 py-3 flex items-center gap-2 hover:bg-red-500/30 transition-all border border-red-500/20 flex-1 justify-center"
              >
                <Trash2 size={18} />
                <span className="text-sm font-bold">Xóa</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Viewers Modal - Modern Style */}
      {showViewers && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-end md:items-center justify-center z-[10000] p-0 md:p-4"
          onClick={() => setShowViewers(false)}
        >
          <div
            className="bg-white dark:bg-neutral-900 rounded-t-[32px] md:rounded-3xl w-full max-w-md max-h-[80vh] overflow-hidden flex flex-col shadow-2xl animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between bg-white/50 dark:bg-neutral-900/50 backdrop-blur-xl sticky top-0 z-10">
              <h3 className="font-bold text-lg dark:text-white">Người xem ({viewersList.length})</h3>
              <button onClick={() => setShowViewers(false)} className="p-2 bg-neutral-100 dark:bg-neutral-800 rounded-full text-neutral-500 dark:text-neutral-400">
                <X size={18} />
              </button>
            </div>
            <div className="p-2 overflow-y-auto flex-1">
              {viewersList.length === 0 ? (
                <div className="py-10 text-center text-neutral-500 dark:text-neutral-400">Chưa có ai xem tin này</div>
              ) : (
                viewersList.map((view, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 rounded-2xl transition-colors">
                    <div className="flex items-center gap-3">
                      <img
                        src={view.user?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(view.user?.name || 'User')}`}
                        alt={view.user?.name}
                        className="w-10 h-10 rounded-full object-cover border border-neutral-200 dark:border-neutral-700"
                      />
                      <div>
                        <p className="font-bold text-sm dark:text-white">{view.user?.name}</p>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">
                          {new Date(view.viewedAt).toLocaleString('vi-VN')}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Reactions Modal - Modern Style */}
      {showReactionsList && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-end md:items-center justify-center z-[10000] p-0 md:p-4"
          onClick={() => setShowReactionsList(false)}
        >
          <div
            className="bg-white dark:bg-neutral-900 rounded-t-[32px] md:rounded-3xl w-full max-w-md max-h-[80vh] overflow-hidden flex flex-col shadow-2xl animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between bg-white/50 dark:bg-neutral-900/50 backdrop-blur-xl sticky top-0 z-10">
              <h3 className="font-bold text-lg dark:text-white">Cảm xúc ({reactionsList.length})</h3>
              <button onClick={() => setShowReactionsList(false)} className="p-2 bg-neutral-100 dark:bg-neutral-800 rounded-full text-neutral-500 dark:text-neutral-400">
                <X size={18} />
              </button>
            </div>
            <div className="p-2 overflow-y-auto flex-1">
              {reactionsList.length === 0 ? (
                <div className="py-10 text-center text-neutral-500 dark:text-neutral-400">Chưa có cảm xúc nào</div>
              ) : (
                reactionsList.map((reaction, idx) => {
                  const { Icon, color } = reactionConfig[reaction.type] || { Icon: Heart, color: 'text-red-500' };
                  return (
                    <div key={idx} className="flex items-center justify-between p-3 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 rounded-2xl transition-colors">
                      <div className="flex items-center gap-3">
                        <img
                          src={reaction.user?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(reaction.user?.name || 'User')}`}
                          alt={reaction.user?.name}
                          className="w-10 h-10 rounded-full object-cover border border-neutral-200 dark:border-neutral-700"
                        />
                        <div>
                          <p className="font-bold text-sm dark:text-white">{reaction.user?.name}</p>
                          <p className="text-xs text-neutral-500 dark:text-neutral-400">
                            {new Date(reaction.reactedAt).toLocaleString('vi-VN')}
                          </p>
                        </div>
                      </div>
                      <div className={`${color} flex items-center gap-1 bg-neutral-100 dark:bg-neutral-800 px-3 py-1.5 rounded-full`}>
                        <Icon size={16} />
                      </div>
                    </div>
                  );
                })
              )}
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
