import React from 'react';
import { X, BarChart3, Eye, Heart, Users } from 'lucide-react';

/**
 * StoryAnalytics - Component hiển thị thống kê story
 * Placeholder component for story analytics
 */
export default function StoryAnalytics({ storyId, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[80vh] overflow-y-auto">
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

        {/* Content */}
        <div className="p-4 space-y-4">
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
              <BarChart3 className="w-8 h-8 text-gray-400" />
            </div>
            <h4 className="text-lg font-medium text-gray-900 mb-2">Thống kê đang phát triển</h4>
            <p className="text-gray-500 text-sm">
              Tính năng thống kê chi tiết sẽ được cập nhật trong phiên bản tiếp theo.
            </p>
          </div>

          {/* Placeholder stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <Eye className="w-6 h-6 text-blue-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-900">0</div>
              <div className="text-sm text-gray-500">Lượt xem</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <Heart className="w-6 h-6 text-red-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-900">0</div>
              <div className="text-sm text-gray-500">Cảm xúc</div>
            </div>
          </div>
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
