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
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex gap-3 overflow-x-auto scrollbar-hide">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="flex-shrink-0">
              <div className="w-[80px] h-[80px] bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse"></div>
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
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-2">
          {/* My Story - Tạo story mới hoặc xem story của mình */}
          {user && (
            <div className="flex-shrink-0 relative">
              {myStories.length === 0 ? (
                // Chưa có story - hiển thị nút tạo với design tròn
                <>
                  <button
                    onClick={() => setShowStoryCreator(true)}
                    className="block w-[80px] h-[80px] rounded-full overflow-hidden relative group hover:scale-105 transition-all duration-200 border-2 border-gray-300 dark:border-gray-600"
                  >
                    <img
                      src={user.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}`}
                      alt={user.name}
                      className="w-full h-full object-cover"
                    />
                  </button>
                  {/* Plus Icon Circle - Ra ngoài viền */}
                  <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-blue-500 rounded-full flex items-center justify-center border-2 border-white dark:border-gray-800 shadow-lg z-10">
                    <Plus size={14} className="text-white" />
                  </div>
                </>
              ) : (
                // Đã có story - hiển thị preview với style tròn
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
                  className="block w-[80px] h-[80px] rounded-full overflow-hidden relative group hover:scale-105 transition-all duration-200 border-2 border-blue-500"
                >
                  {/* Story Preview Image/Video */}
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
                  className="block w-[80px] h-[80px] rounded-full overflow-hidden relative group hover:scale-105 transition-all duration-200 border-2 border-blue-500"
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
                        <div className="w-8 h-8 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center">
                          <Play size={16} className="text-white ml-0.5" />
                        </div>
                      </div>
                    </>
                  )}
                  
                  {/* User Avatar with Ring - Nhỏ hơn */}
                  <div className="absolute top-1 left-1">
                    <div className={`w-6 h-6 rounded-full ring-2 ${viewed ? 'ring-gray-400' : 'ring-blue-500'} ring-offset-1 ring-offset-transparent overflow-hidden`}>
                      <img
                        src={author.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(author.name || 'User')}`}
                        alt={author.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                  
                  {/* Story Count Badge - Nhỏ hơn */}
                  {storyGroup.storyCount > 1 && (
                    <div className="absolute top-1 right-1 bg-black/60 backdrop-blur-sm text-white text-[10px] px-1.5 py-0.5 rounded-full font-medium">
                      {storyGroup.storyCount}
                    </div>
                  )}
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