import React, { useState, useEffect } from 'react';
import { X, BarChart3, Eye, Heart, Users, TrendingUp, Clock, ThumbsUp, Laugh, Frown, Angry, Smile, Loader2 } from 'lucide-react';
import { api } from '../api';

/**
 * StoryAnalytics - Component hiển thị thống kê story chi tiết
 * Sử dụng API thực tế để lấy dữ liệu analytics
 */
export default function StoryAnalytics({ storyId, onClose }) {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    loadAnalytics();
  }, [storyId]);

  const loadAnalytics = async () => {
    if (!storyId) return;
    
    setLoading(true);
    setError('');
    
    try {
      const response = await api(`/api/stories/${storyId}/analytics`);
      setAnalytics(response.analytics);
    } catch (err) {
      setError('Không thể tải thống kê: ' + (err.message || 'Lỗi không xác định'));
    } finally {
      setLoading(false);
    }
  };

  const reactionIcons = {
    like: { Icon: ThumbsUp, color: 'text-blue-500' },
    love: { Icon: Heart, color: 'text-red-500' },
    laugh: { Icon: Laugh, color: 'text-yellow-500' },
    sad: { Icon: Frown, color: 'text-gray-500' },
    angry: { Icon: Angry, color: 'text-orange-500' }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl w-full max-w-md p-8 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Đang tải thống kê...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl w-full max-w-md p-6">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
              <X className="w-8 h-8 text-red-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Lỗi tải thống kê</h3>
            <p className="text-gray-500 text-sm mb-4">{error}</p>
            <div className="flex gap-2">
              <button
                onClick={loadAnalytics}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Thử lại
              </button>
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-gray-900">Thống kê Story</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-1 px-4">
            {[
              { id: 'overview', label: 'Tổng quan', icon: BarChart3 },
              { id: 'viewers', label: 'Người xem', icon: Users },
              { id: 'reactions', label: 'Cảm xúc', icon: Heart }
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                  activeTab === id
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="p-4">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Main Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 rounded-lg p-4 text-center">
                  <Eye className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-gray-900">{analytics?.totalViews || 0}</div>
                  <div className="text-sm text-gray-500">Lượt xem</div>
                </div>
                <div className="bg-green-50 rounded-lg p-4 text-center">
                  <Users className="w-6 h-6 text-green-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-gray-900">{analytics?.uniqueViewers || 0}</div>
                  <div className="text-sm text-gray-500">Người xem</div>
                </div>
                <div className="bg-red-50 rounded-lg p-4 text-center">
                  <Heart className="w-6 h-6 text-red-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-gray-900">{analytics?.totalReactions || 0}</div>
                  <div className="text-sm text-gray-500">Cảm xúc</div>
                </div>
                <div className="bg-purple-50 rounded-lg p-4 text-center">
                  <TrendingUp className="w-6 h-6 text-purple-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-gray-900">{analytics?.engagementRate || 0}%</div>
                  <div className="text-sm text-gray-500">Tương tác</div>
                </div>
              </div>

              {/* Time Info */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-5 h-5 text-gray-600" />
                  <span className="font-medium text-gray-900">Thông tin thời gian</span>
                </div>
                <div className="text-sm text-gray-600">
                  <p>Tạo lúc: {new Date(analytics?.createdAt).toLocaleString('vi-VN')}</p>
                  <p>Hết hạn: {new Date(analytics?.expiresAt).toLocaleString('vi-VN')}</p>
                  <p>Thời gian: {analytics?.timeSinceCreated}</p>
                </div>
              </div>

              {/* Reaction Summary */}
              {analytics?.reactionSummary && analytics.reactionSummary.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Smile className="w-5 h-5 text-gray-600" />
                    <span className="font-medium text-gray-900">Phân tích cảm xúc</span>
                  </div>
                  <div className="space-y-2">
                    {analytics.reactionSummary.map(({ type, count }) => {
                      const { Icon, color } = reactionIcons[type] || { Icon: Heart, color: 'text-red-500' };
                      return (
                        <div key={type} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Icon className={`w-4 h-4 ${color}`} />
                            <span className="text-sm text-gray-700 capitalize">{type}</span>
                          </div>
                          <span className="text-sm font-medium text-gray-900">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'viewers' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-gray-900">Danh sách người xem ({analytics?.views?.length || 0})</h4>
                <span className="text-sm text-gray-500">
                  {analytics?.pagination?.hasMore ? 'Có thêm dữ liệu...' : 'Đã tải hết'}
                </span>
              </div>
              
              {analytics?.views && analytics.views.length > 0 ? (
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {analytics.views.map((view, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <img
                        src={view.user?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(view.user?.name || 'User')}`}
                        alt={view.user?.name}
                        className="w-10 h-10 rounded-full"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-gray-900 truncate">{view.user?.name}</p>
                          {view.user?.isVerified && (
                            <span className="text-blue-500 text-xs">✓</span>
                          )}
                          {view.user?.isOnline && (
                            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500">
                          {new Date(view.viewedAt).toLocaleString('vi-VN')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>Chưa có người xem</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'reactions' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-gray-900">Danh sách cảm xúc ({analytics?.reactions?.length || 0})</h4>
                <span className="text-sm text-gray-500">
                  {analytics?.pagination?.hasMore ? 'Có thêm dữ liệu...' : 'Đã tải hết'}
                </span>
              </div>
              
              {analytics?.reactions && analytics.reactions.length > 0 ? (
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {analytics.reactions.map((reaction, index) => {
                    const { Icon, color } = reactionIcons[reaction.type] || { Icon: Heart, color: 'text-red-500' };
                    return (
                      <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <img
                          src={reaction.user?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(reaction.user?.name || 'User')}`}
                          alt={reaction.user?.name}
                          className="w-10 h-10 rounded-full"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-gray-900 truncate">{reaction.user?.name}</p>
                            {reaction.user?.isVerified && (
                              <span className="text-blue-500 text-xs">✓</span>
                            )}
                            {reaction.user?.isOnline && (
                              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500">
                            {new Date(reaction.reactedAt).toLocaleString('vi-VN')}
                          </p>
                        </div>
                        <div className={`flex items-center gap-1 ${color}`}>
                          <Icon className="w-5 h-5" />
                          <span className="text-sm font-medium capitalize">{reaction.type}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Heart className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>Chưa có cảm xúc</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
