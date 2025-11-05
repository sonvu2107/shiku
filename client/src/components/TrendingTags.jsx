import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { TrendingUp, Hash } from "lucide-react";
import { api } from "../api";

/**
 * TrendingTags - Component hiển thị các tag xu hướng
 * Hiển thị các tag phổ biến nhất để người dùng khám phá nội dung
 */
export default function TrendingTags({ limit = 10 }) {
  const [trendingTags, setTrendingTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadTrendingTags();
  }, []);

  const loadTrendingTags = async () => {
    try {
      setLoading(true);
      // Gọi API để lấy các tag xu hướng
      const response = await api(`/api/posts?limit=100`);
      
      // Đếm tần suất xuất hiện của mỗi tag
      const tagCount = {};
      response.items?.forEach(post => {
        if (post.tags && Array.isArray(post.tags)) {
          post.tags.forEach(tag => {
            if (tag && tag.trim()) {
              const normalizedTag = tag.trim().toLowerCase();
              tagCount[normalizedTag] = (tagCount[normalizedTag] || 0) + 1;
            }
          });
        }
      });

      // Chuyển thành array và sắp xếp theo tần suất
      const sortedTags = Object.entries(tagCount)
        .map(([tag, count]) => ({ tag, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, limit);

      setTrendingTags(sortedTags);
    } catch (error) {
      console.error('Error loading trending tags:', error);
      setTrendingTags([]);
    } finally {
      setLoading(false);
    }
  };

  const handleTagClick = (tag) => {
    navigate(`/explore?q=${encodeURIComponent(tag)}`);
  };

  if (loading) {
    return (
      <div>
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={20} className="text-gray-900 dark:text-gray-100" />
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">Tag xu hướng</h3>
        </div>
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="animate-pulse">
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (trendingTags.length === 0) {
    return null;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp size={20} className="text-gray-900 dark:text-gray-100" />
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">Tag xu hướng</h3>
        </div>
        <button
          onClick={() => navigate('/explore')}
          className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 font-medium transition-colors"
        >
          Xem thêm →
        </button>
      </div>
      
      <div className="space-y-2">
        {trendingTags.map(({ tag, count }, index) => (
          <div
            key={tag}
            onClick={() => handleTagClick(tag)}
            className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer transition-colors group"
          >
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                <span className="text-xs font-bold text-gray-700 dark:text-gray-300">{index + 1}</span>
              </div>
              <Hash size={14} className="text-gray-400 dark:text-gray-500 flex-shrink-0" />
              <span className="font-medium text-gray-900 dark:text-gray-100 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                {tag}
              </span>
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium ml-2">
              {count} bài
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
