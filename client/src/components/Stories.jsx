import React, { useState, useEffect } from 'react';
import { Plus, Play } from 'lucide-react';
import { api } from '../api';
import StoryCreator from './StoryCreator';
import StoryViewer from './StoryViewer';

/**
 * Stories - Component hiển thị stories như Instagram/Facebook
 * Stories tự động xóa sau 24h, có view count và reactions
 */
export default function Stories({ user }) {
  const [storiesGroups, setStoriesGroups] = useState([]); 
  const [myStories, setMyStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showStoryCreator, setShowStoryCreator] = useState(false);
  const [selectedStoryGroup, setSelectedStoryGroup] = useState(null);
  const [selectedStoryIndex, setSelectedStoryIndex] = useState(0);

  useEffect(() => {
    if (user) {
      loadStories();
    }
  }, [user]);

  /**
   * Load stories feed (của bạn bè và chính mình)
   */
  const loadStories = async () => {
    try {
      setLoading(true);
      
      // Load stories feed
      const feedResponse = await api('/api/stories/feed');
      if (feedResponse.storiesGroups) {
        setStoriesGroups(feedResponse.storiesGroups);
      }
      
      // Load my stories riêng để hiển thị
      const myResponse = await api('/api/stories/my/all');
      if (myResponse.stories) {
        setMyStories(myResponse.stories);
      }
    } catch (error) {
      // Silent fail - stories will show empty state
    } finally {
      setLoading(false);
    }
  };

  /**
   * Callback khi tạo story thành công
   */
  const handleStoryCreated = (newStory) => {
    // Thêm vào my stories
    setMyStories(prev => [newStory, ...prev]);
    
    // Reload để cập nhật feed
    loadStories();
  };

  /**
   * Xem story group
   */
  const handleViewStory = (storyGroup, startIndex = 0) => {
    setSelectedStoryGroup(storyGroup);
    setSelectedStoryIndex(startIndex);
  };

  /**
   * Xóa story - Safe callback để tránh state update trong render
   */
  const handleStoryDeleted = (storyId) => {
    // Defer all state updates to avoid React warnings
    setTimeout(() => {
      // Remove from my stories
      setMyStories(prev => prev.filter(s => s._id !== storyId));
      
      // Reload feed
      loadStories();
    }, 0);
  };

  /**
   * Safe close callback để tránh state update trong render
   */
  const handleStoryClose = () => {
    setTimeout(() => {
      setSelectedStoryGroup(null);
      setSelectedStoryIndex(0);
    }, 0);
  };

  /**
   * Format time ago
   */
  const getTimeAgo = (date) => {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    
    if (seconds < 60) return 'Vừa xong';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}p trước`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h trước`;
    return `${Math.floor(seconds / 86400)}d trước`;
  };

  /**
   * Check if user has viewed all stories in group
   */
  const hasViewedAll = (storyGroup) => {
    if (!storyGroup?.stories || !user?._id) return false;
    
    return storyGroup.stories.every(story => 
      story.views?.some(v => v.user === user._id)
    );
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex gap-4 overflow-x-auto scrollbar-hide">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="flex-shrink-0">
              <div className="w-28 h-40 bg-gray-200 rounded-lg animate-pulse"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Luôn hiển thị Stories section nếu user đã đăng nhập
  if (!user) {
    return null;
  }

  return (
    <>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-2">
          {/* My Story - Tạo story mới hoặc xem story của mình */}
          {user && (
            <div className="flex-shrink-0">
              {myStories.length === 0 ? (
                // Chưa có story - hiển thị nút tạo
                <button
                  onClick={() => setShowStoryCreator(true)}
                  className="block w-28 h-40 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl border-2 border-dashed border-white hover:from-blue-600 hover:to-purple-700 transition-all flex flex-col items-center justify-center relative overflow-hidden group"
                >
                  <img
                    src={user.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}`}
                    alt={user.name}
                    className="absolute inset-0 w-full h-full object-cover opacity-20 group-hover:opacity-30 transition-opacity"
                  />
                  <div className="relative z-10">
                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mb-2 shadow-lg">
                      <Plus size={24} className="text-blue-600" />
                    </div>
                    <span className="text-sm text-white font-medium text-center px-1 drop-shadow">Tạo tin</span>
                  </div>
                </button>
              ) : (
                // Đã có story - hiển thị preview
                <button
                  onClick={() => {
                    const myStoryGroup = {
                      _id: user,
                      stories: myStories,
                      latestStory: myStories[0],
                      storyCount: myStories.length
                    };
                    handleViewStory(myStoryGroup, 0);
                  }}
                  className="block w-28 h-40 rounded-xl overflow-hidden relative group"
                >
                  {/* Story Preview */}
                  {myStories[0].mediaType === 'image' ? (
                    <img
                      src={myStories[0].mediaUrl}
                      alt="My Story"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <video
                      src={myStories[0].mediaUrl}
                      className="w-full h-full object-cover"
                      muted
                    />
                  )}
                  
                  {/* Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                  
                  {/* User Avatar */}
                  <div className="absolute top-2 left-2">
                    <div className="w-10 h-10 rounded-full ring-4 ring-blue-500 overflow-hidden">
                      <img
                        src={user.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}`}
                        alt={user.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                  
                  {/* User Name & Add Button */}
                  <div className="absolute bottom-2 left-2 right-2">
                    <p className="text-white text-sm font-medium truncate mb-1">{user.name}</p>
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowStoryCreator(true);
                      }}
                      className="w-full bg-white/90 hover:bg-white text-blue-600 rounded-full py-1 text-xs font-medium transition-colors flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Plus size={14} />
                      Thêm
                    </div>
                  </div>
                </button>
              )}
            </div>
          )}

          {/* Stories của bạn bè */}
          {storiesGroups.length === 0 && myStories.length === 0 && (
            <div className="flex-1 text-center py-8">
              <p className="text-gray-500 text-sm">Chưa có tin nào. Hãy tạo tin đầu tiên!</p>
            </div>
          )}
          
          {storiesGroups.map((storyGroup, index) => {
            // Skip nếu là stories của chính mình (đã hiển thị ở trên)
            if (!storyGroup._id || !user) return null;
            if (storyGroup._id._id === user._id || storyGroup._id === user._id) {
              return null;
            }
            
            const author = storyGroup._id;
            const latestStory = storyGroup.latestStory;
            const viewed = hasViewedAll(storyGroup);
            
            // Skip nếu không có author hoặc latestStory
            if (!author || !latestStory) return null;
            
            return (
              <div key={author._id || index} className="flex-shrink-0">
                <button
                  onClick={() => handleViewStory(storyGroup, 0)}
                  className="block w-28 h-40 rounded-xl overflow-hidden relative group"
                >
                  {/* Story Preview */}
                  {latestStory.mediaType === 'image' ? (
                    <img
                      src={latestStory.mediaUrl}
                      alt={author.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <>
                      <video
                        src={latestStory.mediaUrl}
                        className="w-full h-full object-cover"
                        muted
                      />
                      {/* Video Play Icon */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-10 h-10 bg-black/50 rounded-full flex items-center justify-center">
                          <Play size={20} className="text-white ml-0.5" />
                        </div>
                      </div>
                    </>
                  )}
                  
                  {/* Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                  
                  {/* User Avatar with Ring */}
                  <div className="absolute top-2 left-2">
                    <div className={`w-10 h-10 rounded-full ring-4 ${viewed ? 'ring-gray-400' : 'ring-blue-500'} overflow-hidden`}>
                      <img
                        src={author.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(author.name || 'User')}`}
                        alt={author.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                  
                  {/* Story Count Badge */}
                  {storyGroup.storyCount > 1 && (
                    <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-full">
                      {storyGroup.storyCount}
                    </div>
                  )}
                  
                  {/* User Name & Time */}
                  <div className="absolute bottom-2 left-2 right-2">
                    <p className="text-white text-sm font-medium truncate">{author?.name || 'Người dùng'}</p>
                    <p className="text-white/80 text-xs">{getTimeAgo(latestStory?.createdAt)}</p>
                  </div>
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Story Creator Modal */}
      {showStoryCreator && (
        <StoryCreator
          user={user}
          onClose={() => setShowStoryCreator(false)}
          onStoryCreated={handleStoryCreated}
        />
      )}

      {/* Story Viewer */}
      {selectedStoryGroup && (
        <StoryViewer
          storiesGroup={selectedStoryGroup}
          initialStoryIndex={selectedStoryIndex}
          currentUser={user}
          onClose={handleStoryClose}
          onDelete={handleStoryDeleted}
        />
      )}
    </>
  );
}